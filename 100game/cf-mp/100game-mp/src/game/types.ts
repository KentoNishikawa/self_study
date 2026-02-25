export type Suit = "S" | "H" | "D" | "C" | "JOKER";
export type Rank =
    | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
    | "J" | "Q" | "K" | "JOKER";

export type Mode = "UP" | "DOWN";
export type Difficulty = "SMART" | "CASUAL";
export type GameType = 100 | 200 | 300 | 400 | 500 | "EXTRA";

export type Card = { id: string; suit: Suit; rank: Rank };

export type SeatKind = "HUMAN" | "NPC";
export type Seat = { kind: SeatKind; name: string; hand: Card[] };

export type GameResult =
    | { status: "PLAYING" }
    | { status: "LOSE"; loserSeat: number; reason: string }
    | { status: "VOID"; reason: string };

export type PlayOrigin = "HAND" | "DECK";

export type PlayLog = {
    origin: PlayOrigin;
    seat: number;
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
    id: number;
    kind: "REDEAL";
    afterPlayIndex: number;
    message: string;
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