var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/auth/_shared.ts
var SESSION_COOKIE_NAME = "100game_session";
var SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
var PASSWORD_HASH_ITERATIONS = 21e4;
var PASSWORD_HASH_ALGORITHM = "PBKDF2-SHA256";
function json(payload, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { ...init, headers });
}
__name(json, "json");
async function readJsonRecord(request) {
  try {
    const payload = await request.json();
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}
__name(readJsonRecord, "readJsonRecord");
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
__name(isRecord, "isRecord");
function getString(value) {
  return typeof value === "string" ? value : "";
}
__name(getString, "getString");
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
__name(isValidEmail, "isValidEmail");
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
__name(normalizeEmail, "normalizeEmail");
function isValidRegisterPassword(password) {
  return password.length >= 7 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}
__name(isValidRegisterPassword, "isValidRegisterPassword");
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function addHoursIso(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1e3).toISOString();
}
__name(addHoursIso, "addHoursIso");
function isFutureIso(value) {
  return Date.parse(value) > Date.now();
}
__name(isFutureIso, "isFutureIso");
function createId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${createRandomToken(16)}`;
}
__name(createId, "createId");
function createRandomToken(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
__name(createRandomToken, "createRandomToken");
async function createTokenPair() {
  const rawToken = createRandomToken(32);
  return {
    rawToken,
    tokenHash: await hashToken(rawToken)
  };
}
__name(createTokenPair, "createTokenPair");
async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder().encode(token));
  return base64UrlEncode(new Uint8Array(digest));
}
__name(hashToken, "hashToken");
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", textEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_HASH_ITERATIONS
    },
    key,
    256
  );
  return [
    PASSWORD_HASH_ALGORITHM,
    String(PASSWORD_HASH_ITERATIONS),
    base64UrlEncode(salt),
    base64UrlEncode(new Uint8Array(bits))
  ].join(":");
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, storedHash) {
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
      iterations
    },
    key,
    expected.length * 8
  );
  return timingSafeEqual(new Uint8Array(bits), expected);
}
__name(verifyPassword, "verifyPassword");
function createSessionCookie(rawToken) {
  return [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`
  ].join("; ");
}
__name(createSessionCookie, "createSessionCookie");
function createClearSessionCookie() {
  return [
    `${SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}
__name(createClearSessionCookie, "createClearSessionCookie");
function getSessionTokenFromCookie(request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return "";
  for (const part of cookie.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(valueParts.join("="));
  }
  return "";
}
__name(getSessionTokenFromCookie, "getSessionTokenFromCookie");
async function findSession(env, request) {
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
    `
  ).bind(sessionTokenHash).first();
}
__name(findSession, "findSession");
async function findActiveSession(env, request) {
  const session = await findSession(env, request);
  if (!session || session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) return null;
  return session;
}
__name(findActiveSession, "findActiveSession");
function getOrigin(request) {
  return new URL(request.url).origin;
}
__name(getOrigin, "getOrigin");
async function sendAuthMail(env, payload) {
  if (!env.RESEND_API_KEY) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "100GAME\u30B5\u30DD\u30FC\u30C8 <support@acceble.com>",
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    })
  });
  if (!response.ok) {
    console.error("Auth mail send failed:", response.status, await response.text());
    return false;
  }
  return true;
}
__name(sendAuthMail, "sendAuthMail");
function buildVerificationMail(email, verificationUrl) {
  return {
    to: email,
    subject: "\u3010100GAME\u207A\u3011\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u8A8D\u8A3C\u306E\u304A\u9858\u3044",
    text: [
      "100GAME\u207A\u3078\u306E\u65B0\u898F\u767B\u9332\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002",
      "\u4EE5\u4E0B\u306EURL\u3092\u958B\u3044\u3066\u3001\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u8A8D\u8A3C\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      verificationUrl,
      "\u3053\u306EURL\u306E\u6709\u52B9\u671F\u9650\u306F24\u6642\u9593\u3067\u3059\u3002"
    ].join("\n"),
    html: [
      "<p>100GAME\u207A\u3078\u306E\u65B0\u898F\u767B\u9332\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002</p>",
      "<p>\u4EE5\u4E0B\u306EURL\u3092\u958B\u3044\u3066\u3001\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u8A8D\u8A3C\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002</p>",
      `<p><a href="${escapeHtml(verificationUrl)}">\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u8A8D\u8A3C\u3059\u308B</a></p>`,
      "<p>\u3053\u306EURL\u306E\u6709\u52B9\u671F\u9650\u306F24\u6642\u9593\u3067\u3059\u3002</p>"
    ].join("")
  };
}
__name(buildVerificationMail, "buildVerificationMail");
function buildPasswordResetMail(email, resetUrl) {
  return {
    to: email,
    subject: "\u3010100GAME\u207A\u3011\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u306E\u3054\u6848\u5185",
    text: [
      "100GAME\u207A\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\u3002",
      "\u4EE5\u4E0B\u306EURL\u3092\u958B\u3044\u3066\u3001\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
      resetUrl,
      "\u3053\u306EURL\u306E\u6709\u52B9\u671F\u9650\u306F1\u6642\u9593\u3067\u3059\u3002",
      "\u3053\u306E\u30E1\u30FC\u30EB\u306B\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u7834\u68C4\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    ].join("\n"),
    html: [
      "<p>100GAME\u207A\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\u3002</p>",
      "<p>\u4EE5\u4E0B\u306EURL\u3092\u958B\u3044\u3066\u3001\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002</p>",
      `<p><a href="${escapeHtml(resetUrl)}">\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u518D\u8A2D\u5B9A\u3059\u308B</a></p>`,
      "<p>\u3053\u306EURL\u306E\u6709\u52B9\u671F\u9650\u306F1\u6642\u9593\u3067\u3059\u3002</p>",
      "<p>\u3053\u306E\u30E1\u30FC\u30EB\u306B\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u3001\u7834\u68C4\u3057\u3066\u304F\u3060\u3055\u3044\u3002</p>"
    ].join("")
  };
}
__name(buildPasswordResetMail, "buildPasswordResetMail");
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
__name(escapeHtml, "escapeHtml");
function textEncoder() {
  return new TextEncoder();
}
__name(textEncoder, "textEncoder");
function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(base64UrlDecode, "base64UrlDecode");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}
__name(timingSafeEqual, "timingSafeEqual");

// api/admin/_admin.ts
var ADMIN_SESSION_COOKIE_NAME = "100game_admin_session";
var ADMIN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
async function requireAdminSession(context) {
  const session = await findActiveAdminSession(context.env, context.request);
  if (!session) {
    return json({ ok: false, message: "\u7BA1\u7406\u8005\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  return session;
}
__name(requireAdminSession, "requireAdminSession");
function isResponse(value) {
  return value instanceof Response;
}
__name(isResponse, "isResponse");
function normalizeRole(value) {
  if (value === "admin" || value === "owner") return value;
  return null;
}
__name(normalizeRole, "normalizeRole");
function roleLabel(role) {
  if (role === "owner") return "\u7BA1\u7406\u8CAC\u4EFB\u8005";
  return "\u7BA1\u7406\u8005";
}
__name(roleLabel, "roleLabel");
async function countOwners(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users WHERE role = 'owner' AND status = 'active' AND deleted_at IS NULL").first();
  return Number(row?.count ?? 0);
}
__name(countOwners, "countOwners");
async function findActiveAdminSession(env, request) {
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
    `
  ).bind(sessionTokenHash).first();
  if (!session || session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) return null;
  return session;
}
__name(findActiveAdminSession, "findActiveAdminSession");
async function createAdminLoginSession(env, adminId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const sessionId = createAdminId("ads");
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1e3).toISOString();
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
    `
  ).bind(sessionId, adminId, tokenHash, expiresAt, now, now).run();
  return { rawToken, expiresAt };
}
__name(createAdminLoginSession, "createAdminLoginSession");
async function revokeCurrentAdminSession(env, request) {
  const rawToken = getAdminSessionTokenFromCookie(request);
  if (!rawToken) return;
  const tokenHash = await hashToken(rawToken);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE session_token_hash = ? AND revoked_at IS NULL").bind(now, now, tokenHash).run();
}
__name(revokeCurrentAdminSession, "revokeCurrentAdminSession");
function createAdminSessionCookie(rawToken) {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`
  ].join("; ");
}
__name(createAdminSessionCookie, "createAdminSessionCookie");
function createClearAdminSessionCookie() {
  return [
    `${ADMIN_SESSION_COOKIE_NAME}=`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0"
  ].join("; ");
}
__name(createClearAdminSessionCookie, "createClearAdminSessionCookie");
function getAdminSessionTokenFromCookie(request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return "";
  for (const part of cookie.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== ADMIN_SESSION_COOKIE_NAME) continue;
    return decodeURIComponent(valueParts.join("="));
  }
  return "";
}
__name(getAdminSessionTokenFromCookie, "getAdminSessionTokenFromCookie");
function createAdminId(prefix) {
  if (typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) value += byte.toString(16).padStart(2, "0");
  return `${prefix}_${value}`;
}
__name(createAdminId, "createAdminId");

// api/admin/assets/icon-replacements/[batchId]/[variant].ts
async function onRequestGet(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const batchId = getRouteParam(context, "batchId");
  const variant = getRouteParam(context, "variant");
  if (!batchId || variant !== "before" && variant !== "after") return new Response("Not Found", { status: 404 });
  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'icon_replace'
      AND target_type = 'icon'
    LIMIT 1
    `
  ).bind(batchId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  const payload = parseJson(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });
  if (variant === "before" && payload.storage_provider !== "r2") {
    const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
    return redirectLocalAsset(context.request, imagePath);
  }
  const storageKey = variant === "before" ? typeof payload.storage_key === "string" ? payload.storage_key : "" : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before" ? typeof payload.mime_type === "string" ? payload.mime_type : null : typeof payload.mimeType === "string" ? payload.mimeType : null;
  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });
  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}
__name(onRequestGet, "onRequestGet");
function onRequestPost() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost, "onRequestPost");
function getRouteParam(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam, "getRouteParam");
function redirectLocalAsset(request, imagePath) {
  if (!imagePath.startsWith("/")) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset, "redirectLocalAsset");
function parseJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson, "parseJson");

// api/admin/assets/loading-illustrations/[batchId]/[variant].ts
async function onRequestGet2(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const batchId = getRouteParam2(context, "batchId");
  const variant = getRouteParam2(context, "variant");
  if (!batchId || variant !== "before" && variant !== "after") return new Response("Not Found", { status: 404 });
  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'loading_illustration_replace'
      AND target_type = 'loading_illustration'
    LIMIT 1
    `
  ).bind(batchId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  const payload = parseJson2(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });
  if (variant === "before" && payload.storage_provider !== "r2") {
    const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
    return redirectLocalAsset2(context.request, imagePath);
  }
  const storageKey = variant === "before" ? typeof payload.storage_key === "string" ? payload.storage_key : "" : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before" ? typeof payload.mime_type === "string" ? payload.mime_type : null : typeof payload.mimeType === "string" ? payload.mimeType : null;
  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });
  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}
__name(onRequestGet2, "onRequestGet");
function onRequestPost2() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost2, "onRequestPost");
function getRouteParam2(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam2, "getRouteParam");
function redirectLocalAsset2(request, imagePath) {
  if (!imagePath.startsWith("/")) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset2, "redirectLocalAsset");
function parseJson2(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson2, "parseJson");

// api/admin/assets/icons/[iconId].ts
async function onRequestGet3(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const iconId = getRouteParam3(context, "iconId");
  if (!iconId) return new Response("Not Found", { status: 404 });
  const replacementResponse = await maybeReadReplacementPreview(context, iconId);
  if (replacementResponse) return replacementResponse;
  const row = await context.env.DB.prepare(
    `
    SELECT image_path, storage_provider, storage_key, mime_type
    FROM icons
    WHERE icon_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `
  ).bind(iconId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  return renderAsset(context, row.image_path, row.storage_provider, row.storage_key, row.mime_type);
}
__name(onRequestGet3, "onRequestGet");
function onRequestPost3() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost3, "onRequestPost");
async function maybeReadReplacementPreview(context, iconId) {
  const url = new URL(context.request.url);
  const replacementBatchId = url.searchParams.get("replacementBatchId")?.trim() ?? "";
  const variant = url.searchParams.get("variant")?.trim() ?? "";
  if (!replacementBatchId && !variant) return null;
  if (!replacementBatchId || variant !== "before" && variant !== "after") return new Response("Not Found", { status: 404 });
  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'icon_replace'
      AND target_type = 'icon'
      AND target_id = ?
    LIMIT 1
    `
  ).bind(replacementBatchId, iconId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  const payload = parseJson3(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });
  const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
  const storageProvider = typeof payload.storage_provider === "string" ? payload.storage_provider : "r2";
  const storageKey = variant === "before" ? typeof payload.storage_key === "string" ? payload.storage_key : "" : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before" ? typeof payload.mime_type === "string" ? payload.mime_type : null : typeof payload.mimeType === "string" ? payload.mimeType : null;
  return renderAsset(context, imagePath, storageProvider, storageKey, mimeType);
}
__name(maybeReadReplacementPreview, "maybeReadReplacementPreview");
async function renderAsset(context, imagePath, storageProvider, storageKey, mimeType) {
  if (storageProvider !== "r2") return redirectLocalAsset3(context.request, imagePath);
  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });
  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}
__name(renderAsset, "renderAsset");
function getRouteParam3(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam3, "getRouteParam");
function redirectLocalAsset3(request, imagePath) {
  if (!imagePath.startsWith("/")) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset3, "redirectLocalAsset");
function parseJson3(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson3, "parseJson");

