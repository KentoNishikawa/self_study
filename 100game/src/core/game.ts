// src/core/game.ts
import type { GameState, Seat } from "./types";
import { createDeck, deal, shuffle } from "./deck";

export function createInitialState(humanName: string): GameState {
  const seats: [Seat, Seat, Seat, Seat] = [
    { kind: "HUMAN", name: humanName, hand: [] },
    { kind: "NPC", name: "NPC1", hand: [] },
    { kind: "NPC", name: "NPC2", hand: [] },
    { kind: "NPC", name: "NPC3", hand: [] },
  ];

  const jokerCount = 1;
  const deck = shuffle(createDeck(jokerCount));

  const { hands, restDeck } = deal(deck, 4, 4);
  for (let i = 0; i < 4; i++) seats[i].hand = hands[i];

  let state: GameState = {
    seats,
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
