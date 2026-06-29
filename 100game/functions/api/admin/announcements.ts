import { createId, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type AnnouncementCategory = "normal" | "maintenance" | "bug" | "update" | "important";

type AnnouncementRow = {
  announcement_id: string;
  title: string;
  summary: string | null;
  body: string;
  category: AnnouncementCategory;
  priority: number;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type AnnouncementInput = {
  title: string;
  summary: string;
  body: string;
  category: AnnouncementCategory;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const announcements = await readAnnouncements(context.env);
  return json({
    ok: true,
    currentUser: {
      userId: session.user_id,
      email: session.email,
      role: session.role,
    },
    announcements: announcements.map(toAnnouncementResponse),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

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
    `,
  )
    .bind(
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
      now,
    )
    .run();

  return json({ ok: true, message: "お知らせを作成しました。", id: announcementId });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const announcementId = getString(body.announcementId).trim();
  if (!announcementId) return json({ ok: false, message: "お知らせIDが不正です。" }, { status: 400 });

  const existing = await readAnnouncement(context.env, announcementId);
  if (!existing) return json({ ok: false, message: "お知らせが見つかりません。" }, { status: 404 });
  if (existing.deleted_at) return json({ ok: false, message: "削除済みのお知らせは編集できません。" }, { status: 400 });

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
    `,
  )
    .bind(
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
      announcementId,
    )
    .run();

  return json({ ok: true, message: "お知らせを更新しました。" });
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const announcementId = getString(body.announcementId).trim();
  if (!announcementId) return json({ ok: false, message: "お知らせIDが不正です。" }, { status: 400 });

  const existing = await readAnnouncement(context.env, announcementId);
  if (!existing) return json({ ok: false, message: "お知らせが見つかりません。" }, { status: 404 });
  if (existing.deleted_at) return json({ ok: true, message: "お知らせは既に削除されています。" });

  const now = nowIso();
  await context.env.DB.prepare(
    `
    UPDATE announcements
    SET is_active = 0, deleted_at = ?, updated_by = ?, updated_at = ?
    WHERE announcement_id = ?
    `,
  )
    .bind(now, session.user_id, now, announcementId)
    .run();

  return json({ ok: true, message: "お知らせを削除しました。" });
}

async function readAnnouncements(env: Env) {
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
    `,
  ).all<AnnouncementRow>();

  return result.results ?? [];
}

async function readAnnouncement(env: Env, announcementId: string) {
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
    `,
  )
    .bind(announcementId)
    .first<AnnouncementRow>();
}

function readAnnouncementInput(body: Record<string, unknown>): AnnouncementInput | Response {
  const title = getString(body.title).trim();
  const rawSummary = getString(body.summary).trim();
  const bodyText = getString(body.body).trim();
  const category = readCategory(body.category);
  const priority = readPriority(body.priority);
  const startsAt = readNullableIso(body.startsAt);
  const endsAt = readNullableIso(body.endsAt);

  if (!title) return json({ ok: false, message: "タイトルを入力してください。" }, { status: 400 });
  if (!bodyText) return json({ ok: false, message: "本文を入力してください。" }, { status: 400 });
  if (!category) return json({ ok: false, message: "種別が不正です。" }, { status: 400 });
  if (startsAt === false || endsAt === false) {
    return json({ ok: false, message: "表示日時が不正です。" }, { status: 400 });
  }
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "表示終了日時は表示開始日時以後にしてください。" }, { status: 400 });
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
    endsAt: endsAt || null,
  };
}

function readCategory(value: unknown): AnnouncementCategory | null {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}

function readPriority(value: unknown) {
  const number = typeof value === "number" ? value : Number(getString(value));
  if (!Number.isFinite(number)) return 0;
  return Math.min(999999, Math.max(-999999, Math.trunc(number)));
}

function readNullableIso(value: unknown): string | null | false {
  const text = getString(value).trim();
  if (!text) return null;
  const time = Date.parse(text);
  if (Number.isNaN(time)) return false;
  return new Date(time).toISOString();
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
    isActive: row.is_active === 1,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
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
