import { json, type Env, type PagesContext } from "./auth/_shared";

type GuestIconRow = {
  icon_id: string;
  icon_name: string;
  description: string;
  image_path: string;
  sort_order: number;
  storage_provider: string;
};

type IconTypeLinkRow = {
  icon_id: string;
  icon_type_id: string;
};

const DEFAULT_ICON_SETTING_KEY = "default_icon_id";

export async function onRequestGet({ env }: PagesContext): Promise<Response> {
  const icons = await readGuestIcons(env);
  const iconTypeLinks = await readIconTypeLinks(env, icons.map((icon) => icon.icon_id));
  const rawDefaultIconId = await readDefaultIconId(env);
  const defaultIconId = rawDefaultIconId && icons.some((icon) => icon.icon_id === rawDefaultIconId) ? rawDefaultIconId : null;

  return json({
    ok: true,
    collection: {
      icons: icons.map((icon) => toIconResponse(icon, iconTypeLinks.get(icon.icon_id) ?? [])),
      defaultIconId,
    },
  });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
}

async function readGuestIcons(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      icon_id,
      icon_name,
      description,
      image_path,
      sort_order,
      storage_provider
    FROM icons
    WHERE is_active = 1
      AND is_guest_available = 1
      AND deleted_at IS NULL
    ORDER BY sort_order ASC, icon_id ASC
    `,
  ).all<GuestIconRow>();

  return result.results ?? [];
}

async function readIconTypeLinks(env: Env, iconIds: string[]) {
  if (iconIds.length === 0) return new Map<string, string[]>();

  const placeholders = iconIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `
    SELECT icon_type_links.icon_id, icon_type_links.icon_type_id
    FROM icon_type_links
    INNER JOIN icon_types
      ON icon_types.icon_type_id = icon_type_links.icon_type_id
      AND icon_types.is_active = 1
    WHERE icon_type_links.icon_id IN (${placeholders})
    ORDER BY icon_type_links.icon_id ASC, icon_type_links.sort_order ASC, icon_type_links.icon_type_id ASC
    `,
  )
    .bind(...iconIds)
    .all<IconTypeLinkRow>();

  const linkMap = new Map<string, string[]>();
  for (const row of result.results ?? []) {
    const ids = linkMap.get(row.icon_id) ?? [];
    ids.push(row.icon_type_id);
    linkMap.set(row.icon_id, ids);
  }

  return linkMap;
}

async function readDefaultIconId(env: Env) {
  const row = await env.DB.prepare(
    `
    SELECT setting_value
    FROM app_settings
    WHERE setting_key = ?
    LIMIT 1
    `,
  )
    .bind(DEFAULT_ICON_SETTING_KEY)
    .first<{ setting_value: string | null }>();

  const value = typeof row?.setting_value === "string" ? row.setting_value.trim() : "";
  return value || null;
}

function toIconResponse(row: GuestIconRow, iconTypeIds: string[]) {
  return {
    id: row.icon_id,
    name: row.icon_name,
    comment: row.description,
    imagePath: row.storage_provider === "r2" ? `/api/assets/icons/${encodeURIComponent(row.icon_id)}` : row.image_path,
    owned: true,
    sortOrder: row.sort_order,
    iconTypeIds,
  };
}
