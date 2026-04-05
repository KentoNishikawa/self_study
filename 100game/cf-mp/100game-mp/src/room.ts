// cf-mp/100game-mp/src/room.ts
import type { Difficulty, GameState, GameType, Seat, SeatKind, SystemLog } from "./core/types";
import { reducer, type Action } from "./core/reducer";
import { createDeck, deal, shuffle } from "./core/deck";
import { chooseNpcAction } from "./ai/npc";


// ---------------- Lobby types ----------------
type LobbySeat = {
    kind: "HOST" | "PLAYER" | "NPC";
    name: string;
    iconId: string;
};

type RoomState = {
    roomId: string;
    hostToken: string;
    expiresAt: number; // ms epoch
    locked: boolean; // ゲーム開始後 true（新規参加不可）
    npcDifficulty: Difficulty;
    gameType: string; // "100" | "200" | "300" | "400" | "500" | "EXTRA"
    seats: [LobbySeat, LobbySeat, LobbySeat, LobbySeat]; // 0=HOST, 1..3=P1..P3 or NPC
    playOrder: [number, number, number, number];
    disbanded?: boolean;
};

function makeInitialState(roomId: string, hostToken: string, expiresAt: number): RoomState {
    return {
        roomId,
        hostToken,
        expiresAt,
        locked: false,
        npcDifficulty: "SMART",
        gameType: "100",
        seats: [
            { kind: "HOST", name: "HOST", iconId: "host_default" },
            { kind: "NPC", name: "NPC1", iconId: "npc_default" },
            { kind: "NPC", name: "NPC2", iconId: "npc_default" },
            { kind: "NPC", name: "NPC3", iconId: "npc_default" },
        ],
        playOrder: [0, 1, 2, 3],
        disbanded: false,
    };
}

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function publicRoomState(st: RoomState) {
    // hostTokenは返さない
    const { hostToken: _hide, ...rest } = st;
    return rest;
}

function send(ws: WebSocket, type: string, payload: Record<string, unknown> = {}) {
    ws.send(JSON.stringify({ type, ...payload }));
}

// ---------------- Game helpers ----------------
const EXTRA_CANDIDATES: Array<Exclude<GameType, "EXTRA">> = [100, 200, 300, 400, 500];

// ---------------- Turn limit (MP) ----------------
// ローカルはクライアントで強制手を実行しているが、MPではサーバ側（DO）で強制する。
const TURN_LIMIT_MS = 60 * 1000;
const GAME_START_NPC_DELAY_MS = 3000;

function turnKey(g: GameState) {
    return `${g.turn}|${g.history.length}`;
}

function pickAutoJokerValueNoBust(s: GameState): number {
    const total = s.total;
    const safeMax = s.mode === "UP" ? Math.min(49, (s.target - 1) - total) : Math.min(49, total - 1);
    if (safeMax < 1) return 1;
    return safeMax;
}

function pickExtraTarget(): number {
    const i = Math.floor(Math.random() * EXTRA_CANDIDATES.length);
    return EXTRA_CANDIDATES[i];
}

function parseGameType(s: string): GameType {
    if (s === "EXTRA") return "EXTRA";
    const n = Number(s);
    if (n === 100 || n === 200 || n === 300 || n === 400 || n === 500) return n;
    return 100;
}

function toSeatKind(k: LobbySeat["kind"]): SeatKind {
    return k === "NPC" ? "NPC" : "HUMAN";
}

function makeGameFromRoom(room: RoomState): GameState {
    const gameType = parseGameType(room.gameType);
    const target = gameType === "EXTRA" ? pickExtraTarget() : gameType;
    // ★ここで iconId を GameState に埋め込む（ゲーム画面で表示するため）
    // ★playOrder（手番順）に並べ替えて GameState.seats を作る
    const order = room.playOrder ?? ([0, 1, 2, 3] as [number, number, number, number]);

    const seats = order.map((slot) => {
        const ls = room.seats[slot];
        return {
            kind: toSeatKind(ls.kind),
            name: ls.kind === "NPC" ? `NPC${slot}` : ls.name,
            hand: [],
            iconId: ls.iconId,
        };
    }) as unknown as [Seat, Seat, Seat, Seat];

    const jokerCount = 1;
    const deck = shuffle(createDeck(jokerCount));
    const { hands, restDeck } = deal(deck, 4, 4);
    for (let i = 0; i < 4; i++) seats[i] = { ...seats[i], hand: hands[i] };

    const state: GameState = {
        seats,
        gameType,
        target,
        discard: [],
        systemLogs: [],
        deck: restDeck,
        turn: 0,
        total: 0,
        mode: "UP",
        history: [],
        result: { status: "PLAYING" },
        lastCard: null,
    };

    return state;
}

