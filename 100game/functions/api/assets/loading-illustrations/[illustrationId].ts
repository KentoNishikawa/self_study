import { findActiveSession, type AuthSessionRow, type PagesContext } from "../../auth/_shared";

type LoadingIllustrationAssetRow = {
  illustration_id: string;
  image_path: string;
  is_active: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const illustrationId = getRouteParam(context, "illustrationId");
  if (!illustrationId) return notFound();

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
    `,
  )
    .bind(illustrationId)
    .first<LoadingIllustrationAssetRow>();

  if (!row) return notFound();

  const session = await findActiveSession(context.env, context.request);
  const admin = isAdminSession(session);
  if (Number(row.is_active) !== 1 && !admin) return notFound();

  if (!admin) {
    if (!session) return notFound();
    const viewed = await userViewedLoadingIllustration(context.env.DB, session.user_id, row.illustration_id);
    if (!viewed) return notFound();
  }

  if (row.storage_provider !== "r2") return redirectLocalAsset(context.request, row.image_path);

  if (!row.storage_key || !context.env.ASSETS_BUCKET) return notFound();
  const object = await context.env.ASSETS_BUCKET.get(row.storage_key);
  if (!object) return notFound();

  return imageResponse(object, row.mime_type, "private, max-age=60");
}

export function onRequestPost(): Response {
  return notFound();
}

async function userViewedLoadingIllustration(db: PagesContext["env"]["DB"], userId: string, illustrationId: string) {
  const row = await db.prepare(
    `
    SELECT 1 AS viewed
    FROM user_title_illustrations
    WHERE user_id = ?
      AND illustration_id = ?
      AND first_viewed_at IS NOT NULL
    LIMIT 1
    `,
  )
    .bind(userId, illustrationId)
    .first<{ viewed: number }>();

  return Boolean(row?.viewed);
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
