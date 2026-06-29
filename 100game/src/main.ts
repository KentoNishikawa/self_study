// 100game/src/main.ts
import "./style.css";
import type { Difficulty, GameState } from "./core/types";
import { createInitialState } from "./core/game";
import { reducer } from "./core/reducer";
import { chooseNpcAction } from "./ai/npc";
import { renderHome, type HomeConfig } from "./ui/home";
import { renderTitle } from "./ui/title";
import { AuthApiError, clearAuthSession, logoutAuthSession, requireActiveAuthSession, saveAuthSession } from "./core/authSession";
import { clearUserSettingsCache, getUserPlayerName, loadUserSettingsFromApi } from "./core/userSettings";
import { loadUserCollectionsFromApi, resetUserCollectionsCache } from "./core/userCollections";
import { getPendingIconAwardNotification, getPendingTitleAwardNotification, loadUserNotificationsFromApi, markPendingIconNotificationsRead, markPendingTitleNotificationsRead, resetUserNotificationsCache } from "./core/userNotifications";
import { getSelectedUserTitleName, renderUserHome } from "./ui/userHome";
import { createMatchTelemetry, recordTimeoutDeckPlay, saveCompletedSoloMatch, updateMatchTelemetryFromState, type MatchTelemetry } from "./core/matchHistory";
import { renderMpGate } from "./ui/mpGate";
import { createLoadingConfig, renderLoading, type LoadingScreenConfig } from "./ui/loading";
import { loadAuthenticatedLoadingImagePath } from "./core/loadingIllustrations";
import { GAME_START_OVERLAY_FADE_MS, GAME_START_OVERLAY_HOLD_MS, render, resetRenderTransientState } from "./ui/render";
import { pickJokerValue } from "./ui/jokerPicker";

type Screen = "TITLE" | "MP_GATE" | "LOADING" | "USER_HOME" | "HOME" | "GAME";

const FORCE_HOME_SCREEN_KEY = "100game.forceHomeScreen";
function consumeForceHomeScreen(): boolean {
  try {
    if (sessionStorage.getItem(FORCE_HOME_SCREEN_KEY) !== "1") return false;
    sessionStorage.removeItem(FORCE_HOME_SCREEN_KEY);
    return true;
  } catch {
    return false;
  }
}

const initialRoomId = new URLSearchParams(location.search).get("room");
const hasInitialRoom = !!initialRoomId;
const hasInitialHostToken = (() => {
  if (!initialRoomId) return false;
  try {
    return !!sessionStorage.getItem(`hostToken:${initialRoomId}`);
  } catch {
    return false;
  }
})();
const forceInitialHome = consumeForceHomeScreen();
let screen: Screen = forceInitialHome || (hasInitialRoom && hasInitialHostToken) ? "HOME" : hasInitialRoom ? "MP_GATE" : "TITLE";
let state: GameState | null = null;
let loadingConfig: LoadingScreenConfig | null = null;
let loadingTargetScreen: "USER_HOME" | "HOME" | null = null;
let loadingTimerId: number | null = null;
let isGuestSession = false;
let matchTelemetry: MatchTelemetry | null = null;
let savingMatchId: string | null = null;

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
let mpPendingHostDisbandNotice = false;

const HOST_DISBANDED_NOTICE = {
  message: "HOSTが部屋を解散したため、ホーム画面に戻りました。",
} as const;

const HOST_REDIRECT_NOTICE = {
  title: "",
  message: "マルチプレイを終了しました。ホーム画面へ戻ります。",
} as const;

function leaveMpAfterRoomDisband(session?: MpSession | null) {
  if (session?.isHost) {
    leaveMpToHome(session);
    return;
  }
  leaveMpToHome(session, HOST_DISBANDED_NOTICE);
}

function stashNoticeForNextHomeRender(notice: { title?: string; message: string }) {
  if (!notice?.message) return;
  try {
    sessionStorage.setItem("mp_notice", notice.message);
    if (notice.title !== undefined) sessionStorage.setItem("mp_notice_title", notice.title);
    else sessionStorage.removeItem("mp_notice_title");
  } catch { }
}

const MP_API_BASE = String((import.meta as any).env?.VITE_MP_API_BASE || "http://127.0.0.1:8787");
const TITLE_LOADING_MIN_MS = 4000;
const TITLE_LOADING_MAX_MS = 5500;