function isNpcTurn(game: GameState) {
    return game.seats[game.turn].kind === "NPC";
}

// ---------------- Durable Object ----------------
export class RoomDO {
    private sessions = new Set<WebSocket>();
    private seatByWs = new WeakMap<WebSocket, number>();

    constructor(private ctx: DurableObjectState) { }

    // MP用：次の手番締切をDOアラームで管理
    private async scheduleTurnAlarm(room: RoomState, game: GameState) {
        if (room.disbanded) return;

        // ゲーム未開始/終了なら締切なし
        if (!room.locked || game.result.status !== "PLAYING") {
            await this.ctx.storage.put("turnDeadlineAt", 0);
            await this.ctx.storage.put("turnKey", "");
            await this.ctx.storage.setAlarm(room.expiresAt);
            return;
        }

        // NPC手番なら、すぐ進める（ただし念のためアラームも最短で）
        if (isNpcTurn(game)) {
            await this.ctx.storage.put("turnDeadlineAt", Date.now());
            await this.ctx.storage.put("turnKey", turnKey(game));
            await this.ctx.storage.setAlarm(Math.min(room.expiresAt, Date.now()));
            return;
        }

        // 人間手番のみ締切を持つ
        const deadline = Date.now() + TURN_LIMIT_MS;
        await this.ctx.storage.put("turnDeadlineAt", deadline);
        await this.ctx.storage.put("turnKey", turnKey(game));
        await this.ctx.storage.setAlarm(Math.min(room.expiresAt, deadline));
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // --- WebSocket JOIN ---
        if (request.headers.get("Upgrade") === "websocket") {
            const st = await this.ctx.storage.get<RoomState>("state");
            if (!st) return new Response("Room not initialized", { status: 404 });
            if (st.disbanded) return new Response("Room disbanded", { status: 410 });

            if (st.disbanded) {
                // preflightで解散を判断できるように410で返す
                return json({ disbanded: true }, 410);
            }

            const now = Date.now();
            if (now > st.expiresAt) return new Response("Invite expired", { status: 410 });
            if (st.locked) return new Response("Game already started", { status: 423 });

            const token = url.searchParams.get("token") ?? "";
            const isHost = token !== "" && token === st.hostToken;

            const seatIndex = isHost ? 0 : this.assignPlayerSeat(st);
            if (seatIndex === -1) return new Response("Room full", { status: 409 });

            const pair = new WebSocketPair();
            const client = pair[0];
            const server = pair[1];
            server.accept();

            this.sessions.add(server);
            this.seatByWs.set(server, seatIndex);

            await this.ctx.storage.put("state", st);

            send(server, "WELCOME", { seatIndex, state: publicRoomState(st) });
            this.broadcastRoomState(st);

            server.addEventListener("message", async (ev: MessageEvent) => {
                const cur = await this.ctx.storage.get<RoomState>("state");
                if (!cur) return;

                let msg: any = {};
                try {
                    msg = JSON.parse(String(ev.data));
                } catch {
                    return;
                }

                const mySeat = this.seatByWs.get(server);
                if (typeof mySeat !== "number") return;

                // ===== ロビー編集（開始後は編集不可）=====
                if (!cur.locked) {
                    if (msg.type === "UPDATE_NAME" && typeof msg.name === "string") {
                        cur.seats[mySeat].name = msg.name;
                        await this.ctx.storage.put("state", cur);
                        this.broadcastRoomState(cur);
                        return;
                    }

                    if (msg.type === "COMMIT_NAME" && typeof msg.name === "string") {
                        const trimmed = msg.name.trim();
                        cur.seats[mySeat].name =
                            trimmed === "" ? (mySeat === 0 ? "HOST" : `プレイヤー${mySeat}`) : msg.name;
                        await this.ctx.storage.put("state", cur);
                        this.broadcastRoomState(cur);
                        return;
                    }

                    if (msg.type === "UPDATE_ICON" && typeof msg.iconId === "string") {
                        cur.seats[mySeat].iconId = msg.iconId;
                        await this.ctx.storage.put("state", cur);
                        this.broadcastRoomState(cur);
                        return;
                    }

                    if (msg.type === "HOST_SET_CONFIG") {
                        if (mySeat !== 0) return;
                        if (msg.npcDifficulty === "SMART" || msg.npcDifficulty === "CASUAL") {
                            cur.npcDifficulty = msg.npcDifficulty;
                        }
                        if (typeof msg.gameType === "string") {
                            cur.gameType = msg.gameType;
                        }
                        await this.ctx.storage.put("state", cur);
                        this.broadcastRoomState(cur);
                        return;
                    }
                }


                if (msg.type === "HOST_SET_PLAY_ORDER") {
                    if (mySeat !== 0) return;
                    const po = (msg as any).playOrder;
                    if (!Array.isArray(po) || po.length !== 4) return;
                    const nums = po.map((n: any) => Number(n));
                    const ok = nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 3);
                    if (!ok) return;
                    const uniq = new Set(nums);
                    if (uniq.size !== 4) return;

                    cur.playOrder = nums as [number, number, number, number];
                    await this.ctx.storage.put("state", cur);
                    this.broadcastRoomState(cur);
                    return;
                }

                // ===== ゲーム開始 =====
                if (msg.type === "HOST_START") {
                    if (mySeat !== 0) return;
                    if (cur.locked) return;

                    cur.locked = true;
                    await this.ctx.storage.put("state", cur);
                    this.broadcastRoomState(cur);

                    // フレーム連番を初期化
                    await this.ctx.storage.put("gameSeq", 0);

                    const game0 = makeGameFromRoom(cur);
                    await this.ctx.storage.put("game", game0);
                    this.broadcastGameState(game0);

                    // ★開始直後がNPC手番なら、開始ポップアップが消えてから自動実行する
                    if (isNpcTurn(game0)) {
                        const deadline = Date.now() + GAME_START_NPC_DELAY_MS;
                        await this.ctx.storage.put("turnDeadlineAt", deadline);
                        await this.ctx.storage.put("turnKey", turnKey(game0));
                        await this.ctx.storage.setAlarm(Math.min(cur.expiresAt, deadline));
                        return;
                    }

                    await this.scheduleTurnAlarm(cur, game0);
                    return;
                }

                // 同一ルームで再スタート（HOSTのみ）
                if (msg.type === "HOST_RESTART") {
                    if (mySeat !== 0) return;
                    if (!cur.locked) return;

                    await this.ctx.storage.put("gameSeq", 0);

                    const game0 = makeGameFromRoom(cur);
                    await this.ctx.storage.put("game", game0);
                    this.broadcastGameState(game0);

                    // ★開始直後がNPC手番なら、開始ポップアップが消えてから自動実行する
                    if (isNpcTurn(game0)) {
                        const deadline = Date.now() + GAME_START_NPC_DELAY_MS;
                        await this.ctx.storage.put("turnDeadlineAt", deadline);
                        await this.ctx.storage.put("turnKey", turnKey(game0));
                        await this.ctx.storage.setAlarm(Math.min(cur.expiresAt, deadline));
                        return;
                    }

                    await this.scheduleTurnAlarm(cur, game0);
                    return;
                }

                // ===== ゲーム操作（ポンポンポン：途中経過をまとめて送る）=====
                if (msg.type === "PLAY_HAND" || msg.type === "DRAW_PLAY") {
                    const game = await this.ctx.storage.get<GameState>("game");
                    if (!game) return;
                    if (game.result.status !== "PLAYING") return;
                    // 手番一致チェック（ロビー席→ゲーム席へ変換して判定）
                    const playOrder = cur.playOrder ?? ([0, 1, 2, 3] as [number, number, number, number]);
                    const myGameSeat = playOrder.indexOf(mySeat);
                    if (myGameSeat < 0) return;
                    if (myGameSeat !== game.turn) return;
                    if (game.seats[myGameSeat].kind !== "HUMAN") return;

                    let action: Action | null = null;

                    if (msg.type === "PLAY_HAND") {
                        if (!Number.isInteger(msg.handIndex)) return;
                        action = { type: "PLAY_HAND", handIndex: msg.handIndex, jokerValue: msg.jokerValue };
                    } else {
                        action = { type: "DRAW_PLAY", jokerValue: msg.jokerValue };
                    }

                    // 1) 人間の1手目
                    let after = reducer(game, action);

                    // 2) 途中経過フレーム（ここを250msで再生する）
                    const frames: GameState[] = [after];

                    // 3) NPCの連続手を1手ずつ積む
                    const npc = this.runNpcSteps(cur.npcDifficulty, after);
                    frames.push(...npc.steps);
                    const final = npc.final;

                    // 4) 正本は最終だけ保存
                    await this.ctx.storage.put("game", final);

                    // 5) 全員へ「途中経過まとめて送信」
                    await this.broadcastGameStates(frames, 250);

                    // 6) 次手番のタイムアウトを再スケジュール
                    await this.scheduleTurnAlarm(cur, final);
                    return;
                }

                // ===== 離脱 / 解散 =====
                if (msg.type === "LEAVE") {
                    if (mySeat !== 0 && mySeat >= 1 && mySeat <= 3) {
                        const leaverName = cur.seats[mySeat].name;
                        // ロビー：即NPCへ
                        cur.seats[mySeat] = { kind: "NPC", name: `NPC${mySeat}`, iconId: "npc_default" };
                        await this.ctx.storage.put("state", cur);
                        this.broadcastRoomState(cur);

                        // ゲーム中ならNPC化（iconもnpcにする）
                        if (cur.locked) {
                            await this.convertGameSeatToNpcAndMaybeRun(cur.npcDifficulty, mySeat, leaverName);
                        }
                    }
                    // closeイベントで二重処理しないため、先に紐付けを外す
                    this.sessions.delete(server);
                    this.seatByWs.delete(server);

                    try {
                        server.close(1000, "leave");
                    } catch { }
                    return;
                }

                if (msg.type === "HOST_DISBAND") {
                    if (mySeat !== 0) return;

                    cur.disbanded = true;
                    await this.ctx.storage.put("state", cur);

                    const payload = JSON.stringify({ type: "ROOM_DISBANDED" });
                    for (const ws of this.sessions) {
                        try {
                            ws.send(payload);
                        } catch { }
                    }
                    for (const ws of this.sessions) {
                        try {
                            ws.close(1000, "disband");
                        } catch { }
                    }
                    this.sessions.clear();
                    return;
                }
            });

            server.addEventListener("close", async () => {
                this.sessions.delete(server);
                const seatIndex = this.seatByWs.get(server);
                this.seatByWs.delete(server);

                const cur = await this.ctx.storage.get<RoomState>("state");
                if (!cur) return;
                if (cur.disbanded) return;

                if (seatIndex === 0) {
                    cur.disbanded = true;
                    await this.ctx.storage.put("state", cur);

                    const payload = JSON.stringify({ type: "ROOM_DISBANDED" });
                    for (const ws of this.sessions) {
                        try {
                            ws.send(payload);
                        } catch { }
                    }
                    for (const ws of this.sessions) {
                        try {
                            ws.close(1000, "disband");
                        } catch { }
                    }
                    this.sessions.clear();
                    return;
                }

                if (typeof seatIndex === "number" && seatIndex >= 1 && seatIndex <= 3) {
                    const leaverName = cur.seats[seatIndex].name;
                    cur.seats[seatIndex] = { kind: "NPC", name: `NPC${seatIndex}`, iconId: "npc_default" };
                    await this.ctx.storage.put("state", cur);
                    this.broadcastRoomState(cur);

                    if (cur.locked) {
                        await this.convertGameSeatToNpcAndMaybeRun(cur.npcDifficulty, seatIndex, leaverName);
                    }
                }
            });

            return new Response(null, { status: 101, webSocket: client });
        }

