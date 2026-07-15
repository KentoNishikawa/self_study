import type { Card, Difficulty, GameState, Mode, Rank, SeatKind } from "./types";
import { getUserTitleId } from "./userSettings";

export type MatchTelemetry = {
  matchId: string;
  startedAt: string;
  directionStart: GameState["mode"];
  initialHumanHand: Card[];
  initialHandsBySeat: Card[][];
  everHandAllRed: boolean;
  everHandAllBlack: boolean;
  everHandSameSuit: boolean;
  handSequenceSignatures: string[];
  handSequenceSignaturesBySeat: string[][];
  loseCertainEventCounts: Record<string, number>;
  tablePlayActorCardSequence: string[];
  activeLoseCertainEvent: LoseCertainActiveEvent | null;
  lastProcessedHistoryLength: number;
  lastProcessedActorHistoryLength: number;
  initialOtherHumanSeatIndexes: number[];
  hostOtherLeaveEvents: HostOtherLeaveEvent[];
  lastSeatKinds: SeatKind[];
};

type HostOtherLeaveEvent = {
  seatIndex: number;
  afterPlayIndex: number;
};

export type RematchSessionStats = {
  totalCount: number;
  aliveTotal: number;
  deadTotal: number;
  aliveStreak: number;
  deadStreak: number;
};

type LoseCertainRole = "creator" | "target" | "witness";
type LoseCertainAfterAction = "any" | "creator_exit" | "target_exit" | "target_spade3" | "target_dead";

type LoseCertainActiveEvent = {
  creatorSeat: number;
  targetSeat: number;
  role: LoseCertainRole;
  countedActions: string[];
};

type MatchSaveOptions = {
  state: GameState;
  telemetry: MatchTelemetry;
  difficulty: Difficulty;
  isGuestSession: boolean;
  isMulti?: boolean;
  roomId?: string | null;
  mpSeatIndex?: number | null;
  rematchSessionStats?: RematchSessionStats | null;
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
  handPlayCount: number;
  deckPlayCount: number;
  jokerPlayCount: number;
  spade3CounterCount: number;
  timeoutPlayCount: number;
  timeoutDeckPlayCount: number;
  initialSeatKind: SeatKind | null;
  initialIconIdSnapshot: string | null;
  initialIconTypeIds: string[] | null;
  jokerUsedMatchDeadCount: number;
  jokerBustCount: number;
  deadWithJokerInHandCount: number;
  myJokerCounteredBySpade3Count: number;
  selfJokerAfterPreviousJokerCount: number;
  selfSpade3AfterPreviousJokerCount: number;
  selfSpade3AfterPreviousJokerDeadMargin1Count: number;
  selfPlayRankSet: string[];
  selfPlaySuitSet: string[];
  selfPlayCardSet: string[];
  selfPlayRankSequence: string[];
  selfPlayCardSequence: string[];
  sourceCardPlayCounts: Record<string, number>;
  initialHandCardSequence: string[];
  handSequenceSignatures: string[];
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
  playedCardSet: string[];
  playedSuitSet: string[];
  playedRankCounts: Partial<Record<Rank, number>>;
  selfPlayRankSequence: string[];
  selfPlayCardSequence: string[];
  selfPlaySequenceSignatures: string[];
  handSequenceSignatures: string[];
  loseCertainEventCounts: Record<string, number>;
  redealCount: number;
  rematchSessionTotalCount: number;
  rematchSessionAliveTotal: number;
  rematchSessionDeadTotal: number;
  rematchSessionAliveStreak: number;
  rematchSessionDeadStreak: number;
  hostOtherLeavePatternCounts: Record<string, number>;
};

const savedMatchIds = new Set<string>();

