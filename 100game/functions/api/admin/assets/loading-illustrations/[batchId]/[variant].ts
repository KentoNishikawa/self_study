import { json, type PagesContext } from "../../../../auth/_shared";
import { isResponse, requireAdminSession } from "../../../_admin";

type LoadingIllustrationReplaceItemRow = {
  before_json: string | null;
  after_json: string | null;
};

type LoadingIllustrationReplacePreview = {
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

  const batchId = getRouteParam(context, "batchId");
  const variant = getRouteParam(context, "variant");
  if (!batchId || (variant !== "before" && variant !== "after")) return new Response("Not Found", { status: 404 });

  const row = await context.env.DB.prepare(
    `
    SELECT before_json, after_json
    FROM admin_change_items
    WHERE batch_id = ?
      AND change_type = 'loading_illustration_replace'
      AND target_type = 'loading_illustration'
    LIMIT 1
    `,
  )
    .bind(batchId)
    .first<LoadingIllustrationReplaceItemRow>();

  if (!row) return new Response("Not Found", { status: 404 });

  const payload = parseJson<LoadingIllustrationReplacePreview>(variant === "before" ? row.before_json : row.after_json);
  if (!payload) return new Response("Not Found", { status: 404 });

  if (variant === "before" && payload.storage_provider !== "r2") {
    const imagePath = typeof payload.image_path === "string" ? payload.image_path : "";
    return redirectLocalAsset(context.request, imagePath);
  }

  const storageKey = variant === "before"
    ? typeof payload.storage_key === "string" ? payload.storage_key : ""
    : typeof payload.storageKey === "string" ? payload.storageKey : "";
  const mimeType = variant === "before"
    ? typeof payload.mime_type === "string" ? payload.mime_type : null
    : typeof payload.mimeType === "string" ? payload.mimeType : null;

  if (!storageKey || !context.env.ASSETS_BUCKET) return new Response("Not Found", { status: 404 });

  const object = await context.env.ASSETS_BUCKET.get(storageKey);
  if (!object) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", mimeType ?? "application/octet-stream");
  headers.set("Cache-Control", "private, max-age=60");
  return new Response(object.body, { headers });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
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
