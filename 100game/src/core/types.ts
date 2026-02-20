// src/core/types.ts

export type Suit = "S" | "H" | "D" | "C" | "JOKER";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "JOKER";

export type Mode = "UP" | "DOWN"; // UP:100以上で負け / DOWN:0以下で負け

export type Difficulty = "SMART" | "CASUAL";
export type Card = {
  id: string; // 一意ID（ログや同期で便利）
  suit: Suit;
  rank: Rank;
};

export type SeatKind = "HUMAN" | "NPC";

export type Seat = {
  kind: SeatKind;
  name: string;
  hand: Card[];
};

export type GameResult =
  | { status: "PLAYING" }
  | { status: "LOSE"; loserSeat: number; reason: string }
  | { status: "VOID"; reason: string };

export type PlayLog = {
  origin: PlayOrigin; 
  seat: number; // 0..3
  card: Card;

  value: number; // 確定値（ジョーカー宣言値 / J=10 / ♠3相殺で0など）
  delta: number; // totalに与えた差分（相殺で0になる）

  beforeTotal: number;
  afterTotal: number;

  beforeMode: Mode;
  afterMode: Mode;

  note?: string;
};


export type GameState = {
  seats: [Seat, Seat, Seat, Seat];
  deck: Card[]; // 山札
  turn: number; // 0..3
  total: number;
  mode: Mode;
  history: PlayLog[];
  result: GameResult;
  lastCard: Card | null; // ♠3判定用（直前カード）
};

export type PlayOrigin = "HAND" | "DECK";