export function createMatchTelemetry(state: GameState): MatchTelemetry {
  const initialHumanHand = cloneCards(state.seats[0]?.hand ?? []);
  const initialHandsBySeat = state.seats.map((seat) => cloneCards(seat.hand));
  const telemetry: MatchTelemetry = {
    matchId: typeof state.matchId === "string" && state.matchId ? state.matchId : createMatchId(),
    startedAt: typeof state.startedAt === "string" && state.startedAt ? state.startedAt : new Date().toISOString(),
    directionStart: state.mode,
    initialHumanHand,
    initialHandsBySeat,
    everHandAllRed: isAllRedHand(initialHumanHand),
    everHandAllBlack: isAllBlackHand(initialHumanHand),
    everHandSameSuit: isSameSuitHand(initialHumanHand),
    handSequenceSignatures: [createHandSequenceSignature(initialHumanHand)].filter(Boolean),
    handSequenceSignaturesBySeat: initialHandsBySeat.map((hand) => [createHandSequenceSignature(hand)].filter(Boolean)),
    loseCertainEventCounts: {},
    tablePlayActorCardSequence: [],
    initialOtherHumanSeatIndexes: state.seats
      .map((seat, index) => ({ seat, index }))
      .filter((item) => item.index !== 0 && item.seat.kind === "HUMAN")
      .map((item) => item.index),
    hostOtherLeaveEvents: [],
    activeLoseCertainEvent: null,
    lastProcessedHistoryLength: 0,
    lastProcessedActorHistoryLength: 0,
    lastSeatKinds: state.seats.map((seat) => seat.kind),
  };

  updateMatchTelemetryFromState(telemetry, state);
  return telemetry;
}

export function updateMatchTelemetryFromState(telemetry: MatchTelemetry | null, state: GameState | null) {
  if (!telemetry || !state) return;
  updateActorCardSequenceTelemetryFromState(telemetry, state);
  updateHostOtherLeaveTelemetryFromState(telemetry, state);
  updateLoseCertainTelemetryFromState(telemetry, state);
  const hand = state.seats[0]?.hand ?? [];
  if (isAllRedHand(hand)) telemetry.everHandAllRed = true;
  if (isAllBlackHand(hand)) telemetry.everHandAllBlack = true;
  if (isSameSuitHand(hand)) telemetry.everHandSameSuit = true;

  state.seats.forEach((seat, index) => {
    const signature = createHandSequenceSignature(seat.hand);
    if (!signature) return;
    const signatures = telemetry.handSequenceSignaturesBySeat[index] ?? [];
    if (!signatures.includes(signature)) signatures.push(signature);
    telemetry.handSequenceSignaturesBySeat[index] = signatures;
  });
  telemetry.handSequenceSignatures = telemetry.handSequenceSignaturesBySeat[0] ?? [];
}

export function recordCurrentPlayerLoseCertainExit(telemetry: MatchTelemetry | null) {
  if (!telemetry) return;
  recordLoseCertainExit(telemetry, 0);
}

