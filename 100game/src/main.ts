// 100game/src/main.ts
import "./style.css";
import type { Difficulty, GameState } from "./core/types";
import { createInitialState } from "./core/game";
import { reducer } from "./core/reducer";
import { chooseNpcAction } from "./ai/npc";
import { renderHome, type HomeConfig } from "./ui/home";
import { render } from "./ui/render";
import { pickJokerValue } from "./ui/jokerPicker";

type Screen = "HOME" | "GAME";

let screen: Screen = "HOME";
let state: GameState | null = null;

type MpSession = {
  roomId: string;
  seatIndex: number; // サーバ上の席(0..3)
  isHost: boolean;
  npcDifficulty: Difficulty;
  ws: WebSocket;
};
let mp: MpSession | null = null;

let mpAnimToken = 0;
let mpLastSeq = 0;

function rotateToMe(server: GameState, seatIndex: number): GameState {
  const mapIndex = (i: number) => (i - seatIndex + 4) % 4;
  const unmapIndex = (i: number) => (i + seatIndex) % 4;

  const seats = [
    server.seats[unmapIndex(0)],
    server.seats[unmapIndex(1)],
    server.seats[unmapIndex(2)],
    server.seats[unmapIndex(3)],
  ] as any;

  const history = server.history.map((h) => ({ ...h, seat: mapIndex(h.seat) })) as any;

  const result =
    server.result.status === "LOSE"
      ? { ...server.result, loserSeat: mapIndex(server.result.loserSeat) }
      : server.result;

  return { ...server, seats, turn: mapIndex(server.turn), history, result };
}

function redirectToHomeUrl() {
  const next = location.origin + location.pathname + (location.hash ?? "");
  location.replace(next);
}

const appEl = document.querySelector<HTMLDivElement>("#app");
if (!appEl) throw new Error("#app not found");
const app: HTMLDivElement = appEl;

// NPC演出
let uiLocked = false;
let npcRunToken = 0;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function playMpFrames(session: MpSession, frames: GameState[], intervalMs: number, seq: number) {
  if (!Number.isFinite(seq)) return;
  if (seq <= mpLastSeq) return;
  mpLastSeq = seq;

  mpAnimToken++;
  mpLastSeq = 0;

  const token = mpAnimToken;

  uiLocked = true;
  draw();

  void (async () => {
    for (let i = 0; i < frames.length; i++) {
      if (token !== mpAnimToken) return;

      state = rotateToMe(frames[i], session.seatIndex);
      (state as any).__mpSeatOffset = session.seatIndex; // プレイヤー状況をHOST→P1→P2→P3に固定する用
      (state as any).__mpIsHost = session.isHost;         // Restart制御用
      draw();

      if (i < frames.length - 1) {
        await sleep(intervalMs);
      }
    }

    if (token !== mpAnimToken) return;
    uiLocked = false;
    draw();
  })();
}

function attachMpWs(session: MpSession) {
  session.ws.onmessage = (ev) => {
    let raw: any;
    try {
      raw = JSON.parse(String(ev.data));
    } catch {
      return;
    }

    if (raw?.type === "ROOM_DISBANDED") {
      mpAnimToken++;
      mpLastSeq = 0;
      mp = null;
      redirectToHomeUrl();
      return;
    }

    if (raw?.type === "GAME_STATES" && Array.isArray(raw.states)) {
      const seq = Number(raw.seq);
      const intervalMsRaw = Number(raw.intervalMs);
      const intervalMs = Number.isFinite(intervalMsRaw) ? intervalMsRaw : 250;
      playMpFrames(session, raw.states as GameState[], intervalMs, seq);
      return;
    }

    // フォールバック（start/restart等）
    if (raw?.type === "GAME_STATE" && raw.state) {
      mpAnimToken++;
      state = rotateToMe(raw.state as GameState, session.seatIndex);
      (state as any).__mpSeatOffset = session.seatIndex;
      (state as any).__mpIsHost = session.isHost;
      uiLocked = false;
      draw();
      return;
    }
  };

  session.ws.onclose = () => {
    mpAnimToken++;
    mpLastSeq = 0;
    mp = null;
    redirectToHomeUrl();
  };
}

let difficulty: Difficulty = "CASUAL";
let homeConfig: HomeConfig = {
  playerName: "プレイヤー",
  difficulty: "CASUAL",
  gameType: 100,
};

// ==============================
// 手番の時間制限（60秒）※MP中は無効
// ==============================
const TURN_LIMIT_SEC = 60;

let turnLimitKey = "";
let turnDeadlineMs = 0;
let turnTimeoutId: number | null = null;
let turnTickId: number | null = null;

function nowTurnKey(s: GameState) {
  return `${s.turn}|${s.history.length}`;
}

function limitColor(rem: number): string {
  if (rem >= 31) return "#22c55e";
  if (rem >= 11) return "#f59e0b";
  return "#ff4d6d";
}

