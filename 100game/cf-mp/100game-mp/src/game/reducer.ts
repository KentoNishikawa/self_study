import type { GameState } from "./types";
import { shuffle } from "./deck";
import { applyCardEffects } from "./rules";

export type GameAction =
    | { type: "PLAY_HAND"; handIndex: number; jokerValue?: number }
    | { type: "DRAW_PLAY"; jokerValue?: number };

function nextTurn(turn: number): number {
    return (turn + 1) % 4;
}

function anyHandEmpty(state: GameState): boolean {
    return state.seats.some((s) => s.hand.length === 0);
}

function allHandsEmpty(state: GameState): boolean {
    return state.seats.every((s) => s.hand.length === 0);
}

function extraSuffix(state: GameState): string {
    return state.gameType === "EXTRA" ? `（EXTRA上限値=${state.target}）` : "";
}

function setVoid(state: GameState, reason: string): GameState {
    if (state.result.status !== "PLAYING") return state;
    return { ...state, result: { status: "VOID", reason: `${reason}${extraSuffix(state)}` } };
}

function pushTableCard(state: GameState, playedCard: any): GameState {
    const discard = state.lastCard ? [...state.discard, state.lastCard] : state.discard;
    return { ...state, discard, lastCard: playedCard };
}

function pushSystemLog(
    state: GameState,
    log: { kind: "REDEAL"; afterPlayIndex: number; message: string }
): GameState {
    const lastId = state.systemLogs?.length ? state.systemLogs[state.systemLogs.length - 1].id : 0;
    const nextId = lastId + 1;
    return { ...state, systemLogs: [...(state.systemLogs ?? []), { id: nextId, ...log }] };
}

function maybeRedeal(state: GameState): GameState {
    if (state.result.status !== "PLAYING") return state;
    if (state.target < 200) return state;

    if (state.deck.length !== 0) return state;
    if (!anyHandEmpty(state)) return state;

    const recovered = state.discard.length + state.deck.length;
    const pool = shuffle([...state.discard, ...state.deck]);

    if (pool.length === 0) return setVoid(state, "再配布できるカードが無いため無効試合");

    const seats2 = ([...state.seats] as unknown as typeof state.seats) as any;
    for (let i = 0; i < 4; i++) seats2[i] = { ...state.seats[i], hand: state.seats[i].hand.slice() };

    const needsAny = () => seats2.some((s: any) => s.hand.length < 4);

    let idx = state.turn;
    let guard = 0;

    while (pool.length > 0 && needsAny() && guard < 10000) {
        if (seats2[idx].hand.length < 4) {
            const c = pool.pop();
            if (!c) break;
            seats2[idx] = { ...seats2[idx], hand: [...seats2[idx].hand, c] };
        }
        idx = (idx + 1) % 4;
        guard++;
    }

    const nextState: GameState = { ...state, seats: seats2, deck: pool, discard: [] };

    return pushSystemLog(nextState, {
        kind: "REDEAL",
        afterPlayIndex: nextState.history.length,
        message: `捨て札を回収して再配布しました（回収:${recovered}枚 / 山札:${nextState.deck.length}枚）`,
    });
}

function toVoidIfNoCards(state: GameState): GameState {
    if (state.result.status !== "PLAYING") return state;

    if (state.target >= 200) {
        if (state.deck.length === 0 && anyHandEmpty(state) && state.discard.length === 0) {
            return setVoid(state, "再配布できるカードが無いため無効試合");
        }
        return state;
    }

    if (state.deck.length === 0 && allHandsEmpty(state)) {
        return setVoid(state, "山札と手札が尽きたため無効試合");
    }

    return state;
}

export function reducer(state: GameState, action: GameAction): GameState {
    if (state.result.status !== "PLAYING") return state;

    const seatIndex = state.turn;
    const seat = state.seats[seatIndex];

    const cloneSeats = () => ([...state.seats] as unknown as typeof state.seats);

    const loseReason = (s: GameState, afterTotal: number, beforeMode: GameState["mode"]) => {
        if (beforeMode === "UP") {
            const t = s.gameType === "EXTRA" ? `上限値(${s.target})` : String(s.target);
            return `合計が${t}以上（${afterTotal}）`;
        }
        return `合計が0以下（${afterTotal}）`;
    };

    if (action.type === "PLAY_HAND") {
        const card = seat.hand[action.handIndex];
        if (!card) return state;

        const newHand = seat.hand.filter((_, i) => i !== action.handIndex);

        const seats2 = cloneSeats() as any;
        seats2[seatIndex] = { ...seat, hand: newHand };

        let next: GameState = { ...state, seats: seats2 };
        next = pushTableCard(next, card);

        const r = applyCardEffects(next, seatIndex, card, "HAND", action.jokerValue);

        const history = r.patchedPrev
            ? [...next.history.slice(0, -1), r.patchedPrev, r.log]
            : [...next.history, r.log];

        const result =
            r.lose
                ? ({
                    status: "LOSE" as const,
                    loserSeat: seatIndex,
                    reason: `${loseReason(next, r.afterTotal, r.log.beforeMode)}${extraSuffix(next)}`,
                })
                : next.result;

        next = { ...next, total: r.afterTotal, mode: r.afterMode, history, result };

        if (next.result.status === "PLAYING") {
            next = { ...next, turn: nextTurn(next.turn) };
            next = maybeRedeal(next);
        }

        return toVoidIfNoCards(next);
    }

    if (action.type === "DRAW_PLAY") {
        if (state.deck.length === 0) return state;

        const card = state.deck[state.deck.length - 1];
        const newDeck = state.deck.slice(0, -1);

        let next: GameState = { ...state, deck: newDeck };
        next = pushTableCard(next, card);

        const r = applyCardEffects(next, seatIndex, card, "DECK", action.jokerValue);

        const history = r.patchedPrev
            ? [...next.history.slice(0, -1), r.patchedPrev, r.log]
            : [...next.history, r.log];

        const result =
            r.lose
                ? ({
                    status: "LOSE" as const,
                    loserSeat: seatIndex,
                    reason: `${loseReason(next, r.afterTotal, r.log.beforeMode)}${extraSuffix(next)}`,
                })
                : next.result;

        next = { ...next, total: r.afterTotal, mode: r.afterMode, history, result };

        if (next.result.status === "PLAYING") {
            next = { ...next, turn: nextTurn(next.turn) };
            next = maybeRedeal(next);
        }

        return toVoidIfNoCards(next);
    }

    return state;
}