export async function saveLoseCertainEventCounts(telemetry: MatchTelemetry | null): Promise<boolean> {
  if (!telemetry) return false;
  const counts = Object.fromEntries(Object.entries(telemetry.loseCertainEventCounts).filter(([, value]) => Number(value) > 0));
  if (Object.keys(counts).length === 0) return true;

  try {
    const response = await fetch("/api/lose-certain-events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: telemetry.matchId, counts }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function saveCompletedSoloMatch(options: MatchSaveOptions): Promise<boolean> {
  const { state, telemetry, difficulty, isGuestSession, isMulti = false, roomId = null, mpSeatIndex = null, rematchSessionStats = null } = options;
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
    rematchSessionStats,
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
  const { state, telemetry, difficulty, isGuestSession, isMulti, roomId, mpSeatIndex, rematchSessionStats } = options;
  const selfParticipantNo = isMulti ? normalizeParticipantNo((mpSeatIndex ?? 0) + 1) : 1;
  const loserParticipantNo = state.result.status === "LOSE"
    ? isMulti ? normalizeParticipantNo(state.result.loserSeat + selfParticipantNo) : state.result.loserSeat + 1
    : null;
  const resultReason = state.result.status === "LOSE" ? "bust" : state.result.status === "VOID" ? "void" : "deck_end";
  const participants = buildParticipants(state, telemetry, isGuestSession, isMulti, selfParticipantNo);
  const tableCardStats = buildTableCardStats(state);

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
    matchLogCount: getMatchLogCount(state),
    tablePlayRankSet: tableCardStats.rankSet,
    tablePlaySuitSet: tableCardStats.suitSet,
    tablePlayCardSet: tableCardStats.cardSet,
    tablePlayRankSequence: tableCardStats.rankSequence,
    tablePlayCardSequence: tableCardStats.cardSequence,
    tablePlayActorCardSequence: createTablePlayActorCardSequence(state, telemetry),
    startedAt: telemetry.startedAt,
    endedAt: new Date().toISOString(),
    participants,
    humanStats: buildHumanStats(state, telemetry, rematchSessionStats),
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
    const seatCardStats = buildCardStatsFromLogs(seatLogs);
    const participantNo = isMulti ? normalizeParticipantNo(index + selfParticipantNo) : index + 1;
    const isSelf = index === 0;
    const isNpc = seat.kind === "NPC";
    const isSeatGuest = isSelf ? isGuestSession : Boolean(seat.isGuest);
    const isLoser = loserSeat === index;
    const isWinner = state.result.status === "LOSE" && !isLoser;
    const initialSnapshot = state.initialSeatSnapshots?.[index] ?? null;
    const timeoutPlayCount = seatLogs.filter((log) => log.trigger === "TIMEOUT").length;
    const timeoutDeckPlayCount = seatLogs.filter((log) => log.trigger === "TIMEOUT" && log.origin === "DECK").length;

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
      handPlayCount: seatLogs.filter((log) => log.origin === "HAND").length,
      deckPlayCount: seatLogs.filter((log) => log.origin === "DECK").length,
      jokerPlayCount: seatLogs.filter((log) => log.card.rank === "JOKER").length,
      spade3CounterCount: seatLogs.filter((log) => isSpade3CounterLog(log.card, log.note)).length,
      timeoutPlayCount,
      timeoutDeckPlayCount,
      initialSeatKind: initialSnapshot?.seatKind ?? null,
      initialIconIdSnapshot: initialSnapshot?.iconId ?? null,
      initialIconTypeIds: initialSnapshot ? [...initialSnapshot.iconTypeIds] : null,
      jokerUsedMatchDeadCount: isLoser && seatLogs.some((log) => log.card.rank === "JOKER") ? 1 : 0,
      jokerBustCount: seatLogs.filter((log) => isJokerBustLog(log, state.target)).length,
      deadWithJokerInHandCount: isLoser && seat.hand.some(isJokerCard) ? 1 : 0,
      myJokerCounteredBySpade3Count: seatLogs.filter((log) => log.card.rank === "JOKER" && typeof log.note === "string" && log.note.includes("♠3で無効化")).length,
      selfJokerAfterPreviousJokerCount: countPlayAfterPreviousJoker(state, index, (log) => log.card.rank === "JOKER"),
      selfSpade3AfterPreviousJokerCount: countPlayAfterPreviousJoker(state, index, (log) => isSpade3(log.card)),
      selfSpade3AfterPreviousJokerDeadMargin1Count: countPlayAfterPreviousJoker(state, index, (log) => isSpade3(log.card) && isDeadMarginOne(log.beforeMode, log.beforeTotal, state.target)),
      selfPlayRankSet: seatCardStats.rankSet,
      selfPlaySuitSet: seatCardStats.suitSet,
      selfPlayCardSet: seatCardStats.cardSet,
      selfPlayRankSequence: seatCardStats.rankSequence,
      selfPlayCardSequence: seatCardStats.cardSequence,
      sourceCardPlayCounts: buildSourceCardPlayCounts(seatLogs),
      initialHandCardSequence: (telemetry.initialHandsBySeat[index] ?? []).map(cardSignaturePart),
      handSequenceSignatures: telemetry.handSequenceSignaturesBySeat[index] ?? [],
    };
  });
}

