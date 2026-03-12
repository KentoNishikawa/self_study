// src/ui/home.ts
import type { Difficulty, GameType, GameState } from "../core/types";

export type HomeConfig = {
  playerName: string;
  difficulty: Difficulty;
  gameType: GameType;
};

type LobbySeat = {
  kind: "HOST" | "PLAYER" | "NPC";
  name: string;
  iconId: string;
};

type LobbyState = {
  roomId: string;
  expiresAt: number;
  locked: boolean;
  npcDifficulty: Difficulty;
  gameType: string;
  seats: [LobbySeat, LobbySeat, LobbySeat, LobbySeat];
  playOrder: [number, number, number, number];
};

type WelcomeMsg = { type: "WELCOME"; seatIndex: number; state: LobbyState };
type RoomStateMsg = { type: "ROOM_STATE"; state: LobbyState };

function isLobbyState(v: any): v is LobbyState {
  return (
    v &&
    typeof v.roomId === "string" &&
    typeof v.expiresAt === "number" &&
    typeof v.locked === "boolean" &&
    typeof v.npcDifficulty === "string" &&
    typeof v.gameType === "string" &&
    Array.isArray(v.seats) &&
    v.seats.length === 4 &&
    Array.isArray(v.playOrder) &&
    v.playOrder.length === 4 &&
    v.playOrder.every((n: any) => Number.isInteger(n))
  );
}


function isWelcomeMsg(v: any): v is WelcomeMsg {
  return v && v.type === "WELCOME" && typeof v.seatIndex === "number" && isLobbyState(v.state);
}

function isRoomStateMsg(v: any): v is RoomStateMsg {
  return v && v.type === "ROOM_STATE" && isLobbyState(v.state);
}

function toWsBase(httpBase: string) {
  return httpBase.replace(/^http/i, "ws");
}

// アイコンプリセット（絵文字 or 画像）
const HOST_DEFAULT_SRC = new URL("../icons/01.男の子.png", import.meta.url).href;
const PLAYER_DEFAULT = new URL("../icons/02.女の子.png", import.meta.url).href;

type IconPreset = { id: string; label: string; emoji?: string; src?: string };

const ICON_PRESETS: IconPreset[] = [
  { id: "host_default", src: HOST_DEFAULT_SRC, emoji: "👑", label: "HOST" },
  { id: "player_default",src: PLAYER_DEFAULT,  emoji: "🙂", label: "PLAYER" },
  { id: "npc_default", emoji: "🤖", label: "NPC" },
  { id: "icon_01", emoji: "😀", label: "A" },
  { id: "icon_02", emoji: "😺", label: "B" },
  { id: "icon_03", emoji: "🐉", label: "C" },
];

const ICON_BY_ID = new Map(ICON_PRESETS.map((p) => [p.id, p] as const));

function iconHtml(iconId: string, sizePx: number) {
  const p = ICON_BY_ID.get(iconId) ?? ICON_BY_ID.get("player_default")!;
  if (p.src) {
    return `<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.label)}"
      style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;" />`;
  }
  return escapeHtml(p.emoji ?? "🙂");
}

function seatLabel(i: number) {
  if (i === 0) return "HOST";
  return `P${i}`;
}

function shortName(name: string) {
  const chars = Array.from(name);
  if (chars.length <= 6) return name;
  return chars.slice(0, 6).join("") + "…";
}

