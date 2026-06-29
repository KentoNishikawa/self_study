import { json, nowIso, type Env, type PagesContext } from "./auth/_shared";

type AnnouncementRow = {
  announcement_id: string;
  title: string;
  summary: string | null;
  body: string;
  category: string;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const announcements = await readActiveAnnouncements(context.env);
  return json({
    ok: true,
    announcements: announcements.map(toAnnouncementResponse),
  });
}

async function readActiveAnnouncements(env: Env) {
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
    `,
  )
    .bind(now, now)
    .all<AnnouncementRow>();

  return result.results ?? [];
}

function toAnnouncementResponse(row: AnnouncementRow) {
  return {
    id: row.announcement_id,
    title: row.title,
    summary: row.summary ?? "",
    body: row.body,
    category: row.category,
    categoryLabel: categoryLabel(row.category),
    priority: row.priority,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function categoryLabel(category: string) {
  if (category === "maintenance") return "メンテナンス";
  if (category === "bug") return "不具合";
  if (category === "update") return "アップデート";
  if (category === "important") return "重要";
  return "通常";
}
