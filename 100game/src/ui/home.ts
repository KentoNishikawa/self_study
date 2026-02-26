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
    v.seats.length === 4
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

// アイコンプリセット（絵文字。画像に置き換える時はここを差し替え）
const ICON_PRESETS: Array<{ id: string; emoji: string; label: string }> = [
  { id: "host_default", emoji: "👑", label: "HOST" },
  { id: "player_default", emoji: "🙂", label: "PLAYER" },
  { id: "npc_default", emoji: "🤖", label: "NPC" },
  { id: "icon_01", emoji: "😀", label: "A" },
  { id: "icon_02", emoji: "😺", label: "B" },
  { id: "icon_03", emoji: "🐉", label: "C" },
];

const ICON_EMOJI = new Map(ICON_PRESETS.map((p) => [p.id, p.emoji] as const));
function iconEmoji(iconId: string) {
  return ICON_EMOJI.get(iconId) ?? "🙂";
}

function seatLabel(i: number) {
  if (i === 0) return "HOST";
  return `P${i}`;
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
      <h1 class="appTitle">100ゲーム</h1>
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
              ${escapeHtml(iconEmoji(localIconId))}
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
                           background:rgba(255,255,255,0.06);cursor:pointer;font-size:18px;">
                    ${escapeHtml(p.emoji)}
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

        <div id="roleHint" style="font-size:12px;opacity:0.8;"></div>
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

        <!-- 高さ固定：常にblock。非接続時は hidden -->
        <button id="leaveRoomBtn" class="btn" type="button"
          style="width:100%; display:block; visibility:hidden; pointer-events:none;">
          部屋から抜けてホームへ
        </button>
      </div>
    </div>

    <div class="panel">
      <div style="font-weight:950;margin-bottom:10px;">参加者一覧</div>
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

  const renderParticipants = (st: LobbyState | null) => {
    if (!st) {
      participantsEl.innerHTML = `<div style="opacity:0.75;">未接続</div>`;
      return;
    }

    participantsEl.innerHTML = st.seats
      .map((seat, i) => {
        const isMe = mySeatIndex === i;
        const border = isMe ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(255,255,255,0.16)";
        const bg = isMe ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;border:${border};border-radius:12px;background:${bg};">
            <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                        background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.12);font-size:16px;">
              ${escapeHtml(iconEmoji(seat.iconId))}
            </div>
            <div style="flex:1;font-weight:850;">${escapeHtml(seat.name)}</div>
            <div style="font-size:12px;opacity:0.75;">${escapeHtml(seatLabel(i))}</div>
          </div>
        `;
      })
      .join("");
  };

  const applyRole = () => {
    const isConnected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = isConnected && mySeatIndex === 0;

    // 接続中：名前/アイコンは全員OK、難易度/タイプ/開始はHOSTのみ
    diffEl.disabled = isConnected ? !isHost : false;
    gameTypeEl.disabled = isConnected ? !isHost : false;
    startBtn.disabled = isConnected ? !isHost : false;

    createRoomBtn.disabled = !!roomId;

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
      iconBtn.textContent = iconEmoji(iconId);
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
            seatIndex: mySeatIndex,
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
          iconBtn.textContent = iconEmoji(me.iconId);
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
            iconBtn.textContent = iconEmoji(me.iconId);
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
