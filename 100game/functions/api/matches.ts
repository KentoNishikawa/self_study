import { grantAutomaticAcquisitions } from "./_auto-acquisition";
import { findActiveSession, json, nowIso, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

type MatchMode = "solo" | "multi";
type ResultReason = "bust" | "deck_end" | "host_disband" | "player_left";
type ParticipantType = "user" | "guest" | "npc";
type Direction = "UP" | "DOWN";
type Difficulty = "CASUAL" | "SMART";

type MatchParticipantPayload = {
  participantNo?: unknown;
  participantType?: unknown;
  displayNameSnapshot?: unknown;
  iconIdSnapshot?: unknown;
  titleIdSnapshot?: unknown;
  isHost?: unknown;
  isWinner?: unknown;
  isLoser?: unknown;
  finalHandCount?: unknown;
  playedCardCount?: unknown;
  jokerPlayCount?: unknown;
  spade3CounterCount?: unknown;
  timeoutDeckPlayCount?: unknown;
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
  playedSuitSet?: unknown;
  playedRankCounts?: unknown;
  selfPlaySequenceSignatures?: unknown;
  handSequenceSignatures?: unknown;
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
  titleIdSnapshot: string | null;
  isHost: 0 | 1;
  isWinner: 0 | 1;
  isLoser: 0 | 1;
  finalHandCount: number;
  playedCardCount: number;
  jokerPlayCount: number;
  spade3CounterCount: number;
  timeoutDeckPlayCount: number;
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
  playedSuitSet: string[];
  playedRankCounts: RankCountPayload;
  selfPlaySequenceSignatures: string[];
  handSequenceSignatures: string[];
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
  played_suit_set_json: string;
  self_play_sequence_signatures_json: string;
  hand_sequence_signatures_json: string;
  cleared_title_condition_keys_json: string;
};

const ALLOWED_RESULT_REASONS = new Set<ResultReason>(["bust", "deck_end", "host_disband", "player_left"]);
const ALLOWED_MODES = new Set<MatchMode>(["solo", "multi"]);
const ALLOWED_DIRECTIONS = new Set<Direction>(["UP", "DOWN"]);
const ALLOWED_DIFFICULTIES = new Set<Difficulty>(["CASUAL", "SMART"]);
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
      loser_participant_no, turn_count, started_at, ended_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        icon_id_snapshot, title_id_snapshot, is_host, is_winner, is_loser,
        final_hand_count, played_card_count, joker_play_count, spade3_counter_count,
        timeout_deck_play_count, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_id, participant_no) DO UPDATE SET
        user_id = CASE
          WHEN excluded.user_id IS NOT NULL THEN excluded.user_id
          ELSE match_participants.user_id
        END,
        participant_type = excluded.participant_type,
        display_name_snapshot = excluded.display_name_snapshot,
        icon_id_snapshot = excluded.icon_id_snapshot,
        title_id_snapshot = CASE
          WHEN excluded.title_id_snapshot IS NOT NULL THEN excluded.title_id_snapshot
          ELSE match_participants.title_id_snapshot
        END,
        is_host = excluded.is_host,
        is_winner = excluded.is_winner,
        is_loser = excluded.is_loser,
        final_hand_count = excluded.final_hand_count,
        played_card_count = excluded.played_card_count,
        joker_play_count = excluded.joker_play_count,
        spade3_counter_count = excluded.spade3_counter_count,
        timeout_deck_play_count = excluded.timeout_deck_play_count
      `,
    )
      .bind(
        match.matchId,
        participant.participantNo,
        participantUserId,
        participant.participantType,
        participant.displayNameSnapshot,
        participant.iconIdSnapshot,
        participant.titleIdSnapshot,
        participant.isHost,
        participant.isWinner,
        participant.isLoser,
        participant.finalHandCount,
        participant.playedCardCount,
        participant.jokerPlayCount,
        participant.spade3CounterCount,
        participant.timeoutDeckPlayCount,
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

    seen.add(participantNo);
    participants.push({
      participantNo,
      participantType,
      displayNameSnapshot,
      iconIdSnapshot: normalizeNullableText(source.iconIdSnapshot),
      titleIdSnapshot: normalizeNullableText(source.titleIdSnapshot),
      isHost: normalizeFlag(source.isHost),
      isWinner: normalizeFlag(source.isWinner),
      isLoser: normalizeFlag(source.isLoser),
      finalHandCount: normalizeInteger(source.finalHandCount, 0, 1000) ?? 0,
      playedCardCount: normalizeInteger(source.playedCardCount, 0, 1000000) ?? 0,
      jokerPlayCount: normalizeInteger(source.jokerPlayCount, 0, 1000000) ?? 0,
      spade3CounterCount: normalizeInteger(source.spade3CounterCount, 0, 1000000) ?? 0,
      timeoutDeckPlayCount: normalizeInteger(source.timeoutDeckPlayCount, 0, 1000000) ?? 0,
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
    playedSuitSet: normalizeStringArray(source.playedSuitSet),
    playedRankCounts: normalizeRankCounts(source.playedRankCounts),
    selfPlaySequenceSignatures: normalizeStringArray(source.selfPlaySequenceSignatures),
    handSequenceSignatures: normalizeStringArray(source.handSequenceSignatures),
  };
}

function createMatchStats(match: NormalizedMatch, human: NormalizedParticipant) {
  const humanLost = human.isLoser === 1;
  const humanWon = match.resultReason === "bust" && !humanLost;

  return {
    mode: match.mode,
    difficulty: match.difficulty,
    game_type: match.gameType,
    target_value: match.targetValue,
    direction_start: match.directionStart,
    final_direction: match.finalDirection,
    final_total: match.finalTotal,
    result_reason: match.resultReason,
    turn_count: match.turnCount,
    is_winner: human.isWinner,
    is_loser: human.isLoser,
    human_won: humanWon ? 1 : 0,
    human_lost: humanLost ? 1 : 0,
    final_hand_count: human.finalHandCount,
    played_card_count: human.playedCardCount,
    joker_play_count: human.jokerPlayCount,
    spade3_counter_count: human.spade3CounterCount,
    timeout_deck_play_count: human.timeoutDeckPlayCount,
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
  increment(updates, current, "joker_play_count", human.jokerPlayCount);
  increment(updates, current, "spade3_counter_count", human.spade3CounterCount);
  increment(updates, current, "timeout_deck_play_count", human.timeoutDeckPlayCount);

  const rankCounts = match.humanStats.playedRankCounts;
  increment(updates, current, "ace_play_count", rankCounts.ace);
  increment(updates, current, "jack_play_count", rankCounts.jack);
  increment(updates, current, "queen_play_count", rankCounts.queen);
  increment(updates, current, "king_play_count", rankCounts.king);
  increment(updates, current, "number_card_play_count", rankCounts.number);

  if (humanLost && match.resultReason === "bust") {
    increment(updates, current, "bust_lose_count", 1);
  }

  if (match.resultReason === "deck_end") {
    increment(updates, current, "deck_end_match_count", 1);
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
  updates.played_suit_set_json = mergeJsonStringSet(current.played_suit_set_json, match.humanStats.playedSuitSet);
  updates.self_play_sequence_signatures_json = mergeJsonStringSet(current.self_play_sequence_signatures_json, match.humanStats.selfPlaySequenceSignatures);
  updates.hand_sequence_signatures_json = mergeJsonStringSet(current.hand_sequence_signatures_json, match.humanStats.handSequenceSignatures);
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