function pickTitleLoadingDelayMs(): number {
  return Math.floor(Math.random() * (TITLE_LOADING_MAX_MS - TITLE_LOADING_MIN_MS + 1)) + TITLE_LOADING_MIN_MS;
}

function clearTitleLoadingTimer() {
  if (loadingTimerId != null) {
    window.clearTimeout(loadingTimerId);
    loadingTimerId = null;
  }
}

function startTitleLoading(mode: "AUTHENTICATED" | "GUEST", targetScreen: "USER_HOME" | "HOME") {
  clearTitleLoadingTimer();
  stopTurnLimit();

  isGuestSession = mode === "GUEST";
  loadingConfig = createLoadingConfig(mode);
  loadingTargetScreen = targetScreen;
  screen = "LOADING";
  draw();

  if (mode === "AUTHENTICATED") {
    void loadAuthenticatedLoadingImagePath()
      .then((imagePath) => {
        if (!imagePath || screen !== "LOADING" || loadingTargetScreen !== targetScreen || !loadingConfig) return;
        loadingConfig = { ...loadingConfig, imagePath };
        draw();
      })
      .catch(() => { });
  }

  loadingTimerId = window.setTimeout(() => {
    loadingTimerId = null;
    if (screen !== "LOADING") return;

    const nextScreen = loadingTargetScreen ?? "HOME";
    const showNextScreen = () => {
      loadingConfig = null;
      loadingTargetScreen = null;
      screen = nextScreen;
      draw();
    };

    if (mode === "AUTHENTICATED") {
      void requireActiveAuthSession()
        .then(() => (nextScreen === "USER_HOME" ? refreshUserHomeData() : undefined))
        .then(showNextScreen)
        .catch(handleAuthGuardFailure);
      return;
    }

    showNextScreen();
  }, pickTitleLoadingDelayMs());
}

function refreshUserHomeData() {
  return loadUserSettingsFromApi()
    .then(() => loadUserCollectionsFromApi())
    .then(() => loadUserNotificationsFromApi());
}

function refreshUserHomeDataAndRedraw() {
  void refreshUserHomeData()
    .then(() => {
      if (screen === "USER_HOME") draw();
    })
    .catch(() => { });
}

function clearAuthenticatedClientState() {
  clearAuthSession();
  clearUserSettingsCache();
  resetUserCollectionsCache();
  resetUserNotificationsCache();
  isGuestSession = false;
}

function handleAuthGuardFailure(error: unknown) {
  const message = error instanceof AuthApiError ? error.message : "ログイン状態を確認できませんでした。もう一度ログインしてください。";
  clearTitleLoadingTimer();
  stopTurnLimit();
  clearAuthenticatedClientState();
  loadingConfig = null;
  loadingTargetScreen = null;
  mp = null;
  stopMpDisbandWatch();
  state = null;
  matchTelemetry = null;
  savingMatchId = null;
  screen = "TITLE";
  draw();
  window.setTimeout(() => window.alert(message), 0);
}

function runAuthenticatedAction(action: () => void | Promise<void>) {
  void requireActiveAuthSession()
    .then(action)
    .catch(handleAuthGuardFailure);
}

function startAuthenticatedLoadingToUserHome() {
  refreshUserHomeDataAndRedraw();
  startTitleLoading("AUTHENTICATED", "USER_HOME");
}

async function startTitleLoadingToUserHome() {
  await requireActiveAuthSession();
  startAuthenticatedLoadingToUserHome();
}

function startTitleLoadingToGuestGameSettings() {
  resetUserCollectionsCache();
  resetUserNotificationsCache();
  startTitleLoading("GUEST", "HOME");
}

function cancelMpGateToTitle() {
  clearTitleLoadingTimer();
  isGuestSession = false;
  loadingConfig = null;
  loadingTargetScreen = null;
  screen = "TITLE";
  try {
    const next = location.pathname + (location.hash ?? "");
    history.replaceState(null, "", next);
  } catch { }
  draw();
}


// ソロ時にホームで選んだアイコンを引き継ぐ
let soloIconId = "player_default";

