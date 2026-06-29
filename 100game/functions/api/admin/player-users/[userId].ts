import { createId, getString, json, nowIso, readJsonRecord, type Env, type PagesContext, type UserRole } from "../../auth/_shared";
import { isResponse, requireAdminSession, type AdminSession } from "../_admin";

type PlayerUserDetailRow = {
  user_id: string;
  email: string;
  email_normalized: string;
  status: "pending" | "active" | "suspended" | "deleted";
  role: UserRole;
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  current_icon_id: string | null;
  current_title_id: string | null;
  settings_updated_at: string | null;
  current_title_name: string | null;
  current_title_rarity: number | null;
  current_icon_name: string | null;
  current_icon_image_path: string | null;
  current_icon_rarity: number | null;
  current_icon_storage_provider: string | null;
  title_count: number | null;
  icon_count: number | null;
  illustration_count: number | null;
  viewed_illustration_count: number | null;
  unread_notification_count: number | null;
  active_session_count: number | null;
  solo_match_count: number | null;
  solo_win_count: number | null;
  solo_lose_count: number | null;
  multi_match_count: number | null;
  multi_win_count: number | null;
  multi_lose_count: number | null;
  current_win_streak: number | null;
  max_win_streak: number | null;
  current_lose_streak: number | null;
  max_lose_streak: number | null;
};

type UserTitleRow = {
  title_id: string;
  title_name: string;
  description: string;
  rarity: number;
  acquired_at: string;
};

type UserIconRow = {
  icon_id: string;
  icon_name: string;
  description: string;
  image_path: string;
  rarity: number;
  storage_provider: string | null;
  acquired_at: string;
};

type MatchHistoryRow = {
  match_id: string;
  mode: string;
  difficulty: string;
  game_type: string;
  is_winner: number;
  is_loser: number;
  ended_at: string;
};

type PlayerUserStatusLogRow = {
  log_id: string;
  user_id: string;
  admin_id: string;
  admin_display_name: string | null;
  admin_email: string | null;
  action_type: "suspend" | "unsuspend";
  before_status: string;
  after_status: string;
  reason: string;
  created_at: string;
};

type PlayerUserStatusTargetRow = {
  user_id: string;
  status: "pending" | "active" | "suspended" | "deleted";
};