function buildHumanStats(state: GameState, telemetry: MatchTelemetry, rematchSessionStats: RematchSessionStats | null): HumanStatsPayload {
  const humanLogs = state.history.filter((log) => log.seat === 0);
  const totals = [0, ...state.history.map((log) => log.afterTotal), state.total].filter((value) => Number.isFinite(value));
  const ranks = new Set<string>();
  const cards = new Set<string>();
  const suits = new Set<string>();
  const rankCounts: Partial<Record<Rank, number>> = {};
  const sequenceRanks: string[] = [];
  const sequenceCards: string[] = [];

  for (const log of humanLogs) {
    ranks.add(log.card.rank);
    cards.add(cardSignaturePart(log.card));
    if (log.card.suit !== "JOKER") suits.add(log.card.suit);
    rankCounts[log.card.rank] = (rankCounts[log.card.rank] ?? 0) + 1;
    sequenceRanks.push(log.card.rank);
    sequenceCards.push(cardSignaturePart(log.card));
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
    playedCardSet: Array.from(cards),
    playedSuitSet: Array.from(suits),
    playedRankCounts: rankCounts,
    selfPlayRankSequence: sequenceRanks,
    selfPlayCardSequence: sequenceCards,
    selfPlaySequenceSignatures: sequenceRanks.length > 0 ? [`PLAY_SEQ_${sequenceRanks.join("_")}`] : [],
    handSequenceSignatures: telemetry.handSequenceSignatures,
    loseCertainEventCounts: { ...telemetry.loseCertainEventCounts },
    redealCount: countRedealLogs(state),
    rematchSessionTotalCount: rematchSessionStats?.totalCount ?? 0,
    rematchSessionAliveTotal: rematchSessionStats?.aliveTotal ?? 0,
    rematchSessionDeadTotal: rematchSessionStats?.deadTotal ?? 0,
    rematchSessionAliveStreak: rematchSessionStats?.aliveStreak ?? 0,
    rematchSessionDeadStreak: rematchSessionStats?.deadStreak ?? 0,
    hostOtherLeavePatternCounts: buildHostOtherLeavePatternCounts(telemetry),
  };
}

function updateHostOtherLeaveTelemetryFromState(telemetry: MatchTelemetry, state: GameState) {
  const targetSeatIndexes = new Set(telemetry.initialOtherHumanSeatIndexes ?? []);
  if (targetSeatIndexes.size === 0) return;

  const previousSeatKinds = telemetry.lastSeatKinds ?? state.seats.map((seat) => seat.kind);
  for (const seatIndex of targetSeatIndexes) {
    if (previousSeatKinds[seatIndex] !== "HUMAN" || state.seats[seatIndex]?.kind !== "NPC") continue;
    if (telemetry.hostOtherLeaveEvents.some((event) => event.seatIndex === seatIndex)) continue;
    telemetry.hostOtherLeaveEvents.push({ seatIndex, afterPlayIndex: state.history.length });
  }
}

function buildHostOtherLeavePatternCounts(telemetry: MatchTelemetry): Record<string, number> {
  const requiredSeats = telemetry.initialOtherHumanSeatIndexes ?? [];
  const requiredLeaveCount = requiredSeats.length;
  if (requiredLeaveCount <= 0) return {};

  const requiredSeatSet = new Set(requiredSeats);
  const events = (telemetry.hostOtherLeaveEvents ?? []).filter((event) => requiredSeatSet.has(event.seatIndex));
  const leftSeatSet = new Set(events.map((event) => event.seatIndex));
  if (leftSeatSet.size !== requiredLeaveCount) return {};

  const startCountKey = String(requiredLeaveCount + 1);
  const patterns = new Set<string>(["any"]);
  const turnCounts = new Map<number, number>();
  for (const event of events) {
    turnCounts.set(event.afterPlayIndex, (turnCounts.get(event.afterPlayIndex) ?? 0) + 1);
  }

  if ([...turnCounts.values()].some((count) => count >= requiredLeaveCount)) {
    patterns.add("same_turn_all");
  }

  const oneLeaveTurns = [...turnCounts.entries()]
    .filter(([, count]) => count === 1)
    .map(([turn]) => turn)
    .sort((a, b) => a - b);
  if (oneLeaveTurns.length >= requiredLeaveCount) {
    patterns.add("one_per_turn");
  }
  if (hasConsecutiveRun(oneLeaveTurns, requiredLeaveCount)) {
    patterns.add("one_per_consecutive_turn");
  }

  const counts: Record<string, number> = {};
  for (const pattern of patterns) {
    counts[`start_${startCountKey}:pattern_${pattern}`] = 1;
    counts[`start_any:pattern_${pattern}`] = 1;
  }
  return counts;
}