function getSelectedHomeIconId(): string {
  // 1) sessionStorage に入っていればそれを優先（将来拡張用）
  const s = sessionStorage.getItem("solo_iconId") || sessionStorage.getItem("selectedIconId");
  if (s && typeof s === "string") return s;

  // 2) HOMEのアイコンボタン（実装に依存するが id=iconBtn を優先）
  const btn = document.querySelector<HTMLButtonElement>("#iconBtn");
  const data = (btn as any)?.dataset;
  const d = data?.iconId || data?.icon;
  if (typeof d === "string" && d) return d;

  // 3) 旧実装: select から拾う
  const sel = document.querySelector<HTMLSelectElement>("#iconSelect");
  if (sel?.value) return sel.value;

  // 4) 最後の手段: ボタンの絵文字から推定
  const emoji = (btn?.textContent ?? "").trim();
  const map: Record<string, string> = {
    "👑": "host_default",
    "🙂": "player_default",
    "🤖": "npc_default",
    "😀": "icon_01",
    "😺": "icon_02",
    "🐉": "icon_03",
  };
  if (emoji && map[emoji]) return map[emoji];

  return "player_default";
}


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

function leaveMpToHome(session?: MpSession | null, notice?: { title?: string; message: string } | null) {
  npcRunToken++;
  mpAnimToken++;
  mpLastSeq = 0;
  uiLocked = false;
  stopTurnLimit();
  mpPendingHostDisbandNotice = false;
  stopMpDisbandWatch();

  if (notice?.message) {
    stashNoticeForNextHomeRender(notice);
  }

  const active = session ?? mp;
  if (active) {
    try {
      active.ws.onmessage = null;
      active.ws.onclose = null;
    } catch { }
    try {
      if (active.ws.readyState === WebSocket.OPEN || active.ws.readyState === WebSocket.CONNECTING) {
        active.ws.close();
      }
    } catch { }
  }

  mp = null;
  isGuestSession = false;
  resetRenderTransientState();
  screen = "HOME";
  state = null;
  matchTelemetry = null;
  savingMatchId = null;
  draw();

  try {
    const next = location.pathname + (location.hash ?? "");
    history.replaceState(null, "", next);
  } catch { }
}

window.addEventListener("pagehide", () => {
  if (screen !== "GAME") return;
  if (!mp?.isHost) return;
  stashNoticeForNextHomeRender(HOST_REDIRECT_NOTICE);
});

const appEl = document.querySelector<HTMLDivElement>("#app");
if (!appEl) throw new Error("#app not found");
const app: HTMLDivElement = appEl;

// NPC演出
let uiLocked = false;
let npcRunToken = 0;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const NPC_THINK_MIN_MS = 800;
const NPC_THINK_MAX_MS = 1750;