const DEFAULT_DISPLAY_NAME = "プレイヤー";
const MATCH_HISTORY_LIMIT = 10;
const STATUS_LOG_LIMIT = 20;
const STATUS_REASON_MAX_LENGTH = 500;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const userId = getRouteParam(context, "userId");
  if (!userId) return json({ ok: false, message: "ユーザーIDが指定されていません。" }, { status: 400 });

  const detail = await readPlayerUserDetail(context.env, userId);
  if (!detail) return json({ ok: false, message: "ユーザーが見つかりません。" }, { status: 404 });

  const [titles, icons, matchHistory, statusLogs] = await Promise.all([
    readUserTitles(context.env, userId),
    readUserIcons(context.env, userId),
    readMatchHistory(context.env, userId),
    readPlayerUserStatusLogs(context.env, userId),
  ]);

  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      mustChangePassword: Boolean(session.must_change_password),
    },
    playerUserDetail: toPlayerUserDetailResponse(detail, titles, icons, matchHistory, statusLogs),
  });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const userId = getRouteParam(context, "userId");
  if (!userId) return json({ ok: false, message: "ユーザーIDが指定されていません。" }, { status: 400 });

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const action = readStatusAction(getString(body.action));
  const reason = getString(body.reason).trim();
  if (!action) return json({ ok: false, message: "操作の指定が正しくありません。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "停止理由を入力してください。" }, { status: 400 });
  if (reason.length > STATUS_REASON_MAX_LENGTH) return json({ ok: false, message: `停止理由は${STATUS_REASON_MAX_LENGTH}文字以内にしてください。` }, { status: 400 });

  return updatePlayerUserStatus(context, session, userId, action, reason);
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGET/PATCHのみ対応しています。" }, { status: 405 });
}

async function readPlayerUserDetail(env: Env, userId: string) {
  const now = new Date().toISOString();
  return await env.DB.prepare(
    `
    SELECT
      users.user_id,
      users.email,
      users.email_normalized,
      users.status,
      users.role,
      users.email_verified_at,
      users.last_login_at,
      users.created_at,
      users.updated_at,
      user_settings.display_name,
      user_settings.current_icon_id,
      user_settings.current_title_id,
      user_settings.updated_at AS settings_updated_at,
      current_titles.title_name AS current_title_name,
      current_titles.rarity AS current_title_rarity,
      current_icons.icon_name AS current_icon_name,
      current_icons.image_path AS current_icon_image_path,
      current_icons.rarity AS current_icon_rarity,
      current_icons.storage_provider AS current_icon_storage_provider,
      COALESCE(title_counts.title_count, 0) AS title_count,
      COALESCE(icon_counts.icon_count, 0) AS icon_count,
      COALESCE(illustration_counts.illustration_count, 0) AS illustration_count,
      COALESCE(illustration_counts.viewed_illustration_count, 0) AS viewed_illustration_count,
      COALESCE(notification_counts.unread_notification_count, 0) AS unread_notification_count,
      COALESCE(session_counts.active_session_count, 0) AS active_session_count,
      COALESCE(user_stats_solo.match_count, 0) AS solo_match_count,
      COALESCE(user_stats_solo.win_count, 0) AS solo_win_count,
      COALESCE(user_stats_solo.lose_count, 0) AS solo_lose_count,
      COALESCE(user_stats_multi.match_count, 0) AS multi_match_count,
      COALESCE(user_stats_multi.win_count, 0) AS multi_win_count,
      COALESCE(user_stats_multi.lose_count, 0) AS multi_lose_count,
      COALESCE(user_stats_global.current_win_streak, 0) AS current_win_streak,
      COALESCE(user_stats_global.max_win_streak, 0) AS max_win_streak,
      COALESCE(user_stats_global.current_lose_streak, 0) AS current_lose_streak,
      COALESCE(user_stats_global.max_lose_streak, 0) AS max_lose_streak
    FROM users
    LEFT JOIN user_settings ON user_settings.user_id = users.user_id
    LEFT JOIN titles current_titles ON current_titles.title_id = user_settings.current_title_id
    LEFT JOIN icons current_icons
      ON current_icons.icon_id = user_settings.current_icon_id
      AND current_icons.deleted_at IS NULL
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS title_count
      FROM user_titles
      GROUP BY user_id
    ) title_counts ON title_counts.user_id = users.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS icon_count
      FROM user_icons
      GROUP BY user_id
    ) icon_counts ON icon_counts.user_id = users.user_id
    LEFT JOIN (
      SELECT
        user_id,
        COUNT(*) AS illustration_count,
        SUM(CASE WHEN first_viewed_at IS NOT NULL THEN 1 ELSE 0 END) AS viewed_illustration_count
      FROM user_title_illustrations
      GROUP BY user_id
    ) illustration_counts ON illustration_counts.user_id = users.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS unread_notification_count
      FROM user_notifications
      WHERE is_read = 0
      GROUP BY user_id
    ) notification_counts ON notification_counts.user_id = users.user_id
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS active_session_count
      FROM user_sessions
      WHERE revoked_at IS NULL
        AND expires_at > ?
      GROUP BY user_id
    ) session_counts ON session_counts.user_id = users.user_id
    LEFT JOIN user_stats_solo ON user_stats_solo.user_id = users.user_id
    LEFT JOIN user_stats_multi ON user_stats_multi.user_id = users.user_id
    LEFT JOIN user_stats_global ON user_stats_global.user_id = users.user_id
    WHERE users.user_id = ?
      AND users.status <> 'deleted'
    LIMIT 1
    `,
  )
    .bind(now, userId)
    .first<PlayerUserDetailRow>();
}

async function readUserTitles(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      titles.title_id,
      titles.title_name,
      titles.description,
      titles.rarity,
      user_titles.acquired_at
    FROM user_titles
    INNER JOIN titles ON titles.title_id = user_titles.title_id
    WHERE user_titles.user_id = ?
    ORDER BY user_titles.acquired_at DESC, titles.sort_order ASC, titles.title_id ASC
    `,
  )
    .bind(userId)
    .all<UserTitleRow>();

  return result.results ?? [];
}

async function readUserIcons(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      icons.icon_id,
      icons.icon_name,
      icons.description,
      icons.image_path,
      icons.rarity,
      icons.storage_provider,
      user_icons.acquired_at
    FROM user_icons
    INNER JOIN icons ON icons.icon_id = user_icons.icon_id
    WHERE user_icons.user_id = ?
      AND icons.deleted_at IS NULL
    ORDER BY user_icons.acquired_at DESC, icons.sort_order ASC, icons.icon_id ASC
    `,
  )
    .bind(userId)
    .all<UserIconRow>();

  return result.results ?? [];
}