function hasConsecutiveRun(values: number[], requiredLength: number) {
  if (requiredLength <= 1) return values.length >= 1;
  let runLength = 0;
  let previous: number | null = null;
  for (const value of values) {
    if (previous == null || value === previous + 1) {
      runLength += 1;
    } else if (value !== previous) {
      runLength = 1;
    }
    previous = value;
    if (runLength >= requiredLength) return true;
  }
  return false;
}

function updateActorCardSequenceTelemetryFromState(telemetry: MatchTelemetry, state: GameState) {
  while (telemetry.lastProcessedActorHistoryLength < state.history.length) {
    const log = state.history[telemetry.lastProcessedActorHistoryLength];
    telemetry.lastProcessedActorHistoryLength += 1;
    if (!log) continue;
    telemetry.tablePlayActorCardSequence.push(actorCardSignaturePart(state, log.seat, log.card));
  }
}

function updateLoseCertainTelemetryFromState(telemetry: MatchTelemetry, state: GameState) {
  const previousSeatKinds = telemetry.lastSeatKinds ?? state.seats.map((seat) => seat.kind);
  for (let seatIndex = 0; seatIndex < state.seats.length; seatIndex += 1) {
    if (previousSeatKinds[seatIndex] === "HUMAN" && state.seats[seatIndex]?.kind === "NPC") {
      recordLoseCertainExit(telemetry, seatIndex);
    }
  }
  telemetry.lastSeatKinds = state.seats.map((seat) => seat.kind);

  while (telemetry.lastProcessedHistoryLength < state.history.length) {
    const log = state.history[telemetry.lastProcessedHistoryLength];
    telemetry.lastProcessedHistoryLength += 1;
    if (!log) continue;

    resolveActiveLoseCertainEventAfterPlay(telemetry, state, log);
    maybeStartLoseCertainEvent(telemetry, state, log);
  }

  if (state.result.status === "LOSE" && telemetry.activeLoseCertainEvent?.targetSeat === state.result.loserSeat) {
    recordLoseCertainAfterAction(telemetry, telemetry.activeLoseCertainEvent, "target_dead");
    telemetry.activeLoseCertainEvent = null;
  }

  if (state.result.status !== "PLAYING") {
    telemetry.activeLoseCertainEvent = null;
  }
}

function maybeStartLoseCertainEvent(telemetry: MatchTelemetry, state: GameState, log: GameState["history"][number]) {
  if (state.result.status !== "PLAYING") return;
  const creatorSeat = log.seat;
  const targetSeat = state.turn;
  if (!Number.isInteger(creatorSeat) || !Number.isInteger(targetSeat)) return;
  if (creatorSeat < 0 || creatorSeat > 3 || targetSeat < 0 || targetSeat > 3) return;
  if (creatorSeat === targetSeat) return;
  if (state.seats[targetSeat]?.kind !== "HUMAN") return;
  if (hasSurvivalMove(state, targetSeat)) return;

  const event: LoseCertainActiveEvent = {
    creatorSeat,
    targetSeat,
    role: getLoseCertainRoleForSelf(creatorSeat, targetSeat),
    countedActions: [],
  };
  telemetry.activeLoseCertainEvent = event;
  recordLoseCertainAfterAction(telemetry, event, "any");
}

