import { findActiveSession, json, type Env, type PagesContext } from "./auth/_shared";

type StatsModeRow = {
  match_count?: number | string | null;
  win_count?: number | string | null;
  lose_count?: number | string | null;
  casual_match_count?: number | string | null;
  smart_match_count?: number | string | null;
  type_100_match_count?: number | string | null;
  type_200_match_count?: number | string | null;
  type_300_match_count?: number | string | null;
  type_400_match_count?: number | string | null;
  type_500_match_count?: number | string | null;
  type_extra_match_count?: number | string | null;
  played_card_count?: number | string | null;
  joker_play_count?: number | string | null;
  spade3_counter_count?: number | string | null;
  timeout_deck_play_count?: number | string | null;
};

type StatsGlobalRow = {
  current_win_streak?: number | string | null;
  max_win_streak?: number | string | null;
  current_lose_streak?: number | string | null;
  max_lose_streak?: number | string | null;
  ever_hand_all_red?: number | string | null;
  ever_hand_all_black?: number | string | null;
  ever_hand_same_suit?: number | string | null;
  max_total_reached?: number | string | null;
  min_total_reached?: number | string | null;
  max_turn_count_in_match?: number | string | null;
  max_played_cards_in_match?: number | string | null;
  max_joker_play_in_match?: number | string | null;
  max_spade3_counter_in_match?: number | string | null;
};

type MatchHistoryRow = {
  match_id: string;
  mode: "solo" | "multi";
  room_id: string | null;
  difficulty: string;
  game_type: string;
  target_value: number | string;
  direction_start: string;
  final_direction: string;
  final_total: number | string;
  result_reason: string;
  winner_participant_no: number | string | null;
  loser_participant_no: number | string | null;
  turn_count: number | string;
  started_at: string;
  ended_at: string;
  participant_no: number | string;
  participant_type: string;
  display_name_snapshot: string;
  icon_id_snapshot: string | null;
  title_id_snapshot: string | null;
  is_host: number | string;
  is_winner: number | string;
  is_loser: number | string;
  final_hand_count: number | string;
  played_card_count: number | string;
  joker_play_count: number | string;
  spade3_counter_count: number | string;
  timeout_deck_play_count: number | string;
};

type MatchParticipantRow = {
  match_id: string;
  participant_no: number | string;
  participant_type: string;
  display_name_snapshot: string;
  icon_id_snapshot: string | null;
  title_id_snapshot: string | null;
  is_host: number | string;
  is_winner: number | string;
  is_loser: number | string;
};

type UserMatchStreakRow = {
  is_winner: number | string;
  is_loser: number | string;
};

type WinStreakStats = {
  currentWinStreak: number;
  maxWinStreak: number;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await findActiveSession(context.env, context.request);
  if (!session) return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });

  const [solo, multi, global, matches, soloWinStreaks, multiWinStreaks] = await Promise.all([
    readModeStats(context.env, "user_stats_solo", session.user_id),
    readModeStats(context.env, "user_stats_multi", session.user_id),
    readGlobalStats(context.env, session.user_id),
    readRecentMatches(context.env, session.user_id),
    readWinStreaks(context.env, session.user_id, "solo"),
    readWinStreaks(context.env, session.user_id, "multi"),
  ]);
  const participants = await readParticipants(context.env, matches.map((match) => match.match_id));

  return json({
    ok: true,
    records: {
      stats: {
        solo: withWinStreaks(normalizeModeStats(solo), soloWinStreaks),
        multi: withWinStreaks(normalizeModeStats(multi), multiWinStreaks),
        total: withWinStreaks(sumModeStats(solo, multi), {
          currentWinStreak: readNumber(global?.current_win_streak),
          maxWinStreak: readNumber(global?.max_win_streak),
        }),
        global: normalizeGlobalStats(global),
      },
      recentMatches: matches.map((match) => ({
        matchId: match.match_id,
        mode: match.mode,
        roomId: match.room_id,
        difficulty: match.difficulty,
        gameType: match.game_type,
        targetValue: readNumber(match.target_value),
        directionStart: match.direction_start,
        finalDirection: match.final_direction,
        finalTotal: readNumber(match.final_total),
        resultReason: match.result_reason,
        winnerParticipantNo: readNullableNumber(match.winner_participant_no),
        loserParticipantNo: readNullableNumber(match.loser_participant_no),
        turnCount: readNumber(match.turn_count),
        startedAt: match.started_at,
        endedAt: match.ended_at,
        self: {
          participantNo: readNumber(match.participant_no),
          participantType: match.participant_type,
          displayNameSnapshot: match.display_name_snapshot,
          iconIdSnapshot: match.icon_id_snapshot,
          titleIdSnapshot: match.title_id_snapshot,
          isHost: readFlag(match.is_host),
          isWinner: readFlag(match.is_winner),
          isLoser: readFlag(match.is_loser),
          finalHandCount: readNumber(match.final_hand_count),
          playedCardCount: readNumber(match.played_card_count),
          jokerPlayCount: readNumber(match.joker_play_count),
          spade3CounterCount: readNumber(match.spade3_counter_count),
          timeoutDeckPlayCount: readNumber(match.timeout_deck_play_count),
        },
        participants: (participants.get(match.match_id) ?? []).map((participant) => ({
          participantNo: readNumber(participant.participant_no),
          participantType: participant.participant_type,
          displayNameSnapshot: participant.display_name_snapshot,
          iconIdSnapshot: participant.icon_id_snapshot,
          titleIdSnapshot: participant.title_id_snapshot,
          isHost: readFlag(participant.is_host),
          isWinner: readFlag(participant.is_winner),
          isLoser: readFlag(participant.is_loser),
        })),
      })),
    },
  });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
}

