type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type R2ObjectBody = {
  body: ReadableStream;
  writeHttpMetadata?(headers: Headers): void;
};

type R2Bucket = {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
};

export type Env = {
  DB: D1Database;
  ASSETS_BUCKET?: R2Bucket;
  RESEND_API_KEY?: string;
};

export type PagesContext = {
  request: Request;
  env: Env;
};

export type UserRow = {
  user_id: string;
  email: string;
  email_normalized: string;
  password_hash: string;
  status: "pending" | "active" | "suspended" | "deleted";
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  role: UserRole;
};

export type UserRole = "user" | "admin" | "owner";

export type AuthSessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  status: UserRow["status"];
  role: UserRole;
  expires_at: string;
  revoked_at: string | null;
};

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const SESSION_COOKIE_NAME = "100game_session";
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
const PASSWORD_HASH_ITERATIONS = 210000;
const PASSWORD_HASH_ALGORITHM = "PBKDF2-SHA256";

export function json(payload: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { ...init, headers });
}

export async function readJsonRecord(request: Request) {
  try {
    const payload: unknown = await request.json();
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidRegisterPassword(password: string) {
  return password.length >= 7 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function nowIso() {
  return new Date().toISOString();
}

export function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function isFutureIso(value: string) {
  return Date.parse(value) > Date.now();
}

export function createId(prefix: string) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${createRandomToken(16)}`;
}

export function createRandomToken(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function createTokenPair() {
  const rawToken = createRandomToken(32);
  return {
    rawToken,
    tokenHash: await hashToken(rawToken),
  };
}

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", textEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_HASH_ITERATIONS,
    },
    key,
    256,
  );

  return [
    PASSWORD_HASH_ALGORITHM,
    String(PASSWORD_HASH_ITERATIONS),
    base64UrlEncode(salt),
    base64UrlEncode(new Uint8Array(bits)),
  ].join(":");
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split(":");
  if (parts.length !== 4) return false;

  const [algorithm, iterationsText, saltText, hashText] = parts;
  const iterations = Number(iterationsText);
  if (algorithm !== PASSWORD_HASH_ALGORITHM || !Number.isSafeInteger(iterations) || iterations <= 0) return false;

  const salt = base64UrlDecode(saltText);
  const expected = base64UrlDecode(hashText);
  const key = await crypto.subtle.importKey("raw", textEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    expected.length * 8,
  );

  return timingSafeEqual(new Uint8Array(bits), expected);
}

export function createSessionCookie(rawToken: string) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

export function createClearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export function getSessionTokenFromCookie(request: Request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return "";

  for (const part of cookie.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(valueParts.join("="));
  }

  return "";
}

export async function findSession(env: Env, request: Request) {
  const rawToken = getSessionTokenFromCookie(request);
  if (!rawToken) return null;

  const sessionTokenHash = await hashToken(rawToken);
  return env.DB.prepare(
    `
    SELECT
      user_sessions.session_id,
      user_sessions.user_id,
      users.email,
      users.status,
      users.role,
      user_sessions.expires_at,
      user_sessions.revoked_at
    FROM user_sessions
    INNER JOIN users ON users.user_id = user_sessions.user_id
    WHERE user_sessions.session_token_hash = ?
    LIMIT 1
    `,
  )
    .bind(sessionTokenHash)
    .first<AuthSessionRow>();
}

export async function findActiveSession(env: Env, request: Request) {
  const session = await findSession(env, request);
  if (!session || session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) return null;
  return session;
}

export function getOrigin(request: Request) {
  return new URL(request.url).origin;
}

export async function sendAuthMail(env: Env, payload: MailPayload) {
  if (!env.RESEND_API_KEY) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "100GAMEサポート <support@acceble.com>",
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    console.error("Auth mail send failed:", response.status, await response.text());
    return false;
  }

  return true;
}

export function buildVerificationMail(email: string, verificationUrl: string): MailPayload {
  return {
    to: email,
    subject: "【100GAME⁺】メールアドレス認証のお願い",
    text: [
      "100GAME⁺への新規登録ありがとうございます。",
      "以下のURLを開いて、メールアドレス認証を完了してください。",
      verificationUrl,
      "このURLの有効期限は24時間です。",
    ].join("\n"),
    html: [
      "<p>100GAME⁺への新規登録ありがとうございます。</p>",
      "<p>以下のURLを開いて、メールアドレス認証を完了してください。</p>",
      `<p><a href=\"${escapeHtml(verificationUrl)}\">メールアドレスを認証する</a></p>`,
      "<p>このURLの有効期限は24時間です。</p>",
    ].join(""),
  };
}

export function buildPasswordResetMail(email: string, resetUrl: string): MailPayload {
  return {
    to: email,
    subject: "【100GAME⁺】パスワード再設定のご案内",
    text: [
      "100GAME⁺のパスワード再設定を受け付けました。",
      "以下のURLを開いて、新しいパスワードを設定してください。",
      resetUrl,
      "このURLの有効期限は1時間です。",
      "このメールに心当たりがない場合は、破棄してください。",
    ].join("\n"),
    html: [
      "<p>100GAME⁺のパスワード再設定を受け付けました。</p>",
      "<p>以下のURLを開いて、新しいパスワードを設定してください。</p>",
      `<p><a href=\"${escapeHtml(resetUrl)}\">パスワードを再設定する</a></p>`,
      "<p>このURLの有効期限は1時間です。</p>",
      "<p>このメールに心当たりがない場合は、破棄してください。</p>",
    ].join(""),
  };
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textEncoder() {
  return new TextEncoder();
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
