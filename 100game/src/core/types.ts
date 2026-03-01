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

export type Mode = "UP" | "DOWN"; // UP: target以上で負け / DOWN: 0以下で負け

export type Difficulty = "SMART" | "CASUAL";

// ゲームタイプ（上限値）
export type GameType = 100 | 200 | 300 | 400 | 500 | "EXTRA";

export type Card = {
  id: string;
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

export type PlayOrigin = "HAND" | "DECK";

export type PlayLog = {
  origin: PlayOrigin;
  seat: number; // 0..3
  card: Card;

  value: number;
  delta: number;

  beforeTotal: number;
  afterTotal: number;

  beforeMode: Mode;
  afterMode: Mode;

  note?: string;
};

export type SystemLog = {
  id: number;                  // 連番（toastの既読管理に使う）
  kind: "REDEAL" | "INFO";
  afterPlayIndex: number;      // “何手目の直後”に発生したか（history.length を入れる）
  message: string;             // 表示用
};

export type GameState = {
  seats: [Seat, Seat, Seat, Seat];

  gameType: GameType;
  target: number;

  discard: Card[];

  deck: Card[];
  turn: number;
  total: number;
  mode: Mode;
  history: PlayLog[];
  result: GameResult;

  lastCard: Card | null;

  systemLogs: SystemLog[];
};