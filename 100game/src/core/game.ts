// src/core/game.ts
import type { GameState, GameType, InitialSeatSnapshot, Seat } from "./types";
import { NPC_ICON_ID } from "../icons/iconPresets";
import { createDeck, deal, shuffle } from "./deck";

const EXTRA_CANDIDATES: Array<Exclude<GameType, "EXTRA">> = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

function pickExtraTarget(): number {
  const i = Math.floor(Math.random() * EXTRA_CANDIDATES.length);
  return EXTRA_CANDIDATES[i];
}

export function createInitialState(
  humanName: string,
  gameType: GameType,
  humanIconId?: string,
  humanIconTypeIds: string[] = [],
  npcIconId: string = NPC_ICON_ID,
  npcIconTypeIds: string[] = [],
): GameState {
  const seats: [Seat, Seat, Seat, Seat] = [
    { kind: "HUMAN", name: humanName, hand: [] },
    { kind: "NPC", name: "NPC1", hand: [] },
    { kind: "NPC", name: "NPC2", hand: [] },
    { kind: "NPC", name: "NPC3", hand: [] },
  ];

  // ホーム画面で選んだアイコン（ソロ用）をゲーム状態へ反映
  const _humanIcon = (humanIconId ?? "").trim() || NPC_ICON_ID;
  (seats[0] as any).iconId = _humanIcon;
  (seats[1] as any).iconId = npcIconId;
  (seats[2] as any).iconId = npcIconId;
  (seats[3] as any).iconId = npcIconId;


  const initialSeatSnapshots: [InitialSeatSnapshot, InitialSeatSnapshot, InitialSeatSnapshot, InitialSeatSnapshot] = [
    { seatKind: "HUMAN", iconId: _humanIcon, iconTypeIds: [...humanIconTypeIds] },
    { seatKind: "NPC", iconId: npcIconId, iconTypeIds: [...npcIconTypeIds] },
    { seatKind: "NPC", iconId: npcIconId, iconTypeIds: [...npcIconTypeIds] },
    { seatKind: "NPC", iconId: npcIconId, iconTypeIds: [...npcIconTypeIds] },
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
    initialSeatSnapshots,
  };
  return state;
}