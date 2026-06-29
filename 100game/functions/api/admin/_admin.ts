import {
  createTokenPair,
  hashToken,
  isFutureIso,
  json,
  type Env,
  type PagesContext,
} from "../auth/_shared";

export type AdminRole = "admin" | "owner";

export type AdminSession = {
  session_id: string;
  admin_id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  status: "active" | "disabled" | "deleted";
  must_change_password: number;
  expires_at: string;
  revoked_at: string | null;
};

const ADMIN_SESSION_COOKIE_NAME = "100game_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export async function requireAdminSession(context: PagesContext): Promise<AdminSession | Response> {
  const session = await findActiveAdminSession(context.env, context.request);
  if (!session) {
    return json({ ok: false, message: "管理者ログインが必要です。" }, { status: 401 });
  }

  return session;
}

export function isResponse(value: AdminSession | Response): value is Response {
  return value instanceof Response;
}

export function normalizeRole(value: unknown): AdminRole | null {
  if (value === "admin" || value === "owner") return value;
  return null;
}

export function roleLabel(role: AdminRole) {
  if (role === "owner") return "管理責任者";
  return "管理者";
}

export async function countOwners(env: Env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users WHERE role = 'owner' AND status = 'active' AND deleted_at IS NULL").first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function findActiveAdminSession(env: Env, request: Request) {
  const rawToken = getAdminSessionTokenFromCookie(request);
  if (!rawToken) return null;

  const sessionTokenHash = await hashToken(rawToken);
  const session = await env.DB.prepare(
    `
    SELECT
      admin_sessions.session_id,
      admin_sessions.admin_id,
      admin_sessions.admin_id AS user_id,
      admin_users.email,
      admin_users.display_name,
      admin_users.role,
      admin_users.status,
      admin_users.must_change_password,
      admin_sessions.expires_at,
      admin_sessions.revoked_at
    FROM admin_sessions
    INNER JOIN admin_users ON admin_users.admin_id = admin_sessions.admin_id
    WHERE admin_sessions.session_token_hash = ?
      AND admin_users.deleted_at IS NULL
    LIMIT 1
    `,
  )
    .bind(sessionTokenHash)
    .first<AdminSession>();

  if (!session || session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) return null;
  return session;
}

export async function createAdminLoginSession(env: Env, adminId: string) {
  const now = new Date().toISOString();
  const sessionId = createAdminId("ads");
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await env.DB.prepare(
    `
    INSERT INTO admin_sessions (
      session_id,
      admin_id,
      session_token_hash,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(sessionId, adminId, tokenHash, expiresAt, now, now)
    .run();

  return { rawToken, expiresAt };
}

export async function revokeCurrentAdminSession(env: Env, request: Request) {
  const rawToken = getAdminSessionTokenFromCookie(request);
  if (!rawToken) return;

  const tokenHash = await hashToken(rawToken);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE session_token_hash = ? AND revoked_at IS NULL")
    .bind(now, now, tokenHash)
    .run();
}

export function createAdminSessionCookie(rawToken: string) {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

export function createClearAdminSessionCookie() {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

function getAdminSessionTokenFromCookie(request: Request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return "";

  for (const part of cookie.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== ADMIN_SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(valueParts.join("="));
  }

  return "";
}

function createAdminId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) value += byte.toString(16).padStart(2, "0");
  return `${prefix}_${value}`;
}
