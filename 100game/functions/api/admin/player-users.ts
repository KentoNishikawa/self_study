import { json, type Env, type PagesContext, type UserRole } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type PlayerUserRow = {
  user_id: string;
  email: string;
  email_normalized: string;
  status: "pending" | "active" | "suspended" | "deleted";
  role: UserRole;
  email_verified_at: string | null;
  display_name: string | null;
  last_login_at: string | null;
  created_at: string;
  title_count: number | null;
  icon_count: number | null;
  solo_match_count: number | null;
  solo_win_count: number | null;
  solo_lose_count: number | null;
  multi_match_count: number | null;
  multi_win_count: number | null;
  multi_lose_count: number | null;
};

const PAGE_SIZE = 50;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const url = new URL(context.request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const requestedPage = readPositiveInteger(url.searchParams.get("page"), 1);
  const searchPattern = `%${escapeLike(query.toLowerCase())}%`;

  const total = await countPlayerUsers(context.env, query, searchPattern);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const users = await readPlayerUsers(context.env, query, searchPattern, PAGE_SIZE, offset);

  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      mustChangePassword: Boolean(session.must_change_password),
    },
    query,
    playerUsers: users.map(toPlayerUserResponse),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  });
}

async function countPlayerUsers(env: Env, query: string, searchPattern: string) {
  if (!query) {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total_count FROM users WHERE status <> 'deleted'").first<{ total_count: number }>();
    return Number(row?.total_count ?? 0);
  }

  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS total_count
    FROM users
    LEFT JOIN user_settings ON user_settings.user_id = users.user_id
    WHERE users.status <> 'deleted'
      AND (
        LOWER(users.user_id) LIKE ? ESCAPE '\\'
        OR users.email_normalized LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(user_settings.display_name, '')) LIKE ? ESCAPE '\\'
      )
    `,
  )
    .bind(searchPattern, searchPattern, searchPattern)
    .first<{ total_count: number }>();

  return Number(row?.total_count ?? 0);
}

async function readPlayerUsers(env: Env, query: string, searchPattern: string, limit: number, offset: number) {
  const baseSql = `
    SELECT
      users.user_id,
      users.email,
      users.email_normalized,
      users.status,
      users.role,
      users.email_verified_at,
      user_settings.display_name,
      users.last_login_at,
      users.created_at,
      COALESCE(title_counts.title_count, 0) AS title_count,
      COALESCE(icon_counts.icon_count, 0) AS icon_count,
      COALESCE(user_stats_solo.match_count, 0) AS solo_match_count,
      COALESCE(user_stats_solo.win_count, 0) AS solo_win_count,
      COALESCE(user_stats_solo.lose_count, 0) AS solo_lose_count,
      COALESCE(user_stats_multi.match_count, 0) AS multi_match_count,
      COALESCE(user_stats_multi.win_count, 0) AS multi_win_count,
      COALESCE(user_stats_multi.lose_count, 0) AS multi_lose_count
    FROM users
    LEFT JOIN user_settings ON user_settings.user_id = users.user_id
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
    LEFT JOIN user_stats_solo ON user_stats_solo.user_id = users.user_id
    LEFT JOIN user_stats_multi ON user_stats_multi.user_id = users.user_id
    WHERE users.status <> 'deleted'
  `;

  const searchSql = query
    ? `
      AND (
        LOWER(users.user_id) LIKE ? ESCAPE '\\'
        OR users.email_normalized LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(user_settings.display_name, '')) LIKE ? ESCAPE '\\'
      )
    `
    : "";

  const orderSql = `
    ORDER BY users.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const statement = env.DB.prepare(`${baseSql}${searchSql}${orderSql}`);
  const result = query
    ? await statement.bind(searchPattern, searchPattern, searchPattern, limit, offset).all<PlayerUserRow>()
    : await statement.bind(limit, offset).all<PlayerUserRow>();

  return result.results ?? [];
}

function toPlayerUserResponse(row: PlayerUserRow) {
  const soloMatchCount = readNumber(row.solo_match_count);
  const multiMatchCount = readNumber(row.multi_match_count);
  const soloWinCount = readNumber(row.solo_win_count);
  const multiWinCount = readNumber(row.multi_win_count);
  const soloLoseCount = readNumber(row.solo_lose_count);
  const multiLoseCount = readNumber(row.multi_lose_count);
  const matchCount = soloMatchCount + multiMatchCount;
  const winCount = soloWinCount + multiWinCount;
  const loseCount = soloLoseCount + multiLoseCount;

  return {
    userId: row.user_id,
    email: row.email,
    emailNormalized: row.email_normalized,
    status: row.status,
    role: row.role,
    roleLabel: playerRoleLabel(row.role),
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at,
    displayName: row.display_name ?? "",
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    titleCount: readNumber(row.title_count),
    iconCount: readNumber(row.icon_count),
    stats: {
      matchCount,
      winCount,
      loseCount,
      winRate: matchCount > 0 ? Math.round((winCount / matchCount) * 1000) / 10 : 0,
      soloMatchCount,
      multiMatchCount,
    },
  };
}

function playerRoleLabel(role: UserRole) {
  if (role === "owner") return "管理責任者";
  if (role === "admin") return "管理者";
  return "通常ユーザー";
}

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function readNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
