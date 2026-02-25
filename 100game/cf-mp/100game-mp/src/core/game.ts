// src/core/game.ts
import type { GameState, GameType, Seat } from "./types";
import { createDeck, deal, shuffle } from "./deck";

//const EXTRA_CANDIDATES: Array<Exclude<GameType, "EXTRA">> = [100, 200, 300, 400, 500];
// お遊びデバッグ用コード　S　コンパイルで止められないで止められないため遊んだら消す
const EXTRA_CANDIDATES: number[] = [25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
// お遊びデバッグ用コード　E

function pickExtraTarget(): number {
  const i = Math.floor(Math.random() * EXTRA_CANDIDATES.length);
  return EXTRA_CANDIDATES[i];
}

export function createInitialState(humanName: string, gameType: GameType): GameState {
  const seats: [Seat, Seat, Seat, Seat] = [
    { kind: "HUMAN", name: humanName, hand: [] },
    { kind: "NPC", name: "NPC1", hand: [] },
    { kind: "NPC", name: "NPC2", hand: [] },
    { kind: "NPC", name: "NPC3", hand: [] },
  ];

  const target = gameType === "EXTRA" ? pickExtraTarget() : gameType;

  const jokerCount = 1;
  const deck = shuffle(createDeck(jokerCount));

  const { hands, restDeck } = deal(deck, 4, 4);
  for (let i = 0; i < 4; i++) seats[i].hand = hands[i];

  const state: GameState = {
    seats,
    gameType,
    target,
    discard: [],
    systemLogs: [], 
    deck: restDeck,
    turn: 0,
    total: 0,
    mode: "UP",
    history: [],
    result: { status: "PLAYING" },
    lastCard: null,
  };
  return state;
}