export function renderHome(
  app: HTMLDivElement,
  config: HomeConfig,
  handlers: {
    onStart: (cfg: HomeConfig) => void;
    onChange: (cfg: HomeConfig) => void;
    onEnterMpGame: (
      p: { ws: WebSocket; roomId: string; seatIndex: number; isHost: boolean; npcDifficulty: Difficulty },
      initial: GameState
    ) => void;
  }
) {
  const apiBase = (import.meta as any).env?.VITE_MP_API_BASE || "http://127.0.0.1:8787";
  const wsBase = toWsBase(String(apiBase));

  let roomId: string | null = new URLSearchParams(location.search).get("room");
  let mySeatIndex: number | null = null;
  let lobby: LobbyState | null = null;
  let ws: WebSocket | null = null;

  let reorderMode = false;
  let draftOrder: number[] = [];

  let pendingRedirect = false;
  const ICON_STORAGE_KEY = "100game.iconId";
  let localIconId = "player_default";
  try {
    localIconId = localStorage.getItem(ICON_STORAGE_KEY) ?? "player_default";
  } catch { }


  const redirectToHome = () => {
    // ルーム情報を消して、ソロHOMEへ（再生成を必ず押させる方針）
    if (roomId) {
      sessionStorage.removeItem(`hostToken:${roomId}`);
    }
    const next = location.origin + location.pathname + (location.hash ?? "");
    // ここで確実に“戻った後”の表示を走らせたいので、replaceで遷移
    location.replace(next);
  };

  const flashAndRedirectHome = (message: string) => {
    sessionStorage.setItem("mp_notice", message);
    redirectToHome();
  };

  const leaveOrDisbandAndRedirect = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || mySeatIndex == null) {
      redirectToHome();
      return;
    }

    pendingRedirect = true;

    ws.send(JSON.stringify({ type: mySeatIndex === 0 ? "HOST_DISBAND" : "LEAVE" }));

    setTimeout(() => {
      try {
        ws?.close();
      } catch { }
    }, 50);
  };

  const targetLabel = config.gameType === "EXTRA" ? "???" : String(config.gameType);

  app.innerHTML = `
    <header class="appHeader">
      <h1 class="appTitle">100GAME⁺</h1>
      <div class="appTag">HOME</div>
    </header>

    <!-- 通知モーダル（満員など） -->
    <div id="mpNotice" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.60);align-items:center;justify-content:center;">
      <div style="width:calc(100% - 40px);max-width:520px;border:1px solid rgba(255,255,255,0.18);
                  background:rgba(12,12,12,0.96);border-radius:16px;padding:16px;color:rgba(255,255,255,0.92);">
        <div style="font-weight:950;margin-bottom:8px;">入室できませんでした</div>
        <div id="mpNoticeText" style="font-weight:800;line-height:1.7;"></div>
        <button id="mpNoticeOk" class="btn" type="button" style="width:100%;margin-top:12px;">OK</button>
      </div>
    </div>

    <div class="panel">
      <div style="font-weight:950;margin-bottom:10px;">ゲーム設定</div>

      <div style="display:grid;gap:12px;">
        <div style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">プレイヤー</span>

          <div id="profileRow" style="display:flex;gap:10px;align-items:center;position:relative;">
            <button id="iconBtn" type="button"
              style="width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);
                     background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;
                     font-size:18px;cursor:pointer;">
              ${iconHtml(localIconId, 44)}
            </button>

            <div id="iconPicker"
              style="display:none;position:absolute;left:0;top:52px;z-index:50;
                     padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);
                     background:rgba(10,10,10,0.98);box-shadow:0 8px 30px rgba(0,0,0,0.45);">
              <div style="display:grid;grid-template-columns:repeat(6, 44px);gap:8px;">
                ${ICON_PRESETS.map((p) => `
                  <button type="button" class="iconOpt" data-icon="${escapeHtml(p.id)}"
                    title="${escapeHtml(p.label)}"
                    style="width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);
                           background:rgba(255,255,255,0.06);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">
                    ${iconHtml(p.id, 44)}
                  </button>
                `).join("")}
              </div>
            </div>

            <input id="playerName" class="input" style="flex:1;" value="${escapeHtml(config.playerName)}" />
          </div>

          <div style="font-size:12px;opacity:0.75;">※入力中は即時反映 / 確定（フォーカス外れ）で空欄補正</div>
        </div>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">NPC難易度</span>
          <select id="difficulty" class="select">
            <option value="CASUAL">CASUAL</option>
            <option value="SMART">SMART</option>
          </select>
        </label>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">ゲームタイプ（上限値）</span>
          <select id="gameType" class="select">
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="EXTRA">EXTRA</option>
          </select>
        </label>

        <details class="details">
          <summary>ルール要点</summary>
          <div style="margin-top:8px;color:rgba(255,255,255,0.8);line-height:1.7;">
            <div>・順番にカードを出し、合計が <b>${escapeHtml(targetLabel)}以上</b> で負け（加算時）</div>
            <div>・J/Q/Kは10、Aは1</div>
            <div>・ジョーカーは1〜49（宣言）</div>
            <div>・ジョーカー直後に♠3でジョーカーを0化、♠3も0</div>
            <div>・Jは +10 → 負けてなければ加算/減算を反転</div>
            <div>・<b>上限値が200以上</b> の場合、山札が尽きて誰かの手札が0になった瞬間に「再配布」</div>
            <div>・再配布できるカードが無い場合は無効試合</div>
          </div>
        </details>

        <button id="startBtn" class="btn" style="width:100%;font-weight:950;">
          ゲーム開始
        </button>

        <!-- 高さ固定：接続状態の文言が変わっても折り返して高さが変動しないようにする -->
        <div id="roleHint" style="font-size:12px;opacity:0.8;min-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      </div>
    </div>

    <div class="panel">
      <div style="font-weight:950;margin-bottom:10px;">マルチプレイ</div>

      <div style="display:grid;gap:10px;">
        <button id="createRoomBtn" class="btn" type="button" style="width:100%;">
          招待用URL生成（HOST）
        </button>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">招待URL</span>
          <div style="display:flex;gap:8px;">
            <input id="inviteUrl" class="input" readonly value="" />
            <button id="copyInviteBtn" class="btn" type="button" style="white-space:nowrap;">コピー</button>
          </div>
        </label>

        <div id="connStatus" style="display:none;"></div>

        <!-- 高さ固定：招待URL生成前後でDOMが増減して下の参加者一覧がズレないようにする -->
        <button id="leaveRoomBtn" class="btn" type="button"
          style="width:100%; display:block; min-height:40px; visibility:hidden; pointer-events:none;">
          部屋から抜けてホームへ
        </button>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;min-height:40px;">
        <div style="font-weight:950;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">参加者一覧</div>
        <!-- ボタン分の空間を最初から確保（ボタン自体は必要な時だけ描画） -->
        <div id="reorderSlot" style="width:clamp(130px, 40vw, 190px);min-height:40px;display:flex;align-items:center;justify-content:flex-end;"></div>
      </div>
      <div id="reorderHint" style="display:none;text-align:center;font-weight:950;opacity:0.88;margin:-2px 0 10px 0;line-height:1.25;"></div>
      <div id="participants" style="display:grid;gap:8px;"></div>
    </div>

    <div id="joinFailModal"style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;">
      <div style="width:calc(100% - 40px);max-width:520px;border:1px solid rgba(255,255,255,0.18);background:rgba(12,12,12,0.96);border-radius:16px;padding:16px;">
        <div id="joinFailText" style="font-weight:900;line-height:1.7;"></div>
        <button id="joinFailOk" class="btn" type="button" style="width:100%;margin-top:12px;">OK</button>
      </div>
    </div>
  `;

  // --- notice modal ---
  const mpNotice = app.querySelector<HTMLDivElement>("#mpNotice")!;
  const mpNoticeText = app.querySelector<HTMLDivElement>("#mpNoticeText")!;
  const mpNoticeOk = app.querySelector<HTMLButtonElement>("#mpNoticeOk")!;
  const notice = sessionStorage.getItem("mp_notice");
  if (notice) {
    sessionStorage.removeItem("mp_notice");
    mpNoticeText.textContent = notice;
    // 描画後に表示（環境差で見えないのを避ける）
    setTimeout(() => {
      mpNotice.style.display = "flex";
    }, 0);
  }
  mpNoticeOk.onclick = () => {
    mpNotice.style.display = "none";
  };
  mpNotice.addEventListener("click", (e) => {
    if (e.target === mpNotice) mpNotice.style.display = "none";
  });

  // --- elements ---
  const profileRow = app.querySelector<HTMLDivElement>("#profileRow")!;
  const iconBtn = app.querySelector<HTMLButtonElement>("#iconBtn")!;
  const iconPicker = app.querySelector<HTMLDivElement>("#iconPicker")!;
  const iconOptButtons = Array.from(app.querySelectorAll<HTMLButtonElement>(".iconOpt"));

  const nameEl = app.querySelector<HTMLInputElement>("#playerName")!;
  const diffEl = app.querySelector<HTMLSelectElement>("#difficulty")!;
  const gameTypeEl = app.querySelector<HTMLSelectElement>("#gameType")!;
  const startBtn = app.querySelector<HTMLButtonElement>("#startBtn")!;
  const roleHintEl = app.querySelector<HTMLDivElement>("#roleHint")!;

  const createRoomBtn = app.querySelector<HTMLButtonElement>("#createRoomBtn")!;
  const inviteUrlEl = app.querySelector<HTMLInputElement>("#inviteUrl")!;
  const copyInviteBtn = app.querySelector<HTMLButtonElement>("#copyInviteBtn")!;
  const participantsEl = app.querySelector<HTMLDivElement>("#participants")!;
  const reorderSlotEl = app.querySelector<HTMLDivElement>("#reorderSlot")!;
  const reorderHintEl = app.querySelector<HTMLDivElement>("#reorderHint")!;

  let reorderBtn: HTMLButtonElement | null = null;
  const connStatusEl = app.querySelector<HTMLDivElement>("#connStatus")!;
  const leaveRoomBtn = app.querySelector<HTMLButtonElement>("#leaveRoomBtn")!;

  const joinFailModal = app.querySelector<HTMLDivElement>("#joinFailModal")!;
  const joinFailText = app.querySelector<HTMLDivElement>("#joinFailText")!;
  const joinFailOk = app.querySelector<HTMLButtonElement>("#joinFailOk")!;

  diffEl.value = config.difficulty;
  gameTypeEl.value = String(config.gameType);

  const showJoinFailAndReturnHome = (message: string) => {
    joinFailText.textContent = message;
    joinFailModal.style.display = "flex";
    joinFailOk.onclick = () => {
      joinFailModal.style.display = "none";
      redirectToHome(); // 既存の関数（?room=消してソロHOMEに戻す）
    };
  };

  const parseGameType = (v: string): GameType => {
    if (v === "EXTRA") return "EXTRA";
    const n = Number(v);
    if (n === 100 || n === 200 || n === 300 || n === 400 || n === 500) return n;
    return 100;
  };

  // 非表示だけどログ用
  const setStatus = (s: string) => {
    connStatusEl.textContent = s;
  };


  const CIRCLED = ["①", "②", "③", "④"] as const;

  const normalizePlayOrder = (st: LobbyState) => {
    const po = (st as any).playOrder;
    if (!Array.isArray(po) || po.length !== 4) return [0, 1, 2, 3];
    const nums = po.map((n: any) => Number(n));
    const ok = nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 3);
    if (!ok) return [0, 1, 2, 3];
    const uniq = new Set(nums);
    if (uniq.size !== 4) return [0, 1, 2, 3];
    return nums as [number, number, number, number];
  };

  const renderParticipants = (st: LobbyState | null) => {
    if (!st) {
      participantsEl.innerHTML = `<div style="opacity:0.75;">未接続</div>`;
      return;
    }

    const order = normalizePlayOrder(st);
    const isHost = mySeatIndex === 0;
    const canPick = reorderMode && isHost && !st.locked;

    participantsEl.innerHTML = order
      .map((seatIndex) => {
        const seat = st.seats[seatIndex];
        const isMe = mySeatIndex === seatIndex;
        const border = isMe ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(255,255,255,0.16)";
        const bg = isMe ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        const cursor = canPick ? "pointer" : "default";

        const pickedAt = draftOrder.indexOf(seatIndex);
        const orderBadge = canPick && pickedAt >= 0
          ? `<span style="margin-left:6px;font-weight:950;">${CIRCLED[pickedAt] ?? ""}</span>`
          : "";

        return `
          <div data-seat-index="${seatIndex}" style="display:flex;align-items:center;gap:10px;padding:10px;border:${border};border-radius:12px;background:${bg};cursor:${cursor};">
            <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                        background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.12);font-size:16px;">
              ${iconHtml(seat.iconId, 18)}
            </div>
            <div style="flex:1;font-weight:850;display:flex;align-items:center;gap:6px;">
              <span>${escapeHtml(shortName(seat.name))}</span>
              ${orderBadge}
            </div>
            <div style="font-size:12px;opacity:0.75;">${escapeHtml(seatLabel(seatIndex))}</div>
          </div>
        `;
      })
      .join("");

    if (!canPick) return;

    const rows = Array.from(participantsEl.querySelectorAll<HTMLDivElement>("[data-seat-index]"));
    rows.forEach((row) => {
      row.onclick = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!lobby) return;
        if (mySeatIndex !== 0) return;
        if (lobby.locked) return;

        const seatIndex = Number((row as any).dataset.seatIndex);
        if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 3) return;
        if (draftOrder.includes(seatIndex)) return; // 2回押しは無視

        draftOrder = [...draftOrder, seatIndex];

        if (draftOrder.length >= 4) {
          const po = draftOrder.slice(0, 4) as [number, number, number, number];

          // 4人目で即確定：先にローカル反映してから同期
          (lobby as any).playOrder = po;
          try {
            ws.send(JSON.stringify({ type: "HOST_SET_PLAY_ORDER", playOrder: po }));
          } catch { }

          reorderMode = false;
          draftOrder = [];
        }

        renderParticipants(lobby);
        applyRole();
      };
    });
  };


  const applyRole = () => {
    const isConnected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = isConnected && mySeatIndex === 0;

    // 接続中：名前/アイコンは全員OK、難易度/タイプ/開始はHOSTのみ
    diffEl.disabled = isConnected ? !isHost : false;
    gameTypeEl.disabled = isConnected ? !isHost : false;
    startBtn.disabled = isConnected ? !isHost : false;

    createRoomBtn.disabled = !!roomId;
    // 入れ替えボタン（HOSTのみ・開始前のみ）
    const canReorder = isConnected && isHost && !lobby?.locked;
    // ボタン分の空間は常に確保（ボタン自体は必要な時だけ描画）
    ensureReorderButton(!!canReorder);

    if (!canReorder) {
      reorderMode = false;
      draftOrder = [];
    }

    // 退出/解散ボタン（接続中のみ表示：高さ固定）
    if (isConnected) {
      leaveRoomBtn.style.visibility = "visible";
      leaveRoomBtn.style.pointerEvents = "auto";
      leaveRoomBtn.textContent = isHost ? "部屋を解散してホームへ" : "部屋から抜けてホームへ";
    } else {
      leaveRoomBtn.style.visibility = "hidden";
      leaveRoomBtn.style.pointerEvents = "none";
      leaveRoomBtn.textContent = "部屋から抜けてホームへ";
    }

    updateReorderHint();

    roleHintEl.textContent = !isConnected
      ? "ローカルプレイ（マルチ未接続）"
      : isHost
        ? "HOSTとして接続中（難易度/タイプ/開始が操作可能）"
        : "参加者として接続中（名前/アイコンのみ変更可能）";
  };

  const updateConfigLocal = () => {
    handlers.onChange({
      playerName: nameEl.value,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    });
  };

  // ---- icon picker ----
  let pickerOpen = false;
  const openPicker = () => {
    pickerOpen = true;
    iconPicker.style.display = "block";
  };
  const closePicker = () => {
    pickerOpen = false;
    iconPicker.style.display = "none";
  };

  iconBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    pickerOpen ? closePicker() : openPicker();
  });

  iconOptButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const iconId = btn.dataset.icon || "player_default";

      localIconId = iconId;
      try {
        localStorage.setItem(ICON_STORAGE_KEY, iconId);
      } catch { }
      iconBtn.innerHTML = iconHtml(iconId, 44);
      closePicker();

      if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
        ws.send(JSON.stringify({ type: "UPDATE_ICON", iconId }));
      }
    });
  });

  app.addEventListener("click", () => closePicker());
  profileRow.addEventListener("click", (e) => e.stopPropagation());

  const connectWs = (rid: string) => {
    try {
      ws?.close();
    } catch { }

    const token = sessionStorage.getItem(`hostToken:${rid}`) ?? "";
    const wsUrl = token
      ? `${wsBase}/api/rooms/${rid}/ws?token=${encodeURIComponent(token)}`
      : `${wsBase}/api/rooms/${rid}/ws`;

    setStatus("connecting");
    ws = new WebSocket(wsUrl);

    ws.onmessage = (ev) => {
      let raw: any;
      try {
        raw = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      if (raw && raw.type === "ROOM_DISBANDED") {
        redirectToHome();
        return;
      }

      // GAME_STATE / GAME_STATES が来たら main.ts に引き渡して遷移
      if ((raw?.type === "GAME_STATE" && raw.state) || (raw?.type === "GAME_STATES" && Array.isArray(raw.states))) {
        if (!ws || mySeatIndex == null || !roomId) return;

        const initial: GameState =
          raw.type === "GAME_STATE" ? (raw.state as GameState) : (raw.states[0] as GameState);

        handlers.onEnterMpGame(
          {
            ws,
            roomId,
            seatIndex: (() => {
              const po = lobby ? normalizePlayOrder(lobby) : ([0, 1, 2, 3] as [number, number, number, number]);
              const idx = po.indexOf(mySeatIndex);
              return idx >= 0 ? idx : mySeatIndex;
            })(),
            isHost: mySeatIndex === 0,
            npcDifficulty: (lobby?.npcDifficulty ?? diffEl.value) as Difficulty,
          },
          initial
        );
        return;
      }

      if (isWelcomeMsg(raw)) {
        mySeatIndex = raw.seatIndex;
        lobby = raw.state;

        const me = lobby.seats[mySeatIndex];
        if (me) {
          localIconId = me.iconId;
          iconBtn.innerHTML = iconHtml(me.iconId, 44);
          if (document.activeElement !== nameEl) nameEl.value = me.name;
        }

        diffEl.value = lobby.npcDifficulty;
        gameTypeEl.value = lobby.gameType;

        inviteUrlEl.value = `${location.origin}?room=${lobby.roomId}`;

        renderParticipants(lobby);
        applyRole();
        return;
      }

      if (isRoomStateMsg(raw)) {
        lobby = raw.state;

        diffEl.value = lobby.npcDifficulty;
        gameTypeEl.value = lobby.gameType;

        if (mySeatIndex != null) {
          const me = lobby.seats[mySeatIndex];
          if (me) {
            localIconId = me.iconId;
            iconBtn.innerHTML = iconHtml(me.iconId, 44);
            if (document.activeElement !== nameEl) nameEl.value = me.name;
          }
        }

        inviteUrlEl.value = `${location.origin}?room=${lobby.roomId}`;
        renderParticipants(lobby);
        applyRole();
        return;
      }
    };

    ws.onclose = () => {
      lobby = null;
      mySeatIndex = null;
      reorderMode = false;
      draftOrder = [];
      renderParticipants(null);
      applyRole();

      if (pendingRedirect) {
        pendingRedirect = false;
        redirectToHome();
      }
    };

    ws.onerror = () => setStatus("ws error");
  };

  async function preflightAndJoin(rid: string) {
    try {
      const res = await fetch(`${apiBase}/api/rooms/${rid}/state`, { method: "GET" });
      if (!res.ok) {
        showJoinFailAndReturnHome("roomが見つからないため入室できませんでした。ホーム画面に戻ります");
        return;
      }

      if (res.status === 410) {
        showJoinFailAndReturnHome("HOSTが部屋を解散しました。ホーム画面に戻ります。");
        return;
      }

      const st = (await res.json()) as LobbyState;

      if (Date.now() > st.expiresAt) {
        showJoinFailAndReturnHome("招待URLの期限が切れているため入室できませんでした。ホーム画面に戻ります");
        return;
      }

      if (st.locked) {
        showJoinFailAndReturnHome("ゲームが開始済みのため入室できませんでした。ホーム画面に戻ります");
        return;
      }

      const full = st.seats.slice(1).every((s) => s.kind !== "NPC");
      if (full) {
        showJoinFailAndReturnHome("roomが満員のため入室できませんでした。ホーム画面に戻ります");
        return;
      }

      inviteUrlEl.value = `${location.origin}?room=${rid}`;
      connectWs(rid);
    } catch {
      flashAndRedirectHome("入室できませんでした。ホーム画面に戻ります");
      return;
    }
  }

  // ---- events ----
  nameEl.oninput = () => {
    updateConfigLocal();
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
      ws.send(JSON.stringify({ type: "UPDATE_NAME", name: nameEl.value }));
    }
  };

  nameEl.onblur = () => {
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
      ws.send(JSON.stringify({ type: "COMMIT_NAME", name: nameEl.value }));
    }
  };

  diffEl.onchange = () => {
    updateConfigLocal();
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex === 0) {
      ws.send(
        JSON.stringify({
          type: "HOST_SET_CONFIG",
          npcDifficulty: diffEl.value,
          gameType: gameTypeEl.value,
        })
      );
    }
  };

  gameTypeEl.onchange = () => {
    updateConfigLocal();
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex === 0) {
      ws.send(
        JSON.stringify({
          type: "HOST_SET_CONFIG",
          npcDifficulty: diffEl.value,
          gameType: gameTypeEl.value,
        })
      );
    }
  };

  startBtn.onclick = () => {
    const cfg: HomeConfig = {
      playerName: nameEl.value,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    };

    const isConnected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = isConnected && mySeatIndex === 0;

    if (!isConnected) {
      handlers.onStart(cfg);
      return;
    }
    if (isHost) {
      ws!.send(JSON.stringify({ type: "HOST_START" }));
    }
  };

  createRoomBtn.onclick = async () => {
    try {
      const res = await fetch(`${apiBase}/api/rooms`, { method: "POST" });
      const data = await res.json();

      const rid = String(data.roomId);
      roomId = rid;
      sessionStorage.setItem(`hostToken:${rid}`, String(data.hostToken));

      const next = new URL(location.href);
      next.searchParams.set("room", rid);
      history.replaceState(null, "", next.toString());

      inviteUrlEl.value = `${location.origin}?room=${rid}`;
      connectWs(rid);
    } catch (e) {
      setStatus(String(e));
    }
  };

  copyInviteBtn.onclick = async () => {
    const text = inviteUrlEl.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 失敗してもUIは変えない
    }
  };

  leaveRoomBtn.onclick = () => leaveOrDisbandAndRedirect();

  const isMobile = () => window.matchMedia("(max-width: 520px)").matches;

  const updateReorderHint = () => {
    const connected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = connected && mySeatIndex === 0;

    // 高さ固定：入れ替えモードの開始/終了で参加者一覧の位置がズレないように、
    // 「表示する可能性がある状況」では常にヒント枠の空間を確保する。
    const shouldReserve = connected && isHost && !lobby?.locked;
    const canShow = shouldReserve && reorderMode;

    if (!shouldReserve) {
      reorderHintEl.style.display = "none";
      reorderHintEl.style.visibility = "hidden";
      reorderHintEl.textContent = "";
      reorderHintEl.innerHTML = "";
      return;
    }

    // まず空間を確保（スマホは2行分）
    reorderHintEl.style.display = "flex";
    reorderHintEl.style.flexDirection = "column";
    reorderHintEl.style.alignItems = "center";
    reorderHintEl.style.justifyContent = "center";
    reorderHintEl.style.minHeight = isMobile() ? "44px" : "24px";
    reorderHintEl.style.visibility = canShow ? "visible" : "hidden";

    if (!canShow) {
      // 空枠（高さだけ確保）
      reorderHintEl.innerHTML = isMobile() ? `<div>&nbsp;</div><div>&nbsp;</div>` : `&nbsp;`;
      return;
    }

    const nextNum = Math.min(4, draftOrder.length + 1);
    if (isMobile()) {
      reorderHintEl.innerHTML = `<div>${nextNum}番目を</div><div>選択してください</div>`;
    } else {
      reorderHintEl.textContent = `${nextNum}番目を選択してください`;
    }
  };

  const ensureReorderButton = (canReorder: boolean) => {
    if (!canReorder) {
      if (reorderBtn?.parentElement) reorderBtn.parentElement.removeChild(reorderBtn);
      reorderBtn = null;
      return;
    }

    if (!reorderBtn) {
      const btn = document.createElement("button");
      btn.id = "reorderBtn";
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "順番を入れ替える";
      btn.style.width = "auto";
      btn.style.padding = "8px 10px";
      btn.style.fontWeight = "900";
      btn.style.whiteSpace = "nowrap";
      btn.onclick = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!lobby) return;
        if (mySeatIndex !== 0) return;
        if (lobby.locked) return;

        // 押すたびにやり直し（仕様）
        reorderMode = true;
        draftOrder = [];
        renderParticipants(lobby);
        applyRole();
      };
      reorderBtn = btn;
    }

    if (reorderBtn.parentElement !== reorderSlotEl) {
      reorderSlotEl.innerHTML = "";
      reorderSlotEl.appendChild(reorderBtn);
    }

    reorderBtn.disabled = false;
  };


  if (roomId) {
    preflightAndJoin(roomId);
  } else {
    renderParticipants(null);
    applyRole();
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
