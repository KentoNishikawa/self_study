// src/main.ts

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

let difficulty: Difficulty = "CASUAL";
let homeConfig: HomeConfig = {
  playerName: "プレイヤー",
  difficulty: "CASUAL",
  gameType: 100,
};

const appEl = document.querySelector<HTMLDivElement>("#app");
if (!appEl) throw new Error("#app not found");
const app: HTMLDivElement = appEl;

// NPC演出
let uiLocked = false;
let npcRunToken = 0;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ==============================
// 手番の時間制限（60秒）
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
  if (rem >= 31) return "#22c55e"; // 緑
  if (rem >= 11) return "#f59e0b"; // 橙
  return "#ff4d6d"; // 赤
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

function pickAutoJokerValueNoBust(s: GameState): number {
  const total = s.total;
  const safeMax =
    s.mode === "UP"
      ? Math.min(49, (s.target - 1) - total)
      : Math.min(49, total - 1);

  if (safeMax < 1) return 1;
  return safeMax;
}

async function forceTimeoutAction(capturedKey: string) {
  if (!state) return;
  if (state.result.status !== "PLAYING") return;

  // もうターンが進んでたら何もしない
  if (nowTurnKey(state) !== capturedKey) return;

  // NPC演出中は割り込まない（実質、人間の番が対象になる）
  if (uiLocked) return;

  const seatIndex = state.turn;

  // 原則：DECKから強制で出す
  const top = state.deck[state.deck.length - 1];

  if (top) {
    let jokerValue: number | undefined;
    if (top.rank === "JOKER") jokerValue = pickAutoJokerValueNoBust(state);
    state = reducer(state, { type: "DRAW_PLAY", jokerValue });
  } else {
    // DECKが無い場合の保険：先頭手札を出す（フリーズ回避）
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

function ensureTurnLimit() {
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

// ==============================
// NPCがDECKからJOKERを引いた時の値（安全最大）
// ==============================
function pickNpcJokerValueNoBust(s: GameState, d: Difficulty): number {
  const total = s.total;
  const safeMax =
    s.mode === "UP"
      ? Math.min(49, (s.target - 1) - total)
      : Math.min(49, total - 1);

  if (safeMax < 1) return 1;
  if (d === "SMART") return safeMax;

  return Math.floor(Math.random() * safeMax) + 1;
}

// ===== 描画 =====
function draw() {
  if (screen === "HOME") {
    stopTurnLimit();
    renderHome(app, homeConfig, {
      onStart: (cfg) => startGame(cfg),
      onChange: (cfg) => {
        homeConfig = cfg;
        difficulty = cfg.difficulty;
        // ★入力欄の再生成でフォーカスが飛ぶのを防ぐため、ここでdraw()しない
      },
    });
    return;
  }

  if (!state) {
    stopTurnLimit();
    return;
  }

  render(app, state, difficulty, uiLocked, {
    onPlayHand: (handIndex) => void stepHumanPlayHandAsync(handIndex),
    onDrawPlay: () => void stepHumanDrawPlayAsync(),
    onRestart: () => restartGame(),
    onGoHome: () => goHome(),
  });

  ensureTurnLimit();
}

// ===== 画面遷移 =====
function goHome() {
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  screen = "HOME";
  state = null;
  draw();
}

function startGame(cfg: HomeConfig) {
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

function restartGame() {
  if (!state) return;
  npcRunToken++;
  uiLocked = false;
  stopTurnLimit();

  state = createInitialState(homeConfig.playerName, homeConfig.gameType);
  screen = "GAME";
  draw();

  void runNpcTurnsAnimated();
}

// ===== 共通：山札から引いて即出し（HUMAN/NPC） =====
async function stepDrawPlayAsync(seatIndex: number) {
  if (!state) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== seatIndex) return;

  const peek = state.deck[state.deck.length - 1];
  let jokerValue: number | undefined;

  if (peek?.rank === "JOKER") {
    if (seatIndex === 0) {
      // 時間切れ競合防止：ターンキーが変わったら無視
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
    } else {
      jokerValue = pickNpcJokerValueNoBust(state, difficulty);
    }
  }

  state = reducer(state, { type: "DRAW_PLAY", jokerValue });
}

// ===== HUMAN：手札から出す =====
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

// ===== HUMAN：山札から引いて即出し =====
async function stepHumanDrawPlayAsync() {
  if (!state) return;
  if (uiLocked) return;
  if (state.result.status !== "PLAYING") return;
  if (state.turn !== 0) return;

  await stepDrawPlayAsync(0);

  draw();
  await sleep(250);

  await runNpcTurnsAnimated();
  draw();
}

// ===== NPC：1手ずつ演出しながら進める =====
async function runNpcTurnsAnimated() {
  if (!state) return;

  const token = ++npcRunToken;
  if (state.turn === 0) return;

  uiLocked = true;
  draw();

  try {
    while (state && state.result.status === "PLAYING" && state.turn !== 0) {
      if (token !== npcRunToken) return;

      const seatIndex = state.turn;
      const action = chooseNpcAction(state, difficulty);

      if (action.type === "PLAY_HAND") {
        let jokerValue = (action as any).jokerValue as number | undefined;
        const card = state.seats[seatIndex].hand[action.handIndex];

        if (card?.rank === "JOKER" && jokerValue == null) {
          jokerValue = pickNpcJokerValueNoBust(state, difficulty);
        }

        state = reducer(state, {
          type: "PLAY_HAND",
          handIndex: action.handIndex,
          jokerValue,
        });
      } else if (action.type === "DRAW_PLAY") {
        await stepDrawPlayAsync(seatIndex);
      }

      draw();
      await sleep(250);
    }
  } finally {
    uiLocked = false;
    draw();
  }
}

// ===== 初期描画 =====
draw();