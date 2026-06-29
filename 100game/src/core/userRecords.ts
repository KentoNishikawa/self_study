export type UserRecordModeStats = {
  matchCount: number;
  winCount: number;
  loseCount: number;
  currentWinStreak: number;
  maxWinStreak: number;
  casualMatchCount: number;
  smartMatchCount: number;
  type100MatchCount: number;
  type200MatchCount: number;
  type300MatchCount: number;
  type400MatchCount: number;
  type500MatchCount: number;
  typeExtraMatchCount: number;
  playedCardCount: number;
  jokerPlayCount: number;
  spade3CounterCount: number;
  timeoutDeckPlayCount: number;
};

export type UserRecordGlobalStats = {
  currentWinStreak: number;
  maxWinStreak: number;
  currentLoseStreak: number;
  maxLoseStreak: number;
  everHandAllRed: boolean;
  everHandAllBlack: boolean;
  everHandSameSuit: boolean;
  maxTotalReached: number | null;
  minTotalReached: number | null;
  maxTurnCountInMatch: number;
  maxPlayedCardsInMatch: number;
  maxJokerPlayInMatch: number;
  maxSpade3CounterInMatch: number;
};

export type UserRecordParticipant = {
  participantNo: number;
  participantType: "user" | "guest" | "npc" | string;
  displayNameSnapshot: string;
  iconIdSnapshot: string | null;
  titleIdSnapshot: string | null;
  isHost: boolean;
  isWinner: boolean;
  isLoser: boolean;
};

export type UserRecordMatch = {
  matchId: string;
  mode: "solo" | "multi";
  roomId: string | null;
  difficulty: string;
  gameType: string;
  targetValue: number;
  directionStart: string;
  finalDirection: string;
  finalTotal: number;
  resultReason: string;
  winnerParticipantNo: number | null;
  loserParticipantNo: number | null;
  turnCount: number;
  startedAt: string;
  endedAt: string;
  self: UserRecordParticipant & {
    finalHandCount: number;
    playedCardCount: number;
    jokerPlayCount: number;
    spade3CounterCount: number;
    timeoutDeckPlayCount: number;
  };
  participants: UserRecordParticipant[];
};

export type UserRecordsSnapshot = {
  stats: {
    solo: UserRecordModeStats;
    multi: UserRecordModeStats;
    total: UserRecordModeStats;
    global: UserRecordGlobalStats;
  };
  recentMatches: UserRecordMatch[];
};

type UserRecordsApiResponse = {
  ok?: boolean;
  message?: string;
  records?: UserRecordsSnapshot;
};

export async function loadUserRecordsFromApi(): Promise<UserRecordsSnapshot> {
  let response: Response;

  try {
    response = await fetch("/api/user-records", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("戦績・履歴の取得に失敗しました。通信状況を確認してください。");
  }

  let payload: UserRecordsApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (isRecord(parsed)) payload = parsed as UserRecordsApiResponse;
  } catch { }

  if (!response.ok || payload.ok === false || !payload.records) {
    throw new Error(payload.message ?? "戦績・履歴の取得に失敗しました。");
  }

  return payload.records;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
