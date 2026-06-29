import { findActiveSession, type AuthSessionRow, type PagesContext } from "../../auth/_shared";

type IconAssetRow = {
  icon_id: string;
  image_path: string;
  is_initial: number;
  is_active: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const iconId = getRouteParam(context, "iconId");
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
    `,
  )
    .bind(iconId)
    .first<IconAssetRow>();

  if (!row) return notFound();

  const session = await findActiveSession(context.env, context.request);
  const admin = isAdminSession(session);
  const active = Number(row.is_active) === 1;

  if (row.storage_provider !== "r2") {
    if (!admin && (!active || Number(row.is_initial) !== 1)) return notFound();
    return redirectLocalAsset(context.request, row.image_path);
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

export function onRequestPost(): Response {
  return notFound();
}

async function userOwnsIcon(db: PagesContext["env"]["DB"], userId: string, iconId: string) {
  const row = await db.prepare(
    `
    SELECT 1 AS owned
    FROM user_icons
    WHERE user_id = ?
      AND icon_id = ?
    LIMIT 1
    `,
  )
    .bind(userId, iconId)
    .first<{ owned: number }>();

  return Boolean(row?.owned);
}

async function userHasUnreadIconNotification(db: PagesContext["env"]["DB"], request: Request, userId: string, iconId: string) {
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
    `,
  )
    .bind(notificationId, userId, iconId)
    .first<{ notified: number }>();

  return Boolean(row?.notified);
}

function isAdminSession(session: AuthSessionRow | null) {
  return session?.role === "admin" || session?.role === "owner";
}

function imageResponse(object: { body: ReadableStream; writeHttpMetadata?(headers: Headers): void }, mimeType: string | null, cacheControl: string) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", cacheControl);
  return new Response(object.body, { headers });
}

function getRouteParam(context: PagesContext, key: string) {
  const params = (context as PagesContext & { params?: Record<string, string | string[]> }).params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function redirectLocalAsset(request: Request, imagePath: string) {
  if (!imagePath.startsWith("/")) return notFound();
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}

function notFound() {
  return new Response("Not Found", { status: 404 });
}
