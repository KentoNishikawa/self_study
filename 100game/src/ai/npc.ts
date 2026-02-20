// src/ai/npc.ts
import type { Card, Difficulty, GameState } from "../core/types";

type NpcAction =
  | { type: "PLAY_HAND"; handIndex: number; jokerValue?: number }
  | { type: "DRAW_PLAY"; jokerValue?: number };

function wouldLose(mode: GameState["mode"], total: number, target: number): boolean {
  return (mode === "UP" && total >= target) || (mode === "DOWN" && total <= 0);
}

function baseValue(card: Card, jokerValue?: number): number {
  if (card.rank === "JOKER") {
    const v = Math.floor(Number(jokerValue));
    if (!Number.isFinite(v) || v < 1 || v > 49) throw new Error("JOKER value must be 1..49");
    return v;
  }
  if (card.rank === "A") return 1;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;

  const n = Number(card.rank);
  if (Number.isFinite(n)) return n;

  throw new Error(`Unknown rank: ${String(card.rank)}`);
}

// 「負けない最大値（境界値）」を計算（存在しないなら0を返す）
function safeMaxNoBust(state: GameState): number {
  const total = state.total;

  if (state.mode === "UP") {
    // total + v < target  => v <= (target-1) - total
    return Math.min(49, (state.target - 1) - total);
  } else {
    // total - v > 0 => v <= total - 1
    return Math.min(49, total - 1);
  }
}

// CASUAL/SMART の2段階でJOKER値を決める（必ず1..49に収める）
function pickNpcJokerValue(state: GameState, difficulty: Difficulty): number {
  const maxSafe = safeMaxNoBust(state);
  if (maxSafe < 1) return 1;

  if (difficulty === "SMART") return maxSafe;

  // CASUAL：安全域の中からランダム
  return Math.floor(Math.random() * maxSafe) + 1; // 1..maxSafe
}

// 指定カードを出した時の afterTotal を計算（JOKERはjokerValue想定）
function simulateAfterTotal(state: GameState, card: Card, jokerValue?: number): number {
  const value = card.rank === "J" ? 10 : baseValue(card, jokerValue);
  const delta = state.mode === "UP" ? +value : -value;
  return state.total + delta;
}

export function chooseNpcAction(state: GameState, difficulty: Difficulty): NpcAction {
  const me = state.seats[state.turn];

  // 手札が無いなら引くしかない
  if (me.hand.length === 0) {
    const top = state.deck[state.deck.length - 1];
    if (top?.rank === "JOKER") {
      return { type: "DRAW_PLAY", jokerValue: pickNpcJokerValue(state, difficulty) };
    }
    return { type: "DRAW_PLAY" };
  }

  // --- 手札の「負けない手」を探す ---
  const safeMoves: { handIndex: number; afterTotal: number; jokerValue?: number }[] = [];

  for (let i = 0; i < me.hand.length; i++) {
    const c = me.hand[i];

    let jv: number | undefined = undefined;
    if (c.rank === "JOKER") jv = pickNpcJokerValue(state, difficulty);

    const afterTotal = simulateAfterTotal(state, c, jv);

    // 「今のモードで負けるかどうか」だけ見れば良き
    if (!wouldLose(state.mode, afterTotal, state.target)) {
      safeMoves.push({ handIndex: i, afterTotal, jokerValue: jv });
    }
  }

  // SAFEがあるなら基本は手札から出す
  if (safeMoves.length > 0) {
    if (difficulty === "SMART") {
      // SMART：圧を最大化（UPならafterTotal最大、DOWNならafterTotal最小）
      safeMoves.sort((a, b) =>
        state.mode === "UP" ? b.afterTotal - a.afterTotal : a.afterTotal - b.afterTotal
      );
      const best = safeMoves[0];
      return { type: "PLAY_HAND", handIndex: best.handIndex, jokerValue: best.jokerValue };
    }

    // CASUAL：safeの中からランダム
    if (state.deck.length > 0 && Math.random() < 0.15) {
      const top = state.deck[state.deck.length - 1];
      if (top?.rank === "JOKER") {
        return { type: "DRAW_PLAY", jokerValue: pickNpcJokerValue(state, difficulty) };
      }
      return { type: "DRAW_PLAY" };
    }

    const pick = safeMoves[Math.floor(Math.random() * safeMoves.length)];
    return { type: "PLAY_HAND", handIndex: pick.handIndex, jokerValue: pick.jokerValue };
  }

  // SAFEが無いなら、山札が残ってるなら引いてワンチャン
  if (state.deck.length > 0) {
    const top = state.deck[state.deck.length - 1];
    if (top?.rank === "JOKER") {
      return { type: "DRAW_PLAY", jokerValue: pickNpcJokerValue(state, difficulty) };
    }
    return { type: "DRAW_PLAY" };
  }

  // 山札も無い → 手札からランダム
  const idx = Math.floor(Math.random() * me.hand.length);
  const card = me.hand[idx];
  if (card.rank === "JOKER") {
    return { type: "PLAY_HAND", handIndex: idx, jokerValue: pickNpcJokerValue(state, difficulty) };
  }
  return { type: "PLAY_HAND", handIndex: idx };
}