function updateLimitDom() {
  const fill = document.querySelector<HTMLDivElement>("#limitFill");
  const secEl = document.querySelector<HTMLDivElement>("#limitSec");
  if (!fill || !secEl) return;

  if (!state || screen !== "GAME" || state.result.status !== "PLAYING" || mp) {
    fill.style.width = "0%";
    fill.style.background = "rgba(255,255,255,0.18)";
    secEl.textContent = "";
    return;
  }

  const rem = Math.max(0, Math.ceil((turnDeadlineMs - Date.now()) / 1000));
  const ratio = Math.max(0, Math.min(1, rem / TURN_LIMIT_SEC));
  const pct = `${Math.round(ratio * 100)}%`;

  const c = limitColor(rem);

  fill.style.width = pct;
  fill.style.background =
    c === "#22c55e"
      ? "rgba(34,197,94,0.65)"
      : c === "#f59e0b"
        ? "rgba(245,158,11,0.70)"
        : "rgba(255,77,109,0.65)";

  secEl.textContent = `${rem}s`;
  secEl.style.color = c;
  secEl.style.fontSize = rem <= 10 ? "16px" : "13px";
}

function stopTurnLimit() {
  if (turnTimeoutId != null) {
    window.clearTimeout(turnTimeoutId);
    turnTimeoutId = null;
  }
  if (turnTickId != null) {
    window.clearInterval(turnTickId);
    turnTickId = null;
  }
  turnLimitKey = "";
  turnDeadlineMs = 0;
  updateLimitDom();
}

function ensureTurnLimit() {
  if (mp) {
    stopTurnLimit();
    return;
  }

  if (!state || screen !== "GAME" || state.result.status !== "PLAYING") {
    stopTurnLimit();
    return;
  }

  const key = nowTurnKey(state);
  if (key !== turnLimitKey) {
    turnLimitKey = key;
    turnDeadlineMs = Date.now() + TURN_LIMIT_SEC * 1000;

    if (turnTickId == null) {
      turnTickId = window.setInterval(updateLimitDom, 200);
    }
    updateLimitDom();

    if (turnTimeoutId != null) window.clearTimeout(turnTimeoutId);
    const capturedKey = key;
    turnTimeoutId = window.setTimeout(() => {
      void forceTimeoutAction(capturedKey);
    }, TURN_LIMIT_SEC * 1000);
  } else {
    updateLimitDom();
  }
}

// ローカル用：安全最大ジョーカー
function pickAutoJokerValueNoBust(s: GameState): number {
  const total = s.total;
  const safeMax = s.mode === "UP" ? Math.min(49, (s.target - 1) - total) : Math.min(49, total - 1);
  if (safeMax < 1) return 1;
  return safeMax;
}

async function forceTimeoutAction(capturedKey: string) {
  if (!state) return;
  if (screen !== "GAME") return;
  if (mp) return;
  if (state.result.status !== "PLAYING") return;
  if (nowTurnKey(state) !== capturedKey) return;
  if (uiLocked) return;

  // 人間の番想定：DECKから強制で出す
  const seatIndex = state.turn;
  const top = state.deck[state.deck.length - 1];

  if (top) {
    let jokerValue: number | undefined;
    if (top.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(state);
    state = reducer(state, { type: "DRAW_PLAY", jokerValue });
  } else {
    const hand = state.seats[seatIndex].hand;
    if (hand.length === 0) return;
    const card = hand[0];
    let jokerValue: number | undefined;
    if (card.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(state);
    state = reducer(state, { type: "PLAY_HAND", handIndex: 0, jokerValue });
  }

  draw();
  await sleep(250);
  await runNpcTurnsAnimated();
  draw();
}

// ==============================
// ローカルゲーム処理
// ==============================
function startGame(cfg: HomeConfig) {
  mpAnimToken++;
  mpLastSeq = 0;
  mp = null;

  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  const name = (cfg.playerName || "").trim() || "プレイヤー";
  homeConfig = { ...cfg, playerName: name };
  difficulty = cfg.difficulty;

  state = createInitialState(name, cfg.gameType);
  screen = "GAME";
  draw();

  void runNpcTurnsAnimated();
}

function goHome() {
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  screen = "HOME";
  state = null;
  draw();
}

function restartGame() {
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  const name = (homeConfig.playerName || "").trim() || "プレイヤー";
  state = createInitialState(name, homeConfig.gameType);
  draw();

  void runNpcTurnsAnimated();
}

async function stepHumanPlayHandAsync(handIndex: number) {
  if (!state) return;
  if (uiLocked) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== 0) return;

  const card = state.seats[0].hand[handIndex];
  if (!card) return;

  let jokerValue: number | undefined;

  if (card.rank === "JOKER") {
    const keyBefore = nowTurnKey(state);
    const v = await pickJokerValue({
      mode: state.mode,
      total: state.total,
      allowCancel: true,
      target: state.target,
      isExtra: state.gameType === "EXTRA",
    });

    if (!state) return;
    if (nowTurnKey(state) !== keyBefore) return;
    if (v == null) return;

    jokerValue = v;
  }

  state = reducer(state, { type: "PLAY_HAND", handIndex, jokerValue });

  draw();
  await sleep(250);

  await runNpcTurnsAnimated();
  draw();
}

async function stepHumanDrawPlayAsync() {
  if (!state) return;
  if (uiLocked) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== 0) return;

  const peek = state.deck[state.deck.length - 1];
  let jokerValue: number | undefined;

  if (peek?.rank === "JOKER") {
    const keyBefore = nowTurnKey(state);
    const v = await pickJokerValue({
      mode: state.mode,
      total: state.total,
      allowCancel: false,
      target: state.target,
      isExtra: state.gameType === "EXTRA",
    });

    if (!state) return;
    if (nowTurnKey(state) !== keyBefore) return;
    if (v == null) return;

    jokerValue = v;
  }

  state = reducer(state, { type: "DRAW_PLAY", jokerValue });

  draw();
  await sleep(250);

  await runNpcTurnsAnimated();
  draw();
}