function resolveActiveLoseCertainEventAfterPlay(telemetry: MatchTelemetry, state: GameState, log: GameState["history"][number]) {
  const event = telemetry.activeLoseCertainEvent;
  if (!event) return;

  if (log.seat === event.targetSeat && isSpade3CounterLog(log.card, log.note)) {
    recordLoseCertainAfterAction(telemetry, event, "target_spade3");
    telemetry.activeLoseCertainEvent = null;
    return;
  }

  if (state.result.status === "LOSE" && state.result.loserSeat === event.targetSeat) {
    recordLoseCertainAfterAction(telemetry, event, "target_dead");
    telemetry.activeLoseCertainEvent = null;
    return;
  }

  if (state.result.status !== "PLAYING") {
    telemetry.activeLoseCertainEvent = null;
    return;
  }

  if (log.seat === event.targetSeat && hasSurvivalMove(state, event.targetSeat)) {
    telemetry.activeLoseCertainEvent = null;
  }
}

function recordLoseCertainExit(telemetry: MatchTelemetry, seatIndex: number) {
  const event = telemetry.activeLoseCertainEvent;
  if (!event) return;
  if (seatIndex === event.creatorSeat) {
    recordLoseCertainAfterAction(telemetry, event, "creator_exit");
    return;
  }
  if (seatIndex === event.targetSeat) {
    recordLoseCertainAfterAction(telemetry, event, "target_exit");
    telemetry.activeLoseCertainEvent = null;
  }
}

function recordLoseCertainAfterAction(telemetry: MatchTelemetry, event: LoseCertainActiveEvent, action: LoseCertainAfterAction) {
  const key = toLoseCertainEventCountKey(event.role, action);
  if (!key || event.countedActions.includes(action)) return;
  event.countedActions.push(action);
  telemetry.loseCertainEventCounts[key] = (telemetry.loseCertainEventCounts[key] ?? 0) + 1;
}

function toLoseCertainEventCountKey(role: LoseCertainRole, action: LoseCertainAfterAction): string | null {
  if (action === "any") return `${role}:any`;
  if (role === "creator") {
    if (action === "creator_exit") return "creator:self_exit";
    if (action === "target_exit") return "creator:target_exit";
    if (action === "target_spade3") return "creator:target_spade3";
    if (action === "target_dead") return "creator:target_dead";
  }
  if (role === "target") {
    if (action === "creator_exit") return "target:creator_exit";
    if (action === "target_exit") return "target:self_exit";
    if (action === "target_spade3") return "target:self_spade3";
    if (action === "target_dead") return "target:self_dead";
  }
  if (role === "witness") {
    if (action === "creator_exit") return "witness:creator_exit";
    if (action === "target_exit") return "witness:target_exit";
    if (action === "target_spade3") return "witness:target_spade3";
    if (action === "target_dead") return "witness:target_dead";
  }
  return null;
}

function getLoseCertainRoleForSelf(creatorSeat: number, targetSeat: number): LoseCertainRole {
  if (creatorSeat === 0) return "creator";
  if (targetSeat === 0) return "target";
  return "witness";
}

function hasSurvivalMove(state: GameState, seatIndex: number): boolean {
  const cards = [
    ...(state.seats[seatIndex]?.hand ?? []),
    ...(state.deck.length > 0 ? [state.deck[state.deck.length - 1] as Card] : []),
  ];
  return cards.some((card) => canSurviveCardPlay(state, card));
}

function canSurviveCardPlay(state: GameState, card: Card): boolean {
  if (isSpade3(card) && state.history[state.history.length - 1]?.card.rank === "JOKER") return true;
  if (card.rank === "JOKER") {
    return state.mode === "UP" ? state.total + 1 < state.target : state.total - 1 > 0;
  }

  const value = cardValueForLoseCertain(card);
  if (value == null) return false;
  const afterTotal = state.mode === "UP" ? state.total + value : state.total - value;
  return !wouldLoseByTotal(state.mode, afterTotal, state.target);
}