function pickNpcThinkDelayMs(): number {
  return Math.floor(Math.random() * (NPC_THINK_MAX_MS - NPC_THINK_MIN_MS + 1)) + NPC_THINK_MIN_MS;
}

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
      updateMatchTelemetryFromState(matchTelemetry, state);
      (state as any).__mpSeatOffset = session.seatIndex; // プレイヤー状況をHOST→P1→P2→P3に固定する用
      (state as any).__mpIsHost = session.isHost;         // Restart制御用
      draw();

      if (i < frames.length - 1) {
        await sleep(intervalMs);
      }
    }

    if (token !== mpAnimToken) return;
    if (state && state.history.length === 0 && gameStartUnlockTimerId != null) {
      draw();
      return;
    }

    const shouldDelayUnlockForSingleHumanFrame =
      frames.length === 1 &&
      Array.isArray(frames[0]?.history) &&
      frames[0].history.length > 0;

    if (shouldDelayUnlockForSingleHumanFrame) {
      await sleep(250);
      if (token !== mpAnimToken) return;
    }

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
      leaveMpAfterRoomDisband(session);
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
      if (state.history.length === 0) {
        matchTelemetry = createMatchTelemetry(state);
        savingMatchId = null;
        beginGameStartOverlayPhase(false);
      } else {
        updateMatchTelemetryFromState(matchTelemetry, state);
      }
      (state as any).__mpSeatOffset = session.seatIndex;
      (state as any).__mpIsHost = session.isHost;
      if (state.history.length === 0 && gameStartUnlockTimerId != null) {
        draw();
        return;
      }
      uiLocked = false;
      draw();
      return;
    }
  };

  session.ws.onclose = (ev) => {
    if (ev.reason === "disband" && !session.isHost) {
      leaveMpAfterRoomDisband(session);
      return;
    }
    if (mpPendingHostDisbandNotice) {
      mpPendingHostDisbandNotice = false;
      leaveMpAfterRoomDisband(session);
      return;
    }
    leaveMpToHome(session);
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
let turnLimitDelayUntilMs = 0;
let gameStartUnlockTimerId: number | null = null;
let mpDisbandWatchIntervalId: number | null = null;
let mpDisbandWatchToken = 0;

const GAME_START_TURN_LIMIT_DELAY_MS = GAME_START_OVERLAY_HOLD_MS + GAME_START_OVERLAY_FADE_MS;

function nowTurnKey(s: GameState) {
  return `${s.turn}|${s.history.length}`;
}

function limitColor(rem: number): string {
  if (rem >= 31) return "#22c55e";
  if (rem >= 11) return "#f59e0b";
  return "#ff4d6d";
}

function stopMpDisbandWatch() {
  mpDisbandWatchToken++;
  if (mpDisbandWatchIntervalId != null) {
    window.clearInterval(mpDisbandWatchIntervalId);
    mpDisbandWatchIntervalId = null;
  }
}

function startMpDisbandWatch(session: MpSession) {
  stopMpDisbandWatch();

  const token = ++mpDisbandWatchToken;
  let checking = false;

  const check = async () => {
    if (checking) return;
    if (mp !== session) return;
    checking = true;
    try {
      const res = await fetch(`${MP_API_BASE}/api/rooms/${session.roomId}/state`, {
        method: "GET",
        cache: "no-store",
      });

      if (token !== mpDisbandWatchToken || mp !== session) return;

      if (res.status === 410 || res.status === 404) {
        leaveMpAfterRoomDisband(session);
      }
    } catch {
      // WS側でも検知するので、監視の通信失敗だけでは何もしない
    } finally {
      checking = false;
    }
  };

  mpDisbandWatchIntervalId = window.setInterval(() => {
    void check();
  }, 1000);
  void check();
}

function clearGameStartOverlayPhase() {
  if (gameStartUnlockTimerId != null) {
    window.clearTimeout(gameStartUnlockTimerId);
    gameStartUnlockTimerId = null;
  }
  document.getElementById("gameStartOverlay")?.remove();
}

function holdTurnLimitUntilOverlayEnds() {
  turnLimitDelayUntilMs = Date.now() + GAME_START_TURN_LIMIT_DELAY_MS;
}

function beginGameStartOverlayPhase(runNpcAfterUnlock = false) {
  clearGameStartOverlayPhase();

  if (!state || screen !== "GAME" || state.result.status !== "PLAYING") return;

  uiLocked = true;
  (state as any).__showStartOverlay = true;
  holdTurnLimitUntilOverlayEnds();

  const capturedKey = nowTurnKey(state);
  gameStartUnlockTimerId = window.setTimeout(() => {
    gameStartUnlockTimerId = null;

    if (!state || screen !== "GAME" || state.result.status !== "PLAYING") return;

    const shouldRunNpc = nowTurnKey(state) === capturedKey;

    uiLocked = false;
    draw();

    if (shouldRunNpc && runNpcAfterUnlock && state && state.result.status === "PLAYING" && state.turn !== 0) {
      void runNpcTurnsAnimated();
    }
  }, GAME_START_TURN_LIMIT_DELAY_MS);
}

function showPendingTurnLimitDom() {
  const fill = document.querySelector<HTMLDivElement>("#limitFill");
  const secEl = document.querySelector<HTMLDivElement>("#limitSec");
  if (!fill || !secEl) return;

  fill.style.width = "100%";
  fill.style.background = limitColor(TURN_LIMIT_SEC);
  secEl.textContent = `${TURN_LIMIT_SEC}s`;
  secEl.style.color = limitColor(TURN_LIMIT_SEC);
  secEl.style.fontSize = "13px";
}

function updateLimitDom() {
  const fill = document.querySelector<HTMLDivElement>("#limitFill");
  const secEl = document.querySelector<HTMLDivElement>("#limitSec");
  if (!fill || !secEl) return;

  if (!state || screen !== "GAME" || state.result.status !== "PLAYING") {
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
  clearGameStartOverlayPhase();

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
  turnLimitDelayUntilMs = 0;
  updateLimitDom();
}

function ensureTurnLimit() {

  if (!state || screen !== "GAME" || state.result.status !== "PLAYING") {
    stopTurnLimit();
    return;
  }

  if (turnLimitDelayUntilMs > Date.now()) {
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
    showPendingTurnLimitDom();
    return;
  }

  turnLimitDelayUntilMs = 0;

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
    recordTimeoutDeckPlay(matchTelemetry, seatIndex);
    updateMatchTelemetryFromState(matchTelemetry, state);
  } else {
    const hand = state.seats[seatIndex].hand;
    if (hand.length === 0) return;
    const card = hand[0];
    let jokerValue: number | undefined;
    if (card.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(state);
    state = reducer(state, { type: "PLAY_HAND", handIndex: 0, jokerValue });
    updateMatchTelemetryFromState(matchTelemetry, state);
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
  stopMpDisbandWatch();

  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  const name = (cfg.playerName || "").trim() || "プレイヤー";
  homeConfig = { ...cfg, playerName: name };
  difficulty = cfg.difficulty;

  soloIconId = getSelectedHomeIconId();
  state = createInitialState(name, cfg.gameType, soloIconId);
  matchTelemetry = createMatchTelemetry(state);
  savingMatchId = null;
  (state.seats[0] as any).isGuest = isGuestSession;
  (state.seats[0] as any).titleName = isGuestSession ? "" : getSelectedUserTitleName();
  screen = "GAME";
  loadingTargetScreen = null;
  beginGameStartOverlayPhase(true);
  draw();
}

function goHome() {
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  const shouldReturnToUserHome = !isGuestSession;
  if (shouldReturnToUserHome) {
    refreshUserHomeDataAndRedraw();
  }

  screen = shouldReturnToUserHome ? "USER_HOME" : "HOME";
  state = null;
  matchTelemetry = null;
  savingMatchId = null;
  stopMpDisbandWatch();
  draw();
}

function restartGame() {
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  const name = (homeConfig.playerName || "").trim() || "プレイヤー";
  stopMpDisbandWatch();
  state = createInitialState(name, homeConfig.gameType, soloIconId);
  matchTelemetry = createMatchTelemetry(state);
  savingMatchId = null;
  (state.seats[0] as any).isGuest = isGuestSession;
  (state.seats[0] as any).titleName = isGuestSession ? "" : getSelectedUserTitleName();
  beginGameStartOverlayPhase(true);
  draw();
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
  updateMatchTelemetryFromState(matchTelemetry, state);

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
  updateMatchTelemetryFromState(matchTelemetry, state);

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

      await sleep(pickNpcThinkDelayMs());
      if (token !== npcRunToken) return;
      if (!state || state.result.status !== "PLAYING" || state.turn === 0) return;

      const action = chooseNpcAction(state, difficulty);

      if (action.type === "PLAY_HAND") {
        state = reducer(state, action as any);
      } else {
        state = reducer(state, action as any);
      }

      updateMatchTelemetryFromState(matchTelemetry, state);
      draw();
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


function maybeSaveCompletedLocalMatch() {
  if (!state || !matchTelemetry) return;
  const currentMp = mp;
  const currentIsGuest = isGuestSession || Boolean(state.seats[0]?.isGuest);
  if (currentIsGuest) return;
  if (state.result.status === "PLAYING") return;
  if (savingMatchId === matchTelemetry.matchId) return;

  savingMatchId = matchTelemetry.matchId;
  void saveCompletedSoloMatch({
    state,
    telemetry: matchTelemetry,
    difficulty,
    isGuestSession: currentIsGuest,
    isMulti: Boolean(currentMp),
    roomId: currentMp?.roomId ?? null,
    mpSeatIndex: currentMp?.seatIndex ?? null,
  }).catch(() => { });
}

// ==============================
// 描画
// ==============================
function draw() {
  if (screen === "TITLE") {
    stopTurnLimit();

    renderTitle(app, {
      onStart: () => startTitleLoadingToUserHome(),
      onGuestStart: () => {
        startTitleLoadingToGuestGameSettings();
      },
      onLoginSuccess: (email) => {
        saveAuthSession(email);
        startAuthenticatedLoadingToUserHome();
      },
      onLogout: () => {
        logoutAuthSession().finally(() => {
          clearUserSettingsCache();
          resetUserCollectionsCache();
          resetUserNotificationsCache();
          isGuestSession = false;
          screen = "TITLE";
          draw();
        });
      },
      onOpenPasswordReset: () => {
        window.location.href = new URL("./password-reset.html", window.location.href).toString();
      },
    });

    return;
  }

  if (screen === "MP_GATE") {
    stopTurnLimit();

    renderMpGate(app, {
      onLoginJoin: () => {
        runAuthenticatedAction(() => startTitleLoading("AUTHENTICATED", "HOME"));
      },
      onGuestJoin: () => {
        startTitleLoading("GUEST", "HOME");
      },
      onCancel: () => {
        cancelMpGateToTitle();
      },
    });

    return;
  }

  if (screen === "LOADING") {
    stopTurnLimit();
    renderLoading(app, loadingConfig ?? createLoadingConfig("AUTHENTICATED"));
    return;
  }

  if (screen === "USER_HOME") {
    stopTurnLimit();

    renderUserHome(app, {
      titleAwardNotification: getPendingTitleAwardNotification(),
      iconAwardNotification: getPendingIconAwardNotification(),
      onTitleAwardNotificationClose: () => {
        void markPendingTitleNotificationsRead();
      },
      onIconAwardNotificationClose: () => {
        void markPendingIconNotificationsRead();
      },
      onGoGameSettings: () => {
        runAuthenticatedAction(() => {
          isGuestSession = false;
          homeConfig = { ...homeConfig, playerName: getUserPlayerName() };
          screen = "HOME";
          draw();
        });
      },
      onGoTitle: () => {
        isGuestSession = false;
        screen = "TITLE";
        draw();
      },
    });

    return;
  }

  if (screen === "HOME") {
    stopTurnLimit();

    renderHome(app, { ...homeConfig, isGuest: isGuestSession }, {
      onStart: (cfg) => {
        if (isGuestSession) startGame(cfg);
        else runAuthenticatedAction(() => startGame(cfg));
      },
      onChange: (cfg) => {
        homeConfig = cfg;
        difficulty = cfg.difficulty;
      },
      onGoUserHome: () => {
        runAuthenticatedAction(() => {
          isGuestSession = false;
          refreshUserHomeDataAndRedraw();
          screen = "USER_HOME";
          draw();
        });
      },
      onGoTitle: () => {
        isGuestSession = false;
        screen = "TITLE";
        draw();
      },
      onEnterMpGame: (p, initial) => {
        stopTurnLimit();
        npcRunToken++;
        uiLocked = false;

        mpAnimToken++;
        mpLastSeq = 0;

        mpPendingHostDisbandNotice = false;
        mp = {
          roomId: p.roomId,
          seatIndex: p.seatIndex,
          isHost: p.isHost,
          npcDifficulty: p.npcDifficulty,
          ws: p.ws,
        };
        difficulty = p.npcDifficulty;

        resetRenderTransientState();

        state = rotateToMe(initial, p.seatIndex);
        matchTelemetry = createMatchTelemetry(state);
        savingMatchId = null;
        (state as any).__mpSeatOffset = p.seatIndex;
        (state as any).__mpIsHost = p.isHost;

        screen = "GAME";

        if (state.history.length === 0) {
          beginGameStartOverlayPhase(false);
        }

        // MPゲーム画面中にリロード/リダイレクトしても "?room=" でJOINし直さないよう、URLからsearchを除去
        try {
          const next = location.pathname + (location.hash ?? "");
          history.replaceState(null, "", next);
        } catch { }

        attachMpWs(mp);
        startMpDisbandWatch(mp);
        draw();
      },
    });

    return;
  }

  if (!state) return;

  // ★マルチ時：プレイヤー状況を HOST→P1→P2→P3 固定表示にするための情報を毎回付与
  if (mp && state) (state as any).__mpSeatOffset = Number(mp.seatIndex);
  if (mp && state) (state as any).__mpIsHost = mp.isHost; // （Restart制御とかに使ってるなら）
  if (state) (state as any).__hideHandUntilTurnLimitStarts = turnLimitDelayUntilMs > Date.now();

  maybeSaveCompletedLocalMatch();

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
        if (isGuestSession) restartGame();
        else runAuthenticatedAction(restartGame);
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

      const currentMp = mp;
      if (currentMp.isHost) {
        mpPendingHostDisbandNotice = true;
        uiLocked = true;
        draw();
        try {
          currentMp.ws.send(JSON.stringify({ type: "HOST_DISBAND" }));
        } catch {
          mpPendingHostDisbandNotice = false;
          leaveMpToHome(currentMp);
          return;
        }

        window.setTimeout(() => {
          if (mp !== currentMp || !mpPendingHostDisbandNotice) return;
          leaveMpToHome(currentMp);
        }, 3000);
        return;
      }

      try {
        currentMp.ws.send(JSON.stringify({ type: "LEAVE" }));
      } catch { }

      leaveMpToHome(currentMp);
    },
  });

  ensureTurnLimit();
}

draw();