async function runNpcTurnsAnimated() {
  if (!state) return;
  const token = ++npcRunToken;

  if (state.turn === 0) return;

  uiLocked = true;
  draw();

  try {
    while (state && state.result.status === "PLAYING" && state.turn !== 0) {
      if (token !== npcRunToken) return;

      const action = chooseNpcAction(state, difficulty);

      if (action.type === "PLAY_HAND") {
        state = reducer(state, action as any);
      } else {
        state = reducer(state, action as any);
      }

      draw();
      await sleep(250);
    }
  } finally {
    uiLocked = false;
    draw();
  }
}

// ==============================
// MP操作（送信だけ）
// ==============================
async function mpPlayHandAsync(handIndex: number) {
  if (!mp || !state) return;
  if (uiLocked) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== 0) return;

  const card = state.seats[0].hand[handIndex];
  if (!card) return;

  let jokerValue: number | undefined;

  if (card.rank === "JOKER") {
    const keyBefore = nowTurnKey(state);
    const v = await pickJokerValue({
      mode: state.mode,
      total: state.total,
      allowCancel: true,
      target: state.target,
      isExtra: state.gameType === "EXTRA",
    });

    if (!state) return;
    if (nowTurnKey(state) !== keyBefore) return;
    if (v == null) return;

    jokerValue = v;
  }

  uiLocked = true;
  draw();
  mp.ws.send(JSON.stringify({ type: "PLAY_HAND", handIndex, jokerValue }));
}

async function mpDrawPlayAsync() {
  if (!mp || !state) return;
  if (uiLocked) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== 0) return;

  const peek = state.deck[state.deck.length - 1];
  let jokerValue: number | undefined;

  if (peek?.rank === "JOKER") {
    const keyBefore = nowTurnKey(state);
    const v = await pickJokerValue({
      mode: state.mode,
      total: state.total,
      allowCancel: false,
      target: state.target,
      isExtra: state.gameType === "EXTRA",
    });

    if (!state) return;
    if (nowTurnKey(state) !== keyBefore) return;
    if (v == null) return;

    jokerValue = v;
  }

  uiLocked = true;
  draw();
  mp.ws.send(JSON.stringify({ type: "DRAW_PLAY", jokerValue }));
}

// ==============================
// 描画
// ==============================
function draw() {
  if (screen === "HOME") {
    stopTurnLimit();

    renderHome(app, homeConfig, {
      onStart: (cfg) => startGame(cfg),
      onChange: (cfg) => {
        homeConfig = cfg;
        difficulty = cfg.difficulty;
      },
      onEnterMpGame: (p, initial) => {
        stopTurnLimit();
        npcRunToken++;
        uiLocked = false;

        mpAnimToken++;
        mpLastSeq = 0;

        mp = {
          roomId: p.roomId,
          seatIndex: p.seatIndex,
          isHost: p.isHost,
          npcDifficulty: p.npcDifficulty,
          ws: p.ws,
        };
        difficulty = p.npcDifficulty;

        state = rotateToMe(initial, p.seatIndex);
        (state as any).__mpSeatOffset = p.seatIndex;
        (state as any).__mpIsHost = p.isHost;

        screen = "GAME";
        attachMpWs(mp);
        draw();
      },
    });

    return;
  }

  if (!state) return;

  render(app, state, difficulty, uiLocked, {
    onPlayHand: (handIndex) => {
      if (mp) void mpPlayHandAsync(handIndex);
      else void stepHumanPlayHandAsync(handIndex);
    },
    onDrawPlay: () => {
      if (mp) void mpDrawPlayAsync();
      else void stepHumanDrawPlayAsync();
    },
    onRestart: () => {
      if (!mp) {
        restartGame();
        return;
      }
      if (mp.isHost) {
        mpAnimToken++;   // 再生停止
        mpLastSeq = 0;   // ★seqリセット
        uiLocked = false;
        mp.ws.send(JSON.stringify({ type: "HOST_RESTART" }));
      }
    },
    onGoHome: () => {
      if (!mp) {
        goHome();
        return;
      }

      try {
        mp.ws.send(JSON.stringify({ type: mp.isHost ? "HOST_DISBAND" : "LEAVE" }));
      } catch { }
      try {
        mp.ws.close();
      } catch { }

      mp = null;
      redirectToHomeUrl();
    },
  });

  ensureTurnLimit();
}

draw();