async function readModeStats(env: Env, tableName: "user_stats_solo" | "user_stats_multi", userId: string) {
  return await env.DB.prepare(`SELECT * FROM ${tableName} WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<StatsModeRow>();
}

async function readGlobalStats(env: Env, userId: string) {
  return await env.DB.prepare("SELECT * FROM user_stats_global WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first<StatsGlobalRow>();
}

async function readWinStreaks(env: Env, userId: string, mode: "solo" | "multi"): Promise<WinStreakStats> {
  const result = await env.DB.prepare(
    `
    SELECT
      match_participants.is_winner,
      match_participants.is_loser
    FROM match_participants
    INNER JOIN match_results ON match_results.match_id = match_participants.match_id
    WHERE match_participants.user_id = ?
      AND match_results.mode = ?
    ORDER BY match_results.ended_at ASC, match_results.created_at ASC
    `,
  )
    .bind(userId, mode)
    .all<UserMatchStreakRow>();

  let currentWinStreak = 0;
  let maxWinStreak = 0;

  for (const match of result.results ?? []) {
    if (readFlag(match.is_winner)) {
      currentWinStreak += 1;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      continue;
    }

    currentWinStreak = 0;
  }

  return { currentWinStreak, maxWinStreak };
}

async function readRecentMatches(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      match_results.match_id,
      match_results.mode,
      match_results.room_id,
      match_results.difficulty,
      match_results.game_type,
      match_results.target_value,
      match_results.direction_start,
      COALESCE(match_results.final_direction, match_results.direction_start) AS final_direction,
      match_results.final_total,
      match_results.result_reason,
      match_results.winner_participant_no,
      match_results.loser_participant_no,
      match_results.turn_count,
      match_results.started_at,
      match_results.ended_at,
      match_participants.participant_no,
      match_participants.participant_type,
      match_participants.display_name_snapshot,
      match_participants.icon_id_snapshot,
      match_participants.title_id_snapshot,
      match_participants.is_host,
      match_participants.is_winner,
      match_participants.is_loser,
      match_participants.final_hand_count,
      match_participants.played_card_count,
      match_participants.joker_play_count,
      match_participants.spade3_counter_count,
      match_participants.timeout_deck_play_count
    FROM match_participants
    INNER JOIN match_results ON match_results.match_id = match_participants.match_id
    WHERE match_participants.user_id = ?
    ORDER BY match_results.ended_at DESC
    LIMIT 5
    `,
  )
    .bind(userId)
    .all<MatchHistoryRow>();

  return result.results ?? [];
}

async function readParticipants(env: Env, matchIds: string[]) {
  const grouped = new Map<string, MatchParticipantRow[]>();
  if (matchIds.length === 0) return grouped;

  const placeholders = matchIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `
    SELECT
      match_id,
      participant_no,
      participant_type,
      display_name_snapshot,
      icon_id_snapshot,
      title_id_snapshot,
      is_host,
      is_winner,
      is_loser
    FROM match_participants
    WHERE match_id IN (${placeholders})
    ORDER BY match_id, participant_no
    `,
  )
    .bind(...matchIds)
    .all<MatchParticipantRow>();

  for (const participant of result.results ?? []) {
    const list = grouped.get(participant.match_id) ?? [];
    list.push(participant);
    grouped.set(participant.match_id, list);
  }

  return grouped;
}