async function readMatchHistory(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      match_results.match_id,
      match_results.mode,
      match_results.difficulty,
      match_results.game_type,
      match_participants.is_winner,
      match_participants.is_loser,
      match_results.ended_at
    FROM match_participants
    INNER JOIN match_results ON match_results.match_id = match_participants.match_id
    WHERE match_participants.user_id = ?
    ORDER BY match_results.ended_at DESC, match_results.match_id DESC
    LIMIT ?
    `,
  )
    .bind(userId, MATCH_HISTORY_LIMIT)
    .all<MatchHistoryRow>();

  return result.results ?? [];
}

async function readPlayerUserStatusLogs(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      user_account_status_logs.log_id,
      user_account_status_logs.user_id,
      user_account_status_logs.admin_id,
      admin_users.display_name AS admin_display_name,
      admin_users.email AS admin_email,
      user_account_status_logs.action_type,
      user_account_status_logs.before_status,
      user_account_status_logs.after_status,
      user_account_status_logs.reason,
      user_account_status_logs.created_at
    FROM user_account_status_logs
    LEFT JOIN admin_users ON admin_users.admin_id = user_account_status_logs.admin_id
    WHERE user_account_status_logs.user_id = ?
    ORDER BY user_account_status_logs.created_at DESC, user_account_status_logs.log_id DESC
    LIMIT ?
    `,
  )
    .bind(userId, STATUS_LOG_LIMIT)
    .all<PlayerUserStatusLogRow>();

  return result.results ?? [];
}

