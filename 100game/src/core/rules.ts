// src/core/rules.ts
import type { Card, GameState, Mode, PlayLog, PlayOrigin } from "./types";

export type ResolvePlayOutput = {
  log: PlayLog;
  afterTotal: number;
  afterMode: Mode;
  lose: boolean;
  patchedPrev?: PlayLog; // ♠3相殺のとき直前(JOKER)を書き換える
};

function toggleMode(mode: Mode): Mode {
  return mode === "UP" ? "DOWN" : "UP";
}

function wouldLose(mode: Mode, total: number): boolean {
  return (mode === "UP" && total >= 100) || (mode === "DOWN" && total <= 0);
}

function baseValue(card: Card, jokerValue?: number): number {
  if (card.rank === "JOKER") {
    const v = Math.floor(Number(jokerValue));
    if (!Number.isFinite(v) || v < 1 || v > 49) {
      throw new Error("JOKER value must be 1..49");
    }
    return v;
  }
  if (card.rank === "A") return 1;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;

  const n = Number(card.rank);
  if (Number.isFinite(n)) return n;

  throw new Error(`Unknown rank: ${String(card.rank)}`);
}

/**
 * reducer.ts 互換：5引数で呼ばれる前提
 * applyCardEffects(state, seatIndex, card, origin, jokerValue)
 *
 * ここでは state を更新しない。
 * 「このカードを出した結果（ログ/合計/モード/負け/直前ログ差し替え）」を返す。
 */ 
export function applyCardEffects(
  state: GameState,
  seatIndex: number,
  card: Card,
  origin: PlayOrigin,
  jokerValue?: number
): ResolvePlayOutput {
  const beforeTotal = state.total;
  const beforeMode = state.mode;
  const lastPlay = state.history.length ? state.history[state.history.length - 1] : null;

  // =========================
// ♠3 相殺（直前がJOKERのみ）
// =========================
if (
  card.suit === "S" &&
  card.rank === "3" &&
  lastPlay &&
  lastPlay.card.rank === "JOKER"
) {
  const prev = lastPlay;

  // ★直前(JOKER)は「元のログ」を残す（+41/合計64のまま）
  // ただし補足だけ付ける（"相殺"という文字を入れないとJOKER行が🛡️扱いにならない）
  const patchedPrev: PlayLog = {
    ...prev,
    note: prev.note ? `${prev.note} / ♠3で無効化` : "♠3で無効化",
  };

  // ★♠3のターンで「JOKER分を打ち消した」ことをログに出す
  const canceled = prev.value; // 例: 41
  const delta = beforeMode === "UP" ? -canceled : +canceled; // UPなら -41 / DOWNなら +41
  const afterTotal = beforeTotal + delta; // ここで restoredTotal に戻るはず
  const restoredTotal = prev.beforeTotal;

  const log: PlayLog = {
    seat: seatIndex,
    origin,
    card,
    value: 0,
    delta: -prev.value,              // ここが「-41」になる肝
    beforeTotal: prev.afterTotal,     // ここは 65
    afterTotal: restoredTotal,        // ここは 24
    beforeMode,
    afterMode: beforeMode,
    note: `ジョーカー相殺（🃏(${prev.value})を打ち消し）`,
  };

  return {
    log,
    afterTotal,
    afterMode: beforeMode,
    lose: false,
    patchedPrev,
  };
}


  // =========================
  // J（トグル） ※バグ修正点
  // =========================
  if (card.rank === "J") {
    // ★今のモードに従う（DOWNなら -10）
    const delta = beforeMode === "UP" ? +10 : -10;
    const afterTotal = beforeTotal + delta;

    // ★判定が先。負けるなら反転しない
    const lose = wouldLose(beforeMode, afterTotal);
    const afterMode = lose ? beforeMode : toggleMode(beforeMode);

    const log: PlayLog = {
      seat: seatIndex,
      origin,
      card,
      value: 10,
      delta,
      beforeTotal,
      afterTotal,
      beforeMode,
      afterMode,
      note: lose ? undefined : "Jでモード反転",
    };

    return { log, afterTotal, afterMode, lose };
  }

  // =========================
  // 通常（A/2..10/Q/K/JOKER）
  // =========================
  const value = baseValue(card, jokerValue);
  const delta = beforeMode === "UP" ? +value : -value;
  const afterTotal = beforeTotal + delta;

  const lose = wouldLose(beforeMode, afterTotal);

  const log: PlayLog = {
    seat: seatIndex,
    origin,
    card,
    value,
    delta,
    beforeTotal,
    afterTotal,
    beforeMode,
    afterMode: beforeMode, // 通常カードは反転なし
    note: undefined,
  };

  return { log, afterTotal, afterMode: beforeMode, lose };
}
