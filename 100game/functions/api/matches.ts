import { grantAutomaticAcquisitions } from "./_auto-acquisition";
import { findActiveSession, json, nowIso, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

type MatchMode = "solo" | "multi";
type ResultReason = "bust" | "deck_end" | "host_disband" | "player_left" | "void";
type ParticipantType = "user" | "guest" | "npc";
type Direction = "UP" | "DOWN";
type Difficulty = "CASUAL" | "SMART";
type CardPlayCountSource = "hand" | "deck";
type CardPlayCountGroup = "ace" | "number" | "jack" | "queen" | "king" | "joker";
type CardPlayCountActor = "self" | "previous" | "all";

type MatchParticipantPayload = {
  participantNo?: unknown;
  participantType?: unknown;
  displayNameSnapshot?: unknown;
  iconIdSnapshot?: unknown;
  initialSeatKind?: unknown;
  initialIconIdSnapshot?: unknown;
  initialIconTypeIds?: unknown;
  titleIdSnapshot?: unknown;
  isHost?: unknown;
  isWinner?: unknown;
  isLoser?: unknown;
  finalHandCount?: unknown;
  playedCardCount?: unknown;
  handPlayCount?: unknown;
  deckPlayCount?: unknown;
  jokerPlayCount?: unknown;
  spade3CounterCount?: unknown;
  timeoutPlayCount?: unknown;
  timeoutDeckPlayCount?: unknown;
  jokerUsedMatchDeadCount?: unknown;
  jokerBustCount?: unknown;
  deadWithJokerInHandCount?: unknown;
  myJokerCounteredBySpade3Count?: unknown;
  selfJokerAfterPreviousJokerCount?: unknown;
  selfSpade3AfterPreviousJokerCount?: unknown;
  selfSpade3AfterPreviousJokerDeadMargin1Count?: unknown;
  selfPlayRankSet?: unknown;
  selfPlaySuitSet?: unknown;
  selfPlayCardSet?: unknown;
  selfPlayRankSequence?: unknown;
  selfPlayCardSequence?: unknown;
  sourceCardPlayCounts?: unknown;
  initialHandCardSequence?: unknown;
  handSequenceSignatures?: unknown;
};

type HumanStatsPayload = {
  initialHandAllRed?: unknown;
  initialHandAllBlack?: unknown;
  initialHandSameSuit?: unknown;
  everHandAllRed?: unknown;
  everHandAllBlack?: unknown;
  everHandSameSuit?: unknown;
  maxTotalReached?: unknown;
  minTotalReached?: unknown;
  playedCardRankSet?: unknown;
  playedCardSet?: unknown;
  playedSuitSet?: unknown;
  playedRankCounts?: unknown;
  selfPlayRankSequence?: unknown;
  selfPlayCardSequence?: unknown;
  selfPlaySequenceSignatures?: unknown;
  handSequenceSignatures?: unknown;
  loseCertainEventCounts?: unknown;
  redealCount?: unknown;
  rematchSessionTotalCount?: unknown;
  rematchSessionAliveTotal?: unknown;
  rematchSessionDeadTotal?: unknown;
  rematchSessionAliveStreak?: unknown;
  rematchSessionDeadStreak?: unknown;
  hostOtherLeavePatternCounts?: unknown;
};

type MatchPayload = {
  matchId?: unknown;
  mode?: unknown;
  roomId?: unknown;
  difficulty?: unknown;
  gameType?: unknown;
  targetValue?: unknown;
  directionStart?: unknown;
  finalDirection?: unknown;
  finalTotal?: unknown;
  resultReason?: unknown;
  winnerParticipantNo?: unknown;
  loserParticipantNo?: unknown;
  turnCount?: unknown;
  matchLogCount?: unknown;
  tablePlayRankSet?: unknown;
  tablePlaySuitSet?: unknown;
  tablePlayCardSet?: unknown;
  tablePlayRankSequence?: unknown;
  tablePlayCardSequence?: unknown;
  tablePlayActorCardSequence?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  participants?: unknown;
  humanStats?: unknown;
  clientParticipantNo?: unknown;
};

type NormalizedParticipant = {
  participantNo: number;
  participantType: ParticipantType;
  displayNameSnapshot: string;
  iconIdSnapshot: string | null;
  initialSeatKind: "HUMAN" | "NPC" | null;
  initialIconIdSnapshot: string | null;
  initialIconTypeIds: string[] | null;
  titleIdSnapshot: string | null;
  isHost: 0 | 1;
  isWinner: 0 | 1;
  isLoser: 0 | 1;
  finalHandCount: number;
  playedCardCount: number;
  handPlayCount: number;
  deckPlayCount: number;
  jokerPlayCount: number;
  spade3CounterCount: number;
  timeoutPlayCount: number;
  timeoutDeckPlayCount: number;
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

type NormalizedHumanStats = {
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
  playedRankCounts: RankCountPayload;
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

type NormalizedMatch = {
  matchId: string;
  mode: MatchMode;
  roomId: string | null;
  difficulty: Difficulty;
  gameType: string;
  targetValue: number;
  directionStart: Direction;
  finalDirection: Direction;
  finalTotal: number;
  resultReason: ResultReason;
  winnerParticipantNo: number | null;
  loserParticipantNo: number | null;
  turnCount: number;
  matchLogCount: number;
  tablePlayRankSet: string[];
  tablePlaySuitSet: string[];
  tablePlayCardSet: string[];
  tablePlayRankSequence: string[];
  tablePlayCardSequence: string[];
  tablePlayActorCardSequence: string[];
  startedAt: string;
  endedAt: string;
  participants: NormalizedParticipant[];
  humanStats: NormalizedHumanStats;
  clientParticipantNo: number;
};

type RankCountPayload = {
  ace: number;
  jack: number;
  queen: number;
  king: number;
  number: number;
};

type StatsModeTable = "user_stats_solo" | "user_stats_multi";

type UserStatsModeRow = Record<string, number | string | null> & {
  user_id: string;
};

type UserStatsGlobalRow = Record<string, number | string | null> & {
  user_id: string;
  current_win_streak: number;
  max_win_streak: number;
  current_lose_streak: number;
  max_lose_streak: number;
  max_total_reached: number | null;
  min_total_reached: number | null;
  played_card_rank_set_json: string;
  played_card_set_json: string;
  played_suit_set_json: string;
  self_play_sequence_signatures_json: string;
  hand_sequence_signatures_json: string;
  cleared_title_condition_keys_json: string;
};

const ALLOWED_RESULT_REASONS = new Set<ResultReason>(["bust", "deck_end", "host_disband", "player_left", "void"]);
const ALLOWED_MODES = new Set<MatchMode>(["solo", "multi"]);
const ALLOWED_DIRECTIONS = new Set<Direction>(["UP", "DOWN"]);
const ALLOWED_DIFFICULTIES = new Set<Difficulty>(["CASUAL", "SMART"]);
const CARD_PLAY_COUNT_SOURCES: CardPlayCountSource[] = ["hand", "deck"];
const CARD_PLAY_COUNT_GROUPS: CardPlayCountGroup[] = ["ace", "number", "jack", "queen", "king", "joker"];
const ALLOWED_SOURCE_CARD_PLAY_COUNT_KEYS = new Set(CARD_PLAY_COUNT_SOURCES.flatMap((source) => CARD_PLAY_COUNT_GROUPS.map((group) => `source_${source}:card_${group}`)));
const MAX_JSON_SET_SIZE = 500;

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const body = await readJsonRecord(request) as MatchPayload | null;
  const match = normalizeMatchPayload(body);
  if (!match) {
    return json({ ok: false, message: "試合履歴の保存内容が不正です。" }, { status: 400 });
  }

  const humanParticipant = match.participants.find((participant) => participant.participantNo === match.clientParticipantNo);
  if (!humanParticipant || humanParticipant.participantType !== "user") {
    return json({ ok: false, message: "ログインユーザーの参加者情報がありません。" }, { status: 400 });
  }

  const alreadySaved = await env.DB.prepare("SELECT match_id FROM match_results WHERE match_id = ? LIMIT 1")
    .bind(match.matchId)
    .first<{ match_id: string }>();

  if (alreadySaved && match.mode === "solo") {
    return json({ ok: true, duplicate: true, matchId: match.matchId });
  }

  if (match.mode === "multi") {
    const alreadySavedParticipant = await env.DB.prepare(
      "SELECT user_id FROM match_participants WHERE match_id = ? AND participant_no = ? AND user_id = ? LIMIT 1",
    )
      .bind(match.matchId, match.clientParticipantNo, session.user_id)
      .first<{ user_id: string }>();

    if (alreadySavedParticipant) {
      return json({ ok: true, duplicate: true, matchId: match.matchId });
    }
  }

  const createdAt = nowIso();

  if (!alreadySaved) {
    await env.DB.prepare(
    `
    INSERT OR IGNORE INTO match_results (
      match_id, mode, room_id, difficulty, game_type, target_value,
      direction_start, final_direction, final_total, result_reason, winner_participant_no,
      loser_participant_no, turn_count, match_log_count, redeal_count, all_participants_played_card, table_play_rank_set_json,
      table_play_suit_set_json, table_play_card_set_json, table_play_rank_sequence_json, table_play_card_sequence_json, table_play_actor_card_sequence_json,
      started_at, ended_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      match.matchId,
      match.mode,
      match.roomId,
      match.difficulty,
      match.gameType,
      match.targetValue,
      match.directionStart,
      match.finalDirection,
      match.finalTotal,
      match.resultReason,
      match.winnerParticipantNo,
      match.loserParticipantNo,
      match.turnCount,
      match.matchLogCount,
      match.humanStats.redealCount,
      isAllParticipantsPlayedCard(match) ? 1 : 0,
      JSON.stringify(match.tablePlayRankSet),
      JSON.stringify(match.tablePlaySuitSet),
      JSON.stringify(match.tablePlayCardSet),
      JSON.stringify(match.tablePlayRankSequence),
      JSON.stringify(match.tablePlayCardSequence),
      JSON.stringify(match.tablePlayActorCardSequence),
      match.startedAt,
      match.endedAt,
      createdAt,
    )
      .run();
  }

  for (const participant of match.participants) {
    const participantUserId = participant.participantNo === match.clientParticipantNo && participant.participantType === "user" ? session.user_id : null;

    await env.DB.prepare(
      `
      INSERT INTO match_participants (
        match_id, participant_no, user_id, participant_type, display_name_snapshot,
        icon_id_snapshot, initial_seat_kind, initial_icon_id_snapshot, initial_icon_type_ids_json,
        title_id_snapshot, is_host, is_winner, is_loser,
        final_hand_count, played_card_count, hand_play_count, deck_play_count,
        joker_play_count, spade3_counter_count, timeout_play_count, timeout_deck_play_count,
        joker_used_match_dead_count, joker_bust_count, dead_with_joker_in_hand_count,
        my_joker_countered_by_spade3_count, self_joker_after_previous_joker_count,
        self_spade3_after_previous_joker_count, self_spade3_after_previous_joker_dead_margin1_count,
        self_play_rank_set_json, self_play_suit_set_json, self_play_card_set_json, self_play_rank_sequence_json, self_play_card_sequence_json, source_card_play_counts_json,
        initial_hand_card_sequence_json, hand_sequence_signatures_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_id, participant_no) DO UPDATE SET
        user_id = CASE
          WHEN excluded.user_id IS NOT NULL THEN excluded.user_id
          ELSE match_participants.user_id
        END,
        participant_type = excluded.participant_type,
        display_name_snapshot = excluded.display_name_snapshot,
        icon_id_snapshot = excluded.icon_id_snapshot,
        initial_seat_kind = COALESCE(match_participants.initial_seat_kind, excluded.initial_seat_kind),
        initial_icon_id_snapshot = COALESCE(match_participants.initial_icon_id_snapshot, excluded.initial_icon_id_snapshot),
        initial_icon_type_ids_json = COALESCE(match_participants.initial_icon_type_ids_json, excluded.initial_icon_type_ids_json),
        title_id_snapshot = CASE
          WHEN excluded.title_id_snapshot IS NOT NULL THEN excluded.title_id_snapshot
          ELSE match_participants.title_id_snapshot
        END,
        is_host = excluded.is_host,
        is_winner = excluded.is_winner,
        is_loser = excluded.is_loser,
        final_hand_count = excluded.final_hand_count,
        played_card_count = excluded.played_card_count,
        hand_play_count = excluded.hand_play_count,
        deck_play_count = excluded.deck_play_count,
        joker_play_count = excluded.joker_play_count,
        spade3_counter_count = excluded.spade3_counter_count,
        timeout_play_count = excluded.timeout_play_count,
        timeout_deck_play_count = excluded.timeout_deck_play_count,
        joker_used_match_dead_count = excluded.joker_used_match_dead_count,
        joker_bust_count = excluded.joker_bust_count,
        dead_with_joker_in_hand_count = excluded.dead_with_joker_in_hand_count,
        my_joker_countered_by_spade3_count = excluded.my_joker_countered_by_spade3_count,
        self_joker_after_previous_joker_count = excluded.self_joker_after_previous_joker_count,
        self_spade3_after_previous_joker_count = excluded.self_spade3_after_previous_joker_count,
        self_spade3_after_previous_joker_dead_margin1_count = excluded.self_spade3_after_previous_joker_dead_margin1_count,
        self_play_rank_set_json = excluded.self_play_rank_set_json,
        self_play_suit_set_json = excluded.self_play_suit_set_json,
        self_play_card_set_json = excluded.self_play_card_set_json,
        self_play_rank_sequence_json = excluded.self_play_rank_sequence_json,
        self_play_card_sequence_json = excluded.self_play_card_sequence_json,
        source_card_play_counts_json = excluded.source_card_play_counts_json,
        initial_hand_card_sequence_json = excluded.initial_hand_card_sequence_json,
        hand_sequence_signatures_json = excluded.hand_sequence_signatures_json
      `,
    )
      .bind(
        match.matchId,
        participant.participantNo,
        participantUserId,
        participant.participantType,
        participant.displayNameSnapshot,
        participant.iconIdSnapshot,
        participant.initialSeatKind,
        participant.initialIconIdSnapshot,
        participant.initialIconTypeIds == null ? null : JSON.stringify(participant.initialIconTypeIds),
        participant.titleIdSnapshot,
        participant.isHost,
        participant.isWinner,
        participant.isLoser,
        participant.finalHandCount,
        participant.playedCardCount,
        participant.handPlayCount,
        participant.deckPlayCount,
        participant.jokerPlayCount,
        participant.spade3CounterCount,
        participant.timeoutPlayCount,
        participant.timeoutDeckPlayCount,
        participant.jokerUsedMatchDeadCount,
        participant.jokerBustCount,
        participant.deadWithJokerInHandCount,
        participant.myJokerCounteredBySpade3Count,
        participant.selfJokerAfterPreviousJokerCount,
        participant.selfSpade3AfterPreviousJokerCount,
        participant.selfSpade3AfterPreviousJokerDeadMargin1Count,
        JSON.stringify(participant.selfPlayRankSet),
        JSON.stringify(participant.selfPlaySuitSet),
        JSON.stringify(participant.selfPlayCardSet),
        JSON.stringify(participant.selfPlayRankSequence),
        JSON.stringify(participant.selfPlayCardSequence),
        JSON.stringify(participant.sourceCardPlayCounts),
        JSON.stringify(participant.initialHandCardSequence),
        JSON.stringify(participant.handSequenceSignatures),
        createdAt,
      )
      .run();
  }

  await ensureUserStats(env, session.user_id, createdAt);
  await updateUserStats(env, session.user_id, match, humanParticipant, createdAt);
  await grantAutomaticAcquisitions(env, session.user_id, {
    acquiredAt: createdAt,
    matchStats: createMatchStats(match, humanParticipant),
    matchAchievementKeys: [],
  });

  return json({ ok: true, matchId: match.matchId });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

function normalizeMatchPayload(body: MatchPayload | null): NormalizedMatch | null {
  if (!body || typeof body !== "object") return null;

  const matchId = normalizeText(body.matchId);
  if (!matchId || !/^match_[a-zA-Z0-9_-]{8,}$/.test(matchId)) return null;

  const mode = normalizeEnum(body.mode, ALLOWED_MODES);
  const directionStart = normalizeEnum(body.directionStart, ALLOWED_DIRECTIONS);
  const finalDirection = normalizeEnum(body.finalDirection, ALLOWED_DIRECTIONS);
  const difficulty = normalizeEnum(body.difficulty, ALLOWED_DIFFICULTIES);
  const resultReason = normalizeEnum(body.resultReason, ALLOWED_RESULT_REASONS);
  if (!mode || !directionStart || !finalDirection || !difficulty || !resultReason) return null;

  const gameType = normalizeText(body.gameType);
  const targetValue = normalizeInteger(body.targetValue, 0, 1000000);
  const finalTotal = normalizeInteger(body.finalTotal, -1000000, 1000000);
  const turnCount = normalizeInteger(body.turnCount, 0, 1000000);
  const matchLogCount = normalizeInteger(body.matchLogCount, 0, 1000000) ?? turnCount;
  const startedAt = normalizeIso(body.startedAt);
  const endedAt = normalizeIso(body.endedAt);
  if (!gameType || targetValue == null || finalTotal == null || turnCount == null || !startedAt || !endedAt) return null;

  const participants = normalizeParticipants(body.participants);
  if (participants.length === 0) return null;

  return {
    matchId,
    mode,
    roomId: normalizeNullableText(body.roomId),
    difficulty,
    gameType,
    targetValue,
    directionStart,
    finalDirection,
    finalTotal,
    resultReason,
    winnerParticipantNo: normalizeParticipantNoOrNull(body.winnerParticipantNo),
    loserParticipantNo: normalizeParticipantNoOrNull(body.loserParticipantNo),
    turnCount,
    matchLogCount: matchLogCount ?? turnCount,
    tablePlayRankSet: normalizeStringArray(body.tablePlayRankSet),
    tablePlaySuitSet: normalizeStringArray(body.tablePlaySuitSet),
    tablePlayCardSet: normalizeStringArray(body.tablePlayCardSet),
    tablePlayRankSequence: normalizeStringArray(body.tablePlayRankSequence),
    tablePlayCardSequence: normalizeStringArray(body.tablePlayCardSequence),
    tablePlayActorCardSequence: normalizeStringArray(body.tablePlayActorCardSequence),
    startedAt,
    endedAt,
    participants,
    humanStats: normalizeHumanStats(body.humanStats),
    clientParticipantNo: normalizeInteger(body.clientParticipantNo, 1, 4) ?? 1,
  };
}

function normalizeParticipants(value: unknown): NormalizedParticipant[] {
  if (!Array.isArray(value)) return [];

  const participants: NormalizedParticipant[] = [];
  const seen = new Set<number>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item as MatchParticipantPayload;
    const participantNo = normalizeInteger(source.participantNo, 1, 4);
    const participantType = normalizeParticipantType(source.participantType);
    const displayNameSnapshot = normalizeText(source.displayNameSnapshot);
    if (participantNo == null || !participantType || !displayNameSnapshot || seen.has(participantNo)) continue;

    const playedCardCount = normalizeInteger(source.playedCardCount, 0, 1000000) ?? 0;
    const handPlayCount = normalizeInteger(source.handPlayCount, 0, 1000000) ?? 0;
    const deckPlayCount = normalizeInteger(source.deckPlayCount, 0, 1000000) ?? 0;
    const timeoutDeckPlayCount = Math.min(
      deckPlayCount,
      normalizeInteger(source.timeoutDeckPlayCount, 0, 1000000) ?? 0,
    );
    const normalizedTimeoutPlayCount = normalizeInteger(source.timeoutPlayCount, 0, 1000000);
    const timeoutPlayCount = Math.min(
      playedCardCount,
      Math.max(timeoutDeckPlayCount, normalizedTimeoutPlayCount ?? timeoutDeckPlayCount),
    );

    seen.add(participantNo);
    participants.push({
      participantNo,
      participantType,
      displayNameSnapshot,
      iconIdSnapshot: normalizeNullableText(source.iconIdSnapshot),
      initialSeatKind: normalizeInitialSeatKind(source.initialSeatKind),
      initialIconIdSnapshot: normalizeNullableText(source.initialIconIdSnapshot),
      initialIconTypeIds: normalizeNullableStringArray(source.initialIconTypeIds),
      titleIdSnapshot: normalizeNullableText(source.titleIdSnapshot),
      isHost: normalizeFlag(source.isHost),
      isWinner: normalizeFlag(source.isWinner),
      isLoser: normalizeFlag(source.isLoser),
      finalHandCount: normalizeInteger(source.finalHandCount, 0, 1000) ?? 0,
      playedCardCount,
      handPlayCount,
      deckPlayCount,
      jokerPlayCount: normalizeInteger(source.jokerPlayCount, 0, 1000000) ?? 0,
      spade3CounterCount: normalizeInteger(source.spade3CounterCount, 0, 1000000) ?? 0,
      timeoutPlayCount,
      timeoutDeckPlayCount,
      jokerUsedMatchDeadCount: normalizeInteger(source.jokerUsedMatchDeadCount, 0, 1000000) ?? 0,
      jokerBustCount: normalizeInteger(source.jokerBustCount, 0, 1000000) ?? 0,
      deadWithJokerInHandCount: normalizeInteger(source.deadWithJokerInHandCount, 0, 1000000) ?? 0,
      myJokerCounteredBySpade3Count: normalizeInteger(source.myJokerCounteredBySpade3Count, 0, 1000000) ?? 0,
      selfJokerAfterPreviousJokerCount: normalizeInteger(source.selfJokerAfterPreviousJokerCount, 0, 1000000) ?? 0,
      selfSpade3AfterPreviousJokerCount: normalizeInteger(source.selfSpade3AfterPreviousJokerCount, 0, 1000000) ?? 0,
      selfSpade3AfterPreviousJokerDeadMargin1Count: normalizeInteger(source.selfSpade3AfterPreviousJokerDeadMargin1Count, 0, 1000000) ?? 0,
      selfPlayRankSet: normalizeStringArray(source.selfPlayRankSet),
      selfPlaySuitSet: normalizeStringArray(source.selfPlaySuitSet),
      selfPlayCardSet: normalizeStringArray(source.selfPlayCardSet),
      selfPlayRankSequence: normalizeStringArray(source.selfPlayRankSequence),
      selfPlayCardSequence: normalizeStringArray(source.selfPlayCardSequence),
      sourceCardPlayCounts: normalizeSourceCardPlayCounts(source.sourceCardPlayCounts),
      initialHandCardSequence: normalizeStringArray(source.initialHandCardSequence),
      handSequenceSignatures: normalizeStringArray(source.handSequenceSignatures),
    });
  }

  return participants.sort((a, b) => a.participantNo - b.participantNo);
}

function normalizeHumanStats(value: unknown): NormalizedHumanStats {
  const source = value && typeof value === "object" ? value as HumanStatsPayload : {};
  return {
    initialHandAllRed: Boolean(source.initialHandAllRed),
    initialHandAllBlack: Boolean(source.initialHandAllBlack),
    initialHandSameSuit: Boolean(source.initialHandSameSuit),
    everHandAllRed: Boolean(source.everHandAllRed),
    everHandAllBlack: Boolean(source.everHandAllBlack),
    everHandSameSuit: Boolean(source.everHandSameSuit),
    maxTotalReached: normalizeInteger(source.maxTotalReached, -1000000, 1000000),
    minTotalReached: normalizeInteger(source.minTotalReached, -1000000, 1000000),
    playedCardRankSet: normalizeStringArray(source.playedCardRankSet),
    playedCardSet: normalizeStringArray(source.playedCardSet),
    playedSuitSet: normalizeStringArray(source.playedSuitSet),
    playedRankCounts: normalizeRankCounts(source.playedRankCounts),
    selfPlayRankSequence: normalizeStringArray(source.selfPlayRankSequence),
    selfPlayCardSequence: normalizeStringArray(source.selfPlayCardSequence),
    selfPlaySequenceSignatures: normalizeStringArray(source.selfPlaySequenceSignatures),
    handSequenceSignatures: normalizeStringArray(source.handSequenceSignatures),
    loseCertainEventCounts: readJsonNumberMapFromUnknown(source.loseCertainEventCounts),
    redealCount: normalizeInteger(source.redealCount, 0, 1000000) ?? 0,
    rematchSessionTotalCount: normalizeInteger(source.rematchSessionTotalCount, 0, 1000000) ?? 0,
    rematchSessionAliveTotal: normalizeInteger(source.rematchSessionAliveTotal, 0, 1000000) ?? 0,
    rematchSessionDeadTotal: normalizeInteger(source.rematchSessionDeadTotal, 0, 1000000) ?? 0,
    rematchSessionAliveStreak: normalizeInteger(source.rematchSessionAliveStreak, 0, 1000000) ?? 0,
    rematchSessionDeadStreak: normalizeInteger(source.rematchSessionDeadStreak, 0, 1000000) ?? 0,
    hostOtherLeavePatternCounts: readJsonNumberMapFromUnknown(source.hostOtherLeavePatternCounts),
  };
}

function readRelativeParticipant(match: NormalizedMatch, human: NormalizedParticipant, offset: number) {
  const participantNo = ((human.participantNo - 1 + offset) % 4) + 1;
  return match.participants.find((participant) => participant.participantNo === participantNo) ?? null;
}

function readRelativeInitialHand(match: NormalizedMatch, human: NormalizedParticipant, offset: number) {
  return readRelativeParticipant(match, human, offset)?.initialHandCardSequence ?? [];
}

function readRelativeHandSequenceSignatures(match: NormalizedMatch, human: NormalizedParticipant, offset: number) {
  return readRelativeParticipant(match, human, offset)?.handSequenceSignatures ?? [];
}

function createTimeoutOnlyFinishCountAdditions(match: NormalizedMatch, human: NormalizedParticipant) {
  if (match.resultReason !== "bust" && match.resultReason !== "deck_end") return {};
  const result: Record<string, number> = {};
  const targets: Array<{ key: "self" | "next_1" | "next_2" | "next_3"; participant: NormalizedParticipant | null }> = [
    { key: "self", participant: human },
    { key: "next_1", participant: readRelativeParticipant(match, human, 1) },
    { key: "next_2", participant: readRelativeParticipant(match, human, 2) },
    { key: "next_3", participant: readRelativeParticipant(match, human, 3) },
  ];
  let anyMatched = false;
  for (const target of targets) {
    if (!target.participant || !isTimeoutOnlyFinishParticipant(target.participant)) continue;
    result[target.key] = 1;
    anyMatched = true;
  }
  if (anyMatched) result.any = 1;
  return result;
}

function isTimeoutOnlyFinishParticipant(participant: NormalizedParticipant) {
  return participant.timeoutDeckPlayCount >= 1
    && participant.playedCardCount === participant.timeoutDeckPlayCount
    && participant.deckPlayCount === participant.timeoutDeckPlayCount
    && participant.handPlayCount === 0;
}

function createJokerEventCounts(match: NormalizedMatch, human: NormalizedParticipant) {
  const result: Record<string, number> = {};
  const targets: Array<{ key: "self" | "next_1" | "next_2" | "next_3"; participant: NormalizedParticipant | null }> = [
    { key: "self", participant: human },
    { key: "next_1", participant: readRelativeParticipant(match, human, 1) },
    { key: "next_2", participant: readRelativeParticipant(match, human, 2) },
    { key: "next_3", participant: readRelativeParticipant(match, human, 3) },
  ];

  for (const target of targets) {
    const participant = target.participant;
    if (!participant) continue;
    result[`actor_${target.key}:event_spade3_counter`] = participant.spade3CounterCount;
    result[`actor_${target.key}:event_my_joker_countered`] = participant.myJokerCounteredBySpade3Count;
    result[`actor_${target.key}:event_joker_after_previous_joker`] = participant.selfJokerAfterPreviousJokerCount;
    result[`actor_${target.key}:event_joker_used_match_dead`] = participant.jokerUsedMatchDeadCount;
    result[`actor_${target.key}:event_joker_bust`] = participant.jokerBustCount > 0 ? 1 : 0;
    result[`actor_${target.key}:event_dead_with_joker_in_hand`] = participant.deadWithJokerInHandCount;
  }

  return result;
}

function createMatchCountCompareMetrics(match: NormalizedMatch, human: NormalizedParticipant) {
  const targets: Array<{ key: "self" | "next_1" | "next_2" | "next_3"; participant: NormalizedParticipant | null }> = [
    { key: "self", participant: human },
    { key: "next_1", participant: readRelativeParticipant(match, human, 1) },
    { key: "next_2", participant: readRelativeParticipant(match, human, 2) },
    { key: "next_3", participant: readRelativeParticipant(match, human, 3) },
  ];
  const result: Record<string, Record<string, number>> = {};
  for (const target of targets) {
    const participant = target.participant;
    if (!participant) continue;
    result[target.key] = {
      played_card_count: participant.playedCardCount,
      manual_card_play_count: Math.max(0, participant.playedCardCount - participant.timeoutPlayCount),
      hand_play_count: participant.handPlayCount,
      deck_play_count: participant.deckPlayCount,
      manual_deck_play_count: Math.max(0, participant.deckPlayCount - participant.timeoutDeckPlayCount),
      timeout_deck_play_count: participant.timeoutDeckPlayCount,
      joker_play_count: participant.jokerPlayCount,
      spade3_counter_count: participant.spade3CounterCount,
      my_joker_countered_by_spade3_count: participant.myJokerCounteredBySpade3Count,
      self_joker_after_previous_joker_count: participant.selfJokerAfterPreviousJokerCount,
    };
  }
  return result;
}


function createMatchStats(match: NormalizedMatch, human: NormalizedParticipant) {
  const humanLost = human.isLoser === 1;
  const humanWon = match.resultReason === "bust" && !humanLost;

  return {
    mode: match.mode,
    is_solo_match: match.mode === "solo" ? 1 : 0,
    is_multi_match: match.mode === "multi" ? 1 : 0,
    difficulty: match.difficulty,
    game_type: match.gameType,
    target_value: match.targetValue,
    direction_start: match.directionStart,
    final_direction: match.finalDirection,
    final_total: match.finalTotal,
    result_reason: match.resultReason,
    turn_count: match.turnCount,
    match_log_count: match.matchLogCount,
    match_count_compare_metrics_json: JSON.stringify(createMatchCountCompareMetrics(match, human)),
    table_play_rank_set_json: JSON.stringify(match.tablePlayRankSet),
    table_play_suit_set_json: JSON.stringify(match.tablePlaySuitSet),
    table_play_card_set_json: JSON.stringify(match.tablePlayCardSet),
    table_play_rank_sequence_json: JSON.stringify(match.tablePlayRankSequence),
    table_play_card_sequence_json: JSON.stringify(match.tablePlayCardSequence),
    table_play_actor_card_sequence_json: JSON.stringify(match.tablePlayActorCardSequence),
    participant_icon_slots_json: JSON.stringify(createParticipantIconSlots(match, human)),
    all_participants_played_card: isAllParticipantsPlayedCard(match) ? 1 : 0,
    void_match_count: match.resultReason === "void" ? 1 : 0,
    redeal_count: match.humanStats.redealCount,
    rematch_session_total_count: match.humanStats.rematchSessionTotalCount,
    rematch_session_alive_total: match.humanStats.rematchSessionAliveTotal,
    rematch_session_dead_total: match.humanStats.rematchSessionDeadTotal,
    rematch_session_alive_streak: match.humanStats.rematchSessionAliveStreak,
    rematch_session_dead_streak: match.humanStats.rematchSessionDeadStreak,
    host_other_leave_pattern_counts_json: JSON.stringify(match.humanStats.hostOtherLeavePatternCounts),
    normal_finish_count: match.resultReason === "bust" ? 1 : 0,
    is_winner: human.isWinner,
    is_loser: human.isLoser,
    human_won: humanWon ? 1 : 0,
    human_lost: humanLost ? 1 : 0,
    final_hand_count: human.finalHandCount,
    played_card_count: human.playedCardCount,
    hand_play_count: human.handPlayCount,
    deck_play_count: human.deckPlayCount,
    joker_play_count: human.jokerPlayCount,
    spade3_counter_count: human.spade3CounterCount,
    timeout_deck_play_count: human.timeoutDeckPlayCount,
    timeout_next_1_deck_play_count: readRelativeParticipant(match, human, 1)?.timeoutDeckPlayCount ?? 0,
    timeout_next_2_deck_play_count: readRelativeParticipant(match, human, 2)?.timeoutDeckPlayCount ?? 0,
    timeout_next_3_deck_play_count: readRelativeParticipant(match, human, 3)?.timeoutDeckPlayCount ?? 0,
    joker_used_match_dead_count: human.jokerUsedMatchDeadCount,
    joker_bust_count: human.jokerBustCount,
    dead_with_joker_in_hand_count: human.deadWithJokerInHandCount,
    my_joker_countered_by_spade3_count: human.myJokerCounteredBySpade3Count,
    self_joker_after_previous_joker_count: human.selfJokerAfterPreviousJokerCount,
    joker_event_counts_json: JSON.stringify(createJokerEventCounts(match, human)),
    self_spade3_after_previous_joker_count: human.selfSpade3AfterPreviousJokerCount,
    self_spade3_after_previous_joker_dead_margin1_count: human.selfSpade3AfterPreviousJokerDeadMargin1Count,
    self_play_rank_set_json: JSON.stringify(human.selfPlayRankSet),
    self_play_suit_set_json: JSON.stringify(human.selfPlaySuitSet),
    self_play_card_set_json: JSON.stringify(human.selfPlayCardSet),
    self_play_rank_sequence_json: JSON.stringify(human.selfPlayRankSequence),
    self_play_card_sequence_json: JSON.stringify(human.selfPlayCardSequence),
    initial_hand_card_sequence_json: JSON.stringify(human.initialHandCardSequence),
    initial_hand_next_1_sequence_json: JSON.stringify(readRelativeInitialHand(match, human, 1)),
    initial_hand_next_2_sequence_json: JSON.stringify(readRelativeInitialHand(match, human, 2)),
    initial_hand_next_3_sequence_json: JSON.stringify(readRelativeInitialHand(match, human, 3)),
    hand_sequence_signatures_json: JSON.stringify(human.handSequenceSignatures),
    hand_next_1_sequence_signatures_json: JSON.stringify(readRelativeHandSequenceSignatures(match, human, 1)),
    hand_next_2_sequence_signatures_json: JSON.stringify(readRelativeHandSequenceSignatures(match, human, 2)),
    hand_next_3_sequence_signatures_json: JSON.stringify(readRelativeHandSequenceSignatures(match, human, 3)),
    lose_certain_event_counts_json: JSON.stringify(match.humanStats.loseCertainEventCounts),
  };
}

async function ensureUserStats(env: Env, userId: string, now: string) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_solo (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `,
  )
    .bind(userId, now, now)
    .run();

  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_multi (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `,
  )
    .bind(userId, now, now)
    .run();

  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_global (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `,
  )
    .bind(userId, now, now)
    .run();
}

async function updateUserStats(env: Env, userId: string, match: NormalizedMatch, human: NormalizedParticipant, now: string) {
  const modeTable = getStatsModeTable(match.mode);
  const currentMode = await env.DB.prepare(`SELECT * FROM ${modeTable} WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<UserStatsModeRow>();
  const currentGlobal = await env.DB.prepare("SELECT * FROM user_stats_global WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first<UserStatsGlobalRow>();

  if (!currentMode || !currentGlobal) return;

  const humanLost = human.isLoser === 1;
  const humanWon = match.resultReason === "bust" && !humanLost;

  await updateModeStats(env, modeTable, userId, currentMode, match, human, humanWon, humanLost, now);
  await updateGlobalStats(env, userId, currentGlobal, match, human, humanWon, humanLost, now);
}

function isAllParticipantsPlayedCard(match: NormalizedMatch) {
  return match.participants.length > 0 && match.participants.every((participant) => participant.playedCardCount > 0);
}

function createParticipantIconSlots(match: NormalizedMatch, human: NormalizedParticipant) {
  if (match.participants.length !== 4) return null;
  if (match.participants.some((participant) => (
    participant.initialSeatKind == null
    || participant.initialIconIdSnapshot == null
    || participant.initialIconTypeIds == null
  ))) return null;

  return match.participants.map((participant) => {
    const relation = participant.participantNo === human.participantNo
      ? "self"
      : participant.initialSeatKind === "NPC"
        ? "npc"
        : "other";
    return {
      turnNo: participant.participantNo,
      relation,
      participantType: participant.initialSeatKind === "NPC" ? "npc" : "user",
      iconId: participant.initialIconIdSnapshot,
      iconTypeIds: participant.initialIconTypeIds ?? [],
    };
  }).sort((a, b) => a.turnNo - b.turnNo);
}

async function updateModeStats(
  env: Env,
  modeTable: StatsModeTable,
  userId: string,
  current: UserStatsModeRow,
  match: NormalizedMatch,
  human: NormalizedParticipant,
  humanWon: boolean,
  humanLost: boolean,
  now: string,
) {
  const updates: Record<string, number | string | null> = {};

  increment(updates, current, "match_count", 1);
  if (humanWon) increment(updates, current, "win_count", 1);
  if (humanLost) increment(updates, current, "lose_count", 1);

  if (match.difficulty === "CASUAL") {
    increment(updates, current, "casual_match_count", 1);
  } else if (match.difficulty === "SMART") {
    increment(updates, current, "smart_match_count", 1);
  }

  const typeKey = normalizeStatsGameTypeKey(match.gameType);
  if (typeKey) {
    increment(updates, current, `type_${typeKey}_match_count`, 1);
  }

  increment(updates, current, "played_card_count", human.playedCardCount);
  increment(updates, current, "hand_play_count", human.handPlayCount);
  increment(updates, current, "deck_play_count", human.deckPlayCount);
  increment(updates, current, "joker_play_count", human.jokerPlayCount);
  increment(updates, current, "spade3_counter_count", human.spade3CounterCount);
  increment(updates, current, "timeout_deck_play_count", human.timeoutDeckPlayCount);
  increment(updates, current, "joker_used_match_dead_count", human.jokerUsedMatchDeadCount);
  increment(updates, current, "joker_bust_count", human.jokerBustCount);
  increment(updates, current, "dead_with_joker_in_hand_count", human.deadWithJokerInHandCount);
  increment(updates, current, "my_joker_countered_by_spade3_count", human.myJokerCounteredBySpade3Count);
  increment(updates, current, "self_joker_after_previous_joker_count", human.selfJokerAfterPreviousJokerCount);
  increment(updates, current, "self_spade3_after_previous_joker_count", human.selfSpade3AfterPreviousJokerCount);
  increment(updates, current, "self_spade3_after_previous_joker_dead_margin1_count", human.selfSpade3AfterPreviousJokerDeadMargin1Count);

  const rankCounts = match.humanStats.playedRankCounts;
  increment(updates, current, "ace_play_count", rankCounts.ace);
  increment(updates, current, "jack_play_count", rankCounts.jack);
  increment(updates, current, "queen_play_count", rankCounts.queen);
  increment(updates, current, "king_play_count", rankCounts.king);
  increment(updates, current, "number_card_play_count", rankCounts.number);

  const actorSourceCardPlayCounts = createActorSourceCardPlayCountAdditions(match, human);
  if (Object.keys(actorSourceCardPlayCounts).length > 0) {
    updates.actor_source_card_play_counts_json = mergeJsonNumberMaps(readOptionalString(current.actor_source_card_play_counts_json), actorSourceCardPlayCounts);
  }

  if (humanLost && match.resultReason === "bust") {
    increment(updates, current, "bust_lose_count", 1);
  }

  if (match.resultReason === "bust") {
    increment(updates, current, "normal_finish_count", 1);
  }

  if (isAllParticipantsPlayedCard(match)) {
    increment(updates, current, "all_participants_played_card_match_count", 1);
  }

  if (match.resultReason === "deck_end") {
    increment(updates, current, "deck_end_match_count", 1);
  }
  if (match.resultReason === "void") {
    increment(updates, current, "void_match_count", 1);
  }
  increment(updates, current, "redeal_count", match.humanStats.redealCount);
  const timeoutOnlyFinishCounts = createTimeoutOnlyFinishCountAdditions(match, human);
  if (Object.keys(timeoutOnlyFinishCounts).length > 0) {
    updates.timeout_only_finish_counts_json = mergeJsonNumberMaps(readOptionalString(current.timeout_only_finish_counts_json), timeoutOnlyFinishCounts);
  }
  if (match.mode === "multi" && human.isHost === 1 && Object.keys(match.humanStats.hostOtherLeavePatternCounts).length > 0) {
    updates.host_other_leave_pattern_counts_json = mergeJsonNumberMaps(readOptionalString(current.host_other_leave_pattern_counts_json), match.humanStats.hostOtherLeavePatternCounts);
  }

  if (match.humanStats.initialHandAllRed) {
    increment(updates, current, "initial_hand_all_red_count", 1);
  }
  if (match.humanStats.initialHandAllBlack) {
    increment(updates, current, "initial_hand_all_black_count", 1);
  }
  if (match.humanStats.initialHandSameSuit) {
    increment(updates, current, "initial_hand_same_suit_count", 1);
  }

  updates.updated_at = now;
  await updateStatsRow(env, modeTable, userId, updates);
}

async function updateGlobalStats(
  env: Env,
  userId: string,
  current: UserStatsGlobalRow,
  match: NormalizedMatch,
  human: NormalizedParticipant,
  humanWon: boolean,
  humanLost: boolean,
  now: string,
) {
  const updates: Record<string, number | string | null> = {};

  if (humanWon) {
    const currentWinStreak = readNumber(current.current_win_streak) + 1;
    updates.current_win_streak = currentWinStreak;
    updates.max_win_streak = Math.max(readNumber(current.max_win_streak), currentWinStreak);
    updates.current_lose_streak = 0;
  } else if (humanLost) {
    const currentLoseStreak = readNumber(current.current_lose_streak) + 1;
    updates.current_lose_streak = currentLoseStreak;
    updates.max_lose_streak = Math.max(readNumber(current.max_lose_streak), currentLoseStreak);
    updates.current_win_streak = 0;
  }

  if (match.humanStats.everHandAllRed) updates.ever_hand_all_red = 1;
  if (match.humanStats.everHandAllBlack) updates.ever_hand_all_black = 1;
  if (match.humanStats.everHandSameSuit) updates.ever_hand_same_suit = 1;

  updates.max_total_reached = mergeMax(current.max_total_reached, match.humanStats.maxTotalReached);
  updates.min_total_reached = mergeMin(current.min_total_reached, match.humanStats.minTotalReached);
  updates.max_turn_count_in_match = Math.max(readNumber(current.max_turn_count_in_match), match.turnCount);
  updates.max_played_cards_in_match = Math.max(readNumber(current.max_played_cards_in_match), human.playedCardCount);
  updates.max_joker_play_in_match = Math.max(readNumber(current.max_joker_play_in_match), human.jokerPlayCount);
  updates.max_spade3_counter_in_match = Math.max(readNumber(current.max_spade3_counter_in_match), human.spade3CounterCount);

  updates.played_card_rank_set_json = mergeJsonStringSet(current.played_card_rank_set_json, match.humanStats.playedCardRankSet);
  updates.played_card_set_json = mergeJsonStringSet(current.played_card_set_json, match.humanStats.playedCardSet);
  updates.played_suit_set_json = mergeJsonStringSet(current.played_suit_set_json, match.humanStats.playedSuitSet);
  updates.self_play_sequence_signatures_json = mergeJsonStringSet(current.self_play_sequence_signatures_json, match.humanStats.selfPlaySequenceSignatures);
  updates.hand_sequence_signatures_json = mergeJsonStringSet(current.hand_sequence_signatures_json, match.humanStats.handSequenceSignatures);
  updates.lose_certain_event_counts_json = mergeJsonNumberMaps(readOptionalString(current.lose_certain_event_counts_json), match.humanStats.loseCertainEventCounts);

  if (human.iconIdSnapshot) {
    updates.icon_use_count = readNumber(current.icon_use_count) + 1;
    updates.icon_use_counts_json = incrementJsonNumberMap(readOptionalString(current.icon_use_counts_json), human.iconIdSnapshot, 1);
  }

  updates.updated_at = now;

  await updateStatsRow(env, "user_stats_global", userId, updates);
}

async function updateStatsRow(env: Env, tableName: StatsModeTable | "user_stats_global", userId: string, updates: Record<string, number | string | null>) {
  const assignments = Object.keys(updates);
  if (assignments.length === 0) return;

  await env.DB.prepare(
    `
    UPDATE ${tableName}
    SET ${assignments.map((key) => `${key} = ?`).join(", ")}
    WHERE user_id = ?
    `,
  )
    .bind(...assignments.map((key) => updates[key]), userId)
    .run();
}

function getStatsModeTable(mode: MatchMode): StatsModeTable {
  return mode === "multi" ? "user_stats_multi" : "user_stats_solo";
}

function increment(updates: Record<string, number | string | null>, current: UserStatsModeRow, key: string, value: number) {
  if (!value) return;
  updates[key] = readNumber(updates[key] ?? current[key]) + value;
}

function normalizeRankCounts(value: unknown): RankCountPayload {
  if (!value || typeof value !== "object") {
    return { ace: 0, jack: 0, queen: 0, king: 0, number: 0 };
  }

  const source = value as Record<string, unknown>;
  return {
    ace: Math.max(0, normalizeInteger(source.A, 0, 1000000) ?? normalizeInteger(source.ace, 0, 1000000) ?? 0),
    jack: Math.max(0, normalizeInteger(source.J, 0, 1000000) ?? normalizeInteger(source.jack, 0, 1000000) ?? 0),
    queen: Math.max(0, normalizeInteger(source.Q, 0, 1000000) ?? normalizeInteger(source.queen, 0, 1000000) ?? 0),
    king: Math.max(0, normalizeInteger(source.K, 0, 1000000) ?? normalizeInteger(source.king, 0, 1000000) ?? 0),
    number: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "number"].reduce((sum, key) => {
      return sum + (normalizeInteger(source[key], 0, 1000000) ?? 0);
    }, 0),
  };
}

function normalizeSourceCardPlayCounts(value: unknown) {
  const source = readJsonNumberMapFromUnknown(value);
  const result: Record<string, number> = {};
  for (const [key, count] of Object.entries(source)) {
    if (ALLOWED_SOURCE_CARD_PLAY_COUNT_KEYS.has(key)) result[key] = count;
  }
  return result;
}

function createActorSourceCardPlayCountAdditions(match: NormalizedMatch, human: NormalizedParticipant) {
  const previousParticipantNo = human.participantNo === 1 ? 4 : human.participantNo - 1;
  const previousParticipant = match.participants.find((participant) => participant.participantNo === previousParticipantNo);
  const actorParticipants: Record<CardPlayCountActor, NormalizedParticipant[]> = {
    self: [human],
    previous: previousParticipant ? [previousParticipant] : [],
    all: match.participants,
  };
  const additions: Record<string, number> = {};

  for (const [actor, participants] of Object.entries(actorParticipants) as Array<[CardPlayCountActor, NormalizedParticipant[]]>) {
    addActorSourceCardPlayCount(additions, actor, "all", "all", participants.reduce((sum, participant) => sum + participant.playedCardCount, 0));
    addActorSourceCardPlayCount(additions, actor, "hand", "all", participants.reduce((sum, participant) => sum + participant.handPlayCount, 0));
    addActorSourceCardPlayCount(additions, actor, "deck", "all", participants.reduce((sum, participant) => sum + participant.deckPlayCount, 0));

    for (const group of CARD_PLAY_COUNT_GROUPS) {
      const handCount = participants.reduce((sum, participant) => sum + readNumber(participant.sourceCardPlayCounts[`source_hand:card_${group}`]), 0);
      const deckCount = participants.reduce((sum, participant) => sum + readNumber(participant.sourceCardPlayCounts[`source_deck:card_${group}`]), 0);
      addActorSourceCardPlayCount(additions, actor, "all", group, handCount + deckCount);
      addActorSourceCardPlayCount(additions, actor, "hand", group, handCount);
      addActorSourceCardPlayCount(additions, actor, "deck", group, deckCount);
    }
  }

  return additions;
}

function addActorSourceCardPlayCount(
  target: Record<string, number>,
  actor: CardPlayCountActor,
  source: CardPlayCountSource | "all",
  group: CardPlayCountGroup | "all",
  count: number,
) {
  if (count <= 0) return;
  target[`actor_${actor}:source_${source}:card_${group}`] = count;
}

function normalizeStatsGameTypeKey(gameType: string) {
  const key = gameType.toLowerCase();
  if (["100", "200", "300", "400", "500", "extra"].includes(key)) return key;
  return null;
}

function mergeMax(current: number | string | null | undefined, next: number | null) {
  const currentNumber = normalizeExistingNullableNumber(current);
  if (next == null) return currentNumber;
  if (currentNumber == null) return next;
  return Math.max(currentNumber, next);
}

function mergeMin(current: number | string | null | undefined, next: number | null) {
  const currentNumber = normalizeExistingNullableNumber(current);
  if (next == null) return currentNumber;
  if (currentNumber == null) return next;
  return Math.min(currentNumber, next);
}

function mergeJsonStringSet(currentJson: string | null | undefined, values: string[]) {
  const merged = new Set<string>(readJsonStringArray(currentJson));
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) merged.add(normalized);
    if (merged.size >= MAX_JSON_SET_SIZE) break;
  }
  return JSON.stringify(Array.from(merged));
}

function incrementJsonNumberMap(currentJson: string | null | undefined, key: string, amount: number) {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey || !amount) return currentJson ?? "{}";

  const map = readJsonNumberMap(currentJson);
  map[normalizedKey] = (map[normalizedKey] ?? 0) + amount;
  return JSON.stringify(map);
}

function mergeJsonNumberMaps(currentJson: string | null | undefined, additions: Record<string, number>) {
  const map = readJsonNumberMap(currentJson);
  for (const [key, rawValue] of Object.entries(additions)) {
    const normalizedKey = normalizeText(key);
    const value = Math.floor(Number(rawValue));
    if (!normalizedKey || !Number.isFinite(value) || value <= 0) continue;
    map[normalizedKey] = (map[normalizedKey] ?? 0) + value;
  }
  return JSON.stringify(map);
}

function readJsonNumberMapFromUnknown(value: unknown): Record<string, number> {
  if (!value) return {};
  if (typeof value === "string") return readJsonNumberMap(value);
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const normalizedKey = normalizeText(key);
    const numberValue = Math.floor(Number(rawValue));
    if (!normalizedKey || !Number.isFinite(numberValue) || numberValue <= 0) continue;
    result[normalizedKey] = numberValue;
  }
  return result;
}

function readJsonNumberMap(value: string | null | undefined): Record<string, number> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [key, rawValue] of Object.entries(parsed)) {
      const normalizedKey = normalizeText(key);
      const numberValue = Number(rawValue);
      if (!normalizedKey || !Number.isFinite(numberValue) || numberValue <= 0) continue;
      result[normalizedKey] = Math.floor(numberValue);
    }
    return result;
  } catch {
    return {};
  }
}

function readJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return normalizeStringArray(parsed);
  } catch {
    return [];
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= MAX_JSON_SET_SIZE) break;
  }
  return result;
}

function normalizeNullableStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return normalizeStringArray(value);
}

function normalizeInitialSeatKind(value: unknown): "HUMAN" | "NPC" | null {
  return value === "HUMAN" || value === "NPC" ? value : null;
}

function normalizeParticipantType(value: unknown): ParticipantType | null {
  if (value === "user" || value === "guest" || value === "npc") return value;
  return null;
}

function normalizeEnum<T extends string>(value: unknown, allowed: Set<T>): T | null {
  if (typeof value !== "string") return null;
  return allowed.has(value as T) ? value as T : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

function normalizeNullableText(value: unknown): string | null {
  if (value == null) return null;
  return normalizeText(value);
}

function normalizeIso(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const time = Date.parse(text);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function normalizeInteger(value: unknown, min: number, max: number): number | null {
  const numberValue = Math.trunc(Number(value));
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < min || numberValue > max) return null;
  return numberValue;
}

function normalizeParticipantNoOrNull(value: unknown): number | null {
  if (value == null) return null;
  return normalizeInteger(value, 1, 4);
}

function normalizeFlag(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function normalizeExistingNullableNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readNumber(value: number | string | null | undefined): number {
  const normalized = normalizeExistingNullableNumber(value);
  return normalized ?? 0;
}

function readOptionalString(value: number | string | null | undefined): string | null {
  return typeof value === "string" ? value : null;
}