function normalizeModeStats(row: StatsModeRow | null) {
  return {
    matchCount: readNumber(row?.match_count),
    winCount: readNumber(row?.win_count),
    loseCount: readNumber(row?.lose_count),
    casualMatchCount: readNumber(row?.casual_match_count),
    smartMatchCount: readNumber(row?.smart_match_count),
    type100MatchCount: readNumber(row?.type_100_match_count),
    type200MatchCount: readNumber(row?.type_200_match_count),
    type300MatchCount: readNumber(row?.type_300_match_count),
    type400MatchCount: readNumber(row?.type_400_match_count),
    type500MatchCount: readNumber(row?.type_500_match_count),
    typeExtraMatchCount: readNumber(row?.type_extra_match_count),
    playedCardCount: readNumber(row?.played_card_count),
    jokerPlayCount: readNumber(row?.joker_play_count),
    spade3CounterCount: readNumber(row?.spade3_counter_count),
    timeoutDeckPlayCount: readNumber(row?.timeout_deck_play_count),
  };
}

function sumModeStats(solo: StatsModeRow | null, multi: StatsModeRow | null) {
  const soloStats = normalizeModeStats(solo);
  const multiStats = normalizeModeStats(multi);

  return {
    matchCount: soloStats.matchCount + multiStats.matchCount,
    winCount: soloStats.winCount + multiStats.winCount,
    loseCount: soloStats.loseCount + multiStats.loseCount,
    casualMatchCount: soloStats.casualMatchCount + multiStats.casualMatchCount,
    smartMatchCount: soloStats.smartMatchCount + multiStats.smartMatchCount,
    type100MatchCount: soloStats.type100MatchCount + multiStats.type100MatchCount,
    type200MatchCount: soloStats.type200MatchCount + multiStats.type200MatchCount,
    type300MatchCount: soloStats.type300MatchCount + multiStats.type300MatchCount,
    type400MatchCount: soloStats.type400MatchCount + multiStats.type400MatchCount,
    type500MatchCount: soloStats.type500MatchCount + multiStats.type500MatchCount,
    typeExtraMatchCount: soloStats.typeExtraMatchCount + multiStats.typeExtraMatchCount,
    playedCardCount: soloStats.playedCardCount + multiStats.playedCardCount,
    jokerPlayCount: soloStats.jokerPlayCount + multiStats.jokerPlayCount,
    spade3CounterCount: soloStats.spade3CounterCount + multiStats.spade3CounterCount,
    timeoutDeckPlayCount: soloStats.timeoutDeckPlayCount + multiStats.timeoutDeckPlayCount,
  };
}

function withWinStreaks(stats: ReturnType<typeof normalizeModeStats>, streaks: WinStreakStats) {
  return {
    ...stats,
    currentWinStreak: streaks.currentWinStreak,
    maxWinStreak: streaks.maxWinStreak,
  };
}

function normalizeGlobalStats(row: StatsGlobalRow | null) {
  return {
    currentWinStreak: readNumber(row?.current_win_streak),
    maxWinStreak: readNumber(row?.max_win_streak),
    currentLoseStreak: readNumber(row?.current_lose_streak),
    maxLoseStreak: readNumber(row?.max_lose_streak),
    everHandAllRed: readFlag(row?.ever_hand_all_red),
    everHandAllBlack: readFlag(row?.ever_hand_all_black),
    everHandSameSuit: readFlag(row?.ever_hand_same_suit),
    maxTotalReached: readNullableNumber(row?.max_total_reached),
    minTotalReached: readNullableNumber(row?.min_total_reached),
    maxTurnCountInMatch: readNumber(row?.max_turn_count_in_match),
    maxPlayedCardsInMatch: readNumber(row?.max_played_cards_in_match),
    maxJokerPlayInMatch: readNumber(row?.max_joker_play_in_match),
    maxSpade3CounterInMatch: readNumber(row?.max_spade3_counter_in_match),
  };
}

function readNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}

function readNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.trunc(numberValue);
}

function readFlag(value: unknown): boolean {
  return readNumber(value) === 1;
}