        // --- ルーム初期化 ---
        if (url.pathname === "/init" && request.method === "POST") {
            const body = (await request.json()) as {
                roomId: string;
                hostToken: string;
                expiresAt: number;
            };
            const { roomId, hostToken, expiresAt } = body;

            const state = makeInitialState(roomId, hostToken, expiresAt);
            await this.ctx.storage.put("state", state);
            await this.ctx.storage.put("turnDeadlineAt", 0);
            await this.ctx.storage.put("turnKey", "");
            await this.ctx.storage.setAlarm(expiresAt);
            return new Response("ok");
        }

        if (url.pathname === "/state" && request.method === "GET") {
            const st = await this.ctx.storage.get<RoomState>("state");
            if (!st) return json({ error: "NOT_INITIALIZED" }, 404);

            if (st.disbanded) {
                // preflightで解散を判断できるように410
                return json({ disbanded: true }, 410);
            }

            return json(publicRoomState(st));
        }

        return new Response("Not found", { status: 404 });
    }

    async alarm(): Promise<void> {
        const st = await this.ctx.storage.get<RoomState>("state");
        if (!st) return;
        if (st.disbanded) return;

        const now = Date.now();
        // 期限切れ後は join時に now>expiresAt で弾く（ここでは何もしない）
        if (now >= st.expiresAt) return;

        const deadline = (await this.ctx.storage.get<number>("turnDeadlineAt")) ?? 0;
        if (!deadline || deadline <= 0) {
            // ゲーム未開始など。次のアラームは期限切れ
            await this.ctx.storage.setAlarm(st.expiresAt);
            return;
        }

        // まだ期限前なら、次は締切へ
        if (now < deadline) {
            await this.ctx.storage.setAlarm(Math.min(st.expiresAt, deadline));
            return;
        }

        // ここに来たら「手番の締切」
        const game = await this.ctx.storage.get<GameState>("game");
        if (!game) {
            await this.ctx.storage.put("turnDeadlineAt", 0);
            await this.ctx.storage.put("turnKey", "");
            await this.ctx.storage.setAlarm(st.expiresAt);
            return;
        }
        if (game.result.status !== "PLAYING") {
            await this.ctx.storage.put("turnDeadlineAt", 0);
            await this.ctx.storage.put("turnKey", "");
            await this.ctx.storage.setAlarm(st.expiresAt);
            return;
        }

        const expectedKey = (await this.ctx.storage.get<string>("turnKey")) ?? "";
        const curKey = turnKey(game);
        if (expectedKey && expectedKey !== curKey) {
            // 既に手が進んでいる（古いアラーム）→今の状態で再スケジュール
            await this.scheduleTurnAlarm(st, game);
            return;
        }

        // NPC手番はサーバ側で即実行する設計（基本的にここに来ない想定だが保険）
        if (isNpcTurn(game)) {
            const npc = this.runNpcSteps(st.npcDifficulty, game);
            if (npc.steps.length) {
                await this.ctx.storage.put("game", npc.final);
                await this.broadcastGameStates(npc.steps, 250);
                await this.scheduleTurnAlarm(st, npc.final);
            } else {
                await this.scheduleTurnAlarm(st, game);
            }
            return;
        }

        // 人間の手番：DECKから強制で出す（DECKが空なら手札先頭）
        let jokerValue: number | undefined;
        const top = game.deck[game.deck.length - 1];
        let after: GameState;
        if (top) {
            if (top.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(game);
            after = reducer(game, { type: "DRAW_PLAY", jokerValue });
        } else {
            const hand = game.seats[game.turn].hand;
            if (hand.length === 0) {
                // 何も出せないなら締切を消すだけ
                await this.ctx.storage.put("turnDeadlineAt", 0);
                await this.ctx.storage.put("turnKey", "");
                await this.ctx.storage.setAlarm(st.expiresAt);
                return;
            }
            const card = hand[0];
            if (card.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(game);
            after = reducer(game, { type: "PLAY_HAND", handIndex: 0, jokerValue });
        }

        const frames: GameState[] = [after];
        const npc = this.runNpcSteps(st.npcDifficulty, after);
        frames.push(...npc.steps);
        const final = npc.final;

        await this.ctx.storage.put("game", final);
        await this.broadcastGameStates(frames, 250);
        await this.scheduleTurnAlarm(st, final);
    }

    private assignPlayerSeat(st: RoomState): number {
        for (let i = 1; i <= 3; i++) {
            if (st.seats[i].kind === "NPC") {
                st.seats[i] = { kind: "PLAYER", name: `プレイヤー${i}`, iconId: "player_default" };
                return i;
            }
        }
        return -1;
    }

    private broadcastRoomState(st: RoomState) {
        const payload = JSON.stringify({ type: "ROOM_STATE", state: publicRoomState(st) });
        for (const ws of this.sessions) {
            try {
                ws.send(payload);
            } catch { }
        }
    }

    private broadcastGameState(game: GameState) {
        const payload = JSON.stringify({ type: "GAME_STATE", state: game });
        for (const ws of this.sessions) {
            try {
                ws.send(payload);
            } catch { }
        }
    }

    private async broadcastGameStates(states: GameState[], intervalMs = 250) {
        const cur = (await this.ctx.storage.get<number>("gameSeq")) ?? 0;
        const seq = cur + 1;
        await this.ctx.storage.put("gameSeq", seq);

        const payload = JSON.stringify({ type: "GAME_STATES", seq, intervalMs, states });
        for (const ws of this.sessions) {
            try {
                ws.send(payload);
            } catch { }
        }
    }

    private runNpcSteps(difficulty: Difficulty, start: GameState): { final: GameState; steps: GameState[] } {
        let g = start;
        const steps: GameState[] = [];
        let guard = 0;

        while (guard < 200 && g.result.status === "PLAYING" && isNpcTurn(g)) {
            const act = chooseNpcAction(g, difficulty) as unknown as Action;
            g = reducer(g, act);
            steps.push(g);
            guard++;
        }
        return { final: g, steps };
    }

    private async convertGameSeatToNpcAndMaybeRun(
        difficulty: Difficulty,
        seatIndex: number,
        leaverName?: string
    ) {
        const game = await this.ctx.storage.get<GameState>("game");
        if (!game) return;

        // ★ロビー席→ゲーム席へ変換（playOrderが無い場合は従来通り）
        const cur = await this.ctx.storage.get<RoomState>("state");
        const playOrder = cur?.playOrder ?? ([0, 1, 2, 3] as [number, number, number, number]);
        const gameSeatIndex = playOrder.indexOf(seatIndex);
        if (gameSeatIndex < 0) return;

        if (game.seats[gameSeatIndex].kind !== "HUMAN") return;

        // まず席をNPCへ（iconもNPCにする）
        const seats = ([...game.seats] as unknown as typeof game.seats) as any;
        seats[gameSeatIndex] = {
            ...game.seats[gameSeatIndex],
            kind: "NPC",
            name: `NPC${seatIndex}`,
            iconId: "npc_default",
        };

        const base: GameState = { ...game, seats };

        // ★退出ログを追加（ゲーム中ログに出す）
        const name = (leaverName ?? "").trim() || `プレイヤー${seatIndex}`;
        const message = `${name}が退出しました。以降はNPCが操作します。`;
        const lastId = base.systemLogs.length ? base.systemLogs[base.systemLogs.length - 1].id : 0;

        const infoLog: SystemLog = {
            id: lastId + 1,
            kind: "INFO",
            afterPlayIndex: base.history.length,
            message,
        };

        const base2: GameState = { ...base, systemLogs: [...base.systemLogs, infoLog] };

        const frames: GameState[] = [base2];

        const npc = this.runNpcSteps(difficulty, base2);
        frames.push(...npc.steps);
        const final = npc.final;

        await this.ctx.storage.put("game", final);
        await this.broadcastGameStates(frames, 250);

        // ターン制限の再スケジュール
        if (cur) {
            await this.scheduleTurnAlarm(cur, final);
        }
    }
}
