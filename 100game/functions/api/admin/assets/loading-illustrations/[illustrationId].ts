import { json, type PagesContext } from "../../../auth/_shared";
import { isResponse, requireAdminSession } from "../../_admin";

type LoadingIllustrationAssetRow = {
  image_path: string;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
};

type LoadingIllustrationReplacementRow = {
  before_json: string | null;
  after_json: string | null;
};

type LoadingIllustrationReplacementPreview = {
  image_path?: unknown;
  storage_provider?: unknown;
  storage_key?: unknown;
  mime_type?: unknown;
  storageKey?: unknown;
  mimeType?: unknown;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const illustrationId = getRouteParam(context, "illustrationId");
  if (!illustrationId) return new Response("Not Found", { status: 404 });

  const replacementResponse = await maybeReadReplacementPreview(context, illustrationId);
  if (replacementResponse) return replacementResponse;

  const row = await context.env.DB.prepare(
    `
    SELECT image_path, storage_provider, storage_key, mime_type
    FROM title_illustrations
    WHERE illustration_id = ?
      AND deleted_at IS NULL
    LIMIT 1
    `,
  )
    .bind(illustrationId)
    .first<LoadingIllustrationAssetRow>();

  if (!row) return new Response("Not Found", { status: 404 });
  return renderAsset(context, row.image_path, row.storage_provider, row.storage_key, row.mime_type);
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
}

async function maybeReadReplacementPreview(context: PagesContext, illustrationId: string) {
  const url = new URL(context.request.url);
  const replacementBatchId = url.searchParams.get("replacementBatchId")?.trim() ?? "";
  const variant = url.searchParams.get("variant")?.trim() ?? "";
  if (!replacementBatchId && !variant) return null;
  if (!replacementBatchId || (variant !== "before" && variant !== "after")) return new Response("Not Found", { status: 404 });

  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'loading_illustration_replace'
      AND target_type = 'loading_illustration'
      AND target_id = ?
    LIMIT 1
    `,
  )
    .bind(replacementBatchId, illustrationId)
    .first<LoadingIllustrationReplacementRow>();

  if (!row) return new Response("Not Found", { status: 404 });

  const payload = parseJson<LoadingIllustrationReplacementPreview>(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });

  const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
  const storageProvider = typeof payload.storage_provider === "string" ? payload.storage_provider : "r2";
  const storageKey = variant === "before"
    ? typeof payload.storage_key === "string" ? payload.storage_key : ""
    : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before"
    ? typeof payload.mime_type === "string" ? payload.mime_type : null
    : typeof payload.mimeType === "string" ? payload.mimeType : null;

  return renderAsset(context, imagePath, storageProvider, storageKey, mimeType);
}

async function renderAsset(
  context: PagesContext,
  imagePath: string,
  storageProvider: string,
  storageKey: string | null,
  mimeType: string | null,
) {
  if (storageProvider !== "r2") return redirectLocalAsset(context.request, imagePath);
  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });

  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}

function getRouteParam(context: PagesContext, key: string) {
  const params = (context as PagesContext & { params?: Record<string, string | string[]> }).params;
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function redirectLocalAsset(request: Request, imagePath: string) {
  if (!imagePath.startsWith("/")) return new Response("Not Found", { status: 404 });
  return Response.redirect(new URL(imagePath, request.url).toString(), 302);
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