async function updatePlayerUserStatus(context: PagesContext, session: AdminSession, userId: string, action: "suspend" | "unsuspend", reason: string) {
  const target = await context.env.DB.prepare(
    "SELECT user_id, status FROM users WHERE user_id = ? AND status <> 'deleted' LIMIT 1",
  )
    .bind(userId)
    .first<PlayerUserStatusTargetRow>();

  if (!target) return json({ ok: false, message: "対象ユーザーが見つかりません。" }, { status: 404 });

  const afterStatus = action === "suspend" ? "suspended" : "active";
  if (action === "suspend" && target.status !== "active") {
    return json({ ok: false, message: "activeのユーザーのみ停止できます。" }, { status: 400 });
  }
  if (action === "unsuspend" && target.status !== "suspended") {
    return json({ ok: false, message: "suspendedのユーザーのみ停止解除できます。" }, { status: 400 });
  }

  const now = nowIso();
  await context.env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE user_id = ?")
    .bind(afterStatus, now, target.user_id)
    .run();

  if (action === "suspend") {
    await context.env.DB.prepare("UPDATE user_sessions SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND revoked_at IS NULL")
      .bind(now, now, target.user_id)
      .run();
  }

  await context.env.DB.prepare(
    `
    INSERT INTO user_account_status_logs (
      log_id,
      user_id,
      admin_id,
      action_type,
      before_status,
      after_status,
      reason,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(createId("uasl"), target.user_id, session.admin_id, action, target.status, afterStatus, reason, now)
    .run();

  const detail = await readPlayerUserDetail(context.env, target.user_id);
  if (!detail) return json({ ok: false, message: "ユーザー状態は更新されましたが、詳細の再取得に失敗しました。" }, { status: 500 });

  const [titles, icons, matchHistory, statusLogs] = await Promise.all([
    readUserTitles(context.env, target.user_id),
    readUserIcons(context.env, target.user_id),
    readMatchHistory(context.env, target.user_id),
    readPlayerUserStatusLogs(context.env, target.user_id),
  ]);

  return json({
    ok: true,
    message: action === "suspend" ? "ユーザーを停止しました。" : "ユーザーの停止を解除しました。",
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      mustChangePassword: Boolean(session.must_change_password),
    },
    playerUserDetail: toPlayerUserDetailResponse(detail, titles, icons, matchHistory, statusLogs),
  });
}

function toPlayerUserDetailResponse(detail: PlayerUserDetailRow, titles: UserTitleRow[], icons: UserIconRow[], matchHistory: MatchHistoryRow[], statusLogs: PlayerUserStatusLogRow[]) {
  const solo = toStatsSummary(detail.solo_match_count, detail.solo_win_count, detail.solo_lose_count);
  const multi = toStatsSummary(detail.multi_match_count, detail.multi_win_count, detail.multi_lose_count);
  const total = toStatsSummary(solo.matchCount + multi.matchCount, solo.winCount + multi.winCount, solo.loseCount + multi.loseCount);

  return {
    user: {
      userId: detail.user_id,
      email: detail.email,
      emailNormalized: detail.email_normalized,
      status: detail.status,
      role: detail.role,
      roleLabel: playerRoleLabel(detail.role),
      emailVerified: Boolean(detail.email_verified_at),
      emailVerifiedAt: detail.email_verified_at,
      displayName: detail.display_name || DEFAULT_DISPLAY_NAME,
      lastLoginAt: detail.last_login_at,
      createdAt: detail.created_at,
      updatedAt: detail.updated_at,
      settingsUpdatedAt: detail.settings_updated_at,
    },
    current: {
      title: detail.current_title_id ? {
        id: detail.current_title_id,
        name: detail.current_title_name ?? "不明な称号",
        rarity: readNumber(detail.current_title_rarity),
      } : null,
      icon: detail.current_icon_id ? {
        id: detail.current_icon_id,
        name: detail.current_icon_name ?? "不明なアイコン",
        imagePath: detail.current_icon_image_path ? toIconImagePath(detail.current_icon_id, detail.current_icon_image_path, detail.current_icon_storage_provider) : "",
        rarity: readNumber(detail.current_icon_rarity),
      } : null,
    },
    collectionSummary: {
      titleCount: readNumber(detail.title_count),
      iconCount: readNumber(detail.icon_count),
      illustrationCount: readNumber(detail.illustration_count),
      viewedIllustrationCount: readNumber(detail.viewed_illustration_count),
      unreadNotificationCount: readNumber(detail.unread_notification_count),
      activeSessionCount: readNumber(detail.active_session_count),
    },
    stats: {
      total,
      solo,
      multi,
      currentWinStreak: readNumber(detail.current_win_streak),
      maxWinStreak: readNumber(detail.max_win_streak),
      currentLoseStreak: readNumber(detail.current_lose_streak),
      maxLoseStreak: readNumber(detail.max_lose_streak),
    },
    titles: titles.map((title) => ({
      id: title.title_id,
      name: title.title_name,
      description: title.description,
      rarity: readNumber(title.rarity),
      acquiredAt: title.acquired_at,
    })),
    icons: icons.map((icon) => ({
      id: icon.icon_id,
      name: icon.icon_name,
      description: icon.description,
      imagePath: toIconImagePath(icon.icon_id, icon.image_path, icon.storage_provider),
      rarity: readNumber(icon.rarity),
      acquiredAt: icon.acquired_at,
    })),
    matchHistory: matchHistory.map((match) => ({
      matchId: match.match_id,
      mode: match.mode,
      difficulty: match.difficulty,
      gameType: match.game_type,
      result: Number(match.is_winner) === 1 ? "win" : Number(match.is_loser) === 1 ? "lose" : "other",
      endedAt: match.ended_at,
    })),
    statusLogs: statusLogs.map((log) => ({
      id: log.log_id,
      actionType: log.action_type,
      beforeStatus: log.before_status,
      afterStatus: log.after_status,
      reason: log.reason,
      createdAt: log.created_at,
      admin: {
        id: log.admin_id,
        displayName: log.admin_display_name ?? "",
        email: log.admin_email ?? "",
      },
    })),
  };
}

function toStatsSummary(matchCountValue: number | string | null | undefined, winCountValue: number | string | null | undefined, loseCountValue: number | string | null | undefined) {
  const matchCount = readNumber(matchCountValue);
  const winCount = readNumber(winCountValue);
  const loseCount = readNumber(loseCountValue);
  return {
    matchCount,
    winCount,
    loseCount,
    winRate: matchCount > 0 ? Math.round((winCount / matchCount) * 1000) / 10 : 0,
  };
}

function toIconImagePath(iconId: string, imagePath: string, storageProvider: string | null) {
  return storageProvider === "r2" ? `/api/admin/assets/icons/${encodeURIComponent(iconId)}` : imagePath;
}

function readStatusAction(value: string) {
  if (value === "suspend" || value === "unsuspend") return value;
  return null;
}

function playerRoleLabel(role: UserRole) {
  if (role === "owner") return "管理責任者";
  if (role === "admin") return "管理者";
  return "通常ユーザー";
}

function readNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRouteParam(context: PagesContext, key: string) {
  const params = (context as PagesContext & { params?: Record<string, string | string[]> }).params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
