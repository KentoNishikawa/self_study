import type { Card, Difficulty, GameState, Rank } from "./types";
import { getUserTitleId } from "./userSettings";

export type MatchTelemetry = {
  matchId: string;
  startedAt: string;
  directionStart: GameState["mode"];
  initialHumanHand: Card[];
  timeoutDeckPlayCountBySeat: number[];
  everHandAllRed: boolean;
  everHandAllBlack: boolean;
  everHandSameSuit: boolean;
  handSequenceSignatures: string[];
};

type MatchSaveOptions = {
  state: GameState;
  telemetry: MatchTelemetry;
  difficulty: Difficulty;
  isGuestSession: boolean;
  isMulti?: boolean;
  roomId?: string | null;
  mpSeatIndex?: number | null;
};

type ParticipantPayload = {
  participantNo: number;
  participantType: "user" | "guest" | "npc";
  displayNameSnapshot: string;
  iconIdSnapshot: string | null;
  titleIdSnapshot: string | null;
  isHost: boolean;
  isWinner: boolean;
  isLoser: boolean;
  finalHandCount: number;
  playedCardCount: number;
  jokerPlayCount: number;
  spade3CounterCount: number;
  timeoutDeckPlayCount: number;
};

type HumanStatsPayload = {
  initialHandAllRed: boolean;
  initialHandAllBlack: boolean;
  initialHandSameSuit: boolean;
  everHandAllRed: boolean;
  everHandAllBlack: boolean;
  everHandSameSuit: boolean;
  maxTotalReached: number | null;
  minTotalReached: number | null;
  playedCardRankSet: string[];
  playedSuitSet: string[];
  playedRankCounts: Partial<Record<Rank, number>>;
  selfPlaySequenceSignatures: string[];
  handSequenceSignatures: string[];
};

const savedMatchIds = new Set<string>();

export function createMatchTelemetry(state: GameState): MatchTelemetry {
  const initialHumanHand = cloneCards(state.seats[0]?.hand ?? []);
  const telemetry: MatchTelemetry = {
    matchId: typeof state.matchId === "string" && state.matchId ? state.matchId : createMatchId(),
    startedAt: typeof state.startedAt === "string" && state.startedAt ? state.startedAt : new Date().toISOString(),
    directionStart: state.mode,
    initialHumanHand,
    timeoutDeckPlayCountBySeat: [0, 0, 0, 0],
    everHandAllRed: isAllRedHand(initialHumanHand),
    everHandAllBlack: isAllBlackHand(initialHumanHand),
    everHandSameSuit: isSameSuitHand(initialHumanHand),
    handSequenceSignatures: [createHandSequenceSignature(initialHumanHand)].filter(Boolean),
  };

  updateMatchTelemetryFromState(telemetry, state);
  return telemetry;
}

export function recordTimeoutDeckPlay(telemetry: MatchTelemetry | null, seatIndex: number) {
  if (!telemetry) return;
  if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 3) return;
  telemetry.timeoutDeckPlayCountBySeat[seatIndex] = (telemetry.timeoutDeckPlayCountBySeat[seatIndex] ?? 0) + 1;
}

export function updateMatchTelemetryFromState(telemetry: MatchTelemetry | null, state: GameState | null) {
  if (!telemetry || !state) return;
  const hand = state.seats[0]?.hand ?? [];
  if (isAllRedHand(hand)) telemetry.everHandAllRed = true;
  if (isAllBlackHand(hand)) telemetry.everHandAllBlack = true;
  if (isSameSuitHand(hand)) telemetry.everHandSameSuit = true;

  const signature = createHandSequenceSignature(hand);
  if (signature && !telemetry.handSequenceSignatures.includes(signature)) {
    telemetry.handSequenceSignatures.push(signature);
  }
}

