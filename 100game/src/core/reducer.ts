// src/core/reducer.ts
import type { GameState } from "./types";
import { applyCardEffects } from "./rules";

export type GameAction =
  | { type: "PLAY_HAND"; handIndex: number; jokerValue?: number }
  | { type: "DRAW_PLAY"; jokerValue?: number };

  export type Action = GameAction; 

function nextTurn(turn: number): number {
  return (turn + 1) % 4;
}

function allHandsEmpty(state: GameState): boolean {
  return state.seats.every((s) => s.hand.length === 0);
}

function toVoidIfNoCards(state: GameState): GameState {
  if (state.result.status !== "PLAYING") return state;

  if (state.deck.length === 0 && allHandsEmpty(state)) {
    return {
      ...state,
      result: { status: "VOID", reason: "山札と手札が尽きたため無効試合" },
    };
  }
  return state;
}

export function reducer(state: GameState, action: GameAction): GameState {
  if (state.result.status !== "PLAYING") return state;

  const seatIndex = state.turn;
  const seat = state.seats[seatIndex];

  // seats が [Seat,Seat,Seat,Seat] のため、配列mapではなく「コピーして差し替え」
  const cloneSeats = () =>
    ([...state.seats] as unknown as typeof state.seats);

  if (action.type === "PLAY_HAND") {
    const card = seat.hand[action.handIndex];
    if (!card) return state;

    // 手札から抜く
    const newHand = seat.hand.filter((_, i) => i !== action.handIndex);

    const seats2 = cloneSeats() as any;
    seats2[seatIndex] = { ...seat, hand: newHand };

    // まず seats を反映した state
    let next: GameState = { ...state, seats: seats2 };

    // 効果計算（stateは更新しない・結果だけ返る）
    const r = applyCardEffects(next, seatIndex, card, "HAND", action.jokerValue);

    // history（♠3相殺なら直前ログ差し替え）
    const history = r.patchedPrev
      ? [...next.history.slice(0, -1), r.patchedPrev, r.log]
      : [...next.history, r.log];

    // result
    const result =
      r.lose
        ? {
            status: "LOSE" as const,
            loserSeat: seatIndex,
            reason:
              r.log.beforeMode === "UP"
                ? `合計が100以上（${r.afterTotal}）`
                : `合計が0以下（${r.afterTotal}）`,
          }
        : next.result;

    next = {
      ...next,
      total: r.afterTotal,
      mode: r.afterMode,
      history,
      result,
    };

    // 決着してなければターン進行
    if (next.result.status === "PLAYING") {
      next = { ...next, turn: nextTurn(next.turn) };
    }

    return toVoidIfNoCards(next);
  }

  if (action.type === "DRAW_PLAY") {
    if (state.deck.length === 0) return state;

    const card = state.deck[state.deck.length - 1];
    const newDeck = state.deck.slice(0, -1);

    let next: GameState = { ...state, deck: newDeck };

    const r = applyCardEffects(next, seatIndex, card, "DECK", action.jokerValue);

    const history = r.patchedPrev
      ? [...next.history.slice(0, -1), r.patchedPrev, r.log]
      : [...next.history, r.log];

    const result =
      r.lose
        ? {
            status: "LOSE" as const,
            loserSeat: seatIndex,
            reason:
              r.log.beforeMode === "UP"
                ? `合計が100以上（${r.afterTotal}）`
                : `合計が0以下（${r.afterTotal}）`,
          }
        : next.result;

    next = {
      ...next,
      total: r.afterTotal,
      mode: r.afterMode,
      history,
      result,
    };

    if (next.result.status === "PLAYING") {
      next = { ...next, turn: nextTurn(next.turn) };
    }

    return toVoidIfNoCards(next);
  }

  return state;
}

export default reducer;
