// src/main.ts

import "./style.css";
import type { Difficulty, GameState } from "./core/types";
import { createInitialState } from "./core/game";
import { reducer } from "./core/reducer";
import { chooseNpcAction } from "./ai/npc";
import { renderHome } from "./ui/home";
import { render } from "./ui/render";
import { pickJokerValue } from "./ui/jokerPicker";

// ===== アプリ状態 =====
type Screen = "HOME" | "GAME";

let screen: Screen = "HOME";
let state: GameState | null = null;

let difficulty: Difficulty = "CASUAL";
let homeConfig = { playerName: "プレイヤー", difficulty: "CASUAL" as Difficulty };

const appEl = document.querySelector<HTMLDivElement>("#app");
if (!appEl) throw new Error("#app not found");
const app: HTMLDivElement = appEl;

// ===== 追加：演出（NPCターンの見せ方） =====
let uiLocked = false; // NPCが動いてる間など、操作を一時的に無効化
let npcRunToken = 0; // 中断用トークン（ホーム戻り等でループを止める）
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ==============================
// NPCがDECKからJOKERを引いた時の値
// 「バーストしない範囲の境界値」を選ぶ
// ==============================
function pickNpcJokerValueNoBust(s: GameState, d: Difficulty): number {
  const total = s.total;

  const safeMax =
    s.mode === "UP"
      ? Math.min(49, 99 - total) // total+v<100
      : Math.min(49, total - 1); // total-v>0

  if (safeMax < 1) return 1;

  if (d === "SMART") {
    return safeMax; // 境界値＝最善
  }

  // CASUAL：安全域の中からランダム（詰ませにくくする）
  const min = 1;
  const max = safeMax;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


// ===== 描画 =====
function draw() {
  renderHome(app, homeConfig, {
  onStart: (cfg) => startGame(cfg),
  onChange: (cfg) => {
    homeConfig = cfg;
    difficulty = cfg.difficulty;
    draw();
  },
});

  if (!state) return;

  render(app, state, difficulty, uiLocked, {
  onPlayHand: (handIndex) => void stepHumanPlayHandAsync(handIndex),
  onDrawPlay: () => void stepHumanDrawPlayAsync(),
  onRestart: () => restartGame(),
  onGoHome: () => goHome(),
});
}

// ===== 画面遷移 =====
function goHome() {
  npcRunToken++; // NPCループ中断
  uiLocked = false;

  screen = "HOME";
  state = null;
  draw();
}

function startGame(cfg: typeof homeConfig) {
  npcRunToken++; // 前のループ中断
  uiLocked = false;

  const name = (cfg.playerName || "").trim() || "プレイヤー";
  homeConfig = { ...cfg, playerName: name };
  difficulty = cfg.difficulty;

  state = createInitialState(name);
  screen = "GAME";
  draw();

  // 念のため（turnが0ならすぐ帰る）
  void runNpcTurnsAnimated();
}

function restartGame() {
  if (!state) return;
  npcRunToken++;
  uiLocked = false;
  state = createInitialState(homeConfig.playerName);
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
      // HUMAN：選ばせる
      const v = await pickJokerValue({
        mode: state.mode,
        total: state.total,
        allowCancel: false, // 山札JOKERはキャンセル不可
      });
      if (v == null) return;
      jokerValue = v;
    } else {
      // NPC：バーストしない境界値（できる範囲で）
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
    const v = await pickJokerValue({
      mode: state.mode,
      total: state.total,
      allowCancel: true, // 手札JOKERはキャンセル可
    });
    if (v == null) return;
    jokerValue = v;
  }

  state = reducer(state, { type: "PLAY_HAND", handIndex, jokerValue });

  // あなたの一手を見せる
  draw();
  await sleep(250);

  // NPCを1手ずつ見せる
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

  // あなたの一手を見せる
  draw();
  await sleep(250);

  // NPCを1手ずつ見せる
  await runNpcTurnsAnimated();
  draw();
}

// ===== NPC：1手ずつ演出しながら進める =====
async function runNpcTurnsAnimated() {
  if (!state) return;

  const token = ++npcRunToken;

  // HUMAN手番なら何もしない
  if (state.turn === 0) return;

  uiLocked = true;
  draw();

  try {
    while (state && state.result.status === "PLAYING" && state.turn !== 0) {
      if (token !== npcRunToken) return; // 中断

      const seatIndex = state.turn;

      const action = chooseNpcAction(state, difficulty);

      if (action.type === "PLAY_HAND") {
        // NPCが手札JOKERを出す時に jokerValue が無いなら「同じ境界値ロジック」で補完して固まらないようにする
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
        // ★ ここが重要：NPCも共通関数で処理（JOKERなら自動値を入れる）
        await stepDrawPlayAsync(seatIndex);
      }

      draw();
      await sleep(250);
    }
  } finally {
    // 途中 return/例外でも必ず解除
    uiLocked = false;
    draw();
  }
}

// ===== 初期描画 =====
draw();