export async function saveCompletedSoloMatch(options: MatchSaveOptions): Promise<boolean> {
  const { state, telemetry, difficulty, isGuestSession, isMulti = false, roomId = null, mpSeatIndex = null } = options;
  if (isCurrentPlayerGuest(state, isGuestSession)) return false;
  if (state.result.status === "PLAYING") return false;
  if (savedMatchIds.has(telemetry.matchId)) return true;

  savedMatchIds.add(telemetry.matchId);

  const payload = buildMatchPayload({
    state,
    telemetry,
    difficulty,
    isGuestSession: isCurrentPlayerGuest(state, isGuestSession),
    isMulti,
    roomId,
    mpSeatIndex: isMulti ? mpSeatIndex ?? 0 : null,
  });

  try {
    const response = await fetch("/api/matches", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function buildMatchPayload(options: Required<MatchSaveOptions>) {
  const { state, telemetry, difficulty, isGuestSession, isMulti, roomId, mpSeatIndex } = options;
  const selfParticipantNo = isMulti ? normalizeParticipantNo((mpSeatIndex ?? 0) + 1) : 1;
  const loserParticipantNo = state.result.status === "LOSE"
    ? isMulti ? normalizeParticipantNo(state.result.loserSeat + selfParticipantNo) : state.result.loserSeat + 1
    : null;
  const resultReason = state.result.status === "LOSE" ? "bust" : "deck_end";
  const participants = buildParticipants(state, telemetry, isGuestSession, isMulti, selfParticipantNo);

  return {
    matchId: telemetry.matchId,
    mode: isMulti ? "multi" : "solo",
    roomId,
    difficulty,
    gameType: String(state.gameType),
    targetValue: state.target,
    directionStart: telemetry.directionStart,
    finalDirection: getFinalDirection(state),
    finalTotal: state.total,
    resultReason,
    winnerParticipantNo: null,
    loserParticipantNo,
    turnCount: state.history.length,
    startedAt: telemetry.startedAt,
    endedAt: new Date().toISOString(),
    participants,
    humanStats: buildHumanStats(state, telemetry),
    clientParticipantNo: selfParticipantNo,
  };
}

function getFinalDirection(state: GameState): GameState["mode"] {
  if (state.result.status === "LOSE") {
    const lastPlay = state.history[state.history.length - 1];
    return lastPlay?.beforeMode ?? state.mode;
  }

  return state.mode;
}

function buildParticipants(
  state: GameState,
  telemetry: MatchTelemetry,
  isGuestSession: boolean,
  isMulti: boolean,
  selfParticipantNo: number,
): ParticipantPayload[] {
  const loserSeat = state.result.status === "LOSE" ? state.result.loserSeat : null;

  return state.seats.map((seat, index) => {
    const seatLogs = state.history.filter((log) => log.seat === index);
    const participantNo = isMulti ? normalizeParticipantNo(index + selfParticipantNo) : index + 1;
    const isSelf = index === 0;
    const isNpc = seat.kind === "NPC";
    const isSeatGuest = isSelf ? isGuestSession : Boolean(seat.isGuest);
    const isLoser = loserSeat === index;
    const isWinner = state.result.status === "LOSE" && !isLoser;

    return {
      participantNo,
      participantType: isNpc ? "npc" : isSeatGuest ? "guest" : "user",
      displayNameSnapshot: seat.name || (isSelf ? "プレイヤー" : `NPC${participantNo - 1}`),
      iconIdSnapshot: typeof seat.iconId === "string" ? seat.iconId : null,
      titleIdSnapshot: isSelf && !isGuestSession ? getUserTitleId() : null,
      isHost: isMulti ? participantNo === 1 : isSelf,
      isWinner,
      isLoser,
      finalHandCount: seat.hand.length,
      playedCardCount: seatLogs.length,
      jokerPlayCount: seatLogs.filter((log) => log.card.rank === "JOKER").length,
      spade3CounterCount: seatLogs.filter((log) => isSpade3CounterLog(log.card, log.note)).length,
      timeoutDeckPlayCount: telemetry.timeoutDeckPlayCountBySeat[index] ?? 0,
    };
  });
}

function buildHumanStats(state: GameState, telemetry: MatchTelemetry): HumanStatsPayload {
  const humanLogs = state.history.filter((log) => log.seat === 0);
  const totals = [0, ...state.history.map((log) => log.afterTotal), state.total].filter((value) => Number.isFinite(value));
  const ranks = new Set<string>();
  const suits = new Set<string>();
  const rankCounts: Partial<Record<Rank, number>> = {};
  const sequenceRanks: string[] = [];

  for (const log of humanLogs) {
    ranks.add(log.card.rank);
    if (log.card.suit !== "JOKER") suits.add(log.card.suit);
    rankCounts[log.card.rank] = (rankCounts[log.card.rank] ?? 0) + 1;
    sequenceRanks.push(log.card.rank);
  }

  return {
    initialHandAllRed: isAllRedHand(telemetry.initialHumanHand),
    initialHandAllBlack: isAllBlackHand(telemetry.initialHumanHand),
    initialHandSameSuit: isSameSuitHand(telemetry.initialHumanHand),
    everHandAllRed: telemetry.everHandAllRed,
    everHandAllBlack: telemetry.everHandAllBlack,
    everHandSameSuit: telemetry.everHandSameSuit,
    maxTotalReached: totals.length ? Math.max(...totals) : null,
    minTotalReached: totals.length ? Math.min(...totals) : null,
    playedCardRankSet: Array.from(ranks),
    playedSuitSet: Array.from(suits),
    playedRankCounts: rankCounts,
    selfPlaySequenceSignatures: sequenceRanks.length > 0 ? [`PLAY_SEQ_${sequenceRanks.join("_")}`] : [],
    handSequenceSignatures: telemetry.handSequenceSignatures,
  };
}

function isSpade3CounterLog(card: Card, note: string | undefined) {
  return card.suit === "S" && card.rank === "3" && typeof note === "string" && note.includes("ジョーカー相殺");
}

function isAllRedHand(hand: Card[]) {
  return hand.length > 0 && hand.every((card) => card.suit === "H" || card.suit === "D");
}

function isAllBlackHand(hand: Card[]) {
  return hand.length > 0 && hand.every((card) => card.suit === "S" || card.suit === "C");
}

function isSameSuitHand(hand: Card[]) {
  if (hand.length === 0) return false;
  const firstSuit = hand[0]?.suit;
  if (!firstSuit || firstSuit === "JOKER") return false;
  return hand.every((card) => card.suit === firstSuit);
}

function createHandSequenceSignature(hand: Card[]) {
  if (hand.length === 0) return "";
  return `HAND_SEQ_${hand.map(cardSignaturePart).join("_")}`;
}

function cardSignaturePart(card: Card) {
  if (card.suit === "JOKER" || card.rank === "JOKER") return "JOKER";
  return `${card.suit}${card.rank}`;
}

function cloneCards(cards: Card[]) {
  return cards.map((card) => ({ ...card }));
}

function isCurrentPlayerGuest(state: GameState, fallback: boolean) {
  return fallback || Boolean(state.seats[0]?.isGuest);
}

function normalizeParticipantNo(value: number) {
  const normalized = ((value - 1) % 4 + 4) % 4;
  return normalized + 1;
}

function createMatchId() {
  if (typeof crypto.randomUUID === "function") return `match_${crypto.randomUUID()}`;
  return `match_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