// api/admin/assets/loading-illustrations/[illustrationId].ts
async function onRequestGet4(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const illustrationId = getRouteParam4(context, "illustrationId");
  if (!illustrationId) return new Response("Not Found", { status: 404 });
  const replacementResponse = await maybeReadReplacementPreview2(context, illustrationId);
  if (replacementResponse) return replacementResponse;
  const row = await context.env.DB.prepare(
    `
    SELECT image_path, storage_provider, storage_key, mime_type
    FROM title_illustrations
    WHERE illustration_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `
  ).bind(illustrationId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  return renderAsset2(context, row.image_path, row.storage_provider, row.storage_key, row.mime_type);
}
__name(onRequestGet4, "onRequestGet");
function onRequestPost4() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost4, "onRequestPost");
async function maybeReadReplacementPreview2(context, illustrationId) {
  const url = new URL(context.request.url);
  const replacementBatchId = url.searchParams.get("replacementBatchId")?.trim() ?? "";
  const variant = url.searchParams.get("variant")?.trim() ?? "";
  if (!replacementBatchId && !variant) return null;
  if (!replacementBatchId || variant !== "before" && variant !== "after") return new Response("Not Found", { status: 404 });
  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'loading_illustration_replace'
      AND target_type = 'loading_illustration'
      AND target_id = ?
    LIMIT 1
    `
  ).bind(replacementBatchId, illustrationId).first();
  if (!row) return new Response("Not Found", { status: 404 });
  const payload = parseJson4(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });
  const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
  const storageProvider = typeof payload.storage_provider === "string" ? payload.storage_provider : "r2";
  const storageKey = variant === "before" ? typeof payload.storage_key === "string" ? payload.storage_key : "" : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before" ? typeof payload.mime_type === "string" ? payload.mime_type : null : typeof payload.mimeType === "string" ? payload.mimeType : null;
  return renderAsset2(context, imagePath, storageProvider, storageKey, mimeType);
}
__name(maybeReadReplacementPreview2, "maybeReadReplacementPreview");
async function renderAsset2(context, imagePath, storageProvider, storageKey, mimeType) {
  if (storageProvider !== "r2") return redirectLocalAsset4(context.request, imagePath);
  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });
  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}
__name(renderAsset2, "renderAsset");
function getRouteParam4(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam4, "getRouteParam");
function redirectLocalAsset4(request, imagePath) {
  if (!imagePath.startsWith("/")) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset4, "redirectLocalAsset");
function parseJson4(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson4, "parseJson");

// api/admin/auth/login.ts
async function onRequestPost5({ request, env }) {
  const body = await readJsonRecord(request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const email = getString(body.email).trim();
  const password = getString(body.password);
  const errors = validateLogin({ email, password });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const admin = await env.DB.prepare("SELECT * FROM admin_users WHERE email_normalized = ? AND deleted_at IS NULL LIMIT 1").bind(normalizeEmail(email)).first();
  if (!admin || admin.status !== "active" || !await verifyPassword(password, admin.password_hash)) {
    return json(
      {
        ok: false,
        message: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002",
        errors: { password: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }
      },
      { status: 401 }
    );
  }
  const now = nowIso();
  const { rawToken, expiresAt } = await createAdminLoginSession(env, admin.admin_id);
  await env.DB.prepare("UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE admin_id = ?").bind(now, now, admin.admin_id).run();
  return json(
    {
      ok: true,
      currentUser: {
        userId: admin.admin_id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        roleLabel: roleLabel(admin.role),
        mustChangePassword: Boolean(admin.must_change_password)
      },
      expiresAt
    },
    { headers: { "Set-Cookie": createAdminSessionCookie(rawToken) } }
  );
}
__name(onRequestPost5, "onRequestPost");
function onRequestGet5() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet5, "onRequestGet");
function validateLogin(values) {
  const errors = {};
  if (!values.email) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidEmail(values.email)) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  if (!values.password) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  return errors;
}
__name(validateLogin, "validateLogin");

// api/admin/auth/logout.ts
async function onRequestPost6(context) {
  await revokeCurrentAdminSession(context.env, context.request);
  return json(
    { ok: true, message: "\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002" },
    { headers: { "Set-Cookie": createClearAdminSessionCookie() } }
  );
}
__name(onRequestPost6, "onRequestPost");
function onRequestGet6() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet6, "onRequestGet");

// api/admin/auth/me.ts
async function onRequestGet7(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      roleLabel: roleLabel(session.role),
      mustChangePassword: Boolean(session.must_change_password)
    }
  });
}
__name(onRequestGet7, "onRequestGet");

// api/admin/auth/password.ts
async function onRequestPatch(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const targetAdminId = getString(body.targetAdminId) || session.admin_id;
  const currentPassword = getString(body.currentPassword);
  const newPassword = getString(body.newPassword);
  const confirmPassword = getString(body.confirmPassword);
  const isSelf = targetAdminId === session.admin_id;
  if (!isSelf && session.role !== "owner") {
    return json({ ok: false, message: "\u4ED6\u306E\u7BA1\u7406\u8005\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5909\u66F4\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  }
  if (isSelf && !currentPassword) return json({ ok: false, message: "\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!isValidRegisterPassword(newPassword)) {
    return json({ ok: false, message: "\u65B0\u3057\u3044\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u82F1\u5B57\u30FB\u6570\u5B57\u30FB\u8A18\u53F7\u3092\u542B\u30807\u6587\u5B57\u4EE5\u4E0A\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return json({ ok: false, message: "\u78BA\u8A8D\u7528\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002" }, { status: 400 });
  }
  const row = await context.env.DB.prepare("SELECT admin_id, password_hash FROM admin_users WHERE admin_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1").bind(targetAdminId).first();
  if (!row) {
    return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  }
  if (isSelf && !await verifyPassword(currentPassword, row.password_hash)) {
    return json({ ok: false, message: "\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 401 });
  }
  const now = nowIso();
  const passwordHash = await hashPassword(newPassword);
  await context.env.DB.prepare("UPDATE admin_users SET password_hash = ?, must_change_password = 0, password_changed_at = ?, updated_at = ? WHERE admin_id = ?").bind(passwordHash, now, now, row.admin_id).run();
  return json({ ok: true, message: "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5909\u66F4\u3057\u307E\u3057\u305F\u3002" });
}
__name(onRequestPatch, "onRequestPatch");
function onRequestGet8() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPATCH\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet8, "onRequestGet");

// api/admin/player-users/[userId].ts
var DEFAULT_DISPLAY_NAME = "\u30D7\u30EC\u30A4\u30E4\u30FC";
var MATCH_HISTORY_LIMIT = 10;
var STATUS_LOG_LIMIT = 20;
var STATUS_REASON_MAX_LENGTH = 500;
async function onRequestGet9(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const userId = getRouteParam5(context, "userId");
  if (!userId) return json({ ok: false, message: "\u30E6\u30FC\u30B6\u30FCID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" }, { status: 400 });
  const detail = await readPlayerUserDetail(context.env, userId);
  if (!detail) return json({ ok: false, message: "\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  const [titles, icons, matchHistory, statusLogs] = await Promise.all([
    readUserTitles(context.env, userId),
    readUserIcons(context.env, userId),
    readMatchHistory(context.env, userId),
    readPlayerUserStatusLogs(context.env, userId)
  ]);
  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      mustChangePassword: Boolean(session.must_change_password)
    },
    playerUserDetail: toPlayerUserDetailResponse(detail, titles, icons, matchHistory, statusLogs)
  });
}
__name(onRequestGet9, "onRequestGet");
async function onRequestPatch2(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const userId = getRouteParam5(context, "userId");
  if (!userId) return json({ ok: false, message: "\u30E6\u30FC\u30B6\u30FCID\u304C\u6307\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" }, { status: 400 });
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const action = readStatusAction(getString(body.action));
  const reason = getString(body.reason).trim();
  if (!action) return json({ ok: false, message: "\u64CD\u4F5C\u306E\u6307\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u505C\u6B62\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > STATUS_REASON_MAX_LENGTH) return json({ ok: false, message: `\u505C\u6B62\u7406\u7531\u306F${STATUS_REASON_MAX_LENGTH}\u6587\u5B57\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002` }, { status: 400 });
  return updatePlayerUserStatus(context, session, userId, action, reason);
}
__name(onRequestPatch2, "onRequestPatch");
function onRequestPost7() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET/PATCH\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost7, "onRequestPost");
async function readPlayerUserDetail(env, userId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    `
  ).bind(now, userId).first();
}
__name(readPlayerUserDetail, "readPlayerUserDetail");
async function readUserTitles(env, userId) {
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
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readUserTitles, "readUserTitles");
async function readUserIcons(env, userId) {
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
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readUserIcons, "readUserIcons");
async function readMatchHistory(env, userId) {
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
    `
  ).bind(userId, MATCH_HISTORY_LIMIT).all();
  return result.results ?? [];
}
__name(readMatchHistory, "readMatchHistory");
async function readPlayerUserStatusLogs(env, userId) {
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
    `
  ).bind(userId, STATUS_LOG_LIMIT).all();
  return result.results ?? [];
}
__name(readPlayerUserStatusLogs, "readPlayerUserStatusLogs");
async function updatePlayerUserStatus(context, session, userId, action, reason) {
  const target = await context.env.DB.prepare(
    "SELECT user_id, status FROM users WHERE user_id = ? AND status <> 'deleted' LIMIT 1"
  ).bind(userId).first();
  if (!target) return json({ ok: false, message: "\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  const afterStatus = action === "suspend" ? "suspended" : "active";
  if (action === "suspend" && target.status !== "active") {
    return json({ ok: false, message: "active\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u307F\u505C\u6B62\u3067\u304D\u307E\u3059\u3002" }, { status: 400 });
  }
  if (action === "unsuspend" && target.status !== "suspended") {
    return json({ ok: false, message: "suspended\u306E\u30E6\u30FC\u30B6\u30FC\u306E\u307F\u505C\u6B62\u89E3\u9664\u3067\u304D\u307E\u3059\u3002" }, { status: 400 });
  }
  const now = nowIso();
  await context.env.DB.prepare("UPDATE users SET status = ?, updated_at = ? WHERE user_id = ?").bind(afterStatus, now, target.user_id).run();
  if (action === "suspend") {
    await context.env.DB.prepare("UPDATE user_sessions SET revoked_at = ?, updated_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, now, target.user_id).run();
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
    `
  ).bind(createId("uasl"), target.user_id, session.admin_id, action, target.status, afterStatus, reason, now).run();
  const detail = await readPlayerUserDetail(context.env, target.user_id);
  if (!detail) return json({ ok: false, message: "\u30E6\u30FC\u30B6\u30FC\u72B6\u614B\u306F\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F\u304C\u3001\u8A73\u7D30\u306E\u518D\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002" }, { status: 500 });
  const [titles, icons, matchHistory, statusLogs] = await Promise.all([
    readUserTitles(context.env, target.user_id),
    readUserIcons(context.env, target.user_id),
    readMatchHistory(context.env, target.user_id),
    readPlayerUserStatusLogs(context.env, target.user_id)
  ]);
  return json({
    ok: true,
    message: action === "suspend" ? "\u30E6\u30FC\u30B6\u30FC\u3092\u505C\u6B62\u3057\u307E\u3057\u305F\u3002" : "\u30E6\u30FC\u30B6\u30FC\u306E\u505C\u6B62\u3092\u89E3\u9664\u3057\u307E\u3057\u305F\u3002",
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      mustChangePassword: Boolean(session.must_change_password)
    },
    playerUserDetail: toPlayerUserDetailResponse(detail, titles, icons, matchHistory, statusLogs)
  });
}
__name(updatePlayerUserStatus, "updatePlayerUserStatus");
function toPlayerUserDetailResponse(detail, titles, icons, matchHistory, statusLogs) {
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
      settingsUpdatedAt: detail.settings_updated_at
    },
    current: {
      title: detail.current_title_id ? {
        id: detail.current_title_id,
        name: detail.current_title_name ?? "\u4E0D\u660E\u306A\u79F0\u53F7",
        rarity: readNumber(detail.current_title_rarity)
      } : null,
      icon: detail.current_icon_id ? {
        id: detail.current_icon_id,
        name: detail.current_icon_name ?? "\u4E0D\u660E\u306A\u30A2\u30A4\u30B3\u30F3",
        imagePath: detail.current_icon_image_path ? toIconImagePath(detail.current_icon_id, detail.current_icon_image_path, detail.current_icon_storage_provider) : "",
        rarity: readNumber(detail.current_icon_rarity)
      } : null
    },
    collectionSummary: {
      titleCount: readNumber(detail.title_count),
      iconCount: readNumber(detail.icon_count),
      illustrationCount: readNumber(detail.illustration_count),
      viewedIllustrationCount: readNumber(detail.viewed_illustration_count),
      unreadNotificationCount: readNumber(detail.unread_notification_count),
      activeSessionCount: readNumber(detail.active_session_count)
    },
    stats: {
      total,
      solo,
      multi,
      currentWinStreak: readNumber(detail.current_win_streak),
      maxWinStreak: readNumber(detail.max_win_streak),
      currentLoseStreak: readNumber(detail.current_lose_streak),
      maxLoseStreak: readNumber(detail.max_lose_streak)
    },
    titles: titles.map((title) => ({
      id: title.title_id,
      name: title.title_name,
      description: title.description,
      rarity: readNumber(title.rarity),
      acquiredAt: title.acquired_at
    })),
    icons: icons.map((icon) => ({
      id: icon.icon_id,
      name: icon.icon_name,
      description: icon.description,
      imagePath: toIconImagePath(icon.icon_id, icon.image_path, icon.storage_provider),
      rarity: readNumber(icon.rarity),
      acquiredAt: icon.acquired_at
    })),
    matchHistory: matchHistory.map((match2) => ({
      matchId: match2.match_id,
      mode: match2.mode,
      difficulty: match2.difficulty,
      gameType: match2.game_type,
      result: Number(match2.is_winner) === 1 ? "win" : Number(match2.is_loser) === 1 ? "lose" : "other",
      endedAt: match2.ended_at
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
        email: log.admin_email ?? ""
      }
    }))
  };
}
__name(toPlayerUserDetailResponse, "toPlayerUserDetailResponse");
function toStatsSummary(matchCountValue, winCountValue, loseCountValue) {
  const matchCount = readNumber(matchCountValue);
  const winCount = readNumber(winCountValue);
  const loseCount = readNumber(loseCountValue);
  return {
    matchCount,
    winCount,
    loseCount,
    winRate: matchCount > 0 ? Math.round(winCount / matchCount * 1e3) / 10 : 0
  };
}
__name(toStatsSummary, "toStatsSummary");
function toIconImagePath(iconId, imagePath, storageProvider) {
  return storageProvider === "r2" ? `/api/admin/assets/icons/${encodeURIComponent(iconId)}` : imagePath;
}
__name(toIconImagePath, "toIconImagePath");
function readStatusAction(value) {
  if (value === "suspend" || value === "unsuspend") return value;
  return null;
}
__name(readStatusAction, "readStatusAction");
function playerRoleLabel(role) {
  if (role === "owner") return "\u7BA1\u7406\u8CAC\u4EFB\u8005";
  if (role === "admin") return "\u7BA1\u7406\u8005";
  return "\u901A\u5E38\u30E6\u30FC\u30B6\u30FC";
}
__name(playerRoleLabel, "playerRoleLabel");
function readNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
__name(readNumber, "readNumber");
function getRouteParam5(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam5, "getRouteParam");

// api/assets/icons/[iconId].ts
async function onRequestGet10(context) {
  const iconId = getRouteParam6(context, "iconId");
  if (!iconId) return notFound();
  const row = await context.env.DB.prepare(
    `
    SELECT
      icon_id,
      image_path,
      is_initial,
      is_active,
      storage_provider,
      storage_key,
      mime_type
    FROM icons
    WHERE icon_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `
  ).bind(iconId).first();
  if (!row) return notFound();
  const session = await findActiveSession(context.env, context.request);
  const admin = isAdminSession(session);
  const active = Number(row.is_active) === 1;
  if (row.storage_provider !== "r2") {
    if (!admin && (!active || Number(row.is_initial) !== 1)) return notFound();
    return redirectLocalAsset5(context.request, row.image_path);
  }
  if (!admin) {
    if (!session || !active) return notFound();
    const owned = await userOwnsIcon(context.env.DB, session.user_id, row.icon_id);
    const notified = owned ? false : await userHasUnreadIconNotification(context.env.DB, context.request, session.user_id, row.icon_id);
    if (!owned && !notified) return notFound();
  }
  if (!row.storage_key || !context.env.ASSETS_BUCKET) return notFound();
  const object = await context.env.ASSETS_BUCKET.get(row.storage_key);
  if (!object) return notFound();
  return imageResponse(object, row.mime_type, "private, max-age=60");
}
__name(onRequestGet10, "onRequestGet");
function onRequestPost8() {
  return notFound();
}
__name(onRequestPost8, "onRequestPost");
async function userOwnsIcon(db, userId, iconId) {
  const row = await db.prepare(
    `
    SELECT 1 AS owned
    FROM user_icons
    WHERE user_id = ?
      AND icon_id = ?
    LIMIT 1
    `
  ).bind(userId, iconId).first();
  return Boolean(row?.owned);
}
__name(userOwnsIcon, "userOwnsIcon");
async function userHasUnreadIconNotification(db, request, userId, iconId) {
  const notificationId = new URL(request.url).searchParams.get("notificationId")?.trim();
  if (!notificationId) return false;
  const row = await db.prepare(
    `
    SELECT 1 AS notified
    FROM user_notifications
    WHERE notification_id = ?
      AND user_id = ?
      AND notification_type = 'icon_acquired'
      AND target_type = 'icon'
      AND target_id = ?
      AND is_read = 0
    LIMIT 1
    `
  ).bind(notificationId, userId, iconId).first();
  return Boolean(row?.notified);
}
__name(userHasUnreadIconNotification, "userHasUnreadIconNotification");
function isAdminSession(session) {
  return session?.role === "admin" || session?.role === "owner";
}
__name(isAdminSession, "isAdminSession");
function imageResponse(object, mimeType, cacheControl) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", cacheControl);
  return new Response(object.body, { headers });
}
__name(imageResponse, "imageResponse");
function getRouteParam6(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam6, "getRouteParam");
function redirectLocalAsset5(request, imagePath) {
  if (!imagePath.startsWith("/")) return notFound();
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset5, "redirectLocalAsset");
function notFound() {
  return new Response("Not Found", { status: 404 });
}
__name(notFound, "notFound");

// api/assets/loading-illustrations/[illustrationId].ts
async function onRequestGet11(context) {
  const illustrationId = getRouteParam7(context, "illustrationId");
  if (!illustrationId) return notFound2();
  const row = await context.env.DB.prepare(
    `
    SELECT
      illustration_id,
      image_path,
      is_active,
      storage_provider,
      storage_key,
      mime_type
    FROM title_illustrations
    WHERE illustration_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `
  ).bind(illustrationId).first();
  if (!row) return notFound2();
  const session = await findActiveSession(context.env, context.request);
  const admin = isAdminSession2(session);
  if (Number(row.is_active) !== 1 && !admin) return notFound2();
  if (!admin) {
    if (!session) return notFound2();
    const viewed = await userViewedLoadingIllustration(context.env.DB, session.user_id, row.illustration_id);
    if (!viewed) return notFound2();
  }
  if (row.storage_provider !== "r2") return redirectLocalAsset6(context.request, row.image_path);
  if (!row.storage_key || !context.env.ASSETS_BUCKET) return notFound2();
  const object = await context.env.ASSETS_BUCKET.get(row.storage_key);
  if (!object) return notFound2();
  return imageResponse2(object, row.mime_type, "private, max-age=60");
}
__name(onRequestGet11, "onRequestGet");
function onRequestPost9() {
  return notFound2();
}
__name(onRequestPost9, "onRequestPost");
async function userViewedLoadingIllustration(db, userId, illustrationId) {
  const row = await db.prepare(
    `
    SELECT 1 AS viewed
    FROM user_title_illustrations
    WHERE user_id = ?
      AND illustration_id = ?
      AND first_viewed_at IS NOT NULL
    LIMIT 1
    `
  ).bind(userId, illustrationId).first();
  return Boolean(row?.viewed);
}
__name(userViewedLoadingIllustration, "userViewedLoadingIllustration");
function isAdminSession2(session) {
  return session?.role === "admin" || session?.role === "owner";
}
__name(isAdminSession2, "isAdminSession");
function imageResponse2(object, mimeType, cacheControl) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", cacheControl);
  return new Response(object.body, { headers });
}
__name(imageResponse2, "imageResponse");
function getRouteParam7(context, key) {
  const params = context.params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
__name(getRouteParam7, "getRouteParam");
function redirectLocalAsset6(request, imagePath) {
  if (!imagePath.startsWith("/")) return notFound2();
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}
__name(redirectLocalAsset6, "redirectLocalAsset");
function notFound2() {
  return new Response("Not Found", { status: 404 });
}
__name(notFound2, "notFound");

// api/admin/announcements.ts
async function onRequestGet12(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const announcements = await readAnnouncements(context.env);
  return json({
    ok: true,
    currentUser: {
      userId: session.user_id,
      email: session.email,
      role: session.role
    },
    announcements: announcements.map(toAnnouncementResponse)
  });
}
__name(onRequestGet12, "onRequestGet");
async function onRequestPost10(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const input = readAnnouncementInput(body);
  if (input instanceof Response) return input;
  const now = nowIso();
  const announcementId = createId("announcement");
  await context.env.DB.prepare(
    `
    INSERT INTO announcements (
      announcement_id, title, summary, body, category, priority, is_active,
      starts_at, ends_at, created_by, updated_by, created_at, updated_at, deleted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `
  ).bind(
    announcementId,
    input.title,
    input.summary || null,
    input.body,
    input.category,
    input.priority,
    input.isActive ? 1 : 0,
    input.startsAt,
    input.endsAt,
    session.user_id,
    session.user_id,
    now,
    now
  ).run();
  return json({ ok: true, message: "\u304A\u77E5\u3089\u305B\u3092\u4F5C\u6210\u3057\u307E\u3057\u305F\u3002", id: announcementId });
}
__name(onRequestPost10, "onRequestPost");
async function onRequestPatch3(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const announcementId = getString(body.announcementId).trim();
  if (!announcementId) return json({ ok: false, message: "\u304A\u77E5\u3089\u305BID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  const existing = await readAnnouncement(context.env, announcementId);
  if (!existing) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (existing.deleted_at) return json({ ok: false, message: "\u524A\u9664\u6E08\u307F\u306E\u304A\u77E5\u3089\u305B\u306F\u7DE8\u96C6\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const input = readAnnouncementInput(body);
  if (input instanceof Response) return input;
  const now = nowIso();
  await context.env.DB.prepare(
    `
    UPDATE announcements
    SET
      title = ?,
      summary = ?,
      body = ?,
      category = ?,
      priority = ?,
      is_active = ?,
      starts_at = ?,
      ends_at = ?,
      updated_by = ?,
      updated_at = ?
    WHERE announcement_id = ?
    `
  ).bind(
    input.title,
    input.summary || null,
    input.body,
    input.category,
    input.priority,
    input.isActive ? 1 : 0,
    input.startsAt,
    input.endsAt,
    session.user_id,
    now,
    announcementId
  ).run();
  return json({ ok: true, message: "\u304A\u77E5\u3089\u305B\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002" });
}
__name(onRequestPatch3, "onRequestPatch");
async function onRequestDelete(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const announcementId = getString(body.announcementId).trim();
  if (!announcementId) return json({ ok: false, message: "\u304A\u77E5\u3089\u305BID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  const existing = await readAnnouncement(context.env, announcementId);
  if (!existing) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (existing.deleted_at) return json({ ok: true, message: "\u304A\u77E5\u3089\u305B\u306F\u65E2\u306B\u524A\u9664\u3055\u308C\u3066\u3044\u307E\u3059\u3002" });
  const now = nowIso();
  await context.env.DB.prepare(
    `
    UPDATE announcements
    SET is_active = 0, deleted_at = ?, updated_by = ?, updated_at = ?
    WHERE announcement_id = ?
    `
  ).bind(now, session.user_id, now, announcementId).run();
  return json({ ok: true, message: "\u304A\u77E5\u3089\u305B\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002" });
}
__name(onRequestDelete, "onRequestDelete");
async function readAnnouncements(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      announcement_id,
      title,
      summary,
      body,
      category,
      priority,
      is_active,
      starts_at,
      ends_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      deleted_at
    FROM announcements
    WHERE deleted_at IS NULL
    ORDER BY
      is_active DESC,
      priority DESC,
      COALESCE(starts_at, created_at) DESC,
      created_at DESC
    LIMIT 100
    `
  ).all();
  return result.results ?? [];
}
__name(readAnnouncements, "readAnnouncements");
async function readAnnouncement(env, announcementId) {
  return await env.DB.prepare(
    `
    SELECT
      announcement_id,
      title,
      summary,
      body,
      category,
      priority,
      is_active,
      starts_at,
      ends_at,
      created_by,
      updated_by,
      created_at,
      updated_at,
      deleted_at
    FROM announcements
    WHERE announcement_id = ?
    LIMIT 1
    `
  ).bind(announcementId).first();
}
__name(readAnnouncement, "readAnnouncement");
function readAnnouncementInput(body) {
  const title = getString(body.title).trim();
  const rawSummary = getString(body.summary).trim();
  const bodyText = getString(body.body).trim();
  const category = readCategory(body.category);
  const priority = readPriority(body.priority);
  const startsAt = readNullableIso(body.startsAt);
  const endsAt = readNullableIso(body.endsAt);
  if (!title) return json({ ok: false, message: "\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!bodyText) return json({ ok: false, message: "\u672C\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!category) return json({ ok: false, message: "\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt === false || endsAt === false) {
    return json({ ok: false, message: "\u8868\u793A\u65E5\u6642\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  }
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "\u8868\u793A\u7D42\u4E86\u65E5\u6642\u306F\u8868\u793A\u958B\u59CB\u65E5\u6642\u4EE5\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  const summary = rawSummary || bodyText.slice(0, 120);
  return {
    title,
    summary,
    body: bodyText,
    category,
    priority,
    isActive: body.isActive === true,
    startsAt: startsAt || null,
    endsAt: endsAt || null
  };
}
__name(readAnnouncementInput, "readAnnouncementInput");
function readCategory(value) {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}
__name(readCategory, "readCategory");
function readPriority(value) {
  const number = typeof value === "number" ? value : Number(getString(value));
  if (!Number.isFinite(number)) return 0;
  return Math.min(999999, Math.max(-999999, Math.trunc(number)));
}
__name(readPriority, "readPriority");
function readNullableIso(value) {
  const text = getString(value).trim();
  if (!text) return null;
  const time = Date.parse(text);
  if (Number.isNaN(time)) return false;
  return new Date(time).toISOString();
}
__name(readNullableIso, "readNullableIso");
function toAnnouncementResponse(row) {
  return {
    id: row.announcement_id,
    title: row.title,
    summary: row.summary ?? "",
    body: row.body,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    priority: row.priority,
    isActive: row.is_active === 1,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toAnnouncementResponse, "toAnnouncementResponse");
function categoryLabel(category) {
  if (category === "maintenance") return "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9";
  if (category === "bug") return "\u4E0D\u5177\u5408";
  if (category === "update") return "\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8";
  if (category === "important") return "\u91CD\u8981";
  return "\u901A\u5E38";
}
__name(categoryLabel, "categoryLabel");

// api/admin/assets.ts
var ICON_MAX_BYTES = 3 * 1024 * 1024;
var LOADING_ILLUSTRATION_MAX_BYTES = 5 * 1024 * 1024;
var MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp"
};
var EXT_TO_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp"
};
async function onRequestGet13(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const [icons, loadingIllustrations] = await Promise.all([
    readIconAssets(context.env),
    readLoadingIllustrationAssets(context.env)
  ]);
  return json({
    ok: true,
    assets: {
      icons: icons.map(toIconAssetResponse),
      loadingIllustrations: loadingIllustrations.map(toLoadingIllustrationAssetResponse)
    }
  });
}
__name(onRequestGet13, "onRequestGet");
async function onRequestPost11(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" }, { status: 500 });
  }
  let form;
  try {
    form = await context.request.formData();
  } catch {
    return json({ ok: false, message: "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const assetAction = getString(form.get("assetAction")).trim();
  if (assetAction === "icon_replace") return createIconReplaceChangeBatch(context, form, session.user_id);
  if (assetAction === "loading_illustration_replace") return createLoadingIllustrationReplaceChangeBatch(context, form, session.user_id);
  const assetType = readAssetType(form.get("assetType"));
  if (!assetType) return json({ ok: false, message: "\u7D20\u6750\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  const fileInfo = validateImageFile(fileValue, assetType);
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });
  const now = nowIso();
  const arrayBuffer = await fileValue.arrayBuffer();
  if (assetType === "icon") {
    const iconId = createId("icon");
    const storageKey2 = `icons/${iconId}.${fileInfo.ext}`;
    await context.env.ASSETS_BUCKET.put(storageKey2, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
    await insertIconAsset(context.env, {
      iconId,
      storageKey: storageKey2,
      mimeType: fileInfo.mimeType,
      fileSize: fileValue.size,
      uploadedBy: session.user_id,
      uploadedAt: now,
      assetName: readAssetName(form, fileValue.name, "\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3"),
      description: readAssetDescription(form, "\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3\u7D20\u6750\u3067\u3059\u3002\u79F0\u53F7\u5831\u916C\u3068\u3057\u3066\u7D10\u3065\u3051\u308B\u307E\u3067\u901A\u5E38\u30E6\u30FC\u30B6\u30FC\u306B\u306F\u516C\u958B\u3055\u308C\u307E\u305B\u3093\u3002")
    });
    return json({ ok: true, message: "\u30A2\u30A4\u30B3\u30F3\u7D20\u6750\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F\u3002", id: iconId });
  }
  const illustrationId = createId("illust");
  const storageKey = `loading-illustrations/${illustrationId}.${fileInfo.ext}`;
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
  await insertLoadingIllustrationAsset(context.env, {
    illustrationId,
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedBy: session.user_id,
    uploadedAt: now,
    assetName: readAssetName(form, fileValue.name, "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8"),
    description: readAssetDescription(form, "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u7D20\u6750\u3067\u3059\u3002\u51FA\u73FE\u8A2D\u5B9A\u3092\u884C\u3046\u307E\u3067\u901A\u5E38\u30E6\u30FC\u30B6\u30FC\u306B\u306F\u516C\u958B\u3055\u308C\u307E\u305B\u3093\u3002")
  });
  return json({ ok: true, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u7D20\u6750\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u307E\u3057\u305F\u3002", id: illustrationId });
}
__name(onRequestPost11, "onRequestPost");
async function createIconReplaceChangeBatch(context, form, adminId) {
  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" }, { status: 500 });
  }
  const iconId = getString(form.get("iconId")).trim();
  const reason = getString(form.get("iconReplaceReason")).trim();
  if (!iconId) return json({ ok: false, message: "\u30A2\u30A4\u30B3\u30F3ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u5F8C\u306E\u753B\u50CF\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  const fileInfo = validateImageFile(fileValue, "icon");
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });
  const icon = await readIconReplaceTarget(context.env, iconId);
  if (!icon) return json({ ok: false, message: "\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (icon.deleted_at) return json({ ok: false, message: "\u524A\u9664\u6E08\u307F\u30A2\u30A4\u30B3\u30F3\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) return json({ ok: false, message: "\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3\u4EE5\u5916\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const conflict = await hasOpenIconChange(context.env, iconId);
  if (conflict) return json({ ok: false, message: "\u3053\u306E\u30A2\u30A4\u30B3\u30F3\u306B\u306F\u672A\u53CD\u6620\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const announcement = readOptionalReplaceAnnouncement(form);
  if (announcement instanceof Response) return announcement;
  const now = nowIso();
  const batchName = `\u30A2\u30A4\u30B3\u30F3\u5DEE\u3057\u66FF\u3048\uFF1A${icon.icon_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const storageKey = `icons/replacements/${iconId}/${batchId}.${fileInfo.ext}`;
  const arrayBuffer = await fileValue.arrayBuffer();
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
  const before = {
    ...icon,
    previewPath: `/api/admin/assets/icons/${iconId}?replacementBatchId=${batchId}&variant=before`
  };
  const after = {
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedAt: now,
    previewPath: `/api/admin/assets/icons/${iconId}?replacementBatchId=${batchId}&variant=after`,
    createAnnouncement: Boolean(announcement)
  };
  const effect = await readIconEffect(context.env, iconId);
  const iconReplaceItemId = createId("chi");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'icon_replace', 'icon', ?, ?, ?, ?, ?, ?)
    `
  ).bind(iconReplaceItemId, batchId, iconId, JSON.stringify(before), JSON.stringify(after), JSON.stringify(effect), reason, now).run();
  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `
    ).bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, iconReplaceItemId).run();
  }
  await refreshDraftBatchMeta(context.env, batchId, now);
  return json({ ok: true, message: "\u30A2\u30A4\u30B3\u30F3\u5DEE\u3057\u66FF\u3048\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u304B\u3089\u53CD\u6620\u3057\u3066\u304F\u3060\u3055\u3044\u3002", batchId });
}
__name(createIconReplaceChangeBatch, "createIconReplaceChangeBatch");
async function createLoadingIllustrationReplaceChangeBatch(context, form, adminId) {
  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002" }, { status: 500 });
  }
  const illustrationId = getString(form.get("illustrationId")).trim();
  const reason = getString(form.get("loadingIllustrationReplaceReason")).trim();
  if (!illustrationId) return json({ ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "\u5DEE\u3057\u66FF\u3048\u5F8C\u306E\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u753B\u50CF\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  const fileInfo = validateImageFile(fileValue, "loading-illustration");
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });
  const illustration = await readLoadingIllustrationReplaceTarget(context.env, illustrationId);
  if (!illustration) return json({ ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (illustration.deleted_at) return json({ ok: false, message: "\u524A\u9664\u6E08\u307F\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) return json({ ok: false, message: "\u8FFD\u52A0\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u4EE5\u5916\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const conflict = await hasOpenLoadingIllustrationChange(context.env, illustrationId);
  if (conflict) return json({ ok: false, message: "\u3053\u306E\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u306B\u306F\u672A\u53CD\u6620\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const announcement = readOptionalLoadingIllustrationReplaceAnnouncement(form);
  if (announcement instanceof Response) return announcement;
  const now = nowIso();
  const batchName = `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u5DEE\u3057\u66FF\u3048\uFF1A${illustration.illustration_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const storageKey = `loading-illustrations/replacements/${illustrationId}/${batchId}.${fileInfo.ext}`;
  const arrayBuffer = await fileValue.arrayBuffer();
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
  const before = {
    ...illustration,
    previewPath: `/api/admin/assets/loading-illustrations/${illustrationId}?replacementBatchId=${batchId}&variant=before`
  };
  const after = {
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedAt: now,
    previewPath: `/api/admin/assets/loading-illustrations/${illustrationId}?replacementBatchId=${batchId}&variant=after`,
    createAnnouncement: Boolean(announcement)
  };
  const effect = await readLoadingIllustrationEffect(context.env, illustrationId);
  const loadingReplaceItemId = createId("chi");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'loading_illustration_replace', 'loading_illustration', ?, ?, ?, ?, ?, ?)
    `
  ).bind(loadingReplaceItemId, batchId, illustrationId, JSON.stringify(before), JSON.stringify(after), JSON.stringify(effect), reason, now).run();
  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `
    ).bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, loadingReplaceItemId).run();
  }
  await refreshDraftBatchMeta(context.env, batchId, now);
  return json({ ok: true, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u5DEE\u3057\u66FF\u3048\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u304B\u3089\u53CD\u6620\u3057\u3066\u304F\u3060\u3055\u3044\u3002", batchId });
}
__name(createLoadingIllustrationReplaceChangeBatch, "createLoadingIllustrationReplaceChangeBatch");
async function getOrCreateDraftBatchId(env, adminId, batchName, now) {
  await ensureSingleDraftBatch(env);
  const draft = await readCurrentDraftBatch(env);
  if (draft) return draft.batch_id;
  const batchId = createId("chg");
  await env.DB.prepare(
    `
    INSERT INTO admin_change_batches (
      batch_id, batch_name, status, created_by, created_at, updated_at
    )
    VALUES (?, ?, 'draft', ?, ?, ?)
    `
  ).bind(batchId, batchName, adminId, now, now).run();
  return batchId;
}
__name(getOrCreateDraftBatchId, "getOrCreateDraftBatchId");
async function refreshDraftBatchMeta(env, batchId, now) {
  const items = await readBatchItems(env, batchId);
  const batchName = formatBatchDisplayNameFromItems(items) || "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  await env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'").bind(batchName, now, batchId).run();
}
__name(refreshDraftBatchMeta, "refreshDraftBatchMeta");
async function readCurrentDraftBatch(env) {
  return await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    LIMIT 1
    `
  ).first();
}
__name(readCurrentDraftBatch, "readCurrentDraftBatch");
async function ensureSingleDraftBatch(env) {
  const result = await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    `
  ).all();
  const drafts = result.results ?? [];
  if (drafts.length <= 1) return;
  const primary = drafts[0];
  for (const batchId of drafts.slice(1).map((draft) => draft.batch_id)) {
    await env.DB.prepare("UPDATE admin_change_items SET batch_id = ? WHERE batch_id = ?").bind(primary.batch_id, batchId).run();
    await env.DB.prepare("DELETE FROM admin_change_batches WHERE batch_id = ? AND status = 'draft'").bind(batchId).run();
  }
  const row = await env.DB.prepare(
    `
    SELECT MAX(created_at) AS updated_at
    FROM admin_change_items
    WHERE batch_id = ?
    `
  ).bind(primary.batch_id).first();
  await refreshDraftBatchMeta(env, primary.batch_id, row?.updated_at || nowIso());
}
__name(ensureSingleDraftBatch, "ensureSingleDraftBatch");
async function readBatchItems(env, batchId) {
  const result = await env.DB.prepare(
    `
    SELECT
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at, status
    FROM admin_change_items
    WHERE batch_id = ?
    ORDER BY created_at ASC, item_id ASC
    `
  ).bind(batchId).all();
  return result.results ?? [];
}
__name(readBatchItems, "readBatchItems");
function formatBatchDisplayNameFromItems(items) {
  const mainItems = items.filter((item) => item.status === "draft" && item.change_type !== "announcement_create");
  if (mainItems.length === 0) return "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  const firstName = formatChangeItemDisplayName(mainItems[0]);
  if (mainItems.length === 1) return firstName;
  return `${firstName}\uFF0B\u4ED6${mainItems.length - 1}\u4EF6`;
}
__name(formatBatchDisplayNameFromItems, "formatBatchDisplayNameFromItems");
function formatChangeItemDisplayName(item) {
  const before = parseJson5(item.before_json) ?? {};
  if (item.change_type === "icon_delete") return `\u30A2\u30A4\u30B3\u30F3\u524A\u9664\uFF1A${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "icon_replace") return `\u30A2\u30A4\u30B3\u30F3\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_delete") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u524A\u9664\uFF1A${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_replace") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "title_icon_rewards_update") {
    const title = before.title;
    if (title && typeof title === "object" && !Array.isArray(title)) return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${readRecordText(title, "title_name", item.target_id)}`;
    return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${item.target_id}`;
  }
  return item.target_id;
}
__name(formatChangeItemDisplayName, "formatChangeItemDisplayName");
function readRecordText(record, key, fallback) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
__name(readRecordText, "readRecordText");
function parseJson5(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson5, "parseJson");
function readAssetType(value) {
  if (value === "icon" || value === "loading-illustration") return value;
  return null;
}
__name(readAssetType, "readAssetType");
function validateImageFile(file, assetType) {
  const limit = assetType === "icon" ? ICON_MAX_BYTES : LOADING_ILLUSTRATION_MAX_BYTES;
  const limitText = assetType === "icon" ? "3MB" : "5MB";
  if (file.size <= 0) return { ok: false, message: "\u7A7A\u306E\u30D5\u30A1\u30A4\u30EB\u306F\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3067\u304D\u307E\u305B\u3093\u3002" };
  if (file.size > limit) return { ok: false, message: `\u753B\u50CF\u30B5\u30A4\u30BA\u306F${limitText}\u307E\u3067\u3067\u3059\u3002` };
  const ext = detectExtension(file);
  if (!ext) return { ok: false, message: "\u5BFE\u5FDC\u5F62\u5F0F\u306F png / jpg / jpeg / webp \u3067\u3059\u3002" };
  return { ok: true, ext: ext === "jpeg" ? "jpg" : ext, mimeType: EXT_TO_MIME[ext] ?? file.type };
}
__name(validateImageFile, "validateImageFile");
function detectExtension(file) {
  if (file.type && MIME_TO_EXT[file.type]) return MIME_TO_EXT[file.type];
  const match2 = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = match2?.[1] ?? "";
  return EXT_TO_MIME[ext] ? ext : "";
}
__name(detectExtension, "detectExtension");
function readAssetName(form, fileName, fallback) {
  const inputName = getString(form.get("assetName")).trim();
  if (inputName) return inputName;
  const baseName = fileName.replace(/\.[^.]+$/, "").trim();
  return baseName || fallback;
}
__name(readAssetName, "readAssetName");
function readAssetDescription(form, fallback) {
  const description = getString(form.get("description")).trim();
  return description || fallback;
}
__name(readAssetDescription, "readAssetDescription");
async function insertIconAsset(env, input) {
  const sortOrder = await nextSortOrder(env, "icons");
  await env.DB.prepare(
    `
    INSERT INTO icons (
      icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
      rarity, condition_type, condition_params_json, is_initial, is_guest_available,
      is_active, sort_order, created_at, updated_at, storage_provider, storage_key,
      mime_type, file_size, uploaded_by, uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, 'title_reward', NULL, 0, 0, 0, ?, ?, ?, 'r2', ?, ?, ?, ?, ?)
    `
  ).bind(
    input.iconId,
    `uploaded_${normalizeCodePart(input.iconId)}`,
    input.assetName,
    input.description,
    "\u79F0\u53F7\u5831\u916C\u3068\u3057\u3066\u958B\u653E",
    `/api/admin/assets/icons/${input.iconId}`,
    sortOrder,
    input.uploadedAt,
    input.uploadedAt,
    input.storageKey,
    input.mimeType,
    input.fileSize,
    input.uploadedBy,
    input.uploadedAt
  ).run();
}
__name(insertIconAsset, "insertIconAsset");
async function insertLoadingIllustrationAsset(env, input) {
  const sortOrder = await nextSortOrder(env, "title_illustrations");
  await env.DB.prepare(
    `
    INSERT INTO title_illustrations (
      illustration_id, illustration_code, illustration_name, description, unlock_condition_text,
      image_path, rarity, condition_type, condition_params_json, is_initial, is_rare,
      is_boost_excluded, is_active, sort_order, created_at, updated_at, required_title_id,
      appearance_mode, manual_unviewed_rate, manual_viewed_rate, storage_provider, storage_key,
      mime_type, file_size, uploaded_by, uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, 'title_owned', NULL, 0, 0, 0, 0, ?, ?, ?, NULL, 'auto', 70.0, 30.0, 'r2', ?, ?, ?, ?, ?)
    `
  ).bind(
    input.illustrationId,
    `uploaded_${normalizeCodePart(input.illustrationId)}`,
    input.assetName,
    input.description,
    "\u79F0\u53F7\u6240\u6301\u3067\u30ED\u30FC\u30C9\u753B\u9762\u306B\u51FA\u73FE",
    `/api/admin/assets/loading-illustrations/${input.illustrationId}`,
    sortOrder,
    input.uploadedAt,
    input.uploadedAt,
    input.storageKey,
    input.mimeType,
    input.fileSize,
    input.uploadedBy,
    input.uploadedAt
  ).run();
}
__name(insertLoadingIllustrationAsset, "insertLoadingIllustrationAsset");
async function nextSortOrder(env, tableName) {
  const row = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order FROM ${tableName}`).first();
  return Number(row?.sort_order ?? 1);
}
__name(nextSortOrder, "nextSortOrder");
async function readIconAssets(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, image_path, is_active, sort_order,
      storage_provider, storage_key, mime_type, file_size, uploaded_at
    FROM icons
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, icon_id ASC
    `
  ).all();
  return result.results ?? [];
}
__name(readIconAssets, "readIconAssets");
async function readLoadingIllustrationAssets(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, image_path, is_active, sort_order,
      required_title_id, condition_params_json, appearance_mode, manual_unviewed_rate, manual_viewed_rate,
      storage_provider, storage_key, mime_type, file_size, uploaded_at
    FROM title_illustrations
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, illustration_id ASC
    `
  ).all();
  return result.results ?? [];
}
__name(readLoadingIllustrationAssets, "readLoadingIllustrationAssets");
async function readIconReplaceTarget(env, iconId) {
  return await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, description, image_path, rarity, is_active, sort_order,
      storage_provider, storage_key, mime_type, file_size, uploaded_at, is_initial, deleted_at
    FROM icons
    WHERE icon_id = ?
    LIMIT 1
    `
  ).bind(iconId).first();
}
__name(readIconReplaceTarget, "readIconReplaceTarget");
async function readLoadingIllustrationReplaceTarget(env, illustrationId) {
  return await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, description, image_path, rarity,
      is_initial, is_rare, is_boost_excluded, is_active, sort_order,
      required_title_id, condition_params_json, appearance_mode, manual_unviewed_rate, manual_viewed_rate,
      storage_provider, storage_key, mime_type, file_size, uploaded_at, deleted_at
    FROM title_illustrations
    WHERE illustration_id = ?
    LIMIT 1
    `
  ).bind(illustrationId).first();
}
__name(readLoadingIllustrationReplaceTarget, "readLoadingIllustrationReplaceTarget");
async function hasOpenIconChange(env, iconId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(iconId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenIconChange, "hasOpenIconChange");
async function hasOpenLoadingIllustrationChange(env, illustrationId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'loading_illustration'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(illustrationId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenLoadingIllustrationChange, "hasOpenLoadingIllustrationChange");
async function readIconEffect(env, iconId) {
  const [owned, selected, rewards] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_icons WHERE icon_id = ?").bind(iconId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_settings WHERE current_icon_id = ?").bind(iconId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_icon_rewards WHERE icon_id = ?").bind(iconId).first()
  ]);
  return {
    ownedUserCount: Number(owned?.count ?? 0),
    selectedUserCount: Number(selected?.count ?? 0),
    rewardLinkCount: Number(rewards?.count ?? 0)
  };
}
__name(readIconEffect, "readIconEffect");
async function readLoadingIllustrationEffect(env, illustrationId) {
  const [viewed, linked] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_title_illustrations WHERE illustration_id = ? AND first_viewed_at IS NOT NULL").bind(illustrationId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_illustrations WHERE illustration_id = ? AND required_title_id IS NOT NULL").bind(illustrationId).first()
  ]);
  return {
    viewedUserCount: Number(viewed?.count ?? 0),
    rewardLinkCount: Number(linked?.count ?? 0)
  };
}
__name(readLoadingIllustrationEffect, "readLoadingIllustrationEffect");
function readOptionalReplaceAnnouncement(form) {
  const enabled = form.has("iconReplaceCreateAnnouncement");
  if (!enabled) return null;
  const title = getString(form.get("iconReplaceAnnouncementTitle")).trim();
  const rawSummary = getString(form.get("iconReplaceAnnouncementSummary")).trim();
  const body = getString(form.get("iconReplaceAnnouncementBody")).trim();
  const category = readCategory2(getString(form.get("iconReplaceAnnouncementCategory")).trim());
  const priority = readPriority2(getString(form.get("iconReplaceAnnouncementPriority")).trim());
  const startsAt = readNullableIso2(getString(form.get("iconReplaceAnnouncementStartsAt")).trim());
  const endsAt = readNullableIso2(getString(form.get("iconReplaceAnnouncementEndsAt")).trim());
  const isActive = form.has("iconReplaceAnnouncementIsActive");
  if (!title) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!body) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u672C\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!category) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt === false || endsAt === false) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u65E5\u6642\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u7D42\u4E86\u65E5\u6642\u306F\u8868\u793A\u958B\u59CB\u65E5\u6642\u4EE5\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  return {
    title,
    summary: rawSummary || body.slice(0, 120),
    body,
    category,
    priority,
    isActive,
    startsAt: startsAt || null,
    endsAt: endsAt || null
  };
}
__name(readOptionalReplaceAnnouncement, "readOptionalReplaceAnnouncement");
function readOptionalLoadingIllustrationReplaceAnnouncement(form) {
  const enabled = form.has("loadingIllustrationReplaceCreateAnnouncement");
  if (!enabled) return null;
  const title = getString(form.get("loadingIllustrationReplaceAnnouncementTitle")).trim();
  const rawSummary = getString(form.get("loadingIllustrationReplaceAnnouncementSummary")).trim();
  const body = getString(form.get("loadingIllustrationReplaceAnnouncementBody")).trim();
  const category = readCategory2(getString(form.get("loadingIllustrationReplaceAnnouncementCategory")).trim());
  const priority = readPriority2(getString(form.get("loadingIllustrationReplaceAnnouncementPriority")).trim());
  const startsAt = readNullableIso2(getString(form.get("loadingIllustrationReplaceAnnouncementStartsAt")).trim());
  const endsAt = readNullableIso2(getString(form.get("loadingIllustrationReplaceAnnouncementEndsAt")).trim());
  const isActive = form.has("loadingIllustrationReplaceAnnouncementIsActive");
  if (!title) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!body) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u672C\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!category) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt === false || endsAt === false) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u65E5\u6642\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u7D42\u4E86\u65E5\u6642\u306F\u8868\u793A\u958B\u59CB\u65E5\u6642\u4EE5\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  return {
    title,
    summary: rawSummary || body.slice(0, 120),
    body,
    category,
    priority,
    isActive,
    startsAt: startsAt || null,
    endsAt: endsAt || null
  };
}
__name(readOptionalLoadingIllustrationReplaceAnnouncement, "readOptionalLoadingIllustrationReplaceAnnouncement");
function readCategory2(value) {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}
__name(readCategory2, "readCategory");
function readPriority2(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}
__name(readPriority2, "readPriority");
function readNullableIso2(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString();
}
__name(readNullableIso2, "readNullableIso");
function toIconAssetResponse(row) {
  return {
    id: row.icon_id,
    code: row.icon_code,
    name: row.icon_name,
    imagePath: row.image_path,
    previewPath: row.storage_provider === "r2" ? `/api/admin/assets/icons/${row.icon_id}` : row.image_path,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at
  };
}
__name(toIconAssetResponse, "toIconAssetResponse");
function toLoadingIllustrationAssetResponse(row) {
  return {
    id: row.illustration_id,
    code: row.illustration_code,
    name: row.illustration_name,
    imagePath: row.image_path,
    previewPath: row.storage_provider === "r2" ? `/api/admin/assets/loading-illustrations/${row.illustration_id}` : row.image_path,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    requiredTitleId: row.required_title_id ?? readTitleIdFromParams(row.condition_params_json),
    appearanceMode: row.appearance_mode === "manual" ? "manual" : "auto",
    manualUnviewedRate: Number(row.manual_unviewed_rate ?? 70),
    manualViewedRate: Number(row.manual_viewed_rate ?? 30),
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at
  };
}
__name(toLoadingIllustrationAssetResponse, "toLoadingIllustrationAssetResponse");
function readTitleIdFromParams(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const titleId = parsed.titleId;
    return typeof titleId === "string" && titleId.trim() ? titleId.trim() : null;
  } catch {
    return null;
  }
}
__name(readTitleIdFromParams, "readTitleIdFromParams");
function normalizeCodePart(value) {
  return value.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase();
}
__name(normalizeCodePart, "normalizeCodePart");

// api/admin/change-batches.ts
var DEFAULT_ICON_ID = "img_01_u7537_u306e_u5b50";
var MAIN_CHANGE_TYPES = /* @__PURE__ */ new Set([
  "icon_delete",
  "icon_replace",
  "loading_illustration_delete",
  "loading_illustration_replace",
  "title_icon_rewards_update"
]);
async function onRequestGet14(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  await ensureSingleDraftBatch2(context.env);
  const [batches, items] = await Promise.all([readBatches(context.env), readItems(context.env)]);
  const itemMap = /* @__PURE__ */ new Map();
  for (const item of items) {
    const list = itemMap.get(item.batch_id) ?? [];
    list.push(item);
    itemMap.set(item.batch_id, list);
  }
  return json({
    ok: true,
    changeBatches: batches.map((batch) => toBatchResponse(batch, itemMap.get(batch.batch_id) ?? []))
  });
}
__name(onRequestGet14, "onRequestGet");
async function onRequestPost12(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const changeType = getString(body.changeType).trim();
  if (changeType === "icon_delete") return createIconDeleteChangeBatch(context, body, session.user_id);
  if (changeType === "loading_illustration_delete") return createLoadingIllustrationDeleteChangeBatch(context, body, session.user_id);
  if (changeType === "title_icon_rewards_update") return createTitleIconRewardsChangeBatch(context, body, session.user_id);
  return json({ ok: false, message: "\u5909\u66F4\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
}
__name(onRequestPost12, "onRequestPost");
async function createIconDeleteChangeBatch(context, body, adminId) {
  const iconId = getString(body.iconId).trim();
  const reason = getString(body.reason).trim();
  if (!iconId) return json({ ok: false, message: "\u30A2\u30A4\u30B3\u30F3ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u524A\u9664\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "\u524A\u9664\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const icon = await readIcon(context.env, iconId);
  if (!icon) return json({ ok: false, message: "\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (icon.deleted_at) return json({ ok: false, message: "\u524A\u9664\u6E08\u307F\u30A2\u30A4\u30B3\u30F3\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) return json({ ok: false, message: "\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3\u4EE5\u5916\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const fallback = await readIcon(context.env, DEFAULT_ICON_ID);
  if (!fallback || fallback.deleted_at) return json({ ok: false, message: "\u521D\u671F\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 500 });
  const conflict = await hasOpenIconChange2(context.env, iconId);
  if (conflict) return json({ ok: false, message: "\u3053\u306E\u30A2\u30A4\u30B3\u30F3\u306B\u306F\u672A\u53CD\u6620\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const announcement = readOptionalAnnouncement(body.announcement);
  if (announcement instanceof Response) return announcement;
  const now = nowIso();
  const batchName = `\u30A2\u30A4\u30B3\u30F3\u524A\u9664\uFF1A${icon.icon_name}`;
  const batchId = await getOrCreateDraftBatchId2(context.env, adminId, batchName, now);
  const iconItemId = createId("chi");
  const effect = await readIconDeleteEffect(context.env, iconId);
  const after = { deletedAt: null, fallbackIconId: DEFAULT_ICON_ID, createAnnouncement: Boolean(announcement) };
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'icon_delete', 'icon', ?, ?, ?, ?, ?, ?)
    `
  ).bind(iconItemId, batchId, iconId, JSON.stringify(icon), JSON.stringify(after), JSON.stringify(effect), reason, now).run();
  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `
    ).bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, iconItemId).run();
  }
  await refreshDraftBatchMeta2(context.env, batchId, now);
  return json({ ok: true, message: "\u30A2\u30A4\u30B3\u30F3\u524A\u9664\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u304B\u3089\u53CD\u6620\u3057\u3066\u304F\u3060\u3055\u3044\u3002", batchId });
}
__name(createIconDeleteChangeBatch, "createIconDeleteChangeBatch");
async function createLoadingIllustrationDeleteChangeBatch(context, body, adminId) {
  const illustrationId = getString(body.illustrationId).trim();
  const reason = getString(body.reason).trim();
  if (!illustrationId) return json({ ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u524A\u9664\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "\u524A\u9664\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const illustration = await readLoadingIllustration(context.env, illustrationId);
  if (!illustration) return json({ ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (illustration.deleted_at) return json({ ok: false, message: "\u524A\u9664\u6E08\u307F\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) return json({ ok: false, message: "\u8FFD\u52A0\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u4EE5\u5916\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const conflict = await hasOpenLoadingIllustrationChange2(context.env, illustrationId);
  if (conflict) return json({ ok: false, message: "\u3053\u306E\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u306B\u306F\u672A\u53CD\u6620\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const announcement = readOptionalAnnouncement(body.announcement);
  if (announcement instanceof Response) return announcement;
  const now = nowIso();
  const batchName = `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u524A\u9664\uFF1A${illustration.illustration_name}`;
  const batchId = await getOrCreateDraftBatchId2(context.env, adminId, batchName, now);
  const effect = await readLoadingIllustrationEffect2(context.env, illustrationId);
  const after = { deletedAt: null, unlinkReward: true, createAnnouncement: Boolean(announcement) };
  const loadingDeleteItemId = createId("chi");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'loading_illustration_delete', 'loading_illustration', ?, ?, ?, ?, ?, ?)
    `
  ).bind(loadingDeleteItemId, batchId, illustrationId, JSON.stringify(illustration), JSON.stringify(after), JSON.stringify(effect), reason, now).run();
  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `
    ).bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, loadingDeleteItemId).run();
  }
  await refreshDraftBatchMeta2(context.env, batchId, now);
  return json({ ok: true, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u524A\u9664\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u304B\u3089\u53CD\u6620\u3057\u3066\u304F\u3060\u3055\u3044\u3002", batchId });
}
__name(createLoadingIllustrationDeleteChangeBatch, "createLoadingIllustrationDeleteChangeBatch");
async function createTitleIconRewardsChangeBatch(context, body, adminId) {
  const titleId = getString(body.titleId).trim();
  const reason = getString(body.reason).trim();
  const iconRewardIds = readIconRewardIds(body.iconRewardIds);
  if (!titleId) return json({ ok: false, message: "\u79F0\u53F7ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "\u5909\u66F4\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "\u5909\u66F4\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (iconRewardIds.length > 3) return json({ ok: false, message: "\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u306F\u6700\u59273\u3064\u307E\u3067\u3067\u3059\u3002" }, { status: 400 });
  const title = await readTitle(context.env, titleId);
  if (!title) return json({ ok: false, message: "\u79F0\u53F7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  const iconRewardsValid = await validateIconRewardIds(context.env, iconRewardIds);
  if (!iconRewardsValid) return json({ ok: false, message: "\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  for (const iconId of iconRewardIds) {
    const iconConflict = await hasOpenIconDelete(context.env, iconId);
    if (iconConflict) return json({ ok: false, message: "\u9078\u629E\u4E2D\u306E\u30A2\u30A4\u30B3\u30F3\u306B\u306F\u672A\u53CD\u6620\u306E\u524A\u9664\u4E88\u5B9A\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  const conflict = await hasOpenTitleIconRewardsChange(context.env, titleId);
  if (conflict) return json({ ok: false, message: "\u3053\u306E\u79F0\u53F7\u306B\u306F\u672A\u53CD\u6620\u306E\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const currentIconRewardIds = await readTitleIconRewardIds(context.env, titleId);
  if (isSameIdList(currentIconRewardIds, iconRewardIds)) return json({ ok: false, message: "\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u306E\u5909\u66F4\u5185\u5BB9\u304C\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const [beforeIcons, afterIcons, effect] = await Promise.all([
    readIconSummaries(context.env, currentIconRewardIds),
    readIconSummaries(context.env, iconRewardIds),
    readTitleIconRewardsEffect(context.env, titleId, currentIconRewardIds, iconRewardIds)
  ]);
  const now = nowIso();
  const batchName = `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${title.title_name}`;
  const batchId = await getOrCreateDraftBatchId2(context.env, adminId, batchName, now);
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'title_icon_rewards_update', 'title', ?, ?, ?, ?, ?, ?)
    `
  ).bind(
    createId("chi"),
    batchId,
    titleId,
    JSON.stringify({ title, iconRewardIds: currentIconRewardIds, iconRewards: beforeIcons }),
    JSON.stringify({ iconRewardIds, iconRewards: afterIcons }),
    JSON.stringify(effect),
    reason,
    now
  ).run();
  await refreshDraftBatchMeta2(context.env, batchId, now);
  return json({ ok: true, message: "\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u304B\u3089\u53CD\u6620\u3057\u3066\u304F\u3060\u3055\u3044\u3002", batchId });
}
__name(createTitleIconRewardsChangeBatch, "createTitleIconRewardsChangeBatch");
async function onRequestPatch4(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const action = getString(body.action).trim();
  const batchId = getString(body.batchId).trim();
  if (!batchId) return json({ ok: false, message: "\u53CD\u6620ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (action === "apply") return applyBatch(context.env, batchId, session.user_id);
  if (action === "cancelItem") {
    const itemId = getString(body.itemId).trim();
    const cancelReason = getString(body.cancelReason).trim();
    if (!itemId) return json({ ok: false, message: "\u5909\u66F4ID\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
    if (!cancelReason) return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
    if (cancelReason.length > 500) return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
    return cancelChangeItem(context.env, batchId, itemId, session.user_id, cancelReason);
  }
  if (action === "cancel") {
    const cancelReason = getString(body.cancelReason).trim();
    if (!cancelReason) return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
    if (cancelReason.length > 500) return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
    return cancelBatch(context.env, batchId, session.user_id, cancelReason);
  }
  return json({ ok: false, message: "\u64CD\u4F5C\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
}
__name(onRequestPatch4, "onRequestPatch");
async function applyBatch(env, batchId, adminId) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "\u53CD\u6620\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "\u53CD\u6620\u3067\u304D\u308B\u72B6\u614B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const items = await readBatchItems2(env, batchId);
  const activeItems = items.filter(isActiveChangeItem);
  const mainItems = activeItems.filter((item) => isMainChangeItem(item));
  if (mainItems.length === 0) return json({ ok: false, message: "\u53CD\u6620\u5BFE\u8C61\u306E\u5909\u66F4\u304C\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  try {
    const now = nowIso();
    const statements = [];
    for (const item of mainItems) {
      if (item.change_type === "icon_delete") await appendIconDeleteApplyStatements(env, statements, item, now);
      else if (item.change_type === "icon_replace") await appendIconReplaceApplyStatements(env, statements, item, adminId, now);
      else if (item.change_type === "title_icon_rewards_update") await appendTitleIconRewardsApplyStatements(env, statements, item, now);
      else if (item.change_type === "loading_illustration_delete") await appendLoadingIllustrationDeleteApplyStatements(env, statements, item, now);
      else if (item.change_type === "loading_illustration_replace") await appendLoadingIllustrationReplaceApplyStatements(env, statements, item, adminId, now);
    }
    appendAnnouncementStatements(env, statements, activeItems, adminId, now);
    statements.push(
      env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?").bind(adminId, now, now, batchId)
    );
    await batchStatements(env, statements);
    return json({ ok: true, message: "\u53CD\u6620\u3057\u307E\u3057\u305F\u3002" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "\u53CD\u6620\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002";
    const now = nowIso();
    await env.DB.prepare("UPDATE admin_change_batches SET status = 'failed', error_message = ?, updated_at = ? WHERE batch_id = ?").bind(message, now, batchId).run();
    return json({ ok: false, message }, { status: 500 });
  }
}
__name(applyBatch, "applyBatch");
async function appendIconDeleteApplyStatements(env, statements, iconDelete, now) {
  const icon = await readIcon(env, iconDelete.target_id);
  if (!icon || icon.deleted_at) throw new Error("\u524A\u9664\u5BFE\u8C61\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3\u4EE5\u5916\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002");
  const fallback = await readIcon(env, DEFAULT_ICON_ID);
  if (!fallback || fallback.deleted_at) throw new Error("\u521D\u671F\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  statements.push(
    env.DB.prepare("DELETE FROM title_icon_rewards WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) SELECT user_id, ?, ?, ? FROM user_settings WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, now, icon.icon_id),
    env.DB.prepare("UPDATE user_settings SET current_icon_id = ?, updated_at = ? WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, icon.icon_id),
    env.DB.prepare("DELETE FROM user_icons WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("UPDATE icons SET is_active = 0, deleted_at = ?, updated_at = ? WHERE icon_id = ?").bind(now, now, icon.icon_id)
  );
}
__name(appendIconDeleteApplyStatements, "appendIconDeleteApplyStatements");
async function appendIconReplaceApplyStatements(env, statements, iconReplace, adminId, now) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
  const icon = await readIcon(env, iconReplace.target_id);
  if (!icon || icon.deleted_at) throw new Error("\u5DEE\u3057\u66FF\u3048\u5BFE\u8C61\u30A2\u30A4\u30B3\u30F3\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("\u8FFD\u52A0\u30A2\u30A4\u30B3\u30F3\u4EE5\u5916\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002");
  const after = parseJson6(iconReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("\u5DEE\u3057\u66FF\u3048\u5F8C\u753B\u50CF\u306E\u60C5\u5831\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("\u5DEE\u3057\u66FF\u3048\u5F8C\u753B\u50CF\u304CR2\u306B\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  statements.push(
    env.DB.prepare(
      `
      UPDATE icons
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE icon_id = ?
      `
    ).bind(`/api/admin/assets/icons/${icon.icon_id}`, storageKey, mimeType, fileSize, adminId, now, now, icon.icon_id)
  );
}
__name(appendIconReplaceApplyStatements, "appendIconReplaceApplyStatements");
async function appendLoadingIllustrationDeleteApplyStatements(env, statements, loadingDelete, now) {
  const illustration = await readLoadingIllustration(env, loadingDelete.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("\u524A\u9664\u5BFE\u8C61\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("\u8FFD\u52A0\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u4EE5\u5916\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002");
  statements.push(
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET is_active = 0,
          required_title_id = NULL,
          condition_params_json = NULL,
          unlock_condition_text = '\u524A\u9664\u6E08\u307F',
          deleted_at = ?,
          updated_at = ?
      WHERE illustration_id = ?
      `
    ).bind(now, now, illustration.illustration_id)
  );
}
__name(appendLoadingIllustrationDeleteApplyStatements, "appendLoadingIllustrationDeleteApplyStatements");
async function appendLoadingIllustrationReplaceApplyStatements(env, statements, loadingReplace, adminId, now) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
  const illustration = await readLoadingIllustration(env, loadingReplace.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("\u5DEE\u3057\u66FF\u3048\u5BFE\u8C61\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("\u8FFD\u52A0\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u4EE5\u5916\u306F\u5DEE\u3057\u66FF\u3048\u3067\u304D\u307E\u305B\u3093\u3002");
  const after = parseJson6(loadingReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("\u5DEE\u3057\u66FF\u3048\u5F8C\u753B\u50CF\u306E\u60C5\u5831\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("\u5DEE\u3057\u66FF\u3048\u5F8C\u753B\u50CF\u304CR2\u306B\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  statements.push(
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE illustration_id = ?
      `
    ).bind(`/api/admin/assets/loading-illustrations/${illustration.illustration_id}`, storageKey, mimeType, fileSize, adminId, now, now, illustration.illustration_id)
  );
}
__name(appendLoadingIllustrationReplaceApplyStatements, "appendLoadingIllustrationReplaceApplyStatements");
async function appendTitleIconRewardsApplyStatements(env, statements, item, now) {
  const title = await readTitle(env, item.target_id);
  if (!title) throw new Error("\u79F0\u53F7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
  const after = parseJson6(item.after_json);
  const iconRewardIds = readIconRewardIds(after?.iconRewardIds);
  if (iconRewardIds.length > 3) throw new Error("\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u306F\u6700\u59273\u3064\u307E\u3067\u3067\u3059\u3002");
  const iconRewardsValid = await validateIconRewardIds(env, iconRewardIds);
  if (!iconRewardsValid) throw new Error("\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  statements.push(env.DB.prepare("DELETE FROM title_icon_rewards WHERE title_id = ?").bind(title.title_id));
  for (const [index, iconId] of iconRewardIds.entries()) {
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO title_icon_rewards (title_id, icon_id, sort_order, created_at)
        VALUES (?, ?, ?, ?)
        `
      ).bind(title.title_id, iconId, index + 1, now)
    );
  }
  for (const iconId of iconRewardIds) {
    const users = await readTitleUsersMissingIcon(env, title.title_id, iconId);
    for (const userId of users) {
      statements.push(
        env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) VALUES (?, ?, ?, ?)").bind(userId, iconId, now, now)
      );
      statements.push(
        env.DB.prepare(
          `
          INSERT OR IGNORE INTO user_notifications (
            notification_id, user_id, notification_type, target_type, target_id,
            priority, is_read, read_at, created_at
          )
          VALUES (?, ?, 'icon_acquired', 'icon', ?, 20, 0, NULL, ?)
          `
        ).bind(createId("ntf"), userId, iconId, now)
      );
    }
  }
}
__name(appendTitleIconRewardsApplyStatements, "appendTitleIconRewardsApplyStatements");
async function cancelBatch(env, batchId, adminId, cancelReason) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "\u53CD\u6620\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u3067\u304D\u308B\u72B6\u614B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE batch_id = ? AND status = 'draft'
      `
    ).bind(adminId, now, cancelReason, batchId),
    env.DB.prepare(
      `
      UPDATE admin_change_batches
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ?
      WHERE batch_id = ?
      `
    ).bind(adminId, now, cancelReason, now, batchId)
  ];
  await batchStatements(env, statements);
  return json({ ok: true, message: "\u53CD\u6620\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F\u3002" });
}
__name(cancelBatch, "cancelBatch");
async function cancelChangeItem(env, batchId, itemId, adminId, cancelReason) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "\u53CD\u6620\u5BFE\u8C61\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "\u30AD\u30E3\u30F3\u30BB\u30EB\u3067\u304D\u308B\u72B6\u614B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const items = await readBatchItems2(env, batchId);
  const item = items.find((entry) => entry.item_id === itemId);
  if (!item) return json({ ok: false, message: "\u5909\u66F4\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (item.status !== "draft") return json({ ok: false, message: "\u3053\u306E\u5909\u66F4\u306F\u30AD\u30E3\u30F3\u30BB\u30EB\u3067\u304D\u308B\u72B6\u614B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (!isMainChangeItem(item)) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u4F5C\u6210\u306F\u89AA\u306E\u5909\u66F4\u3068\u4E00\u7DD2\u306B\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE item_id = ? AND batch_id = ? AND status = 'draft'
      `
    ).bind(adminId, now, cancelReason, itemId, batchId),
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE batch_id = ?
        AND status = 'draft'
        AND change_type = 'announcement_create'
        AND (
          parent_item_id = ?
          OR (parent_item_id IS NULL AND reason = ? AND created_at = ?)
        )
      `
    ).bind(adminId, now, cancelReason, batchId, itemId, item.reason, item.created_at)
  ];
  const remainingActiveMainCount = items.filter((entry) => entry.item_id !== itemId && isActiveChangeItem(entry) && isMainChangeItem(entry)).length;
  if (remainingActiveMainCount === 0) {
    const batchCancelReason = truncateText(`\u6709\u52B9\u306A\u5909\u66F4\u304C0\u4EF6\u306B\u306A\u3063\u305F\u305F\u3081\u3002\u6700\u5F8C\u306E\u500B\u5225\u30AD\u30E3\u30F3\u30BB\u30EB\u7406\u7531\uFF1A${cancelReason}`, 500);
    statements.push(
      env.DB.prepare(
        `
        UPDATE admin_change_batches
        SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ?
        WHERE batch_id = ?
        `
      ).bind(adminId, now, batchCancelReason, now, batchId)
    );
  } else {
    const remainingItems = items.filter((entry) => entry.item_id !== itemId && isActiveChangeItem(entry));
    const batchName = formatBatchDisplayNameFromItems2(remainingItems) || "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
    statements.push(
      env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'").bind(batchName, now, batchId)
    );
  }
  await batchStatements(env, statements);
  return json({ ok: true, message: "\u5909\u66F4\u3092\u30AD\u30E3\u30F3\u30BB\u30EB\u3057\u307E\u3057\u305F\u3002" });
}
__name(cancelChangeItem, "cancelChangeItem");
function appendAnnouncementStatements(env, statements, items, adminId, now) {
  for (const item of items.filter((entry) => isActiveChangeItem(entry) && entry.change_type === "announcement_create")) {
    const input = parseJson6(item.after_json);
    if (!input) throw new Error("\u304A\u77E5\u3089\u305B\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO announcements (
          announcement_id, title, summary, body, category, priority, is_active,
          starts_at, ends_at, created_by, updated_by, created_at, updated_at, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `
      ).bind(
        item.target_id,
        input.title,
        input.summary || null,
        input.body,
        input.category,
        input.priority,
        input.isActive ? 1 : 0,
        input.startsAt,
        input.endsAt,
        adminId,
        adminId,
        now,
        now
      )
    );
  }
}
__name(appendAnnouncementStatements, "appendAnnouncementStatements");
async function readBatches(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_batches.*,
      created_admin.display_name AS created_by_name,
      created_admin.email AS created_by_email,
      applied_admin.display_name AS applied_by_name,
      applied_admin.email AS applied_by_email,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_batches
    LEFT JOIN admin_users AS created_admin ON created_admin.admin_id = admin_change_batches.created_by
    LEFT JOIN admin_users AS applied_admin ON applied_admin.admin_id = admin_change_batches.applied_by
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_batches.cancelled_by
    ORDER BY CASE WHEN admin_change_batches.status = 'draft' THEN 0 ELSE 1 END, admin_change_batches.created_at DESC
    LIMIT 100
    `
  ).all();
  return result.results ?? [];
}
__name(readBatches, "readBatches");
async function readItems(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_items.item_id,
      admin_change_items.batch_id,
      admin_change_items.change_type,
      admin_change_items.target_type,
      admin_change_items.target_id,
      admin_change_items.before_json,
      admin_change_items.after_json,
      admin_change_items.effect_json,
      admin_change_items.reason,
      admin_change_items.created_at,
      admin_change_items.status,
      admin_change_items.parent_item_id,
      admin_change_items.cancelled_by,
      admin_change_items.cancelled_at,
      admin_change_items.cancel_reason,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_items
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_items.cancelled_by
    ORDER BY admin_change_items.created_at ASC, admin_change_items.item_id ASC
    `
  ).all();
  return result.results ?? [];
}
__name(readItems, "readItems");
async function readBatch(env, batchId) {
  return await env.DB.prepare("SELECT * FROM admin_change_batches WHERE batch_id = ? LIMIT 1").bind(batchId).first();
}
__name(readBatch, "readBatch");
async function readBatchItems2(env, batchId) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_items.item_id,
      admin_change_items.batch_id,
      admin_change_items.change_type,
      admin_change_items.target_type,
      admin_change_items.target_id,
      admin_change_items.before_json,
      admin_change_items.after_json,
      admin_change_items.effect_json,
      admin_change_items.reason,
      admin_change_items.created_at,
      admin_change_items.status,
      admin_change_items.parent_item_id,
      admin_change_items.cancelled_by,
      admin_change_items.cancelled_at,
      admin_change_items.cancel_reason,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_items
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_items.cancelled_by
    WHERE admin_change_items.batch_id = ?
    ORDER BY admin_change_items.created_at ASC, admin_change_items.item_id ASC
    `
  ).bind(batchId).all();
  return result.results ?? [];
}
__name(readBatchItems2, "readBatchItems");
async function readIcon(env, iconId) {
  return await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, description, image_path, rarity,
      is_initial, is_active, storage_provider, storage_key, mime_type, file_size,
      uploaded_at, deleted_at
    FROM icons
    WHERE icon_id = ?
    LIMIT 1
    `
  ).bind(iconId).first();
}
__name(readIcon, "readIcon");
async function readLoadingIllustration(env, illustrationId) {
  return await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, description, image_path, rarity,
      is_initial, is_active, storage_provider, storage_key, mime_type, file_size,
      uploaded_at, required_title_id, condition_params_json, appearance_mode,
      manual_unviewed_rate, manual_viewed_rate, deleted_at
    FROM title_illustrations
    WHERE illustration_id = ?
    LIMIT 1
    `
  ).bind(illustrationId).first();
}
__name(readLoadingIllustration, "readLoadingIllustration");
async function hasOpenIconChange2(env, iconId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(iconId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenIconChange2, "hasOpenIconChange");
async function hasOpenIconDelete(env, iconId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'icon_delete'
      AND admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(iconId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenIconDelete, "hasOpenIconDelete");
async function hasOpenLoadingIllustrationChange2(env, illustrationId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'loading_illustration'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(illustrationId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenLoadingIllustrationChange2, "hasOpenLoadingIllustrationChange");
async function readTitle(env, titleId) {
  return await env.DB.prepare(
    `
    SELECT
      title_id, title_code, title_name, description, unlock_condition_text,
      rarity, condition_type, condition_params_json, is_initial, is_active,
      sort_order, created_at, updated_at
    FROM titles
    WHERE title_id = ?
    LIMIT 1
    `
  ).bind(titleId).first();
}
__name(readTitle, "readTitle");
async function readTitleIconRewardIds(env, titleId) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    WHERE title_icon_rewards.title_id = ?
    ORDER BY title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `
  ).bind(titleId).all();
  return (result.results ?? []).map((row) => row.icon_id);
}
__name(readTitleIconRewardIds, "readTitleIconRewardIds");
async function validateIconRewardIds(env, iconRewardIds) {
  if (iconRewardIds.length === 0) return true;
  const placeholders = iconRewardIds.map(() => "?").join(", ");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM icons WHERE icon_id IN (${placeholders}) AND deleted_at IS NULL`
  ).bind(...iconRewardIds).first();
  return Number(row?.count ?? 0) === iconRewardIds.length;
}
__name(validateIconRewardIds, "validateIconRewardIds");
async function readIconSummaries(env, iconIds) {
  if (iconIds.length === 0) return [];
  const placeholders = iconIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `
    SELECT icon_id, icon_code, icon_name
    FROM icons
    WHERE icon_id IN (${placeholders})
    `
  ).bind(...iconIds).all();
  const iconMap = new Map((result.results ?? []).map((row) => [row.icon_id, row]));
  return iconIds.map((iconId) => iconMap.get(iconId) ?? { icon_id: iconId, icon_code: iconId, icon_name: iconId });
}
__name(readIconSummaries, "readIconSummaries");
async function hasOpenTitleIconRewardsChange(env, titleId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'title_icon_rewards_update'
      AND admin_change_items.target_type = 'title'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(titleId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenTitleIconRewardsChange, "hasOpenTitleIconRewardsChange");
async function readTitleIconRewardsEffect(env, titleId, beforeIds, afterIds) {
  const addedIconIds = afterIds.filter((iconId) => !beforeIds.includes(iconId));
  const removedIconIds = beforeIds.filter((iconId) => !afterIds.includes(iconId));
  const titleHolder = await env.DB.prepare("SELECT COUNT(*) AS count FROM user_titles WHERE title_id = ?").bind(titleId).first();
  let retroactiveGrantCount = 0;
  for (const iconId of afterIds) {
    const missing = await env.DB.prepare(
      `
      SELECT COUNT(*) AS count
      FROM user_titles
      LEFT JOIN user_icons
        ON user_icons.user_id = user_titles.user_id
        AND user_icons.icon_id = ?
      WHERE user_titles.title_id = ?
        AND user_icons.icon_id IS NULL
      `
    ).bind(iconId, titleId).first();
    retroactiveGrantCount += Number(missing?.count ?? 0);
  }
  return {
    beforeCount: beforeIds.length,
    afterCount: afterIds.length,
    addedIconIds,
    removedIconIds,
    titleHolderCount: Number(titleHolder?.count ?? 0),
    retroactiveGrantCount
  };
}
__name(readTitleIconRewardsEffect, "readTitleIconRewardsEffect");
async function readTitleUsersMissingIcon(env, titleId, iconId) {
  const result = await env.DB.prepare(
    `
    SELECT user_titles.user_id
    FROM user_titles
    LEFT JOIN user_icons
      ON user_icons.user_id = user_titles.user_id
      AND user_icons.icon_id = ?
    WHERE user_titles.title_id = ?
      AND user_icons.icon_id IS NULL
    ORDER BY user_titles.user_id ASC
    `
  ).bind(iconId, titleId).all();
  return (result.results ?? []).map((row) => row.user_id);
}
__name(readTitleUsersMissingIcon, "readTitleUsersMissingIcon");
function readIconRewardIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((item) => getString(item).trim()).filter(Boolean);
  return Array.from(new Set(ids));
}
__name(readIconRewardIds, "readIconRewardIds");
function isSameIdList(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
__name(isSameIdList, "isSameIdList");
async function readIconDeleteEffect(env, iconId) {
  const [owned, selected, rewards] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_icons WHERE icon_id = ?").bind(iconId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_settings WHERE current_icon_id = ?").bind(iconId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_icon_rewards WHERE icon_id = ?").bind(iconId).first()
  ]);
  return {
    ownedUserCount: Number(owned?.count ?? 0),
    selectedUserCount: Number(selected?.count ?? 0),
    rewardLinkCount: Number(rewards?.count ?? 0),
    fallbackIconId: DEFAULT_ICON_ID
  };
}
__name(readIconDeleteEffect, "readIconDeleteEffect");
async function readLoadingIllustrationEffect2(env, illustrationId) {
  const [viewed, linked] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_title_illustrations WHERE illustration_id = ? AND first_viewed_at IS NOT NULL").bind(illustrationId).first(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_illustrations WHERE illustration_id = ? AND required_title_id IS NOT NULL").bind(illustrationId).first()
  ]);
  return {
    viewedUserCount: Number(viewed?.count ?? 0),
    rewardLinkCount: Number(linked?.count ?? 0)
  };
}
__name(readLoadingIllustrationEffect2, "readLoadingIllustrationEffect");
function readOptionalAnnouncement(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  const enabled = record.enabled === true;
  if (!enabled) return null;
  const title = getString(record.title).trim();
  const rawSummary = getString(record.summary).trim();
  const body = getString(record.body).trim();
  const category = readCategory3(record.category);
  const priority = readPriority3(record.priority);
  const startsAt = readNullableIso3(record.startsAt);
  const endsAt = readNullableIso3(record.endsAt);
  const isActive = record.isActive === true;
  if (!title) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u30BF\u30A4\u30C8\u30EB\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!body) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u672C\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!category) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u7A2E\u5225\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt === false || endsAt === false) return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u65E5\u6642\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "\u304A\u77E5\u3089\u305B\u8868\u793A\u7D42\u4E86\u65E5\u6642\u306F\u8868\u793A\u958B\u59CB\u65E5\u6642\u4EE5\u5F8C\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  }
  return {
    title,
    summary: rawSummary || body.slice(0, 120),
    body,
    category,
    priority,
    isActive,
    startsAt: startsAt || null,
    endsAt: endsAt || null
  };
}
__name(readOptionalAnnouncement, "readOptionalAnnouncement");
function readCategory3(value) {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}
__name(readCategory3, "readCategory");
function readPriority3(value) {
  const numberValue = typeof value === "number" ? value : Number(getString(value));
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}
__name(readPriority3, "readPriority");
function readNullableIso3(value) {
  const raw = getString(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString();
}
__name(readNullableIso3, "readNullableIso");
async function getOrCreateDraftBatchId2(env, adminId, batchName, now) {
  await ensureSingleDraftBatch2(env);
  const draft = await readCurrentDraftBatch2(env);
  if (draft) return draft.batch_id;
  const batchId = createId("chg");
  await env.DB.prepare(
    `
    INSERT INTO admin_change_batches (
      batch_id, batch_name, status, created_by, created_at, updated_at
    )
    VALUES (?, ?, 'draft', ?, ?, ?)
    `
  ).bind(batchId, batchName, adminId, now, now).run();
  return batchId;
}
__name(getOrCreateDraftBatchId2, "getOrCreateDraftBatchId");
async function refreshDraftBatchMeta2(env, batchId, now) {
  const items = await readBatchItems2(env, batchId);
  const batchName = formatBatchDisplayNameFromItems2(items) || "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  await env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'").bind(batchName, now, batchId).run();
}
__name(refreshDraftBatchMeta2, "refreshDraftBatchMeta");
async function readCurrentDraftBatch2(env) {
  return await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    LIMIT 1
    `
  ).first();
}
__name(readCurrentDraftBatch2, "readCurrentDraftBatch");
async function ensureSingleDraftBatch2(env) {
  const result = await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    `
  ).all();
  const drafts = result.results ?? [];
  if (drafts.length <= 1) return;
  const primary = drafts[0];
  const mergedIds = drafts.slice(1).map((draft) => draft.batch_id);
  for (const batchId of mergedIds) {
    await env.DB.prepare("UPDATE admin_change_items SET batch_id = ? WHERE batch_id = ?").bind(primary.batch_id, batchId).run();
    await env.DB.prepare("DELETE FROM admin_change_batches WHERE batch_id = ? AND status = 'draft'").bind(batchId).run();
  }
  const row = await env.DB.prepare(
    `
    SELECT MAX(created_at) AS updated_at
    FROM admin_change_items
    WHERE batch_id = ?
    `
  ).bind(primary.batch_id).first();
  await refreshDraftBatchMeta2(env, primary.batch_id, row?.updated_at || nowIso());
}
__name(ensureSingleDraftBatch2, "ensureSingleDraftBatch");
function isActiveChangeItem(item) {
  return item.status === "draft";
}
__name(isActiveChangeItem, "isActiveChangeItem");
function isMainChangeItem(item) {
  return MAIN_CHANGE_TYPES.has(item.change_type);
}
__name(isMainChangeItem, "isMainChangeItem");
function formatBatchDisplayName(batch, items) {
  return formatBatchDisplayNameFromItems2(items) || batch.batch_name;
}
__name(formatBatchDisplayName, "formatBatchDisplayName");
function formatBatchDisplayNameFromItems2(items) {
  const mainItems = items.filter((item) => isActiveChangeItem(item) && isMainChangeItem(item));
  if (mainItems.length === 0) return "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  const firstName = formatChangeItemDisplayName2(mainItems[0]);
  if (mainItems.length === 1) return firstName;
  return `${firstName}\uFF0B\u4ED6${mainItems.length - 1}\u4EF6`;
}
__name(formatBatchDisplayNameFromItems2, "formatBatchDisplayNameFromItems");
function formatChangeItemDisplayName2(item) {
  const before = parseJson6(item.before_json) ?? {};
  const after = parseJson6(item.after_json) ?? {};
  if (item.change_type === "icon_delete") return `\u30A2\u30A4\u30B3\u30F3\u524A\u9664\uFF1A${readRecordText2(before, "icon_name", item.target_id)}`;
  if (item.change_type === "icon_replace") return `\u30A2\u30A4\u30B3\u30F3\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText2(before, "icon_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_delete") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u524A\u9664\uFF1A${readRecordText2(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_replace") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText2(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "title_icon_rewards_update") {
    const title = before.title;
    if (title && typeof title === "object" && !Array.isArray(title)) return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${readRecordText2(title, "title_name", item.target_id)}`;
    return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${item.target_id}`;
  }
  if (item.change_type === "announcement_create") return `\u304A\u77E5\u3089\u305B\u4F5C\u6210\uFF1A${readRecordText2(after, "title", item.target_id)}`;
  return item.target_id;
}
__name(formatChangeItemDisplayName2, "formatChangeItemDisplayName");
function readRecordText2(record, key, fallback) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
__name(readRecordText2, "readRecordText");
function countMainChangeItems(items) {
  return items.filter((item) => isActiveChangeItem(item) && isMainChangeItem(item)).length;
}
__name(countMainChangeItems, "countMainChangeItems");
function toBatchResponse(batch, items) {
  return {
    id: batch.batch_id,
    name: formatBatchDisplayName(batch, items),
    status: batch.status,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    scheduledAt: batch.scheduled_at,
    appliedAt: batch.applied_at,
    cancelledAt: batch.cancelled_at,
    cancelReason: batch.cancel_reason,
    errorMessage: batch.error_message,
    createdBy: toAdminActor(batch.created_by, batch.created_by_name, batch.created_by_email),
    appliedBy: batch.applied_by ? toAdminActor(batch.applied_by, batch.applied_by_name, batch.applied_by_email) : null,
    cancelledBy: batch.cancelled_by ? toAdminActor(batch.cancelled_by, batch.cancelled_by_name, batch.cancelled_by_email) : null,
    changeItemCount: countMainChangeItems(items),
    items: items.map(toItemResponse)
  };
}
__name(toBatchResponse, "toBatchResponse");
function toItemResponse(item) {
  return {
    id: item.item_id,
    batchId: item.batch_id,
    changeType: item.change_type,
    targetType: item.target_type,
    targetId: item.target_id,
    before: parseJson6(item.before_json),
    after: parseJson6(item.after_json),
    effect: parseJson6(item.effect_json),
    reason: item.reason,
    createdAt: item.created_at,
    status: item.status,
    parentItemId: item.parent_item_id,
    cancelledAt: item.cancelled_at,
    cancelReason: item.cancel_reason,
    cancelledBy: item.cancelled_by ? toAdminActor(item.cancelled_by, item.cancelled_by_name ?? null, item.cancelled_by_email ?? null) : null
  };
}
__name(toItemResponse, "toItemResponse");
function toAdminActor(id, displayName, email) {
  return { id, displayName: displayName ?? id, email: email ?? "" };
}
__name(toAdminActor, "toAdminActor");
function truncateText(value, maxLength) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
__name(truncateText, "truncateText");
function parseJson6(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson6, "parseJson");
async function batchStatements(env, statements) {
  const db = env.DB;
  if (typeof db.batch === "function") {
    await db.batch(statements);
    return;
  }
  for (const statement of statements) {
    await statement.run();
  }
}
__name(batchStatements, "batchStatements");

// api/admin/loading-illustrations.ts
function onRequestGet15() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPATCH\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet15, "onRequestGet");
async function onRequestPatch5(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const input = readLoadingIllustrationInput(body);
  if (!input.ok) return json({ ok: false, message: input.message }, { status: 400 });
  const illustrationExists = await existsById(context.env, "title_illustrations", "illustration_id", input.value.illustrationId);
  if (!illustrationExists) return json({ ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  const titleExists = await existsById(context.env, "titles", "title_id", input.value.requiredTitleId);
  if (!titleExists) return json({ ok: false, message: "\u7D10\u3065\u3051\u308B\u79F0\u53F7\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const titleName = await readTitleName(context.env, input.value.requiredTitleId);
  await updateLoadingIllustration(context.env, input.value, titleName ?? "\u79F0\u53F7");
  return json({ ok: true, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002" });
}
__name(onRequestPatch5, "onRequestPatch");
function onRequestPost13() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPATCH\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost13, "onRequestPost");
function readLoadingIllustrationInput(body) {
  const illustrationId = getString(body.illustrationId).trim();
  const requiredTitleId = getString(body.requiredTitleId).trim();
  const appearanceMode = readAppearanceMode(body.appearanceMode);
  const manualUnviewedRate = readRate(body.manualUnviewedRate);
  const manualViewedRate = readRate(body.manualViewedRate);
  const isActive = readFlag(body.isActive);
  if (!illustrationId) return { ok: false, message: "\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8ID\u304C\u3042\u308A\u307E\u305B\u3093\u3002" };
  if (!requiredTitleId) return { ok: false, message: "\u7D10\u3065\u3051\u308B\u79F0\u53F7\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" };
  if (!appearanceMode) return { ok: false, message: "\u51FA\u73FE\u8A2D\u5B9A\u304C\u4E0D\u6B63\u3067\u3059\u3002" };
  if (manualUnviewedRate === null || manualViewedRate === null) {
    return { ok: false, message: "\u51FA\u73FE\u7387\u306F0.0000\u301C100.0000\u306E\u7BC4\u56F2\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" };
  }
  return {
    ok: true,
    value: {
      illustrationId,
      requiredTitleId,
      appearanceMode,
      manualUnviewedRate,
      manualViewedRate,
      isActive
    }
  };
}
__name(readLoadingIllustrationInput, "readLoadingIllustrationInput");
function readAppearanceMode(value) {
  if (value === "auto" || value === "manual") return value;
  return null;
}
__name(readAppearanceMode, "readAppearanceMode");
function readRate(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < 0 || numberValue > 100) return null;
  return Math.round(numberValue * 1e4) / 1e4;
}
__name(readRate, "readRate");
function readFlag(value) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}
__name(readFlag, "readFlag");
async function existsById(env, tableName, columnName, id) {
  const deletedFilter = tableName === "title_illustrations" ? " AND deleted_at IS NULL" : "";
  const row = await env.DB.prepare(`SELECT 1 AS exists_flag FROM ${tableName} WHERE ${columnName} = ?${deletedFilter} LIMIT 1`).bind(id).first();
  return Number(row?.exists_flag ?? 0) === 1;
}
__name(existsById, "existsById");
async function readTitleName(env, titleId) {
  const row = await env.DB.prepare("SELECT title_name FROM titles WHERE title_id = ? LIMIT 1").bind(titleId).first();
  return row?.title_name ?? null;
}
__name(readTitleName, "readTitleName");
async function updateLoadingIllustration(env, input, titleName) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE title_illustrations
    SET
      required_title_id = ?,
      appearance_mode = ?,
      manual_unviewed_rate = ?,
      manual_viewed_rate = ?,
      condition_type = 'title_owned',
      condition_params_json = ?,
      unlock_condition_text = ?,
      is_active = ?,
      updated_at = ?
    WHERE illustration_id = ?
    `
  ).bind(
    input.requiredTitleId,
    input.appearanceMode,
    input.manualUnviewedRate,
    input.manualViewedRate,
    JSON.stringify({ titleId: input.requiredTitleId }),
    `${titleName}\u3092\u6240\u6301\u3057\u3066\u3044\u308B\u3068\u30ED\u30FC\u30C9\u753B\u9762\u306B\u51FA\u73FE`,
    input.isActive,
    now,
    input.illustrationId
  ).run();
}
__name(updateLoadingIllustration, "updateLoadingIllustration");

// api/admin/masters.ts
var AdminInputError = class extends Error {
  static {
    __name(this, "AdminInputError");
  }
};
async function onRequestGet16(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const [titles, icons, titleIconRewards] = await Promise.all([
    readTitles(context.env),
    readIcons(context.env),
    readTitleIconRewards(context.env)
  ]);
  return json({
    ok: true,
    currentUser: {
      userId: session.user_id,
      email: session.email,
      role: session.role
    },
    masters: {
      titles: titles.map((title) => toTitleResponse(title, titleIconRewards.get(title.title_id) ?? [])),
      icons: icons.map(toIconResponse)
    }
  });
}
__name(onRequestGet16, "onRequestGet");
async function onRequestPost14(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const targetType = readTargetType(body.targetType);
  if (!targetType) return json({ ok: false, message: "\u7BA1\u7406\u5BFE\u8C61\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  try {
    if (targetType === "title") {
      const input2 = readTitleInput(body, false);
      if (!input2.ok) return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors: input2.errors }, { status: 400 });
      const titleId = createId("title");
      await insertTitle(context.env, titleId, input2.value);
      const title = await readTitle2(context.env, titleId);
      const batchId = title ? await createTitleIconRewardsChangeBatchIfNeeded(context.env, title, input2.value.iconRewardIds, input2.value.titleIconRewardChangeReason, session.user_id) : null;
      return json({ ok: true, message: batchId ? "\u79F0\u53F7\u3092\u8FFD\u52A0\u3057\u3001\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002" : "\u79F0\u53F7\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002", id: titleId, batchId });
    }
    const input = readIconInput(body, false);
    if (!input.ok) return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors: input.errors }, { status: 400 });
    const iconId = createId("icon");
    await insertIcon(context.env, iconId, input.value);
    return json({ ok: true, message: "\u30A2\u30A4\u30B3\u30F3\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002", id: iconId });
  } catch (error) {
    return json({ ok: false, message: toSaveErrorMessage(error) }, { status: 409 });
  }
}
__name(onRequestPost14, "onRequestPost");
async function onRequestPatch6(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const targetType = readTargetType(body.targetType);
  if (!targetType) return json({ ok: false, message: "\u7BA1\u7406\u5BFE\u8C61\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  try {
    if (targetType === "title") {
      const input2 = readTitleInput(body, true);
      if (!input2.ok) return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors: input2.errors }, { status: 400 });
      await updateTitle(context.env, input2.value);
      const title = input2.value.titleId ? await readTitle2(context.env, input2.value.titleId) : null;
      const batchId = title ? await createTitleIconRewardsChangeBatchIfNeeded(context.env, title, input2.value.iconRewardIds, input2.value.titleIconRewardChangeReason, session.user_id) : null;
      return json({ ok: true, message: batchId ? "\u79F0\u53F7\u3092\u66F4\u65B0\u3057\u3001\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\u3092\u4E00\u6642\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002" : "\u79F0\u53F7\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002", batchId });
    }
    const input = readIconInput(body, true);
    if (!input.ok) return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors: input.errors }, { status: 400 });
    await updateIcon(context.env, input.value);
    return json({ ok: true, message: "\u30A2\u30A4\u30B3\u30F3\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3002" });
  } catch (error) {
    return json({ ok: false, message: toSaveErrorMessage(error) }, { status: 409 });
  }
}
__name(onRequestPatch6, "onRequestPatch");
function readTargetType(value) {
  if (value === "title" || value === "icon") return value;
  return null;
}
__name(readTargetType, "readTargetType");
function readTitleInput(body, requireId) {
  const errors = {};
  const titleId = getString(body.titleId).trim();
  const titleCode = getString(body.titleCode).trim();
  const titleName = getString(body.titleName).trim();
  const description = getString(body.description).trim();
  const unlockConditionText = getString(body.unlockConditionText).trim();
  const rarity = readInteger(body.rarity, 1);
  const conditionType = getString(body.conditionType).trim();
  const conditionParamsJson = normalizeJsonText(body.conditionParamsJson, errors);
  const isInitial = readFlag2(body.isInitial);
  const isActive = readFlag2(body.isActive);
  const sortOrder = readInteger(body.sortOrder, 0);
  const iconRewardIds = readIconRewardIds2(body.iconRewardIds, errors);
  const titleIconRewardChangeReason = getString(body.titleIconRewardChangeReason).trim();
  if (requireId && !titleId) errors.titleId = "\u79F0\u53F7ID\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
  if (!titleCode) errors.titleCode = "\u79F0\u53F7\u30B3\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!titleName) errors.titleName = "\u79F0\u53F7\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!description) errors.description = "\u8AAC\u660E\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!unlockConditionText) errors.unlockConditionText = "\u53D6\u5F97\u6761\u4EF6\u30C6\u30AD\u30B9\u30C8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (rarity < 1 || rarity > 5) errors.rarity = "\u30EC\u30A2\u5EA6\u306F1\u301C5\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!conditionType) errors.conditionType = "condition_type\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      titleId: titleId || void 0,
      titleCode,
      titleName,
      description,
      unlockConditionText,
      rarity,
      conditionType,
      conditionParamsJson,
      isInitial,
      isActive,
      sortOrder,
      iconRewardIds,
      titleIconRewardChangeReason
    }
  };
}
__name(readTitleInput, "readTitleInput");
function readIconInput(body, requireId) {
  const errors = {};
  const iconId = getString(body.iconId).trim();
  const iconCode = getString(body.iconCode).trim();
  const iconName = getString(body.iconName).trim();
  const description = getString(body.description).trim();
  const unlockConditionText = getString(body.unlockConditionText).trim();
  const imagePath = getString(body.imagePath).trim();
  const rarity = readInteger(body.rarity, 1);
  const conditionType = getString(body.conditionType).trim();
  const conditionParamsJson = normalizeJsonText(body.conditionParamsJson, errors);
  const isInitial = readFlag2(body.isInitial);
  const isGuestAvailable = readFlag2(body.isGuestAvailable);
  const isActive = readFlag2(body.isActive);
  const sortOrder = readInteger(body.sortOrder, 0);
  if (requireId && !iconId) errors.iconId = "\u30A2\u30A4\u30B3\u30F3ID\u304C\u3042\u308A\u307E\u305B\u3093\u3002";
  if (!iconCode) errors.iconCode = "\u30A2\u30A4\u30B3\u30F3\u30B3\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!iconName) errors.iconName = "\u30A2\u30A4\u30B3\u30F3\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!description) errors.description = "\u8AAC\u660E\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!unlockConditionText) errors.unlockConditionText = "\u53D6\u5F97\u6761\u4EF6\u30C6\u30AD\u30B9\u30C8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!imagePath) errors.imagePath = "\u753B\u50CF\u30D1\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (rarity < 1 || rarity > 5) errors.rarity = "\u30EC\u30A2\u5EA6\u306F1\u301C5\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!conditionType) errors.conditionType = "condition_type\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      iconId: iconId || void 0,
      iconCode,
      iconName,
      description,
      unlockConditionText,
      imagePath,
      rarity,
      conditionType,
      conditionParamsJson,
      isInitial,
      isGuestAvailable,
      isActive,
      sortOrder
    }
  };
}
__name(readIconInput, "readIconInput");
function normalizeJsonText(value, errors) {
  const text = getString(value).trim();
  if (!text) return null;
  try {
    JSON.parse(text);
  } catch {
    errors.conditionParamsJson = "condition_params_json \u306F\u6B63\u3057\u3044JSON\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  }
  return text;
}
__name(normalizeJsonText, "normalizeJsonText");
function readFlag2(value) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}
__name(readFlag2, "readFlag");
function readIconRewardIds2(value, errors) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((item) => getString(item).trim()).filter(Boolean);
  const uniqueIds2 = [...new Set(ids)];
  if (uniqueIds2.length !== ids.length) errors.iconRewardIds = "\u540C\u3058\u30A2\u30A4\u30B3\u30F3\u3092\u91CD\u8907\u3057\u3066\u7D10\u3065\u3051\u308B\u3053\u3068\u306F\u3067\u304D\u307E\u305B\u3093\u3002";
  if (uniqueIds2.length > 3) errors.iconRewardIds = "\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u306F\u6700\u59273\u3064\u307E\u3067\u3067\u3059\u3002";
  return uniqueIds2.slice(0, 3);
}
__name(readIconRewardIds2, "readIconRewardIds");
function readInteger(value, fallback) {
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : fallback;
}
__name(readInteger, "readInteger");
async function readTitles(env) {
  const result = await env.DB.prepare(
    `
    SELECT *
    FROM titles
    ORDER BY sort_order ASC, title_id ASC
    `
  ).all();
  return result.results ?? [];
}
__name(readTitles, "readTitles");
async function readIcons(env) {
  const result = await env.DB.prepare(
    `
    SELECT *
    FROM icons
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, icon_id ASC
    `
  ).all();
  return result.results ?? [];
}
__name(readIcons, "readIcons");
async function readTitleIconRewards(env) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.title_id, title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    ORDER BY title_icon_rewards.title_id ASC, title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `
  ).all();
  const rewardMap = /* @__PURE__ */ new Map();
  for (const row of result.results ?? []) {
    const iconIds = rewardMap.get(row.title_id) ?? [];
    iconIds.push(row.icon_id);
    rewardMap.set(row.title_id, iconIds);
  }
  return rewardMap;
}
__name(readTitleIconRewards, "readTitleIconRewards");
async function readTitle2(env, titleId) {
  return await env.DB.prepare(
    `
    SELECT *
    FROM titles
    WHERE title_id = ?
    LIMIT 1
    `
  ).bind(titleId).first();
}
__name(readTitle2, "readTitle");
async function readTitleIconRewardIds2(env, titleId) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    WHERE title_icon_rewards.title_id = ?
    ORDER BY title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `
  ).bind(titleId).all();
  return (result.results ?? []).map((row) => row.icon_id);
}
__name(readTitleIconRewardIds2, "readTitleIconRewardIds");
async function createTitleIconRewardsChangeBatchIfNeeded(env, title, iconRewardIds, reason, adminId) {
  const currentIconRewardIds = await readTitleIconRewardIds2(env, title.title_id);
  if (isSameIdList2(currentIconRewardIds, iconRewardIds)) return null;
  if (!reason) throw new AdminInputError("\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u3092\u5909\u66F4\u3059\u308B\u5834\u5408\u306F\u3001\u5909\u66F4\u7406\u7531\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  if (reason.length > 500) throw new AdminInputError("\u5909\u66F4\u7406\u7531\u306F500\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  const openTitleChange = await hasOpenTitleIconRewardsChange2(env, title.title_id);
  if (openTitleChange) throw new AdminInputError("\u3053\u306E\u79F0\u53F7\u306B\u306F\u672A\u53CD\u6620\u306E\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  for (const iconId of iconRewardIds) {
    const openIconDelete = await hasOpenIconDelete2(env, iconId);
    if (openIconDelete) throw new AdminInputError("\u9078\u629E\u4E2D\u306E\u30A2\u30A4\u30B3\u30F3\u306B\u306F\u672A\u53CD\u6620\u306E\u524A\u9664\u4E88\u5B9A\u304C\u3042\u308A\u307E\u3059\u3002\u53CD\u6620\u8A2D\u5B9A\u30BF\u30D6\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  const iconRewardsValid = await validateIconRewardIds2(env, iconRewardIds);
  if (!iconRewardsValid) throw new AdminInputError("\u7D10\u3065\u3051\u308B\u30A2\u30A4\u30B3\u30F3\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  const [beforeIcons, afterIcons, effect] = await Promise.all([
    readIconSummaries2(env, currentIconRewardIds),
    readIconSummaries2(env, iconRewardIds),
    readTitleIconRewardsEffect2(env, title.title_id, currentIconRewardIds, iconRewardIds)
  ]);
  const now = nowIso();
  const batchName = `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${title.title_name}`;
  const batchId = await getOrCreateDraftBatchId3(env, adminId, batchName, now);
  await env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'title_icon_rewards_update', 'title', ?, ?, ?, ?, ?, ?)
    `
  ).bind(
    createId("chi"),
    batchId,
    title.title_id,
    JSON.stringify({ title, iconRewardIds: currentIconRewardIds, iconRewards: beforeIcons }),
    JSON.stringify({ iconRewardIds, iconRewards: afterIcons }),
    JSON.stringify(effect),
    reason,
    now
  ).run();
  await refreshDraftBatchMeta3(env, batchId, now);
  return batchId;
}
__name(createTitleIconRewardsChangeBatchIfNeeded, "createTitleIconRewardsChangeBatchIfNeeded");
async function getOrCreateDraftBatchId3(env, adminId, batchName, now) {
  await ensureSingleDraftBatch3(env);
  const draft = await readCurrentDraftBatch3(env);
  if (draft) return draft.batch_id;
  const batchId = createId("chg");
  await env.DB.prepare(
    `
    INSERT INTO admin_change_batches (
      batch_id, batch_name, status, created_by, created_at, updated_at
    )
    VALUES (?, ?, 'draft', ?, ?, ?)
    `
  ).bind(batchId, batchName, adminId, now, now).run();
  return batchId;
}
__name(getOrCreateDraftBatchId3, "getOrCreateDraftBatchId");
async function refreshDraftBatchMeta3(env, batchId, now) {
  const items = await readBatchItems3(env, batchId);
  const batchName = formatBatchDisplayNameFromItems3(items) || "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  await env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'").bind(batchName, now, batchId).run();
}
__name(refreshDraftBatchMeta3, "refreshDraftBatchMeta");
async function readCurrentDraftBatch3(env) {
  return await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    LIMIT 1
    `
  ).first();
}
__name(readCurrentDraftBatch3, "readCurrentDraftBatch");
async function ensureSingleDraftBatch3(env) {
  const result = await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    `
  ).all();
  const drafts = result.results ?? [];
  if (drafts.length <= 1) return;
  const primary = drafts[0];
  for (const batchId of drafts.slice(1).map((draft) => draft.batch_id)) {
    await env.DB.prepare("UPDATE admin_change_items SET batch_id = ? WHERE batch_id = ?").bind(primary.batch_id, batchId).run();
    await env.DB.prepare("DELETE FROM admin_change_batches WHERE batch_id = ? AND status = 'draft'").bind(batchId).run();
  }
  const row = await env.DB.prepare(
    `
    SELECT MAX(created_at) AS updated_at
    FROM admin_change_items
    WHERE batch_id = ?
    `
  ).bind(primary.batch_id).first();
  await refreshDraftBatchMeta3(env, primary.batch_id, row?.updated_at || nowIso());
}
__name(ensureSingleDraftBatch3, "ensureSingleDraftBatch");
async function readBatchItems3(env, batchId) {
  const result = await env.DB.prepare(
    `
    SELECT
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at, status
    FROM admin_change_items
    WHERE batch_id = ?
    ORDER BY created_at ASC, item_id ASC
    `
  ).bind(batchId).all();
  return result.results ?? [];
}
__name(readBatchItems3, "readBatchItems");
function formatBatchDisplayNameFromItems3(items) {
  const mainItems = items.filter((item) => item.status === "draft" && item.change_type !== "announcement_create");
  if (mainItems.length === 0) return "\u6B21\u56DE\u53CD\u6620\u4E88\u5B9A";
  const firstName = formatChangeItemDisplayName3(mainItems[0]);
  if (mainItems.length === 1) return firstName;
  return `${firstName}\uFF0B\u4ED6${mainItems.length - 1}\u4EF6`;
}
__name(formatBatchDisplayNameFromItems3, "formatBatchDisplayNameFromItems");
function formatChangeItemDisplayName3(item) {
  const before = parseJson7(item.before_json) ?? {};
  if (item.change_type === "icon_delete") return `\u30A2\u30A4\u30B3\u30F3\u524A\u9664\uFF1A${readRecordText3(before, "icon_name", item.target_id)}`;
  if (item.change_type === "icon_replace") return `\u30A2\u30A4\u30B3\u30F3\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText3(before, "icon_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_delete") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u524A\u9664\uFF1A${readRecordText3(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_replace") return `\u30ED\u30FC\u30C9\u30A4\u30E9\u30B9\u30C8\u5DEE\u3057\u66FF\u3048\uFF1A${readRecordText3(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "title_icon_rewards_update") {
    const title = before.title;
    if (title && typeof title === "object" && !Array.isArray(title)) return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${readRecordText3(title, "title_name", item.target_id)}`;
    return `\u79F0\u53F7\u30A2\u30A4\u30B3\u30F3\u5831\u916C\u5909\u66F4\uFF1A${item.target_id}`;
  }
  return item.target_id;
}
__name(formatChangeItemDisplayName3, "formatChangeItemDisplayName");
function readRecordText3(record, key, fallback) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
__name(readRecordText3, "readRecordText");
function parseJson7(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
__name(parseJson7, "parseJson");
async function validateIconRewardIds2(env, iconRewardIds) {
  if (iconRewardIds.length === 0) return true;
  const placeholders = iconRewardIds.map(() => "?").join(", ");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM icons WHERE icon_id IN (${placeholders}) AND deleted_at IS NULL`
  ).bind(...iconRewardIds).first();
  return Number(row?.count ?? 0) === iconRewardIds.length;
}
__name(validateIconRewardIds2, "validateIconRewardIds");
async function readIconSummaries2(env, iconIds) {
  if (iconIds.length === 0) return [];
  const placeholders = iconIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `
    SELECT icon_id, icon_code, icon_name
    FROM icons
    WHERE icon_id IN (${placeholders})
    `
  ).bind(...iconIds).all();
  const iconMap = new Map((result.results ?? []).map((row) => [row.icon_id, row]));
  return iconIds.map((iconId) => iconMap.get(iconId) ?? { icon_id: iconId, icon_code: iconId, icon_name: iconId });
}
__name(readIconSummaries2, "readIconSummaries");
async function hasOpenIconDelete2(env, iconId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'icon_delete'
      AND admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(iconId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenIconDelete2, "hasOpenIconDelete");
async function hasOpenTitleIconRewardsChange2(env, titleId) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'title_icon_rewards_update'
      AND admin_change_items.target_type = 'title'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `
  ).bind(titleId).first();
  return Number(row?.count ?? 0) > 0;
}
__name(hasOpenTitleIconRewardsChange2, "hasOpenTitleIconRewardsChange");
async function readTitleIconRewardsEffect2(env, titleId, beforeIds, afterIds) {
  const addedIconIds = afterIds.filter((iconId) => !beforeIds.includes(iconId));
  const removedIconIds = beforeIds.filter((iconId) => !afterIds.includes(iconId));
  const titleHolder = await env.DB.prepare("SELECT COUNT(*) AS count FROM user_titles WHERE title_id = ?").bind(titleId).first();
  let retroactiveGrantCount = 0;
  for (const iconId of afterIds) {
    const missing = await env.DB.prepare(
      `
      SELECT COUNT(*) AS count
      FROM user_titles
      LEFT JOIN user_icons
        ON user_icons.user_id = user_titles.user_id
        AND user_icons.icon_id = ?
      WHERE user_titles.title_id = ?
        AND user_icons.icon_id IS NULL
      `
    ).bind(iconId, titleId).first();
    retroactiveGrantCount += Number(missing?.count ?? 0);
  }
  return {
    beforeCount: beforeIds.length,
    afterCount: afterIds.length,
    addedIconIds,
    removedIconIds,
    titleHolderCount: Number(titleHolder?.count ?? 0),
    retroactiveGrantCount
  };
}
__name(readTitleIconRewardsEffect2, "readTitleIconRewardsEffect");
function isSameIdList2(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
__name(isSameIdList2, "isSameIdList");
async function insertTitle(env, titleId, input) {
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT INTO titles (
      title_id, title_code, title_name, description, unlock_condition_text,
      rarity, condition_type, condition_params_json, is_initial, is_active,
      sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).bind(
    titleId,
    input.titleCode,
    input.titleName,
    input.description,
    input.unlockConditionText,
    input.rarity,
    input.conditionType,
    input.conditionParamsJson,
    input.isInitial,
    input.isActive,
    input.sortOrder,
    now,
    now
  ).run();
}
__name(insertTitle, "insertTitle");
async function updateTitle(env, input) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE titles
    SET
      title_code = ?,
      title_name = ?,
      description = ?,
      unlock_condition_text = ?,
      rarity = ?,
      condition_type = ?,
      condition_params_json = ?,
      is_initial = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE title_id = ?
    `
  ).bind(
    input.titleCode,
    input.titleName,
    input.description,
    input.unlockConditionText,
    input.rarity,
    input.conditionType,
    input.conditionParamsJson,
    input.isInitial,
    input.isActive,
    input.sortOrder,
    now,
    input.titleId
  ).run();
}
__name(updateTitle, "updateTitle");
async function insertIcon(env, iconId, input) {
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT INTO icons (
      icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
      rarity, condition_type, condition_params_json, is_initial, is_guest_available,
      is_active, sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).bind(
    iconId,
    input.iconCode,
    input.iconName,
    input.description,
    input.unlockConditionText,
    input.imagePath,
    input.rarity,
    input.conditionType,
    input.conditionParamsJson,
    input.isInitial,
    input.isGuestAvailable,
    input.isActive,
    input.sortOrder,
    now,
    now
  ).run();
}
__name(insertIcon, "insertIcon");
async function updateIcon(env, input) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE icons
    SET
      icon_code = ?,
      icon_name = ?,
      description = ?,
      unlock_condition_text = ?,
      image_path = ?,
      rarity = ?,
      condition_type = ?,
      condition_params_json = ?,
      is_initial = ?,
      is_guest_available = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE icon_id = ?
    `
  ).bind(
    input.iconCode,
    input.iconName,
    input.description,
    input.unlockConditionText,
    input.imagePath,
    input.rarity,
    input.conditionType,
    input.conditionParamsJson,
    input.isInitial,
    input.isGuestAvailable,
    input.isActive,
    input.sortOrder,
    now,
    input.iconId
  ).run();
}
__name(updateIcon, "updateIcon");
function toTitleResponse(row, iconRewardIds) {
  return {
    id: row.title_id,
    code: row.title_code,
    name: row.title_name,
    description: row.description,
    unlockConditionText: row.unlock_condition_text,
    rarity: row.rarity,
    conditionType: row.condition_type,
    conditionParamsJson: row.condition_params_json ?? "",
    isInitial: row.is_initial === 1,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    iconRewardIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toTitleResponse, "toTitleResponse");
function toIconResponse(row) {
  return {
    id: row.icon_id,
    code: row.icon_code,
    name: row.icon_name,
    description: row.description,
    unlockConditionText: row.unlock_condition_text,
    imagePath: row.image_path,
    rarity: row.rarity,
    conditionType: row.condition_type,
    conditionParamsJson: row.condition_params_json ?? "",
    isInitial: row.is_initial === 1,
    isGuestAvailable: row.is_guest_available === 1,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toIconResponse, "toIconResponse");
function toSaveErrorMessage(error) {
  if (error instanceof AdminInputError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("UNIQUE")) return "\u30B3\u30FC\u30C9\u304C\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059\u3002";
  return "\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
}
__name(toSaveErrorMessage, "toSaveErrorMessage");

// api/admin/player-users.ts
var PAGE_SIZE = 50;
async function onRequestGet17(context) {
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
      mustChangePassword: Boolean(session.must_change_password)
    },
    query,
    playerUsers: users.map(toPlayerUserResponse),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages
    }
  });
}
__name(onRequestGet17, "onRequestGet");
async function countPlayerUsers(env, query, searchPattern) {
  if (!query) {
    const row2 = await env.DB.prepare("SELECT COUNT(*) AS total_count FROM users WHERE status <> 'deleted'").first();
    return Number(row2?.total_count ?? 0);
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
    `
  ).bind(searchPattern, searchPattern, searchPattern).first();
  return Number(row?.total_count ?? 0);
}
__name(countPlayerUsers, "countPlayerUsers");
async function readPlayerUsers(env, query, searchPattern, limit, offset) {
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
  const searchSql = query ? `
      AND (
        LOWER(users.user_id) LIKE ? ESCAPE '\\'
        OR users.email_normalized LIKE ? ESCAPE '\\'
        OR LOWER(COALESCE(user_settings.display_name, '')) LIKE ? ESCAPE '\\'
      )
    ` : "";
  const orderSql = `
    ORDER BY users.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const statement = env.DB.prepare(`${baseSql}${searchSql}${orderSql}`);
  const result = query ? await statement.bind(searchPattern, searchPattern, searchPattern, limit, offset).all() : await statement.bind(limit, offset).all();
  return result.results ?? [];
}
__name(readPlayerUsers, "readPlayerUsers");
function toPlayerUserResponse(row) {
  const soloMatchCount = readNumber2(row.solo_match_count);
  const multiMatchCount = readNumber2(row.multi_match_count);
  const soloWinCount = readNumber2(row.solo_win_count);
  const multiWinCount = readNumber2(row.multi_win_count);
  const soloLoseCount = readNumber2(row.solo_lose_count);
  const multiLoseCount = readNumber2(row.multi_lose_count);
  const matchCount = soloMatchCount + multiMatchCount;
  const winCount = soloWinCount + multiWinCount;
  const loseCount = soloLoseCount + multiLoseCount;
  return {
    userId: row.user_id,
    email: row.email,
    emailNormalized: row.email_normalized,
    status: row.status,
    role: row.role,
    roleLabel: playerRoleLabel2(row.role),
    emailVerified: Boolean(row.email_verified_at),
    emailVerifiedAt: row.email_verified_at,
    displayName: row.display_name ?? "",
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    titleCount: readNumber2(row.title_count),
    iconCount: readNumber2(row.icon_count),
    stats: {
      matchCount,
      winCount,
      loseCount,
      winRate: matchCount > 0 ? Math.round(winCount / matchCount * 1e3) / 10 : 0,
      soloMatchCount,
      multiMatchCount
    }
  };
}
__name(toPlayerUserResponse, "toPlayerUserResponse");
function playerRoleLabel2(role) {
  if (role === "owner") return "\u7BA1\u7406\u8CAC\u4EFB\u8005";
  if (role === "admin") return "\u7BA1\u7406\u8005";
  return "\u901A\u5E38\u30E6\u30FC\u30B6\u30FC";
}
__name(playerRoleLabel2, "playerRoleLabel");
function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}
__name(readPositiveInteger, "readPositiveInteger");
function readNumber2(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
__name(readNumber2, "readNumber");
function escapeLike(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
__name(escapeLike, "escapeLike");

// api/admin/users.ts
async function onRequestGet18(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const users = await readAdminUsers(context.env);
  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      roleLabel: roleLabel(session.role),
      mustChangePassword: Boolean(session.must_change_password)
    },
    users: users.map((user) => toUserResponse(user, session.admin_id))
  });
}
__name(onRequestGet18, "onRequestGet");
async function onRequestPost15(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  if (session.role !== "owner") {
    return json({ ok: false, message: "\u7BA1\u7406\u8005\u3092\u8FFD\u52A0\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  }
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const displayName = getString(body.displayName).trim();
  const email = getString(body.email).trim();
  const emailNormalized = normalizeEmail(email);
  const role = normalizeRole(getString(body.role)) ?? "admin";
  if (!displayName) return json({ ok: false, message: "\u7BA1\u7406\u8005\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (displayName.length > 30) return json({ ok: false, message: "\u7BA1\u7406\u8005\u540D\u306F30\u6587\u5B57\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!isValidEmail(email)) return json({ ok: false, message: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  const existing = await context.env.DB.prepare("SELECT admin_id, deleted_at FROM admin_users WHERE email_normalized = ? LIMIT 1").bind(emailNormalized).first();
  const now = nowIso();
  const passwordHash = await hashPassword(email);
  if (existing && !existing.deleted_at) {
    return json({ ok: false, message: "\u3053\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u7BA1\u7406\u8005\u306F\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u3002" }, { status: 409 });
  }
  if (existing?.deleted_at) {
    await context.env.DB.prepare(
      `
      UPDATE admin_users
      SET
        display_name = ?,
        email = ?,
        email_normalized = ?,
        password_hash = ?,
        role = ?,
        status = 'active',
        must_change_password = 1,
        password_changed_at = NULL,
        updated_at = ?,
        deleted_at = NULL
      WHERE admin_id = ?
      `
    ).bind(displayName, email, emailNormalized, passwordHash, role, now, existing.admin_id).run();
    return json({ ok: true, message: "\u524A\u9664\u6E08\u307F\u7BA1\u7406\u8005\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F\u3002\u521D\u671F\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3068\u540C\u3058\u3067\u3059\u3002" });
  }
  const adminId = createId("adm");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_users (
      admin_id,
      display_name,
      email,
      email_normalized,
      password_hash,
      role,
      status,
      must_change_password,
      last_login_at,
      password_changed_at,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NULL, NULL, ?, ?, NULL)
    `
  ).bind(adminId, displayName, email, emailNormalized, passwordHash, role, now, now).run();
  return json({ ok: true, message: "\u7BA1\u7406\u8005\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F\u3002\u521D\u671F\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3068\u540C\u3058\u3067\u3059\u3002" });
}
__name(onRequestPost15, "onRequestPost");
async function onRequestPatch7(context) {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  const action = getString(body.action);
  if (action === "update_display_name") return updateDisplayName(context, session.admin_id, session.role, body);
  if (action === "update_role") return updateRole(context, session.admin_id, session.role, body);
  if (action === "update_status") return updateStatus(context, session.admin_id, session.role, body);
  if (action === "delete_admin") return deleteAdmin(context, session.admin_id, session.role, body);
  return json({ ok: false, message: "\u672A\u5BFE\u5FDC\u306E\u64CD\u4F5C\u3067\u3059\u3002" }, { status: 400 });
}
__name(onRequestPatch7, "onRequestPatch");
async function updateDisplayName(context, currentAdminId, currentRole, body) {
  const targetAdminId = getString(body.adminId).trim();
  const displayName = getString(body.displayName).trim();
  if (!targetAdminId) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!displayName) return json({ ok: false, message: "\u7BA1\u7406\u8005\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (displayName.length > 30) return json({ ok: false, message: "\u7BA1\u7406\u8005\u540D\u306F30\u6587\u5B57\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (currentRole !== "owner" && targetAdminId !== currentAdminId) {
    return json({ ok: false, message: "\u4ED6\u306E\u7BA1\u7406\u8005\u540D\u3092\u5909\u66F4\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  }
  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET display_name = ?, updated_at = ? WHERE admin_id = ?").bind(displayName, now, target.admin_id).run();
  return json({ ok: true, message: "\u7BA1\u7406\u8005\u540D\u3092\u5909\u66F4\u3057\u307E\u3057\u305F\u3002" });
}
__name(updateDisplayName, "updateDisplayName");
async function updateRole(context, currentAdminId, currentRole, body) {
  if (currentRole !== "owner") return json({ ok: false, message: "\u6A29\u9650\u3092\u5909\u66F4\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  const targetAdminId = getString(body.adminId).trim();
  const nextRole = normalizeRole(getString(body.role));
  if (!targetAdminId) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!nextRole) return json({ ok: false, message: "\u6A29\u9650\u306E\u6307\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "\u81EA\u5206\u81EA\u8EAB\u306E\u6A29\u9650\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (target.role === "owner" && nextRole !== "owner" && await countOwners(context.env) <= 1) {
    return json({ ok: false, message: "\u7BA1\u7406\u8CAC\u4EFB\u8005\u304C0\u4EBA\u306B\u306A\u308B\u305F\u3081\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  }
  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET role = ?, updated_at = ? WHERE admin_id = ?").bind(nextRole, now, target.admin_id).run();
  return json({ ok: true, message: "\u7BA1\u7406\u8005\u306E\u6A29\u9650\u3092\u5909\u66F4\u3057\u307E\u3057\u305F\u3002" });
}
__name(updateRole, "updateRole");
async function updateStatus(context, currentAdminId, currentRole, body) {
  if (currentRole !== "owner") return json({ ok: false, message: "\u72B6\u614B\u3092\u5909\u66F4\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  const targetAdminId = getString(body.adminId).trim();
  const nextStatus = getString(body.status) === "disabled" ? "disabled" : getString(body.status) === "active" ? "active" : null;
  if (!targetAdminId) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (!nextStatus) return json({ ok: false, message: "\u72B6\u614B\u306E\u6307\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "\u81EA\u5206\u81EA\u8EAB\u306E\u72B6\u614B\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (target.role === "owner" && target.status === "active" && nextStatus !== "active" && await countOwners(context.env) <= 1) {
    return json({ ok: false, message: "\u6709\u52B9\u306A\u7BA1\u7406\u8CAC\u4EFB\u8005\u304C0\u4EBA\u306B\u306A\u308B\u305F\u3081\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  }
  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET status = ?, updated_at = ? WHERE admin_id = ?").bind(nextStatus, now, target.admin_id).run();
  if (nextStatus !== "active") {
    await context.env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE admin_id = ? AND revoked_at IS NULL").bind(now, now, target.admin_id).run();
  }
  return json({ ok: true, message: nextStatus === "active" ? "\u7BA1\u7406\u8005\u3092\u6709\u52B9\u5316\u3057\u307E\u3057\u305F\u3002" : "\u7BA1\u7406\u8005\u3092\u7121\u52B9\u5316\u3057\u307E\u3057\u305F\u3002" });
}
__name(updateStatus, "updateStatus");
async function deleteAdmin(context, currentAdminId, currentRole, body) {
  if (currentRole !== "owner") return json({ ok: false, message: "\u7BA1\u7406\u8005\u3092\u524A\u9664\u3067\u304D\u308B\u306E\u306F\u7BA1\u7406\u8CAC\u4EFB\u8005\u306E\u307F\u3067\u3059\u3002" }, { status: 403 });
  const targetAdminId = getString(body.adminId).trim();
  if (!targetAdminId) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "\u81EA\u5206\u81EA\u8EAB\u306F\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "\u5BFE\u8C61\u306E\u7BA1\u7406\u8005\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002" }, { status: 404 });
  if (target.role === "owner") {
    if (target.status === "active" && await countOwners(context.env) <= 1) {
      return json({ ok: false, message: "\u6709\u52B9\u306A\u7BA1\u7406\u8CAC\u4EFB\u8005\u304C0\u4EBA\u306B\u306A\u308B\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
    }
    const remainingOwner = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM admin_users WHERE role = 'owner' AND deleted_at IS NULL AND admin_id != ?"
    ).bind(target.admin_id).first();
    if (Number(remainingOwner?.count ?? 0) <= 0) {
      return json({ ok: false, message: "\u7BA1\u7406\u8CAC\u4EFB\u8005\u304C0\u4EBA\u306B\u306A\u308B\u305F\u3081\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3002" }, { status: 400 });
    }
  }
  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE admin_id = ?").bind(now, now, target.admin_id).run();
  await context.env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE admin_id = ? AND revoked_at IS NULL").bind(now, now, target.admin_id).run();
  return json({ ok: true, message: "\u7BA1\u7406\u8005\u3092\u524A\u9664\u3057\u307E\u3057\u305F\u3002" });
}
__name(deleteAdmin, "deleteAdmin");
async function readAdminUsers(env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_id,
      display_name,
      email,
      email_normalized,
      role,
      status,
      must_change_password,
      last_login_at,
      password_changed_at,
      created_at,
      updated_at
    FROM admin_users
    WHERE deleted_at IS NULL
    ORDER BY
      CASE role WHEN 'owner' THEN 0 ELSE 1 END,
      CASE status WHEN 'active' THEN 0 WHEN 'disabled' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 100
    `
  ).all();
  return result.results ?? [];
}
__name(readAdminUsers, "readAdminUsers");
async function readAdminTarget(env, adminId) {
  return env.DB.prepare(
    `
    SELECT admin_id, display_name, email, role, status
    FROM admin_users
    WHERE admin_id = ? AND deleted_at IS NULL
    LIMIT 1
    `
  ).bind(adminId).first();
}
__name(readAdminTarget, "readAdminTarget");
function toUserResponse(row, currentAdminId) {
  return {
    userId: row.admin_id,
    adminId: row.admin_id,
    email: row.email,
    emailNormalized: row.email_normalized,
    status: row.status,
    role: row.role,
    roleLabel: roleLabel(row.role),
    displayName: row.display_name,
    lastLoginAt: row.last_login_at,
    passwordChangedAt: row.password_changed_at,
    mustChangePassword: Boolean(row.must_change_password),
    isSelf: row.admin_id === currentAdminId,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toUserResponse, "toUserResponse");

// api/auth/login.ts
async function onRequestPost16({ request, env }) {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const email = getString(body.email).trim();
  const password = getString(body.password);
  const errors = validateLogin2({ email, password });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const user = await env.DB.prepare("SELECT * FROM users WHERE email_normalized = ? LIMIT 1").bind(normalizeEmail(email)).first();
  if (!user || !await verifyPassword(password, user.password_hash)) {
    return json(
      {
        ok: false,
        message: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002",
        errors: { password: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }
      },
      { status: 401 }
    );
  }
  if (user.status === "suspended") {
    return json(
      {
        ok: false,
        message: "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u73FE\u5728\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002",
        errors: { password: "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u73FE\u5728\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002" }
      },
      { status: 403 }
    );
  }
  if (user.status !== "active") {
    return json(
      {
        ok: false,
        message: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002",
        errors: { password: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002" }
      },
      { status: 401 }
    );
  }
  const now = nowIso();
  const sessionId = createId("ses");
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = addHoursIso(24);
  await env.DB.prepare(
    `
    INSERT INTO user_sessions (
      session_id,
      user_id,
      session_token_hash,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `
  ).bind(sessionId, user.user_id, tokenHash, expiresAt, now, now).run();
  await env.DB.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE user_id = ?").bind(now, now, user.user_id).run();
  return json(
    {
      ok: true,
      user: {
        userId: user.user_id,
        email: user.email
      },
      expiresAt
    },
    {
      headers: {
        "Set-Cookie": createSessionCookie(rawToken)
      }
    }
  );
}
__name(onRequestPost16, "onRequestPost");
function onRequestGet19() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet19, "onRequestGet");
function validateLogin2(values) {
  const errors = {};
  if (!values.email) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidEmail(values.email)) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  if (!values.password) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  return errors;
}
__name(validateLogin2, "validateLogin");

// api/auth/logout.ts
async function onRequestPost17({ request, env }) {
  const rawToken = getSessionTokenFromCookie(request);
  if (rawToken) {
    const now = nowIso();
    await env.DB.prepare(
      `
      UPDATE user_sessions
      SET revoked_at = ?, updated_at = ?
      WHERE session_token_hash = ?
        AND revoked_at IS NULL
      `
    ).bind(now, now, await hashToken(rawToken)).run();
  }
  return json(
    { ok: true, message: "\u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002" },
    {
      headers: {
        "Set-Cookie": createClearSessionCookie()
      }
    }
  );
}
__name(onRequestPost17, "onRequestPost");
function onRequestGet20() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet20, "onRequestGet");

// api/auth/me.ts
var ACCOUNT_UNAVAILABLE_MESSAGE = "\u3053\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306F\u73FE\u5728\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u5FC3\u5F53\u305F\u308A\u304C\u306A\u3044\u5834\u5408\u306F\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002";
async function onRequestGet21({ request, env }) {
  const session = await findSession(env, request);
  if (!session) {
    return json({ ok: true, authenticated: false });
  }
  if (session.status === "suspended") {
    return json(
      { ok: false, authenticated: false, accountUnavailable: true, message: ACCOUNT_UNAVAILABLE_MESSAGE },
      { status: 403, headers: { "Set-Cookie": createClearSessionCookie() } }
    );
  }
  if (session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) {
    return json(
      { ok: true, authenticated: false },
      { headers: { "Set-Cookie": createClearSessionCookie() } }
    );
  }
  return json({
    ok: true,
    authenticated: true,
    user: {
      userId: session.user_id,
      email: session.email
    },
    expiresAt: session.expires_at
  });
}
__name(onRequestGet21, "onRequestGet");
function onRequestPost18() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost18, "onRequestPost");

// api/auth/password-reset.ts
async function onRequestPost19({ request, env }) {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const token = getString(body.token);
  const password = getString(body.password);
  const errors = validatePasswordReset({ token, password });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const tokenHash = await hashToken(token);
  const resetToken = await env.DB.prepare(
    `
    SELECT
      password_reset_tokens.token_id,
      password_reset_tokens.user_id,
      password_reset_tokens.expires_at,
      password_reset_tokens.used_at,
      users.status
    FROM password_reset_tokens
    INNER JOIN users ON users.user_id = password_reset_tokens.user_id
    WHERE password_reset_tokens.token_hash = ?
    LIMIT 1
    `
  ).bind(tokenHash).first();
  if (!resetToken || resetToken.used_at || resetToken.status !== "active" || !isFutureIso(resetToken.expires_at)) {
    return json(
      {
        ok: false,
        message: "\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u30EA\u30F3\u30AF\u304C\u7121\u52B9\u3001\u307E\u305F\u306F\u6709\u52B9\u671F\u9650\u5207\u308C\u3067\u3059\u3002",
        errors: { token: "\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u30EA\u30F3\u30AF\u304C\u7121\u52B9\u3001\u307E\u305F\u306F\u6709\u52B9\u671F\u9650\u5207\u308C\u3067\u3059\u3002" }
      },
      { status: 400 }
    );
  }
  const now = nowIso();
  const passwordHash = await hashPassword(password);
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?").bind(passwordHash, now, resetToken.user_id).run();
  await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_id = ?").bind(now, resetToken.token_id).run();
  return json({ ok: true, message: "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u518D\u8A2D\u5B9A\u3057\u307E\u3057\u305F\u3002" });
}
__name(onRequestPost19, "onRequestPost");
function onRequestGet22() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet22, "onRequestGet");
function validatePasswordReset(values) {
  const errors = {};
  if (!values.token) errors.token = "\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u30EA\u30F3\u30AF\u304C\u7121\u52B9\u3067\u3059\u3002";
  if (!values.password) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidRegisterPassword(values.password)) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u82F1\u5B57\u30FB\u6570\u5B57\u30FB\u8A18\u53F7\u3092\u542B\u30807\u6587\u5B57\u4EE5\u4E0A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  return errors;
}
__name(validatePasswordReset, "validatePasswordReset");

// api/auth/password-reset-request.ts
async function onRequestPost20({ request, env }) {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const email = getString(body.email).trim();
  const errors = validatePasswordResetRequest({ email });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const user = await env.DB.prepare("SELECT user_id, email, status FROM users WHERE email_normalized = ? LIMIT 1").bind(normalizeEmail(email)).first();
  if (user?.status === "active") {
    const now = nowIso();
    const tokenId = createId("prt");
    const { rawToken, tokenHash } = await createTokenPair();
    const expiresAt = addHoursIso(1);
    await env.DB.prepare(
      `
      INSERT INTO password_reset_tokens (
        token_id,
        user_id,
        token_hash,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
      `
    ).bind(tokenId, user.user_id, tokenHash, expiresAt, now).run();
    const resetUrl = new URL("/password-reset.html", getOrigin(request));
    resetUrl.searchParams.set("token", rawToken);
    await sendAuthMail(env, buildPasswordResetMail(user.email, resetUrl.toString()));
  }
  return json({
    ok: true,
    message: "\u3054\u5165\u529B\u3044\u305F\u3060\u3044\u305F\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u304C\u767B\u9332\u6E08\u307F\u306E\u5834\u5408\u3001\u30D1\u30B9\u30EF\u30FC\u30C9\u518D\u8A2D\u5B9A\u7528\u306E\u30E1\u30FC\u30EB\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\u3002"
  });
}
__name(onRequestPost20, "onRequestPost");
function onRequestGet23() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet23, "onRequestGet");
function validatePasswordResetRequest(values) {
  const errors = {};
  if (!values.email) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidEmail(values.email)) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  return errors;
}
__name(validatePasswordResetRequest, "validatePasswordResetRequest");

// api/auth/register.ts
var MAX_DISPLAY_NAME_LENGTH = 15;
async function onRequestPost21({ request, env }) {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const email = getString(body.email).trim();
  const password = getString(body.password);
  const displayName = getString(body.displayName).trim();
  const errors = validateRegister({ email, password, displayName });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const emailNormalized = normalizeEmail(email);
  const existingUser = await env.DB.prepare("SELECT user_id FROM users WHERE email_normalized = ? LIMIT 1").bind(emailNormalized).first();
  if (existingUser) {
    return json(
      {
        ok: false,
        message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        errors: { email: "\u3053\u306E\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306F\u65E2\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u307E\u3059\u3002" }
      },
      { status: 409 }
    );
  }
  const now = nowIso();
  const userId = createId("usr");
  const tokenId = createId("evt");
  const passwordHash = await hashPassword(password);
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = addHoursIso(24);
  await env.DB.prepare(
    `
    INSERT INTO users (
      user_id,
      email,
      email_normalized,
      password_hash,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `
  ).bind(userId, email, emailNormalized, passwordHash, now, now).run();
  await env.DB.prepare(
    `
    INSERT INTO email_verification_tokens (
      token_id,
      user_id,
      token_hash,
      expires_at,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
    `
  ).bind(tokenId, userId, tokenHash, expiresAt, now).run();
  await env.DB.prepare(
    `
    INSERT INTO user_settings (
      user_id,
      display_name,
      sound_volume_level,
      created_at,
      updated_at
    )
    VALUES (?, ?, 3, ?, ?)
    `
  ).bind(userId, displayName, now, now).run();
  const verificationUrl = new URL("/api/auth/verify-email", getOrigin(request));
  verificationUrl.searchParams.set("token", rawToken);
  const mailSent = await sendAuthMail(env, buildVerificationMail(email, verificationUrl.toString()));
  return json({
    ok: true,
    status: "pending",
    mailSent,
    message: "\u65B0\u898F\u767B\u9332\u3092\u53D7\u3051\u4ED8\u3051\u307E\u3057\u305F\u3002\u30E1\u30FC\u30EB\u8A8D\u8A3C\u3092\u5B8C\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  });
}
__name(onRequestPost21, "onRequestPost");
function onRequestGet24() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet24, "onRequestGet");
function validateRegister(values) {
  const errors = {};
  if (!values.email) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidEmail(values.email)) errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  if (!values.password) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (!isValidRegisterPassword(values.password)) errors.password = "\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u82F1\u5B57\u30FB\u6570\u5B57\u30FB\u8A18\u53F7\u3092\u542B\u30807\u6587\u5B57\u4EE5\u4E0A\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  if (!values.displayName) errors.displayName = "\u8868\u793A\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  else if (values.displayName.length > MAX_DISPLAY_NAME_LENGTH) errors.displayName = `\u8868\u793A\u540D\u306F${MAX_DISPLAY_NAME_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  return errors;
}
__name(validateRegister, "validateRegister");

// api/auth/verify-email.ts
async function onRequestGet25({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) {
    return html("\u30E1\u30FC\u30EB\u8A8D\u8A3C\u30EA\u30F3\u30AF\u304C\u7121\u52B9\u3067\u3059\u3002", 400);
  }
  const tokenHash = await hashToken(token);
  const verificationToken = await env.DB.prepare(
    `
    SELECT
      email_verification_tokens.token_id,
      email_verification_tokens.user_id,
      email_verification_tokens.expires_at,
      email_verification_tokens.used_at,
      users.status
    FROM email_verification_tokens
    INNER JOIN users ON users.user_id = email_verification_tokens.user_id
    WHERE email_verification_tokens.token_hash = ?
    LIMIT 1
    `
  ).bind(tokenHash).first();
  if (!verificationToken || verificationToken.used_at || verificationToken.status !== "pending" || !isFutureIso(verificationToken.expires_at)) {
    return html("\u30E1\u30FC\u30EB\u8A8D\u8A3C\u30EA\u30F3\u30AF\u304C\u7121\u52B9\u3001\u307E\u305F\u306F\u6709\u52B9\u671F\u9650\u5207\u308C\u3067\u3059\u3002", 400);
  }
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE users
    SET status = 'active', email_verified_at = ?, updated_at = ?
    WHERE user_id = ?
    `
  ).bind(now, now, verificationToken.user_id).run();
  await env.DB.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE token_id = ?").bind(now, verificationToken.token_id).run();
  const redirectUrl = new URL("/index.html", url.origin);
  redirectUrl.searchParams.set("auth", "login");
  redirectUrl.searchParams.set("verified", "1");
  return Response.redirect(redirectUrl.toString(), 302);
}
__name(onRequestGet25, "onRequestGet");
function onRequestPost22() {
  return html("\u3053\u306EAPI\u306FGET\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002", 405);
}
__name(onRequestPost22, "onRequestPost");
function html(message, status) {
  return new Response(
    `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>100GAME\u207A \u30E1\u30FC\u30EB\u8A8D\u8A3C</title></head><body><main style="font-family:sans-serif;padding:24px;"><h1>100GAME\u207A</h1><p>${escapeHtml(message)}</p><p><a href="/index.html">\u30BF\u30A4\u30C8\u30EB\u3078\u623B\u308B</a></p></main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}
__name(html, "html");

// api/announcements.ts
async function onRequestGet26(context) {
  const announcements = await readActiveAnnouncements(context.env);
  return json({
    ok: true,
    announcements: announcements.map(toAnnouncementResponse2)
  });
}
__name(onRequestGet26, "onRequestGet");
async function readActiveAnnouncements(env) {
  const now = nowIso();
  const result = await env.DB.prepare(
    `
    SELECT
      announcement_id,
      title,
      summary,
      body,
      category,
      priority,
      starts_at,
      ends_at,
      created_at,
      updated_at
    FROM announcements
    WHERE is_active = 1
      AND deleted_at IS NULL
      AND (starts_at IS NULL OR starts_at <= ?)
      AND (ends_at IS NULL OR ends_at >= ?)
    ORDER BY
      priority DESC,
      COALESCE(starts_at, created_at) DESC,
      created_at DESC
    LIMIT 5
    `
  ).bind(now, now).all();
  return result.results ?? [];
}
__name(readActiveAnnouncements, "readActiveAnnouncements");
function toAnnouncementResponse2(row) {
  return {
    id: row.announcement_id,
    title: row.title,
    summary: row.summary ?? "",
    body: row.body,
    category: row.category,
    categoryLabel: categoryLabel2(row.category),
    priority: row.priority,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toAnnouncementResponse2, "toAnnouncementResponse");
function categoryLabel2(category) {
  if (category === "maintenance") return "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9";
  if (category === "bug") return "\u4E0D\u5177\u5408";
  if (category === "update") return "\u30A2\u30C3\u30D7\u30C7\u30FC\u30C8";
  if (category === "important") return "\u91CD\u8981";
  return "\u901A\u5E38";
}
__name(categoryLabel2, "categoryLabel");

// api/contact.ts
var MAX_SUBJECT_LENGTH = 80;
var MAX_NAME_LENGTH = 40;
var MAX_MESSAGE_LENGTH = 2e3;
var MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
var ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
var CATEGORY_LABELS = {
  bug: "\u4E0D\u5177\u5408\u306E\u5831\u544A",
  request: "\u6539\u5584\u8981\u671B",
  other: "\u305D\u306E\u4ED6\u304A\u554F\u3044\u5408\u308F\u305B"
};
async function onRequestPost23({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return json2(
      {
        ok: false,
        message: "\u30E1\u30FC\u30EB\u9001\u4FE1\u7528\u306E\u8A2D\u5B9A\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002"
      },
      { status: 500 }
    );
  }
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json2(
      {
        ok: false,
        message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      { status: 400 }
    );
  }
  const category = getFormString(formData, "category");
  const subject = getFormString(formData, "subject");
  const name = getFormString(formData, "name");
  const email = getFormString(formData, "email");
  const message = getFormString(formData, "message");
  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
  const errors = validateContact({
    category,
    subject,
    name,
    email,
    message,
    imageFile
  });
  if (Object.keys(errors).length > 0) {
    return json2(
      {
        ok: false,
        message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
        errors
      },
      { status: 400 }
    );
  }
  const trimmedCategory = category;
  const trimmedSubject = subject.trim();
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  const userAgent = request.headers.get("user-agent") ?? "\u4E0D\u660E";
  const sentAt = formatJstDate(/* @__PURE__ */ new Date());
  const attachments = [];
  if (imageFile) {
    attachments.push({
      filename: imageFile.name,
      content: await fileToBase64(imageFile)
    });
  }
  const payload = {
    from: "100GAME\u30B5\u30DD\u30FC\u30C8 <support@acceble.com>",
    to: ["support@acceble.com"],
    reply_to: trimmedEmail,
    subject: `\u3010100GAME\u304A\u554F\u3044\u5408\u308F\u305B\u3011${trimmedSubject}`,
    text: buildTextEmail({
      categoryLabel: CATEGORY_LABELS[trimmedCategory],
      subject: trimmedSubject,
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      imageFileName: imageFile?.name ?? "\u306A\u3057",
      sentAt,
      userAgent
    }),
    html: buildHtmlEmail({
      categoryLabel: CATEGORY_LABELS[trimmedCategory],
      subject: trimmedSubject,
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      imageFileName: imageFile?.name ?? "\u306A\u3057",
      sentAt,
      userAgent
    })
  };
  if (attachments.length > 0) {
    payload.attachments = attachments;
  }
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!resendResponse.ok) {
    const responseText = await resendResponse.text();
    console.error("Resend send failed:", resendResponse.status, responseText);
    return json2(
      {
        ok: false,
        message: "\u30E1\u30FC\u30EB\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      { status: 502 }
    );
  }
  return json2({
    ok: true,
    message: "\u304A\u554F\u3044\u5408\u308F\u305B\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F\u3002"
  });
}
__name(onRequestPost23, "onRequestPost");
function onRequestGet27() {
  return json2(
    {
      ok: false,
      message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002"
    },
    { status: 405 }
  );
}
__name(onRequestGet27, "onRequestGet");
function getFormString(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
__name(getFormString, "getFormString");
function validateContact(values) {
  const errors = {};
  if (!isAllowedCategory(values.category)) {
    errors.category = "\u304A\u554F\u3044\u5408\u308F\u305B\u7A2E\u5225\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  }
  if (!values.subject.trim()) {
    errors.subject = "\u4EF6\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  } else if (values.subject.trim().length > MAX_SUBJECT_LENGTH) {
    errors.subject = `\u4EF6\u540D\u306F${MAX_SUBJECT_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  }
  if (values.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `\u304A\u540D\u524D\u30FB\u30D7\u30EC\u30A4\u30E4\u30FC\u540D\u306F${MAX_NAME_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  }
  if (!values.email.trim()) {
    errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  } else if (!isValidEmail2(values.email.trim())) {
    errors.email = "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002";
  }
  if (!values.message.trim()) {
    errors.message = "\u304A\u554F\u3044\u5408\u308F\u305B\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
  } else if (values.message.trim().length > MAX_MESSAGE_LENGTH) {
    errors.message = `\u304A\u554F\u3044\u5408\u308F\u305B\u5185\u5BB9\u306F${MAX_MESSAGE_LENGTH}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  }
  if (values.imageFile) {
    if (!ALLOWED_IMAGE_TYPES.includes(values.imageFile.type)) {
      errors.imageFile = "\u6DFB\u4ED8\u3067\u304D\u308B\u753B\u50CF\u5F62\u5F0F\u306F jpg / png / webp \u306E\u307F\u3067\u3059\u3002";
    } else if (values.imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      errors.imageFile = "\u6DFB\u4ED8\u753B\u50CF\u306F3MB\u4EE5\u5185\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    }
  }
  return errors;
}
__name(validateContact, "validateContact");
function isAllowedCategory(value) {
  return value === "bug" || value === "request" || value === "other";
}
__name(isAllowedCategory, "isAllowedCategory");
function isValidEmail2(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
__name(isValidEmail2, "isValidEmail");
async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
__name(fileToBase64, "fileToBase64");
function buildTextEmail(values) {
  return [
    "100GAME\u306E\u304A\u554F\u3044\u5408\u308F\u305B\u30D5\u30A9\u30FC\u30E0\u304B\u3089\u9001\u4FE1\u304C\u3042\u308A\u307E\u3057\u305F\u3002",
    "",
    `\u304A\u554F\u3044\u5408\u308F\u305B\u7A2E\u5225\uFF1A${values.categoryLabel}`,
    `\u4EF6\u540D\uFF1A${values.subject}`,
    `\u304A\u540D\u524D\u30FB\u30D7\u30EC\u30A4\u30E4\u30FC\u540D\uFF1A${values.name || "\u672A\u5165\u529B"}`,
    `\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\uFF1A${values.email}`,
    `\u753B\u50CF\u6DFB\u4ED8\uFF1A${values.imageFileName}`,
    `\u9001\u4FE1\u65E5\u6642\uFF1A${values.sentAt}`,
    `User-Agent\uFF1A${values.userAgent}`,
    "",
    "\u304A\u554F\u3044\u5408\u308F\u305B\u5185\u5BB9\uFF1A",
    values.message
  ].join("\n");
}
__name(buildTextEmail, "buildTextEmail");
function buildHtmlEmail(values) {
  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">100GAME \u304A\u554F\u3044\u5408\u308F\u305B</h1>
      <p style="margin: 0 0 18px;">100GAME\u306E\u304A\u554F\u3044\u5408\u308F\u305B\u30D5\u30A9\u30FC\u30E0\u304B\u3089\u9001\u4FE1\u304C\u3042\u308A\u307E\u3057\u305F\u3002</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${buildHtmlRow("\u304A\u554F\u3044\u5408\u308F\u305B\u7A2E\u5225", values.categoryLabel)}
        ${buildHtmlRow("\u4EF6\u540D", values.subject)}
        ${buildHtmlRow("\u304A\u540D\u524D\u30FB\u30D7\u30EC\u30A4\u30E4\u30FC\u540D", values.name || "\u672A\u5165\u529B")}
        ${buildHtmlRow("\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", values.email)}
        ${buildHtmlRow("\u753B\u50CF\u6DFB\u4ED8", values.imageFileName)}
        ${buildHtmlRow("\u9001\u4FE1\u65E5\u6642", values.sentAt)}
        ${buildHtmlRow("User-Agent", values.userAgent)}
      </table>

      <h2 style="font-size: 16px; margin: 24px 0 8px;">\u304A\u554F\u3044\u5408\u308F\u305B\u5185\u5BB9</h2>
      <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #f9fafb;">${escapeHtml2(values.message)}</div>
    </div>
  `;
}
__name(buildHtmlEmail, "buildHtmlEmail");
function buildHtmlRow(label, value) {
  return `
    <tr>
      <th style="width: 180px; text-align: left; vertical-align: top; padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb;">${escapeHtml2(label)}</th>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${escapeHtml2(value)}</td>
    </tr>
  `;
}
__name(buildHtmlRow, "buildHtmlRow");
function escapeHtml2(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
__name(escapeHtml2, "escapeHtml");
function formatJstDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}
__name(formatJstDate, "formatJstDate");
function json2(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=UTF-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}
__name(json2, "json");

// api/user-collections.ts
var DEFAULT_TITLE_ID = "title-initial-001";
var DEFAULT_ICON_ID2 = "img_01_u7537_u306e_u5b50";
var TITLE_SEEDS = [
  createInitialTitleSeed("title-initial-001", "initial_first_step", "\u306F\u3058\u3081\u306E\u4E00\u6B69", "\u307E\u305A\u306F\u3053\u3053\u304B\u3089\uFF01", 1),
  createInitialTitleSeed("title-initial-002", "initial_challenger_100", "100\u3078\u306E\u6311\u6226\u8005", "\u5343\u91CC\u306E\u9053\u3082\u4E00\u6B69\u3088\u308A\u3060\u3051\u3069\u3001\u3053\u3053\u3067\u306F100\u304B\u3089", 2),
  createInitialTitleSeed("title-initial-003", "initial_hand_newbie", "\u624B\u672D\u306E\u65B0\u4EBA", "\u624B\u672D\u3069\u3053\u308D\u304B\u5168\u90E8\u65B0\u4EBA\u3060\u3082\u3093", 3),
  createInitialTitleSeed("title-initial-004", "initial_first_card", "\u307E\u305A\u306F\u4E00\u679A", "\u3068\u308A\u3042\u3048\u305A\u30AB\u30FC\u30C9\u51FA\u3057\u305F\u3089\u826F\u304F\u3067\u304D\u307E\u3057\u305F\uFF01", 4),
  createInitialTitleSeed("title-initial-005", "initial_rule_checking", "\u30EB\u30FC\u30EB\u78BA\u8A8D\u4E2D", "\u30EB\u30FC\u30EB\u3092\u5B88\u3063\u3066\u697D\u3057\u304F\u30FB\u30FB\u30FB\u904A\u3073\u307E\u3057\u3087\u3046\uFF01", 5),
  createInitialTitleSeed("title-initial-006", "initial_relaxed_player", "\u307E\u3063\u305F\u308A\u52E2", "\u7126\u3089\u305A\u884C\u3053\u3046\u3088\u3002", 6),
  createInitialTitleSeed("title-initial-007", "initial_easy_please", "\u304A\u624B\u67D4\u3089\u304B\u306B", "\u3053\u306E\u79F0\u53F7\u63B2\u3052\u3066\u308B\u4EBA\u3092\u3044\u3058\u3081\u308B\u4EBA\u3068\u306E\u95A2\u4FC2\u306F\u8003\u3048\u305F\u65B9\u304C\u826F\u3044\u3068\u601D\u3046", 7),
  createInitialTitleSeed("title-initial-008", "initial_player_started", "\u30D7\u30EC\u30A4\u30E4\u30FC\u3001\u59CB\u3081\u307E\u3057\u305F", "\u30AE\u30BF\u30FC\u306E\u4EE3\u308F\u308A\u306B\u30AB\u30FC\u30C9\u3092\uFF01", 8),
  createInitialTitleSeed("title-initial-009", "initial_match_entrance", "\u52DD\u8CA0\u306E\u5165\u53E3", "\u3044\u3056\uFF01\u52DD\u8CA0\uFF01", 9),
  createInitialTitleSeed("title-initial-010", "initial_one_game_please", "\u4E00\u6226\u304A\u9858\u3044\u3057\u307E\u3059", "\u306A\u3093\u305F\u308B\u793C\u5100\u306E\u826F\u3055\uFF01", 10)
];
var ICON_SEEDS = [
  createIconSeed("img_01_u7537_u306e_u5b50", "icon_player_001", "\u7537\u306E\u5B50", 1, "/assets/icons/01_boy.png"),
  createIconSeed("img_02_u5973_u306e_u5b50_u59b9", "icon_player_002", "\u5973\u306E\u5B50 \u59B9", 2, "/assets/icons/02_girl_sister.png"),
  createIconSeed("img_03_u7537_u6027", "icon_player_003", "\u7537\u6027", 3, "/assets/icons/03_man.png"),
  createIconSeed("img_04_u5973_u6027", "icon_player_004", "\u5973\u6027", 4, "/assets/icons/04_woman.png"),
  createIconSeed("img_05_u30a4_u30cc", "icon_player_005", "\u30A4\u30CC", 5, "/assets/icons/05_dog.png"),
  createIconSeed("img_06_u30cd_u30b3", "icon_player_006", "\u30CD\u30B3", 6, "/assets/icons/06_cat.png")
];
var ILLUSTRATION_SEEDS = [
  {
    illustration_id: "load-illustration-001",
    illustration_code: "loading_boy_001",
    illustration_name: "\u30ED\u30FC\u30C9\u753B\u9762\uFF11(\u7537\u306E\u5B50)",
    description: "\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030",
    unlock_condition_text: "\u306F\u3058\u3081\u306E\u4E00\u6B69\u3092\u6240\u6301\u3057\u3066\u3044\u308B\u3068\u30ED\u30FC\u30C9\u753B\u9762\u306B\u51FA\u73FE",
    image_path: "/assets/loading-illustrations/01_load.png",
    rarity: 1,
    condition_type: "title_owned",
    condition_params_json: '{"titleId":"title-initial-001"}',
    is_initial: 0,
    is_rare: 0,
    is_boost_excluded: 0,
    is_active: 1,
    sort_order: 1
  },
  {
    illustration_id: "load-illustration-002",
    illustration_code: "loading_girl_001",
    illustration_name: "\u30ED\u30FC\u30C9\u753B\u9762\uFF12(\u5973\u306E\u5B50)",
    description: "\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030\u6587\u5B57\u657030",
    unlock_condition_text: "100\u3078\u306E\u6311\u6226\u8005\u3092\u6240\u6301\u3057\u3066\u3044\u308B\u3068\u30ED\u30FC\u30C9\u753B\u9762\u306B\u51FA\u73FE",
    image_path: "/assets/loading-illustrations/02_load.png",
    rarity: 1,
    condition_type: "title_owned",
    condition_params_json: '{"titleId":"title-initial-002"}',
    is_initial: 0,
    is_rare: 0,
    is_boost_excluded: 0,
    is_active: 1,
    sort_order: 2
  }
];
async function onRequestGet28({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  await ensureCollectionSeed(env, session.user_id);
  const [titles, icons, loadingIllustrations] = await Promise.all([
    readTitleCollection(env, session.user_id),
    readIconCollection(env, session.user_id),
    readIllustrationCollection(env, session.user_id)
  ]);
  return json({
    ok: true,
    collection: {
      titles: titles.map(toTitleResponse2),
      icons: icons.map(toIconResponse2),
      loadingIllustrations: loadingIllustrations.map(toIllustrationResponse)
    }
  });
}
__name(onRequestGet28, "onRequestGet");
function onRequestPost24() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost24, "onRequestPost");
async function ensureCollectionSeed(env, userId) {
  const now = nowIso();
  for (const title of TITLE_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO titles (
        title_id, title_code, title_name, description, unlock_condition_text,
        rarity, condition_type, condition_params_json, is_initial, is_active,
        sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(title_id) DO NOTHING
      `
    ).bind(
      title.title_id,
      title.title_code,
      title.title_name,
      title.description,
      title.unlock_condition_text,
      title.rarity,
      title.condition_type,
      title.condition_params_json,
      title.is_initial,
      title.is_active,
      title.sort_order,
      now,
      now
    ).run();
  }
  for (const icon of ICON_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO icons (
        icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
        rarity, condition_type, condition_params_json, is_initial, is_guest_available,
        is_active, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(icon_id) DO NOTHING
      `
    ).bind(
      icon.icon_id,
      icon.icon_code,
      icon.icon_name,
      icon.description,
      icon.unlock_condition_text,
      icon.image_path,
      icon.rarity,
      icon.condition_type,
      icon.condition_params_json,
      icon.is_initial,
      icon.is_guest_available,
      icon.is_active,
      icon.sort_order,
      now,
      now
    ).run();
  }
  await grantInitialTitlesFromDb(env, userId, now);
  await grantInitialIconsFromDb(env, userId, now);
  for (const illustration of ILLUSTRATION_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO title_illustrations (
        illustration_id, illustration_code, illustration_name, description, unlock_condition_text,
        image_path, rarity, condition_type, condition_params_json, is_initial, is_rare,
        is_boost_excluded, is_active, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(illustration_id) DO UPDATE SET
        illustration_code = excluded.illustration_code,
        illustration_name = excluded.illustration_name,
        description = excluded.description,
        unlock_condition_text = excluded.unlock_condition_text,
        image_path = excluded.image_path,
        rarity = excluded.rarity,
        condition_type = excluded.condition_type,
        condition_params_json = excluded.condition_params_json,
        is_initial = excluded.is_initial,
        is_rare = excluded.is_rare,
        is_boost_excluded = excluded.is_boost_excluded,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
      `
    ).bind(
      illustration.illustration_id,
      illustration.illustration_code,
      illustration.illustration_name,
      illustration.description,
      illustration.unlock_condition_text,
      illustration.image_path,
      illustration.rarity,
      illustration.condition_type,
      illustration.condition_params_json,
      illustration.is_initial,
      illustration.is_rare,
      illustration.is_boost_excluded,
      illustration.is_active,
      illustration.sort_order,
      now,
      now
    ).run();
  }
  await env.DB.prepare(
    `
    UPDATE user_settings
    SET
      current_icon_id = COALESCE(current_icon_id, ?),
      current_title_id = COALESCE(current_title_id, ?),
      updated_at = ?
    WHERE user_id = ?
    `
  ).bind(DEFAULT_ICON_ID2, DEFAULT_TITLE_ID, now, userId).run();
}
__name(ensureCollectionSeed, "ensureCollectionSeed");
async function grantInitialTitlesFromDb(env, userId, now) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_titles (user_id, title_id, acquired_at, created_at)
    SELECT ?, title_id, ?, ?
    FROM titles
    WHERE is_initial = 1
      AND is_active = 1
    `
  ).bind(userId, now, now).run();
}
__name(grantInitialTitlesFromDb, "grantInitialTitlesFromDb");
async function grantInitialIconsFromDb(env, userId, now) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at)
    SELECT ?, icon_id, ?, ?
    FROM icons
    WHERE is_initial = 1
      AND is_active = 1
    `
  ).bind(userId, now, now).run();
}
__name(grantInitialIconsFromDb, "grantInitialIconsFromDb");
async function readTitleCollection(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      titles.title_id,
      titles.title_name,
      titles.description,
      titles.unlock_condition_text,
      titles.rarity,
      titles.sort_order,
      user_titles.acquired_at
    FROM titles
    LEFT JOIN user_titles
      ON user_titles.title_id = titles.title_id
      AND user_titles.user_id = ?
    WHERE titles.is_active = 1
    ORDER BY titles.sort_order ASC, titles.title_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readTitleCollection, "readTitleCollection");
async function readIconCollection(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      icons.icon_id,
      icons.icon_name,
      icons.description,
      icons.unlock_condition_text,
      icons.image_path,
      icons.rarity,
      icons.sort_order,
      icons.storage_provider,
      user_icons.acquired_at
    FROM icons
    LEFT JOIN user_icons
      ON user_icons.icon_id = icons.icon_id
      AND user_icons.user_id = ?
    WHERE icons.deleted_at IS NULL
      AND (icons.is_active = 1 OR user_icons.acquired_at IS NOT NULL)
      AND (COALESCE(icons.storage_provider, 'local') <> 'r2' OR user_icons.acquired_at IS NOT NULL)
    ORDER BY icons.sort_order ASC, icons.icon_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readIconCollection, "readIconCollection");
async function readIllustrationCollection(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      title_illustrations.illustration_id,
      title_illustrations.illustration_name,
      title_illustrations.description,
      title_illustrations.unlock_condition_text,
      title_illustrations.image_path,
      title_illustrations.rarity,
      title_illustrations.sort_order,
      title_illustrations.storage_provider,
      user_title_illustrations.acquired_at,
      user_title_illustrations.first_viewed_at,
      user_title_illustrations.last_viewed_at,
      user_title_illustrations.display_count
    FROM title_illustrations
    INNER JOIN user_title_illustrations
      ON user_title_illustrations.illustration_id = title_illustrations.illustration_id
      AND user_title_illustrations.user_id = ?
      AND user_title_illustrations.first_viewed_at IS NOT NULL
    WHERE title_illustrations.is_active = 1
      AND title_illustrations.deleted_at IS NULL
    ORDER BY title_illustrations.sort_order ASC, title_illustrations.illustration_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readIllustrationCollection, "readIllustrationCollection");
function toTitleResponse2(row) {
  const owned = Boolean(row.acquired_at);
  return {
    id: row.title_id,
    name: owned ? row.title_name : "\u672A\u958B\u653E",
    rarity: toRarityStars(row.rarity),
    condition: owned ? row.unlock_condition_text : "\u672A\u6240\u6301",
    acquiredAt: owned ? formatAcquiredAt(row.acquired_at) : void 0,
    acquiredAtOrder: owned ? toEpochMillis(row.acquired_at) : void 0,
    comment: owned ? row.description : "\u672A\u6240\u6301",
    owned,
    sortOrder: row.sort_order
  };
}
__name(toTitleResponse2, "toTitleResponse");
function toIconResponse2(row) {
  const owned = Boolean(row.acquired_at);
  const imagePath = row.storage_provider === "r2" ? `/api/assets/icons/${encodeURIComponent(row.icon_id)}` : row.image_path;
  return {
    id: row.icon_id,
    name: owned ? row.icon_name : "\u672A\u958B\u653E",
    comment: owned ? row.description : "\u672A\u6240\u6301",
    imagePath,
    owned,
    sortOrder: row.sort_order
  };
}
__name(toIconResponse2, "toIconResponse");
function toIllustrationResponse(row) {
  const owned = Boolean(row.first_viewed_at);
  const src = row.storage_provider === "r2" ? `/api/assets/loading-illustrations/${encodeURIComponent(row.illustration_id)}` : row.image_path;
  return {
    id: row.illustration_id,
    name: owned ? row.illustration_name : "\u672A\u958B\u653E",
    src,
    comment: owned ? row.description : "\u672A\u6240\u6301",
    owned,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    displayCount: row.display_count ?? 0,
    sortOrder: row.sort_order
  };
}
__name(toIllustrationResponse, "toIllustrationResponse");
function createInitialTitleSeed(titleId, titleCode, titleName, description, sortOrder) {
  return {
    title_id: titleId,
    title_code: titleCode,
    title_name: titleName,
    description,
    unlock_condition_text: "\u521D\u671F\u304B\u3089\u6240\u6301",
    rarity: 1,
    condition_type: "initial_grant",
    condition_params_json: null,
    is_initial: 1,
    is_active: 1,
    sort_order: sortOrder
  };
}
__name(createInitialTitleSeed, "createInitialTitleSeed");
function createIconSeed(iconId, iconCode, name, sortOrder, imagePath) {
  return {
    icon_id: iconId,
    icon_code: iconCode,
    icon_name: name,
    description: `${name}\u306E\u30D7\u30EC\u30A4\u30E4\u30FC\u30A2\u30A4\u30B3\u30F3\u3067\u3059\u3002\u30B2\u30FC\u30E0\u5185\u3067\u9078\u629E\u3067\u304D\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002`,
    unlock_condition_text: "\u6700\u521D\u304B\u3089\u6240\u6301",
    image_path: imagePath,
    rarity: 1,
    condition_type: "initial_grant",
    condition_params_json: null,
    is_initial: 1,
    is_guest_available: 1,
    is_active: 1,
    sort_order: sortOrder
  };
}
__name(createIconSeed, "createIconSeed");
function toRarityStars(rarity) {
  const level = Math.min(5, Math.max(1, Math.round(Number(rarity) || 1)));
  return "\u2606".repeat(level);
}
__name(toRarityStars, "toRarityStars");
function toEpochMillis(value) {
  if (!value) return void 0;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? void 0 : time;
}
__name(toEpochMillis, "toEpochMillis");
function formatAcquiredAt(value) {
  if (!value) return void 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}\u5E74${month}\u6708${day}\u65E5\u306B\u53D6\u5F97`;
}
__name(formatAcquiredAt, "formatAcquiredAt");

// api/loading-illustration.ts
var FALLBACK_AUTH_LOADING_IMAGE = "/assets/loading-illustrations/01_load.png";
async function onRequestGet29({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  await ensureCollectionSeed(env, session.user_id);
  const illustration = await pickLoadingIllustration(env, session.user_id);
  if (!illustration) {
    return json({ ok: true, imagePath: FALLBACK_AUTH_LOADING_IMAGE });
  }
  await recordLoadingIllustrationView(env, session.user_id, illustration.illustration_id);
  return json({
    ok: true,
    illustrationId: illustration.illustration_id,
    imagePath: toLoadingIllustrationImagePath(illustration)
  });
}
__name(onRequestGet29, "onRequestGet");
function toLoadingIllustrationImagePath(illustration) {
  if (illustration.storage_provider === "r2") {
    return `/api/assets/loading-illustrations/${encodeURIComponent(illustration.illustration_id)}`;
  }
  return illustration.image_path;
}
__name(toLoadingIllustrationImagePath, "toLoadingIllustrationImagePath");
function onRequestPost25() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost25, "onRequestPost");
async function pickLoadingIllustration(env, userId) {
  const [illustrations, userTitles] = await Promise.all([
    readLoadingIllustrations(env, userId),
    readUserTitles2(env, userId)
  ]);
  const titleIds = new Set(userTitles.map((title) => title.title_id));
  const titleCodes = new Set(userTitles.map((title) => title.title_code));
  const candidates = illustrations.filter((illustration) => isLoadingIllustrationEligible(illustration, titleIds, titleCodes));
  if (candidates.length <= 0) return null;
  return pickByAppearanceSettings(candidates);
}
__name(pickLoadingIllustration, "pickLoadingIllustration");
async function readLoadingIllustrations(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      title_illustrations.illustration_id,
      title_illustrations.illustration_name,
      title_illustrations.image_path,
      title_illustrations.storage_provider,
      title_illustrations.required_title_id,
      title_illustrations.appearance_mode,
      title_illustrations.manual_unviewed_rate,
      title_illustrations.manual_viewed_rate,
      title_illustrations.condition_type,
      title_illustrations.condition_params_json,
      title_illustrations.is_rare,
      user_title_illustrations.first_viewed_at,
      user_title_illustrations.display_count
    FROM title_illustrations
    LEFT JOIN user_title_illustrations
      ON user_title_illustrations.illustration_id = title_illustrations.illustration_id
      AND user_title_illustrations.user_id = ?
    WHERE title_illustrations.is_active = 1
      AND title_illustrations.deleted_at IS NULL
    ORDER BY title_illustrations.sort_order ASC, title_illustrations.illustration_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readLoadingIllustrations, "readLoadingIllustrations");
async function readUserTitles2(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT titles.title_id, titles.title_code
    FROM user_titles
    INNER JOIN titles
      ON titles.title_id = user_titles.title_id
    WHERE user_titles.user_id = ?
      AND titles.is_active = 1
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readUserTitles2, "readUserTitles");
function isLoadingIllustrationEligible(illustration, titleIds, titleCodes) {
  if (Number(illustration.is_rare) === 1) return false;
  const requiredTitleId = illustration.required_title_id?.trim();
  if (requiredTitleId) return titleIds.has(requiredTitleId);
  if (illustration.condition_type === "initial_grant") return true;
  if (illustration.condition_type !== "title_owned") return false;
  const params = parseConditionParams(illustration.condition_params_json);
  if (!params) return false;
  const requiredTitleIds = normalizeStringValues(params.titleIds, params.titleId);
  const requiredTitleCodes = normalizeStringValues(params.titleCodes, params.titleCode);
  if (requiredTitleIds.length <= 0 && requiredTitleCodes.length <= 0) return false;
  return requiredTitleIds.some((titleId) => titleIds.has(titleId)) || requiredTitleCodes.some((titleCode) => titleCodes.has(titleCode));
}
__name(isLoadingIllustrationEligible, "isLoadingIllustrationEligible");
function parseConditionParams(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
__name(parseConditionParams, "parseConditionParams");
function normalizeStringValues(arrayValue, singleValue) {
  const values = [];
  if (Array.isArray(arrayValue)) {
    for (const value of arrayValue) {
      if (typeof value !== "string") continue;
      const normalized = value.trim();
      if (normalized) values.push(normalized);
    }
  }
  if (typeof singleValue === "string") {
    const normalized = singleValue.trim();
    if (normalized) values.push(normalized);
  }
  return values;
}
__name(normalizeStringValues, "normalizeStringValues");
function pickByAppearanceSettings(items) {
  const unviewed = items.filter((item) => !item.first_viewed_at);
  const viewed = items.filter((item) => Boolean(item.first_viewed_at));
  if (unviewed.length <= 0) return pickWithinViewState(viewed, "viewed");
  if (viewed.length <= 0) return pickWithinViewState(unviewed, "unviewed");
  const unviewedWeight = viewStateGroupWeight(unviewed, "unviewed");
  const viewedWeight = viewStateGroupWeight(viewed, "viewed");
  const totalWeight = unviewedWeight + viewedWeight;
  if (totalWeight <= 0) return null;
  const group = Math.random() * totalWeight < unviewedWeight ? unviewed : viewed;
  const state = group === unviewed ? "unviewed" : "viewed";
  return pickWithinViewState(group, state);
}
__name(pickByAppearanceSettings, "pickByAppearanceSettings");
function viewStateGroupWeight(items, state) {
  let total = 0;
  const autoItems = items.filter((item) => readAppearanceMode2(item) === "auto");
  if (autoItems.length > 0) total += state === "unviewed" ? 70 : 30;
  for (const item of items) {
    if (readAppearanceMode2(item) !== "manual") continue;
    total += manualRate(item, state);
  }
  return total;
}
__name(viewStateGroupWeight, "viewStateGroupWeight");
function pickWithinViewState(items, state) {
  const manualItems = items.filter((item) => readAppearanceMode2(item) === "manual").map((item) => ({ item, rate: manualRate(item, state) })).filter((entry) => entry.rate > 0);
  const autoItems = items.filter((item) => readAppearanceMode2(item) === "auto");
  const totalManualRate = manualItems.reduce((sum, entry) => sum + entry.rate, 0);
  if (totalManualRate <= 0) return pickRandomItem(autoItems);
  if (totalManualRate >= 100 || autoItems.length <= 0) {
    return pickWeightedManualItem(manualItems);
  }
  const threshold = Math.random() * 100;
  if (threshold < totalManualRate) {
    return pickWeightedManualItem(manualItems);
  }
  return pickRandomItem(autoItems);
}
__name(pickWithinViewState, "pickWithinViewState");
function pickRandomItem(items) {
  if (items.length <= 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}
__name(pickRandomItem, "pickRandomItem");
function pickWeightedManualItem(items) {
  const totalRate = items.reduce((sum, entry) => sum + entry.rate, 0);
  if (totalRate <= 0) return null;
  let threshold = Math.random() * totalRate;
  for (const entry of items) {
    threshold -= entry.rate;
    if (threshold <= 0) return entry.item;
  }
  return items[items.length - 1]?.item ?? null;
}
__name(pickWeightedManualItem, "pickWeightedManualItem");
function manualRate(item, state) {
  const rawRate = state === "unviewed" ? item.manual_unviewed_rate : item.manual_viewed_rate;
  const rate = Number(rawRate ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.min(rate, 100);
}
__name(manualRate, "manualRate");
function readAppearanceMode2(item) {
  return item.appearance_mode === "manual" ? "manual" : "auto";
}
__name(readAppearanceMode2, "readAppearanceMode");
async function recordLoadingIllustrationView(env, userId, illustrationId) {
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT INTO user_title_illustrations (
      user_id, illustration_id, acquired_at, first_viewed_at, last_viewed_at,
      display_count, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, illustration_id) DO UPDATE SET
      first_viewed_at = COALESCE(user_title_illustrations.first_viewed_at, excluded.first_viewed_at),
      last_viewed_at = excluded.last_viewed_at,
      display_count = user_title_illustrations.display_count + 1,
      updated_at = excluded.updated_at
    `
  ).bind(userId, illustrationId, now, now, now, now, now).run();
}
__name(recordLoadingIllustrationView, "recordLoadingIllustrationView");

// api/_condition-engine.ts
var CONDITION_TYPES = /* @__PURE__ */ new Set([
  "stat_count_at_least",
  "stat_value_at_least",
  "stat_value_at_most",
  "stat_flag_true",
  "stat_json_contains_all",
  "stat_json_contains_key",
  "match_achievement_key",
  "all_conditions",
  "any_condition"
]);
var CONDITION_SCOPES = /* @__PURE__ */ new Set(["solo", "multi", "total", "global", "match"]);
function evaluateCondition(condition, context) {
  const conditionType = normalizeConditionType(condition.condition_type ?? condition.conditionType);
  if (!conditionType) return false;
  const params = parseConditionParams2(condition.condition_params_json ?? condition.conditionParamsJson);
  if (!params) return false;
  switch (conditionType) {
    case "stat_count_at_least":
    case "stat_value_at_least":
      return evaluateStatValueAtLeast(params, context);
    case "stat_value_at_most":
      return evaluateStatValueAtMost(params, context);
    case "stat_flag_true":
      return evaluateStatFlagTrue(params, context);
    case "stat_json_contains_all":
      return evaluateStatJsonContainsAll(params, context);
    case "stat_json_contains_key":
      return evaluateStatJsonContainsKey(params, context);
    case "match_achievement_key":
      return evaluateMatchAchievementKey(params, context);
    case "all_conditions":
      return evaluateAllConditions(params, context);
    case "any_condition":
      return evaluateAnyCondition(params, context);
    default:
      return false;
  }
}
__name(evaluateCondition, "evaluateCondition");
function parseConditionParams2(value) {
  if (value == null) return {};
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeParamsObject(parsed);
    } catch {
      return null;
    }
  }
  return normalizeParamsObject(value);
}
__name(parseConditionParams2, "parseConditionParams");
function readStatValue(scope, statKey, context) {
  if (scope === "total") return readTotalStatValue(statKey, context);
  const row = getStatsRow(scope, context);
  if (!row || !hasOwn(row, statKey)) return void 0;
  return row[statKey];
}
__name(readStatValue, "readStatValue");
function evaluateStatValueAtLeast(params, context) {
  const statRequest = readStatRequest(params);
  const targetValue = readNumberParam(params, "value");
  if (!statRequest || targetValue == null) return false;
  const actualValue = readNumericStatValue(statRequest.scope, statRequest.statKey, context);
  return actualValue != null && actualValue >= targetValue;
}
__name(evaluateStatValueAtLeast, "evaluateStatValueAtLeast");
function evaluateStatValueAtMost(params, context) {
  const statRequest = readStatRequest(params);
  const targetValue = readNumberParam(params, "value");
  if (!statRequest || targetValue == null) return false;
  const actualValue = readNumericStatValue(statRequest.scope, statRequest.statKey, context);
  return actualValue != null && actualValue <= targetValue;
}
__name(evaluateStatValueAtMost, "evaluateStatValueAtMost");
function evaluateStatFlagTrue(params, context) {
  const statRequest = readStatRequest(params);
  if (!statRequest) return false;
  return isTruthyFlag(readStatValue(statRequest.scope, statRequest.statKey, context));
}
__name(evaluateStatFlagTrue, "evaluateStatFlagTrue");
function evaluateStatJsonContainsAll(params, context) {
  const statRequest = readStatRequest(params);
  const expectedValues = readStringArrayParam(params, "values");
  if (!statRequest || expectedValues.length === 0) return false;
  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const actualSet = readJsonStringSet(actualValue);
  if (!actualSet) return false;
  return expectedValues.every((value) => actualSet.has(value));
}
__name(evaluateStatJsonContainsAll, "evaluateStatJsonContainsAll");
function evaluateStatJsonContainsKey(params, context) {
  const statRequest = readStatRequest(params);
  const key = readStringParam(params, "key");
  if (!statRequest || !key) return false;
  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const parsed = parseJsonValue(actualValue);
  if (Array.isArray(parsed)) return readJsonStringSet(parsed)?.has(key) ?? false;
  if (parsed && typeof parsed === "object") return Object.prototype.hasOwnProperty.call(parsed, key);
  return false;
}
__name(evaluateStatJsonContainsKey, "evaluateStatJsonContainsKey");
function evaluateMatchAchievementKey(params, context) {
  const key = readStringParam(params, "key");
  if (!key) return false;
  return new Set(context.matchAchievementKeys ?? []).has(key);
}
__name(evaluateMatchAchievementKey, "evaluateMatchAchievementKey");
function evaluateAllConditions(params, context) {
  const conditions = readNestedConditions(params);
  if (conditions.length === 0) return false;
  return conditions.every((condition) => evaluateCondition(condition, context));
}
__name(evaluateAllConditions, "evaluateAllConditions");
function evaluateAnyCondition(params, context) {
  const conditions = readNestedConditions(params);
  if (conditions.length === 0) return false;
  return conditions.some((condition) => evaluateCondition(condition, context));
}
__name(evaluateAnyCondition, "evaluateAnyCondition");
function readNumericStatValue(scope, statKey, context) {
  const value = readStatValue(scope, statKey, context);
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
__name(readNumericStatValue, "readNumericStatValue");
function readTotalStatValue(statKey, context) {
  const soloHasValue = Boolean(context.soloStats && hasOwn(context.soloStats, statKey));
  const multiHasValue = Boolean(context.multiStats && hasOwn(context.multiStats, statKey));
  if (!soloHasValue && !multiHasValue) return void 0;
  const soloValue = soloHasValue ? readNumericValue(context.soloStats?.[statKey]) : 0;
  const multiValue = multiHasValue ? readNumericValue(context.multiStats?.[statKey]) : 0;
  if (soloValue == null || multiValue == null) return void 0;
  return soloValue + multiValue;
}
__name(readTotalStatValue, "readTotalStatValue");
function getStatsRow(scope, context) {
  if (scope === "solo") return context.soloStats;
  if (scope === "multi") return context.multiStats;
  if (scope === "global") return context.globalStats;
  return context.matchStats;
}
__name(getStatsRow, "getStatsRow");
function readStatRequest(params) {
  const scope = normalizeScope(params.scope);
  const statKey = readStringParam(params, "statKey");
  if (!scope || !statKey) return null;
  return { scope, statKey };
}
__name(readStatRequest, "readStatRequest");
function readNestedConditions(params) {
  if (!Array.isArray(params.conditions)) return [];
  return params.conditions.filter((condition) => {
    return Boolean(condition && typeof condition === "object");
  });
}
__name(readNestedConditions, "readNestedConditions");
function normalizeConditionType(value) {
  if (typeof value !== "string") return null;
  return CONDITION_TYPES.has(value) ? value : null;
}
__name(normalizeConditionType, "normalizeConditionType");
function normalizeScope(value) {
  if (typeof value !== "string") return null;
  return CONDITION_SCOPES.has(value) ? value : null;
}
__name(normalizeScope, "normalizeScope");
function normalizeParamsObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
__name(normalizeParamsObject, "normalizeParamsObject");
function readStringParam(params, key) {
  const value = params[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}
__name(readStringParam, "readStringParam");
function readNumberParam(params, key) {
  const value = params[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
__name(readNumberParam, "readNumberParam");
function readStringArrayParam(params, key) {
  if (!Array.isArray(params[key])) return [];
  const values = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of params[key]) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    values.push(normalized);
  }
  return values;
}
__name(readStringArrayParam, "readStringArrayParam");
function readJsonStringSet(value) {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return null;
  const result = /* @__PURE__ */ new Set();
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (normalized) result.add(normalized);
  }
  return result;
}
__name(readJsonStringSet, "readJsonStringSet");
function parseJsonValue(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  return null;
}
__name(parseJsonValue, "parseJsonValue");
function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}
__name(isTruthyFlag, "isTruthyFlag");
function readNumericValue(value) {
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
__name(readNumericValue, "readNumericValue");
function hasOwn(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}
__name(hasOwn, "hasOwn");

// api/user-notifications.ts
var NOTIFICATION_LIMIT = 20;
var NOTIFICATION_PRIORITIES = {
  title_acquired: 10,
  icon_acquired: 20,
  title_illustration_acquired: 30
};
var NOTIFICATION_TARGET_TYPES = {
  title_acquired: "title",
  icon_acquired: "icon",
  title_illustration_acquired: "title_illustration"
};
async function onRequestGet30({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  const rows = await readUnreadNotifications(env, session.user_id);
  return json({
    ok: true,
    notifications: rows.map(toNotificationResponse),
    titleAwardNotification: toTitleAwardNotification(rows),
    iconAwardNotification: toIconAwardNotification(rows),
    titleIllustrationAwardNotification: toTitleIllustrationAwardNotification(rows)
  });
}
__name(onRequestGet30, "onRequestGet");
async function onRequestPost26({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  const payload = await readJsonRecord(request);
  const notificationIds = normalizeNotificationIds(payload?.notificationIds);
  if (notificationIds.length === 0) {
    return json({ ok: false, message: "\u65E2\u8AAD\u5316\u3059\u308B\u901A\u77E5\u304C\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  }
  await markNotificationsRead(env, session.user_id, notificationIds);
  return json({ ok: true });
}
__name(onRequestPost26, "onRequestPost");
async function createAcquiredNotification(env, userId, notificationType, targetId) {
  const targetType = NOTIFICATION_TARGET_TYPES[notificationType];
  const priority = NOTIFICATION_PRIORITIES[notificationType];
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_notifications (
      notification_id, user_id, notification_type, target_type, target_id,
      priority, is_read, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `
  ).bind(createId("ntf"), userId, notificationType, targetType, targetId, priority, now).run();
}
__name(createAcquiredNotification, "createAcquiredNotification");
async function readUnreadNotifications(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      user_notifications.notification_id,
      user_notifications.notification_type,
      user_notifications.target_type,
      user_notifications.target_id,
      user_notifications.priority,
      user_notifications.created_at,
      titles.title_name,
      titles.rarity AS title_rarity,
      icons.icon_name,
      icons.image_path AS icon_image_path,
      icons.storage_provider AS icon_storage_provider,
      title_illustrations.illustration_name,
      title_illustrations.image_path AS illustration_image_path
    FROM user_notifications
    LEFT JOIN titles
      ON user_notifications.target_type = 'title'
      AND titles.title_id = user_notifications.target_id
    LEFT JOIN icons
      ON user_notifications.target_type = 'icon'
      AND icons.icon_id = user_notifications.target_id
    LEFT JOIN title_illustrations
      ON user_notifications.target_type = 'title_illustration'
      AND title_illustrations.illustration_id = user_notifications.target_id
    WHERE user_notifications.user_id = ?
      AND user_notifications.is_read = 0
    ORDER BY user_notifications.priority ASC, user_notifications.created_at ASC, user_notifications.notification_id ASC
    LIMIT ?
    `
  ).bind(userId, NOTIFICATION_LIMIT).all();
  return result.results ?? [];
}
__name(readUnreadNotifications, "readUnreadNotifications");
async function markNotificationsRead(env, userId, notificationIds) {
  const now = nowIso();
  for (const notificationId of notificationIds) {
    await env.DB.prepare(
      `
      UPDATE user_notifications
      SET is_read = 1,
          read_at = ?
      WHERE user_id = ?
        AND notification_id = ?
        AND is_read = 0
      `
    ).bind(now, userId, notificationId).run();
  }
}
__name(markNotificationsRead, "markNotificationsRead");
function toNotificationResponse(row) {
  return {
    notificationId: row.notification_id,
    notificationType: row.notification_type,
    targetType: row.target_type,
    targetId: row.target_id,
    priority: Number(row.priority),
    createdAt: row.created_at
  };
}
__name(toNotificationResponse, "toNotificationResponse");
function toTitleAwardNotification(rows) {
  const items = rows.filter((row) => row.notification_type === "title_acquired" && row.target_type === "title").map((row) => ({
    notificationId: row.notification_id,
    id: row.target_id,
    name: row.title_name ?? row.target_id,
    rarity: toRarityStars2(row.title_rarity ?? 1)
  }));
  return items.length > 0 ? { items } : null;
}
__name(toTitleAwardNotification, "toTitleAwardNotification");
function toIconAwardNotification(rows) {
  const items = rows.filter((row) => row.notification_type === "icon_acquired" && row.target_type === "icon").map((row) => ({
    notificationId: row.notification_id,
    id: row.target_id,
    name: row.icon_name ?? row.target_id,
    imagePath: toIconNotificationImagePath(row)
  }));
  return items.length > 0 ? { items } : null;
}
__name(toIconAwardNotification, "toIconAwardNotification");
function toIconNotificationImagePath(row) {
  if (row.icon_storage_provider === "r2") {
    const notificationId = encodeURIComponent(row.notification_id);
    return `/api/assets/icons/${encodeURIComponent(row.target_id)}?notificationId=${notificationId}`;
  }
  return row.icon_image_path ?? void 0;
}
__name(toIconNotificationImagePath, "toIconNotificationImagePath");
function toTitleIllustrationAwardNotification(rows) {
  const items = rows.filter((row) => row.notification_type === "title_illustration_acquired" && row.target_type === "title_illustration").map((row) => ({
    notificationId: row.notification_id,
    id: row.target_id,
    name: row.illustration_name ?? row.target_id,
    imagePath: row.illustration_image_path ?? void 0
  }));
  return items.length > 0 ? { items } : null;
}
__name(toTitleIllustrationAwardNotification, "toTitleIllustrationAwardNotification");
function normalizeNotificationIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = /* @__PURE__ */ new Set();
  for (const item of value) {
    const id = getString(item).trim();
    if (id) ids.add(id);
  }
  return Array.from(ids);
}
__name(normalizeNotificationIds, "normalizeNotificationIds");
function toRarityStars2(rarity) {
  const level = Math.min(5, Math.max(1, Math.round(Number(rarity) || 1)));
  return "\u2606".repeat(level);
}
__name(toRarityStars2, "toRarityStars");

// api/_auto-acquisition.ts
async function grantAutomaticAcquisitions(env, userId, options) {
  const context = await buildConditionContext(env, userId, options);
  if (!context) {
    return { grantedTitleIds: [], grantedIconIds: [] };
  }
  const grantedTitleIds = await grantAutomaticTitles(env, userId, context, options.acquiredAt);
  const titleRewardIconIds = await grantTitleRewardIcons(env, userId, grantedTitleIds, options.acquiredAt);
  const automaticIconIds = await grantAutomaticIcons(env, userId, context, options.acquiredAt);
  return {
    grantedTitleIds,
    grantedIconIds: uniqueIds([...titleRewardIconIds, ...automaticIconIds])
  };
}
__name(grantAutomaticAcquisitions, "grantAutomaticAcquisitions");
async function buildConditionContext(env, userId, options) {
  const [soloStats, multiStats, globalStats] = await Promise.all([
    readStatsRow(env, "user_stats_solo", userId),
    readStatsRow(env, "user_stats_multi", userId),
    readStatsRow(env, "user_stats_global", userId)
  ]);
  if (!soloStats || !multiStats || !globalStats) return null;
  return {
    soloStats,
    multiStats,
    globalStats,
    matchStats: options.matchStats ?? null,
    matchAchievementKeys: options.matchAchievementKeys ?? []
  };
}
__name(buildConditionContext, "buildConditionContext");
async function readStatsRow(env, tableName, userId) {
  return await env.DB.prepare(`SELECT * FROM ${tableName} WHERE user_id = ? LIMIT 1`).bind(userId).first();
}
__name(readStatsRow, "readStatsRow");
async function grantAutomaticTitles(env, userId, context, acquiredAt) {
  const candidates = await readTitleCandidates(env, userId);
  const grantedTitleIds = [];
  for (const candidate of candidates) {
    if (!evaluateCondition(candidate, context)) continue;
    await env.DB.prepare(
      `
      INSERT OR IGNORE INTO user_titles (user_id, title_id, acquired_at, created_at)
      VALUES (?, ?, ?, ?)
      `
    ).bind(userId, candidate.target_id, acquiredAt, acquiredAt).run();
    await createAcquiredNotification(env, userId, "title_acquired", candidate.target_id);
    grantedTitleIds.push(candidate.target_id);
  }
  return grantedTitleIds;
}
__name(grantAutomaticTitles, "grantAutomaticTitles");
async function grantAutomaticIcons(env, userId, context, acquiredAt) {
  const candidates = await readIconCandidates(env, userId);
  const grantedIconIds = [];
  for (const candidate of candidates) {
    if (!evaluateCondition(candidate, context)) continue;
    const granted = await grantIconIfMissing(env, userId, candidate.target_id, acquiredAt);
    if (granted) grantedIconIds.push(candidate.target_id);
  }
  return grantedIconIds;
}
__name(grantAutomaticIcons, "grantAutomaticIcons");
async function grantTitleRewardIcons(env, userId, titleIds, acquiredAt) {
  if (titleIds.length === 0) return [];
  const grantedIconIds = [];
  const checkedIconIds = /* @__PURE__ */ new Set();
  for (const titleId of titleIds) {
    const rewardIconIds = await readTitleRewardIconIds(env, titleId);
    for (const iconId of rewardIconIds) {
      if (checkedIconIds.has(iconId)) continue;
      checkedIconIds.add(iconId);
      const granted = await grantIconIfMissing(env, userId, iconId, acquiredAt);
      if (granted) grantedIconIds.push(iconId);
    }
  }
  return grantedIconIds;
}
__name(grantTitleRewardIcons, "grantTitleRewardIcons");
async function grantIconIfMissing(env, userId, iconId, acquiredAt) {
  const owned = await env.DB.prepare(
    `
    SELECT 1 AS owned
    FROM user_icons
    WHERE user_id = ?
      AND icon_id = ?
    LIMIT 1
    `
  ).bind(userId, iconId).first();
  if (owned?.owned) return false;
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at)
    VALUES (?, ?, ?, ?)
    `
  ).bind(userId, iconId, acquiredAt, acquiredAt).run();
  await createAcquiredNotification(env, userId, "icon_acquired", iconId);
  return true;
}
__name(grantIconIfMissing, "grantIconIfMissing");
async function readTitleRewardIconIds(env, titleId) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    WHERE title_icon_rewards.title_id = ?
    ORDER BY title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `
  ).bind(titleId).all();
  return (result.results ?? []).map((row) => row.icon_id);
}
__name(readTitleRewardIconIds, "readTitleRewardIconIds");
function uniqueIds(ids) {
  return Array.from(new Set(ids));
}
__name(uniqueIds, "uniqueIds");
async function readTitleCandidates(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      titles.title_id AS target_id,
      titles.condition_type,
      titles.condition_params_json
    FROM titles
    LEFT JOIN user_titles
      ON user_titles.title_id = titles.title_id
      AND user_titles.user_id = ?
    WHERE titles.is_active = 1
      AND titles.is_initial = 0
      AND titles.condition_type <> 'initial_grant'
      AND user_titles.title_id IS NULL
    ORDER BY titles.sort_order ASC, titles.title_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readTitleCandidates, "readTitleCandidates");
async function readIconCandidates(env, userId) {
  const result = await env.DB.prepare(
    `
    SELECT
      icons.icon_id AS target_id,
      icons.condition_type,
      icons.condition_params_json
    FROM icons
    LEFT JOIN user_icons
      ON user_icons.icon_id = icons.icon_id
      AND user_icons.user_id = ?
    WHERE icons.is_active = 1
      AND icons.is_initial = 0
      AND icons.condition_type <> 'initial_grant'
      AND user_icons.icon_id IS NULL
    ORDER BY icons.sort_order ASC, icons.icon_id ASC
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readIconCandidates, "readIconCandidates");

// api/matches.ts
var ALLOWED_RESULT_REASONS = /* @__PURE__ */ new Set(["bust", "deck_end", "host_disband", "player_left"]);
var ALLOWED_MODES = /* @__PURE__ */ new Set(["solo", "multi"]);
var ALLOWED_DIRECTIONS = /* @__PURE__ */ new Set(["UP", "DOWN"]);
var ALLOWED_DIFFICULTIES = /* @__PURE__ */ new Set(["CASUAL", "SMART"]);
var MAX_JSON_SET_SIZE = 500;
async function onRequestPost27({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  const body = await readJsonRecord(request);
  const match2 = normalizeMatchPayload(body);
  if (!match2) {
    return json({ ok: false, message: "\u8A66\u5408\u5C65\u6B74\u306E\u4FDD\u5B58\u5185\u5BB9\u304C\u4E0D\u6B63\u3067\u3059\u3002" }, { status: 400 });
  }
  const humanParticipant = match2.participants.find((participant) => participant.participantNo === match2.clientParticipantNo);
  if (!humanParticipant || humanParticipant.participantType !== "user") {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u30E6\u30FC\u30B6\u30FC\u306E\u53C2\u52A0\u8005\u60C5\u5831\u304C\u3042\u308A\u307E\u305B\u3093\u3002" }, { status: 400 });
  }
  const alreadySaved = await env.DB.prepare("SELECT match_id FROM match_results WHERE match_id = ? LIMIT 1").bind(match2.matchId).first();
  if (alreadySaved && match2.mode === "solo") {
    return json({ ok: true, duplicate: true, matchId: match2.matchId });
  }
  if (match2.mode === "multi") {
    const alreadySavedParticipant = await env.DB.prepare(
      "SELECT user_id FROM match_participants WHERE match_id = ? AND participant_no = ? AND user_id = ? LIMIT 1"
    ).bind(match2.matchId, match2.clientParticipantNo, session.user_id).first();
    if (alreadySavedParticipant) {
      return json({ ok: true, duplicate: true, matchId: match2.matchId });
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
    `
    ).bind(
      match2.matchId,
      match2.mode,
      match2.roomId,
      match2.difficulty,
      match2.gameType,
      match2.targetValue,
      match2.directionStart,
      match2.finalDirection,
      match2.finalTotal,
      match2.resultReason,
      match2.winnerParticipantNo,
      match2.loserParticipantNo,
      match2.turnCount,
      match2.startedAt,
      match2.endedAt,
      createdAt
    ).run();
  }
  for (const participant of match2.participants) {
    const participantUserId = participant.participantNo === match2.clientParticipantNo && participant.participantType === "user" ? session.user_id : null;
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
      `
    ).bind(
      match2.matchId,
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
      createdAt
    ).run();
  }
  await ensureUserStats(env, session.user_id, createdAt);
  await updateUserStats(env, session.user_id, match2, humanParticipant, createdAt);
  await grantAutomaticAcquisitions(env, session.user_id, {
    acquiredAt: createdAt,
    matchStats: createMatchStats(match2, humanParticipant),
    matchAchievementKeys: []
  });
  return json({ ok: true, matchId: match2.matchId });
}
__name(onRequestPost27, "onRequestPost");
function onRequestGet31() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FPOST\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestGet31, "onRequestGet");
function normalizeMatchPayload(body) {
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
  const targetValue = normalizeInteger(body.targetValue, 0, 1e6);
  const finalTotal = normalizeInteger(body.finalTotal, -1e6, 1e6);
  const turnCount = normalizeInteger(body.turnCount, 0, 1e6);
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
    clientParticipantNo: normalizeInteger(body.clientParticipantNo, 1, 4) ?? 1
  };
}
__name(normalizeMatchPayload, "normalizeMatchPayload");
function normalizeParticipants(value) {
  if (!Array.isArray(value)) return [];
  const participants = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const source = item;
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
      finalHandCount: normalizeInteger(source.finalHandCount, 0, 1e3) ?? 0,
      playedCardCount: normalizeInteger(source.playedCardCount, 0, 1e6) ?? 0,
      jokerPlayCount: normalizeInteger(source.jokerPlayCount, 0, 1e6) ?? 0,
      spade3CounterCount: normalizeInteger(source.spade3CounterCount, 0, 1e6) ?? 0,
      timeoutDeckPlayCount: normalizeInteger(source.timeoutDeckPlayCount, 0, 1e6) ?? 0
    });
  }
  return participants.sort((a, b) => a.participantNo - b.participantNo);
}
__name(normalizeParticipants, "normalizeParticipants");
function normalizeHumanStats(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    initialHandAllRed: Boolean(source.initialHandAllRed),
    initialHandAllBlack: Boolean(source.initialHandAllBlack),
    initialHandSameSuit: Boolean(source.initialHandSameSuit),
    everHandAllRed: Boolean(source.everHandAllRed),
    everHandAllBlack: Boolean(source.everHandAllBlack),
    everHandSameSuit: Boolean(source.everHandSameSuit),
    maxTotalReached: normalizeInteger(source.maxTotalReached, -1e6, 1e6),
    minTotalReached: normalizeInteger(source.minTotalReached, -1e6, 1e6),
    playedCardRankSet: normalizeStringArray(source.playedCardRankSet),
    playedSuitSet: normalizeStringArray(source.playedSuitSet),
    playedRankCounts: normalizeRankCounts(source.playedRankCounts),
    selfPlaySequenceSignatures: normalizeStringArray(source.selfPlaySequenceSignatures),
    handSequenceSignatures: normalizeStringArray(source.handSequenceSignatures)
  };
}
__name(normalizeHumanStats, "normalizeHumanStats");
function createMatchStats(match2, human) {
  const humanLost = human.isLoser === 1;
  const humanWon = match2.resultReason === "bust" && !humanLost;
  return {
    mode: match2.mode,
    difficulty: match2.difficulty,
    game_type: match2.gameType,
    target_value: match2.targetValue,
    direction_start: match2.directionStart,
    final_direction: match2.finalDirection,
    final_total: match2.finalTotal,
    result_reason: match2.resultReason,
    turn_count: match2.turnCount,
    is_winner: human.isWinner,
    is_loser: human.isLoser,
    human_won: humanWon ? 1 : 0,
    human_lost: humanLost ? 1 : 0,
    final_hand_count: human.finalHandCount,
    played_card_count: human.playedCardCount,
    joker_play_count: human.jokerPlayCount,
    spade3_counter_count: human.spade3CounterCount,
    timeout_deck_play_count: human.timeoutDeckPlayCount
  };
}
__name(createMatchStats, "createMatchStats");
async function ensureUserStats(env, userId, now) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_solo (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `
  ).bind(userId, now, now).run();
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_multi (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `
  ).bind(userId, now, now).run();
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_stats_global (user_id, created_at, updated_at)
    VALUES (?, ?, ?)
    `
  ).bind(userId, now, now).run();
}
__name(ensureUserStats, "ensureUserStats");
async function updateUserStats(env, userId, match2, human, now) {
  const modeTable = getStatsModeTable(match2.mode);
  const currentMode = await env.DB.prepare(`SELECT * FROM ${modeTable} WHERE user_id = ? LIMIT 1`).bind(userId).first();
  const currentGlobal = await env.DB.prepare("SELECT * FROM user_stats_global WHERE user_id = ? LIMIT 1").bind(userId).first();
  if (!currentMode || !currentGlobal) return;
  const humanLost = human.isLoser === 1;
  const humanWon = match2.resultReason === "bust" && !humanLost;
  await updateModeStats(env, modeTable, userId, currentMode, match2, human, humanWon, humanLost, now);
  await updateGlobalStats(env, userId, currentGlobal, match2, human, humanWon, humanLost, now);
}
__name(updateUserStats, "updateUserStats");
async function updateModeStats(env, modeTable, userId, current, match2, human, humanWon, humanLost, now) {
  const updates = {};
  increment(updates, current, "match_count", 1);
  if (humanWon) increment(updates, current, "win_count", 1);
  if (humanLost) increment(updates, current, "lose_count", 1);
  if (match2.difficulty === "CASUAL") {
    increment(updates, current, "casual_match_count", 1);
  } else if (match2.difficulty === "SMART") {
    increment(updates, current, "smart_match_count", 1);
  }
  const typeKey = normalizeStatsGameTypeKey(match2.gameType);
  if (typeKey) {
    increment(updates, current, `type_${typeKey}_match_count`, 1);
  }
  increment(updates, current, "played_card_count", human.playedCardCount);
  increment(updates, current, "joker_play_count", human.jokerPlayCount);
  increment(updates, current, "spade3_counter_count", human.spade3CounterCount);
  increment(updates, current, "timeout_deck_play_count", human.timeoutDeckPlayCount);
  const rankCounts = match2.humanStats.playedRankCounts;
  increment(updates, current, "ace_play_count", rankCounts.ace);
  increment(updates, current, "jack_play_count", rankCounts.jack);
  increment(updates, current, "queen_play_count", rankCounts.queen);
  increment(updates, current, "king_play_count", rankCounts.king);
  increment(updates, current, "number_card_play_count", rankCounts.number);
  if (humanLost && match2.resultReason === "bust") {
    increment(updates, current, "bust_lose_count", 1);
  }
  if (match2.resultReason === "deck_end") {
    increment(updates, current, "deck_end_match_count", 1);
  }
  if (match2.humanStats.initialHandAllRed) {
    increment(updates, current, "initial_hand_all_red_count", 1);
  }
  if (match2.humanStats.initialHandAllBlack) {
    increment(updates, current, "initial_hand_all_black_count", 1);
  }
  if (match2.humanStats.initialHandSameSuit) {
    increment(updates, current, "initial_hand_same_suit_count", 1);
  }
  updates.updated_at = now;
  await updateStatsRow(env, modeTable, userId, updates);
}
__name(updateModeStats, "updateModeStats");
async function updateGlobalStats(env, userId, current, match2, human, humanWon, humanLost, now) {
  const updates = {};
  if (humanWon) {
    const currentWinStreak = readNumber3(current.current_win_streak) + 1;
    updates.current_win_streak = currentWinStreak;
    updates.max_win_streak = Math.max(readNumber3(current.max_win_streak), currentWinStreak);
    updates.current_lose_streak = 0;
  } else if (humanLost) {
    const currentLoseStreak = readNumber3(current.current_lose_streak) + 1;
    updates.current_lose_streak = currentLoseStreak;
    updates.max_lose_streak = Math.max(readNumber3(current.max_lose_streak), currentLoseStreak);
    updates.current_win_streak = 0;
  }
  if (match2.humanStats.everHandAllRed) updates.ever_hand_all_red = 1;
  if (match2.humanStats.everHandAllBlack) updates.ever_hand_all_black = 1;
  if (match2.humanStats.everHandSameSuit) updates.ever_hand_same_suit = 1;
  updates.max_total_reached = mergeMax(current.max_total_reached, match2.humanStats.maxTotalReached);
  updates.min_total_reached = mergeMin(current.min_total_reached, match2.humanStats.minTotalReached);
  updates.max_turn_count_in_match = Math.max(readNumber3(current.max_turn_count_in_match), match2.turnCount);
  updates.max_played_cards_in_match = Math.max(readNumber3(current.max_played_cards_in_match), human.playedCardCount);
  updates.max_joker_play_in_match = Math.max(readNumber3(current.max_joker_play_in_match), human.jokerPlayCount);
  updates.max_spade3_counter_in_match = Math.max(readNumber3(current.max_spade3_counter_in_match), human.spade3CounterCount);
  updates.played_card_rank_set_json = mergeJsonStringSet(current.played_card_rank_set_json, match2.humanStats.playedCardRankSet);
  updates.played_suit_set_json = mergeJsonStringSet(current.played_suit_set_json, match2.humanStats.playedSuitSet);
  updates.self_play_sequence_signatures_json = mergeJsonStringSet(current.self_play_sequence_signatures_json, match2.humanStats.selfPlaySequenceSignatures);
  updates.hand_sequence_signatures_json = mergeJsonStringSet(current.hand_sequence_signatures_json, match2.humanStats.handSequenceSignatures);
  updates.updated_at = now;
  await updateStatsRow(env, "user_stats_global", userId, updates);
}
__name(updateGlobalStats, "updateGlobalStats");
async function updateStatsRow(env, tableName, userId, updates) {
  const assignments = Object.keys(updates);
  if (assignments.length === 0) return;
  await env.DB.prepare(
    `
    UPDATE ${tableName}
    SET ${assignments.map((key) => `${key} = ?`).join(", ")}
    WHERE user_id = ?
    `
  ).bind(...assignments.map((key) => updates[key]), userId).run();
}
__name(updateStatsRow, "updateStatsRow");
function getStatsModeTable(mode) {
  return mode === "multi" ? "user_stats_multi" : "user_stats_solo";
}
__name(getStatsModeTable, "getStatsModeTable");
function increment(updates, current, key, value) {
  if (!value) return;
  updates[key] = readNumber3(updates[key] ?? current[key]) + value;
}
__name(increment, "increment");
function normalizeRankCounts(value) {
  if (!value || typeof value !== "object") {
    return { ace: 0, jack: 0, queen: 0, king: 0, number: 0 };
  }
  const source = value;
  return {
    ace: Math.max(0, normalizeInteger(source.A, 0, 1e6) ?? normalizeInteger(source.ace, 0, 1e6) ?? 0),
    jack: Math.max(0, normalizeInteger(source.J, 0, 1e6) ?? normalizeInteger(source.jack, 0, 1e6) ?? 0),
    queen: Math.max(0, normalizeInteger(source.Q, 0, 1e6) ?? normalizeInteger(source.queen, 0, 1e6) ?? 0),
    king: Math.max(0, normalizeInteger(source.K, 0, 1e6) ?? normalizeInteger(source.king, 0, 1e6) ?? 0),
    number: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "number"].reduce((sum, key) => {
      return sum + (normalizeInteger(source[key], 0, 1e6) ?? 0);
    }, 0)
  };
}
__name(normalizeRankCounts, "normalizeRankCounts");
function normalizeStatsGameTypeKey(gameType) {
  const key = gameType.toLowerCase();
  if (["100", "200", "300", "400", "500", "extra"].includes(key)) return key;
  return null;
}
__name(normalizeStatsGameTypeKey, "normalizeStatsGameTypeKey");
function mergeMax(current, next) {
  const currentNumber = normalizeExistingNullableNumber(current);
  if (next == null) return currentNumber;
  if (currentNumber == null) return next;
  return Math.max(currentNumber, next);
}
__name(mergeMax, "mergeMax");
function mergeMin(current, next) {
  const currentNumber = normalizeExistingNullableNumber(current);
  if (next == null) return currentNumber;
  if (currentNumber == null) return next;
  return Math.min(currentNumber, next);
}
__name(mergeMin, "mergeMin");
function mergeJsonStringSet(currentJson, values) {
  const merged = new Set(readJsonStringArray(currentJson));
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) merged.add(normalized);
    if (merged.size >= MAX_JSON_SET_SIZE) break;
  }
  return JSON.stringify(Array.from(merged));
}
__name(mergeJsonStringSet, "mergeJsonStringSet");
function readJsonStringArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return normalizeStringArray(parsed);
  } catch {
    return [];
  }
}
__name(readJsonStringArray, "readJsonStringArray");
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    const normalized = normalizeText(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= MAX_JSON_SET_SIZE) break;
  }
  return result;
}
__name(normalizeStringArray, "normalizeStringArray");
function normalizeParticipantType(value) {
  if (value === "user" || value === "guest" || value === "npc") return value;
  return null;
}
__name(normalizeParticipantType, "normalizeParticipantType");
function normalizeEnum(value, allowed) {
  if (typeof value !== "string") return null;
  return allowed.has(value) ? value : null;
}
__name(normalizeEnum, "normalizeEnum");
function normalizeText(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}
__name(normalizeText, "normalizeText");
function normalizeNullableText(value) {
  if (value == null) return null;
  return normalizeText(value);
}
__name(normalizeNullableText, "normalizeNullableText");
function normalizeIso(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const time = Date.parse(text);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}
__name(normalizeIso, "normalizeIso");
function normalizeInteger(value, min, max) {
  const numberValue = Math.trunc(Number(value));
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < min || numberValue > max) return null;
  return numberValue;
}
__name(normalizeInteger, "normalizeInteger");
function normalizeParticipantNoOrNull(value) {
  if (value == null) return null;
  return normalizeInteger(value, 1, 4);
}
__name(normalizeParticipantNoOrNull, "normalizeParticipantNoOrNull");
function normalizeFlag(value) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}
__name(normalizeFlag, "normalizeFlag");
function normalizeExistingNullableNumber(value) {
  if (value == null) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
__name(normalizeExistingNullableNumber, "normalizeExistingNullableNumber");
function readNumber3(value) {
  const normalized = normalizeExistingNullableNumber(value);
  return normalized ?? 0;
}
__name(readNumber3, "readNumber");

// api/user-records.ts
async function onRequestGet32(context) {
  const session = await findActiveSession(context.env, context.request);
  if (!session) return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  const [solo, multi, global, matches, soloWinStreaks, multiWinStreaks] = await Promise.all([
    readModeStats(context.env, "user_stats_solo", session.user_id),
    readModeStats(context.env, "user_stats_multi", session.user_id),
    readGlobalStats(context.env, session.user_id),
    readRecentMatches(context.env, session.user_id),
    readWinStreaks(context.env, session.user_id, "solo"),
    readWinStreaks(context.env, session.user_id, "multi")
  ]);
  const participants = await readParticipants(context.env, matches.map((match2) => match2.match_id));
  return json({
    ok: true,
    records: {
      stats: {
        solo: withWinStreaks(normalizeModeStats(solo), soloWinStreaks),
        multi: withWinStreaks(normalizeModeStats(multi), multiWinStreaks),
        total: withWinStreaks(sumModeStats(solo, multi), {
          currentWinStreak: readNumber4(global?.current_win_streak),
          maxWinStreak: readNumber4(global?.max_win_streak)
        }),
        global: normalizeGlobalStats(global)
      },
      recentMatches: matches.map((match2) => ({
        matchId: match2.match_id,
        mode: match2.mode,
        roomId: match2.room_id,
        difficulty: match2.difficulty,
        gameType: match2.game_type,
        targetValue: readNumber4(match2.target_value),
        directionStart: match2.direction_start,
        finalDirection: match2.final_direction,
        finalTotal: readNumber4(match2.final_total),
        resultReason: match2.result_reason,
        winnerParticipantNo: readNullableNumber(match2.winner_participant_no),
        loserParticipantNo: readNullableNumber(match2.loser_participant_no),
        turnCount: readNumber4(match2.turn_count),
        startedAt: match2.started_at,
        endedAt: match2.ended_at,
        self: {
          participantNo: readNumber4(match2.participant_no),
          participantType: match2.participant_type,
          displayNameSnapshot: match2.display_name_snapshot,
          iconIdSnapshot: match2.icon_id_snapshot,
          titleIdSnapshot: match2.title_id_snapshot,
          isHost: readFlag3(match2.is_host),
          isWinner: readFlag3(match2.is_winner),
          isLoser: readFlag3(match2.is_loser),
          finalHandCount: readNumber4(match2.final_hand_count),
          playedCardCount: readNumber4(match2.played_card_count),
          jokerPlayCount: readNumber4(match2.joker_play_count),
          spade3CounterCount: readNumber4(match2.spade3_counter_count),
          timeoutDeckPlayCount: readNumber4(match2.timeout_deck_play_count)
        },
        participants: (participants.get(match2.match_id) ?? []).map((participant) => ({
          participantNo: readNumber4(participant.participant_no),
          participantType: participant.participant_type,
          displayNameSnapshot: participant.display_name_snapshot,
          iconIdSnapshot: participant.icon_id_snapshot,
          titleIdSnapshot: participant.title_id_snapshot,
          isHost: readFlag3(participant.is_host),
          isWinner: readFlag3(participant.is_winner),
          isLoser: readFlag3(participant.is_loser)
        }))
      }))
    }
  });
}
__name(onRequestGet32, "onRequestGet");
function onRequestPost28() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost28, "onRequestPost");
async function readModeStats(env, tableName, userId) {
  return await env.DB.prepare(`SELECT * FROM ${tableName} WHERE user_id = ? LIMIT 1`).bind(userId).first();
}
__name(readModeStats, "readModeStats");
async function readGlobalStats(env, userId) {
  return await env.DB.prepare("SELECT * FROM user_stats_global WHERE user_id = ? LIMIT 1").bind(userId).first();
}
__name(readGlobalStats, "readGlobalStats");
async function readWinStreaks(env, userId, mode) {
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
    `
  ).bind(userId, mode).all();
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  for (const match2 of result.results ?? []) {
    if (readFlag3(match2.is_winner)) {
      currentWinStreak += 1;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      continue;
    }
    currentWinStreak = 0;
  }
  return { currentWinStreak, maxWinStreak };
}
__name(readWinStreaks, "readWinStreaks");
async function readRecentMatches(env, userId) {
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
    `
  ).bind(userId).all();
  return result.results ?? [];
}
__name(readRecentMatches, "readRecentMatches");
async function readParticipants(env, matchIds) {
  const grouped = /* @__PURE__ */ new Map();
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
    `
  ).bind(...matchIds).all();
  for (const participant of result.results ?? []) {
    const list = grouped.get(participant.match_id) ?? [];
    list.push(participant);
    grouped.set(participant.match_id, list);
  }
  return grouped;
}
__name(readParticipants, "readParticipants");
function normalizeModeStats(row) {
  return {
    matchCount: readNumber4(row?.match_count),
    winCount: readNumber4(row?.win_count),
    loseCount: readNumber4(row?.lose_count),
    casualMatchCount: readNumber4(row?.casual_match_count),
    smartMatchCount: readNumber4(row?.smart_match_count),
    type100MatchCount: readNumber4(row?.type_100_match_count),
    type200MatchCount: readNumber4(row?.type_200_match_count),
    type300MatchCount: readNumber4(row?.type_300_match_count),
    type400MatchCount: readNumber4(row?.type_400_match_count),
    type500MatchCount: readNumber4(row?.type_500_match_count),
    typeExtraMatchCount: readNumber4(row?.type_extra_match_count),
    playedCardCount: readNumber4(row?.played_card_count),
    jokerPlayCount: readNumber4(row?.joker_play_count),
    spade3CounterCount: readNumber4(row?.spade3_counter_count),
    timeoutDeckPlayCount: readNumber4(row?.timeout_deck_play_count)
  };
}
__name(normalizeModeStats, "normalizeModeStats");
function sumModeStats(solo, multi) {
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
    timeoutDeckPlayCount: soloStats.timeoutDeckPlayCount + multiStats.timeoutDeckPlayCount
  };
}
__name(sumModeStats, "sumModeStats");
function withWinStreaks(stats, streaks) {
  return {
    ...stats,
    currentWinStreak: streaks.currentWinStreak,
    maxWinStreak: streaks.maxWinStreak
  };
}
__name(withWinStreaks, "withWinStreaks");
function normalizeGlobalStats(row) {
  return {
    currentWinStreak: readNumber4(row?.current_win_streak),
    maxWinStreak: readNumber4(row?.max_win_streak),
    currentLoseStreak: readNumber4(row?.current_lose_streak),
    maxLoseStreak: readNumber4(row?.max_lose_streak),
    everHandAllRed: readFlag3(row?.ever_hand_all_red),
    everHandAllBlack: readFlag3(row?.ever_hand_all_black),
    everHandSameSuit: readFlag3(row?.ever_hand_same_suit),
    maxTotalReached: readNullableNumber(row?.max_total_reached),
    minTotalReached: readNullableNumber(row?.min_total_reached),
    maxTurnCountInMatch: readNumber4(row?.max_turn_count_in_match),
    maxPlayedCardsInMatch: readNumber4(row?.max_played_cards_in_match),
    maxJokerPlayInMatch: readNumber4(row?.max_joker_play_in_match),
    maxSpade3CounterInMatch: readNumber4(row?.max_spade3_counter_in_match)
  };
}
__name(normalizeGlobalStats, "normalizeGlobalStats");
function readNumber4(value) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}
__name(readNumber4, "readNumber");
function readNullableNumber(value) {
  if (value == null || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.trunc(numberValue);
}
__name(readNullableNumber, "readNullableNumber");
function readFlag3(value) {
  return readNumber4(value) === 1;
}
__name(readFlag3, "readFlag");

// api/user-settings.ts
var DEFAULT_DISPLAY_NAME2 = "\u30D7\u30EC\u30A4\u30E4\u30FC";
var DEFAULT_SOUND_VOLUME_LEVEL = 3;
var MAX_DISPLAY_NAME_LENGTH2 = 15;
async function onRequestGet33({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  const settings = await ensureUserSettings(env, session.user_id);
  return json({ ok: true, settings: toResponseSettings(settings) });
}
__name(onRequestGet33, "onRequestGet");
async function onRequestPatch8({ request, env }) {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "\u30ED\u30B0\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002" }, { status: 401 });
  }
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }, { status: 400 });
  }
  const currentSettings = await ensureUserSettings(env, session.user_id);
  const patch = readSettingsPatch(body);
  const errors = validateSettingsPatch(patch);
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "\u5165\u529B\u5185\u5BB9\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", errors }, { status: 400 });
  }
  const now = nowIso();
  let displayName = currentSettings.display_name || DEFAULT_DISPLAY_NAME2;
  let previousDisplayName = currentSettings.previous_display_name;
  let currentIconId = currentSettings.current_icon_id;
  let currentTitleId = currentSettings.current_title_id;
  let soundVolumeLevel = normalizeSoundVolumeLevel(currentSettings.sound_volume_level);
  if (patch.displayName !== void 0) {
    const nextDisplayName = normalizeDisplayName(patch.displayName) ?? DEFAULT_DISPLAY_NAME2;
    if (nextDisplayName !== displayName) {
      previousDisplayName = displayName;
      displayName = nextDisplayName;
    }
  }
  if (patch.currentIconId !== void 0) {
    currentIconId = normalizeNullableText2(patch.currentIconId);
    if (currentIconId && !await ownsIcon(env, session.user_id, currentIconId)) {
      return json({ ok: false, message: "\u6240\u6301\u3057\u3066\u3044\u306A\u3044\u30A2\u30A4\u30B3\u30F3\u306F\u8A2D\u5B9A\u3067\u304D\u307E\u305B\u3093\u3002", errors: { currentIconId: "\u6240\u6301\u3057\u3066\u3044\u306A\u3044\u30A2\u30A4\u30B3\u30F3\u3067\u3059\u3002" } }, { status: 400 });
    }
  }
  if (patch.currentTitleId !== void 0) {
    currentTitleId = normalizeNullableText2(patch.currentTitleId);
    if (currentTitleId && !await ownsTitle(env, session.user_id, currentTitleId)) {
      return json({ ok: false, message: "\u6240\u6301\u3057\u3066\u3044\u306A\u3044\u79F0\u53F7\u306F\u8A2D\u5B9A\u3067\u304D\u307E\u305B\u3093\u3002", errors: { currentTitleId: "\u6240\u6301\u3057\u3066\u3044\u306A\u3044\u79F0\u53F7\u3067\u3059\u3002" } }, { status: 400 });
    }
  }
  if (patch.soundVolumeLevel !== void 0) {
    soundVolumeLevel = normalizeSoundVolumeLevel(patch.soundVolumeLevel);
  }
  await env.DB.prepare(
    `
    UPDATE user_settings
    SET
      display_name = ?,
      previous_display_name = ?,
      current_icon_id = ?,
      current_title_id = ?,
      sound_volume_level = ?,
      updated_at = ?
    WHERE user_id = ?
    `
  ).bind(displayName, previousDisplayName, currentIconId, currentTitleId, soundVolumeLevel, now, session.user_id).run();
  const updatedSettings = {
    ...currentSettings,
    display_name: displayName,
    previous_display_name: previousDisplayName,
    current_icon_id: currentIconId,
    current_title_id: currentTitleId,
    sound_volume_level: soundVolumeLevel,
    updated_at: now
  };
  return json({ ok: true, settings: toResponseSettings(updatedSettings) });
}
__name(onRequestPatch8, "onRequestPatch");
function onRequestPost29() {
  return json({ ok: false, message: "\u3053\u306EAPI\u306FGET\u307E\u305F\u306FPATCH\u9001\u4FE1\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002" }, { status: 405 });
}
__name(onRequestPost29, "onRequestPost");
async function ensureUserSettings(env, userId) {
  const existingSettings = await env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1").bind(userId).first();
  if (existingSettings) return existingSettings;
  const now = nowIso();
  const settings = {
    user_id: userId,
    display_name: DEFAULT_DISPLAY_NAME2,
    previous_display_name: null,
    current_icon_id: null,
    current_title_id: null,
    sound_volume_level: DEFAULT_SOUND_VOLUME_LEVEL,
    created_at: now,
    updated_at: now
  };
  await env.DB.prepare(
    `
    INSERT INTO user_settings (
      user_id,
      display_name,
      previous_display_name,
      current_icon_id,
      current_title_id,
      sound_volume_level,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).bind(
    settings.user_id,
    settings.display_name,
    settings.previous_display_name,
    settings.current_icon_id,
    settings.current_title_id,
    settings.sound_volume_level,
    settings.created_at,
    settings.updated_at
  ).run();
  return settings;
}
__name(ensureUserSettings, "ensureUserSettings");
async function ownsIcon(env, userId, iconId) {
  const row = await env.DB.prepare("SELECT icon_id FROM user_icons WHERE user_id = ? AND icon_id = ? LIMIT 1").bind(userId, iconId).first();
  return Boolean(row);
}
__name(ownsIcon, "ownsIcon");
async function ownsTitle(env, userId, titleId) {
  const row = await env.DB.prepare("SELECT title_id FROM user_titles WHERE user_id = ? AND title_id = ? LIMIT 1").bind(userId, titleId).first();
  return Boolean(row);
}
__name(ownsTitle, "ownsTitle");
function readSettingsPatch(body) {
  const patch = {};
  if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
    patch.displayName = getString(body.displayName);
  }
  if (Object.prototype.hasOwnProperty.call(body, "currentIconId")) {
    patch.currentIconId = getNullableString(body.currentIconId);
  }
  if (Object.prototype.hasOwnProperty.call(body, "currentTitleId")) {
    patch.currentTitleId = getNullableString(body.currentTitleId);
  }
  if (Object.prototype.hasOwnProperty.call(body, "soundVolumeLevel")) {
    patch.soundVolumeLevel = Number(body.soundVolumeLevel);
  }
  return patch;
}
__name(readSettingsPatch, "readSettingsPatch");
function validateSettingsPatch(patch) {
  const errors = {};
  if (patch.displayName !== void 0) {
    const displayName = String(patch.displayName ?? "").trim();
    if (!displayName) errors.displayName = "\u30D7\u30EC\u30A4\u30E4\u30FC\u30CD\u30FC\u30E0\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    else if (Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH2) errors.displayName = `\u30D7\u30EC\u30A4\u30E4\u30FC\u30CD\u30FC\u30E0\u306F${MAX_DISPLAY_NAME_LENGTH2}\u6587\u5B57\u4EE5\u5185\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
  }
  if (patch.soundVolumeLevel !== void 0) {
    if (![1, 2, 3, 4, 5].includes(patch.soundVolumeLevel)) {
      errors.soundVolumeLevel = "\u97F3\u91CF\u306F1\u301C5\u3067\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    }
  }
  return errors;
}
__name(validateSettingsPatch, "validateSettingsPatch");
function toResponseSettings(settings) {
  return {
    displayName: settings.display_name || DEFAULT_DISPLAY_NAME2,
    previousDisplayName: settings.previous_display_name,
    currentIconId: settings.current_icon_id,
    currentTitleId: settings.current_title_id,
    soundVolumeLevel: normalizeSoundVolumeLevel(settings.sound_volume_level)
  };
}
__name(toResponseSettings, "toResponseSettings");
function getNullableString(value) {
  if (value === null) return null;
  return typeof value === "string" ? value : null;
}
__name(getNullableString, "getNullableString");
function normalizeDisplayName(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_DISPLAY_NAME_LENGTH2).join("");
}
__name(normalizeDisplayName, "normalizeDisplayName");
function normalizeNullableText2(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
__name(normalizeNullableText2, "normalizeNullableText");
function normalizeSoundVolumeLevel(value) {
  const normalized = Math.min(5, Math.max(1, Math.round(Number(value) || DEFAULT_SOUND_VOLUME_LEVEL)));
  return normalized;
}
__name(normalizeSoundVolumeLevel, "normalizeSoundVolumeLevel");

// ../.wrangler/tmp/pages-e88Arg/functionsRoutes-0.8631156628372763.mjs
var routes = [
  {
    routePath: "/api/admin/assets/icon-replacements/:batchId/:variant",
    mountPath: "/api/admin/assets/icon-replacements/:batchId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/assets/icon-replacements/:batchId/:variant",
    mountPath: "/api/admin/assets/icon-replacements/:batchId",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/assets/loading-illustrations/:batchId/:variant",
    mountPath: "/api/admin/assets/loading-illustrations/:batchId",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/admin/assets/loading-illustrations/:batchId/:variant",
    mountPath: "/api/admin/assets/loading-illustrations/:batchId",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/admin/assets/icons/:iconId",
    mountPath: "/api/admin/assets/icons",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/admin/assets/icons/:iconId",
    mountPath: "/api/admin/assets/icons",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/admin/assets/loading-illustrations/:illustrationId",
    mountPath: "/api/admin/assets/loading-illustrations",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/admin/assets/loading-illustrations/:illustrationId",
    mountPath: "/api/admin/assets/loading-illustrations",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/admin/auth/login",
    mountPath: "/api/admin/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/admin/auth/login",
    mountPath: "/api/admin/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/admin/auth/logout",
    mountPath: "/api/admin/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/admin/auth/logout",
    mountPath: "/api/admin/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/admin/auth/me",
    mountPath: "/api/admin/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/admin/auth/password",
    mountPath: "/api/admin/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/admin/auth/password",
    mountPath: "/api/admin/auth",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/admin/player-users/:userId",
    mountPath: "/api/admin/player-users",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/admin/player-users/:userId",
    mountPath: "/api/admin/player-users",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch2]
  },
  {
    routePath: "/api/admin/player-users/:userId",
    mountPath: "/api/admin/player-users",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/assets/icons/:iconId",
    mountPath: "/api/assets/icons",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/assets/icons/:iconId",
    mountPath: "/api/assets/icons",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/assets/loading-illustrations/:illustrationId",
    mountPath: "/api/assets/loading-illustrations",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/assets/loading-illustrations/:illustrationId",
    mountPath: "/api/assets/loading-illustrations",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/admin/announcements",
    mountPath: "/api/admin",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/announcements",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/api/admin/announcements",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch3]
  },
  {
    routePath: "/api/admin/announcements",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost10]
  },
  {
    routePath: "/api/admin/assets",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet13]
  },
  {
    routePath: "/api/admin/assets",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost11]
  },
  {
    routePath: "/api/admin/change-batches",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet14]
  },
  {
    routePath: "/api/admin/change-batches",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch4]
  },
  {
    routePath: "/api/admin/change-batches",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost12]
  },
  {
    routePath: "/api/admin/loading-illustrations",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet15]
  },
  {
    routePath: "/api/admin/loading-illustrations",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch5]
  },
  {
    routePath: "/api/admin/loading-illustrations",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost13]
  },
  {
    routePath: "/api/admin/masters",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet16]
  },
  {
    routePath: "/api/admin/masters",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch6]
  },
  {
    routePath: "/api/admin/masters",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost14]
  },
  {
    routePath: "/api/admin/player-users",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet17]
  },
  {
    routePath: "/api/admin/users",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet18]
  },
  {
    routePath: "/api/admin/users",
    mountPath: "/api/admin",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch7]
  },
  {
    routePath: "/api/admin/users",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost15]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet19]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost16]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet20]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost17]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet21]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost18]
  },
  {
    routePath: "/api/auth/password-reset",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet22]
  },
  {
    routePath: "/api/auth/password-reset",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost19]
  },
  {
    routePath: "/api/auth/password-reset-request",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet23]
  },
  {
    routePath: "/api/auth/password-reset-request",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost20]
  },
  {
    routePath: "/api/auth/register",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet24]
  },
  {
    routePath: "/api/auth/register",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost21]
  },
  {
    routePath: "/api/auth/verify-email",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet25]
  },
  {
    routePath: "/api/auth/verify-email",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost22]
  },
  {
    routePath: "/api/announcements",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet26]
  },
  {
    routePath: "/api/contact",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet27]
  },
  {
    routePath: "/api/contact",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost23]
  },
  {
    routePath: "/api/loading-illustration",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet29]
  },
  {
    routePath: "/api/loading-illustration",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost25]
  },
  {
    routePath: "/api/matches",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet31]
  },
  {
    routePath: "/api/matches",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost27]
  },
  {
    routePath: "/api/user-collections",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet28]
  },
  {
    routePath: "/api/user-collections",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost24]
  },
  {
    routePath: "/api/user-notifications",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet30]
  },
  {
    routePath: "/api/user-notifications",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost26]
  },
  {
    routePath: "/api/user-records",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet32]
  },
  {
    routePath: "/api/user-records",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost28]
  },
  {
    routePath: "/api/user-settings",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet33]
  },
  {
    routePath: "/api/user-settings",
    mountPath: "/api",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch8]
  },
  {
    routePath: "/api/user-settings",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost29]
  }
];

// ../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-EJO09J/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-EJO09J/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.7920569242631037.mjs.map
