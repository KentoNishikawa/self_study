import { json, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

const DEFAULT_ICON_SETTING_KEY = "default_icon_id";
const NPC_ICON_ID = "npc_default";

type IconRow = { icon_id: string };
type IconTypeLinkRow = { icon_type_id: string };

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  const requestedIconId = normalizeIconId(body?.iconId);

  try {
    const iconId = await resolveActiveIconId(env, requestedIconId);
    if (!iconId) {
      return json({ ok: false, message: "開始時アイコン情報を取得できませんでした。" }, { status: 503 });
    }

    const npcIcon = await readActiveIcon(env, NPC_ICON_ID);
    if (!npcIcon) {
      return json({ ok: false, message: "開始時アイコン情報を取得できませんでした。" }, { status: 503 });
    }

    const [iconTypeIds, npcIconTypeIds] = await Promise.all([
      readActiveIconTypeIds(env, iconId),
      readActiveIconTypeIds(env, npcIcon.icon_id),
    ]);
    return json({
      ok: true,
      snapshot: {
        iconId,
        iconTypeIds,
        npcIconId: npcIcon.icon_id,
        npcIconTypeIds,
      },
    });
  } catch {
    return json({ ok: false, message: "開始時アイコン情報を取得できませんでした。" }, { status: 503 });
  }
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

async function resolveActiveIconId(env: Env, requestedIconId: string | null): Promise<string | null> {
  if (requestedIconId) {
    const requested = await readActiveIcon(env, requestedIconId);
    if (requested) return requested.icon_id;
  }

  const setting = await env.DB.prepare(
    `SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1`,
  )
    .bind(DEFAULT_ICON_SETTING_KEY)
    .first<{ setting_value: string | null }>();
  const defaultIconId = normalizeIconId(setting?.setting_value);
  if (defaultIconId) {
    const fallback = await readActiveIcon(env, defaultIconId);
    if (fallback) return fallback.icon_id;
  }

  return null;
}

async function readActiveIcon(env: Env, iconId: string) {
  return env.DB.prepare(
    `
    SELECT icon_id
    FROM icons
    WHERE icon_id = ?
      AND is_active = 1
      AND deleted_at IS NULL
    LIMIT 1
    `,
  )
    .bind(iconId)
    .first<IconRow>();
}

async function readActiveIconTypeIds(env: Env, iconId: string) {
  const result = await env.DB.prepare(
    `
    SELECT icon_type_links.icon_type_id
    FROM icon_type_links
    INNER JOIN icon_types
      ON icon_types.icon_type_id = icon_type_links.icon_type_id
      AND icon_types.is_active = 1
    WHERE icon_type_links.icon_id = ?
    ORDER BY icon_type_links.sort_order ASC, icon_type_links.icon_type_id ASC
    `,
  )
    .bind(iconId)
    .all<IconTypeLinkRow>();
  return (result.results ?? []).map((row) => row.icon_type_id);
}

function normalizeIconId(value: unknown): string | null {
  const iconId = typeof value === "string" ? value.trim() : "";
  if (!iconId || iconId.length > 120) return null;
  if (!/^[A-Za-z0-9_./:-]+$/.test(iconId)) return null;
  return iconId;
}