function cardValueForLoseCertain(card: Card): number | null {
  if (card.rank === "A") return 1;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
  const value = Number(card.rank);
  return Number.isFinite(value) ? value : null;
}

function wouldLoseByTotal(mode: Mode, total: number, target: number): boolean {
  return mode === "UP" ? total >= target : total <= 0;
}

function buildTableCardStats(state: GameState) {
  return buildCardStatsFromLogs(state.history);
}

function createTablePlayActorCardSequence(state: GameState, telemetry: MatchTelemetry) {
  if (telemetry.tablePlayActorCardSequence.length === state.history.length) return [...telemetry.tablePlayActorCardSequence];
  return state.history.map((log) => actorCardSignaturePart(state, log.seat, log.card));
}

function actorCardSignaturePart(state: GameState, seatIndex: number, card: Card) {
  const actor = seatIndex === 0 ? "self" : state.seats[seatIndex]?.kind === "NPC" ? "npc" : "other";
  return `${actor}:${cardSignaturePart(card)}`;
}

function buildCardStatsFromLogs(logs: GameState["history"]) {
  const rankSet = new Set<string>();
  const cardSet = new Set<string>();
  const suitSet = new Set<string>();
  const rankSequence: string[] = [];
  const cardSequence: string[] = [];

  for (const log of logs) {
    rankSet.add(log.card.rank);
    if (log.card.suit !== "JOKER") suitSet.add(log.card.suit);
    cardSet.add(cardSignaturePart(log.card));
    rankSequence.push(log.card.rank);
    cardSequence.push(cardSignaturePart(log.card));
  }

  return {
    rankSet: Array.from(rankSet),
    suitSet: Array.from(suitSet),
    cardSet: Array.from(cardSet),
    rankSequence,
    cardSequence,
  };
}

function buildSourceCardPlayCounts(logs: GameState["history"]) {
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const source = log.origin === "DECK" ? "deck" : "hand";
    const cardGroup = toCardPlayCountGroup(log.card.rank);
    const key = `source_${source}:card_${cardGroup}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function toCardPlayCountGroup(rank: Rank) {
  if (rank === "A") return "ace";
  if (rank === "J") return "jack";
  if (rank === "Q") return "queen";
  if (rank === "K") return "king";
  if (rank === "JOKER") return "joker";
  return "number";
}

function isSpade3CounterLog(card: Card, note: string | undefined) {
  return isSpade3(card) && typeof note === "string" && note.includes("ジョーカー相殺");
}

function isSpade3(card: Card) {
  return card.suit === "S" && card.rank === "3";
}

function isJokerCard(card: Card) {
  return card.suit === "JOKER" || card.rank === "JOKER";
}

function isJokerBustLog(log: GameState["history"][number], target: number) {
  if (log.card.rank !== "JOKER") return false;
  return log.beforeMode === "UP" ? log.afterTotal >= target : log.afterTotal <= 0;
}

function countPlayAfterPreviousJoker(state: GameState, seatIndex: number, predicate: (log: GameState["history"][number]) => boolean) {
  let count = 0;
  for (let index = 1; index < state.history.length; index += 1) {
    const previous = state.history[index - 1];
    const current = state.history[index];
    if (!previous || !current) continue;
    if (previous.card.rank !== "JOKER") continue;
    if (current.seat !== seatIndex) continue;
    if (predicate(current)) count += 1;
  }
  return count;
}

function isDeadMarginOne(mode: GameState["mode"], total: number, target: number) {
  return mode === "UP" ? total === target - 1 : total === 1;
}

function getMatchLogCount(state: GameState) {
  return state.history.length + (state.systemLogs?.length ?? 0);
}

function countRedealLogs(state: GameState) {
  return (state.systemLogs ?? []).filter((log) => log.kind === "REDEAL").length;
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
