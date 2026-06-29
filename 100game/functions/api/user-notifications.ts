import { createId, findActiveSession, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

type UserNotificationRow = {
  notification_id: string;
  notification_type: NotificationType;
  target_type: TargetType;
  target_id: string;
  priority: number;
  created_at: string;
  title_name: string | null;
  title_rarity: number | null;
  icon_name: string | null;
  icon_image_path: string | null;
  icon_storage_provider: string | null;
  illustration_name: string | null;
  illustration_image_path: string | null;
};

type NotificationType = "title_acquired" | "icon_acquired" | "title_illustration_acquired";
type TargetType = "title" | "icon" | "title_illustration";

const NOTIFICATION_LIMIT = 20;
const NOTIFICATION_PRIORITIES: Record<NotificationType, number> = {
  title_acquired: 10,
  icon_acquired: 20,
  title_illustration_acquired: 30,
};

const NOTIFICATION_TARGET_TYPES: Record<NotificationType, TargetType> = {
  title_acquired: "title",
  icon_acquired: "icon",
  title_illustration_acquired: "title_illustration",
};

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const rows = await readUnreadNotifications(env, session.user_id);
  return json({
    ok: true,
    notifications: rows.map(toNotificationResponse),
    titleAwardNotification: toTitleAwardNotification(rows),
    iconAwardNotification: toIconAwardNotification(rows),
    titleIllustrationAwardNotification: toTitleIllustrationAwardNotification(rows),
  });
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const payload = await readJsonRecord(request);
  const notificationIds = normalizeNotificationIds(payload?.notificationIds);
  if (notificationIds.length === 0) {
    return json({ ok: false, message: "既読化する通知がありません。" }, { status: 400 });
  }

  await markNotificationsRead(env, session.user_id, notificationIds);
  return json({ ok: true });
}

export async function createAcquiredNotification(env: Env, userId: string, notificationType: NotificationType, targetId: string) {
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
    `,
  )
    .bind(createId("ntf"), userId, notificationType, targetType, targetId, priority, now)
    .run();
}

async function readUnreadNotifications(env: Env, userId: string) {
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
    `,
  )
    .bind(userId, NOTIFICATION_LIMIT)
    .all<UserNotificationRow>();

  return result.results ?? [];
}

async function markNotificationsRead(env: Env, userId: string, notificationIds: string[]) {
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
      `,
    )
      .bind(now, userId, notificationId)
      .run();
  }
}

function toNotificationResponse(row: UserNotificationRow) {
  return {
    notificationId: row.notification_id,
    notificationType: row.notification_type,
    targetType: row.target_type,
    targetId: row.target_id,
    priority: Number(row.priority),
    createdAt: row.created_at,
  };
}

function toTitleAwardNotification(rows: UserNotificationRow[]) {
  const items = rows
    .filter((row) => row.notification_type === "title_acquired" && row.target_type === "title")
    .map((row) => ({
      notificationId: row.notification_id,
      id: row.target_id,
      name: row.title_name ?? row.target_id,
      rarity: toRarityStars(row.title_rarity ?? 1),
    }));

  return items.length > 0 ? { items } : null;
}

function toIconAwardNotification(rows: UserNotificationRow[]) {
  const items = rows
    .filter((row) => row.notification_type === "icon_acquired" && row.target_type === "icon")
    .map((row) => ({
      notificationId: row.notification_id,
      id: row.target_id,
      name: row.icon_name ?? row.target_id,
      imagePath: toIconNotificationImagePath(row),
    }));

  return items.length > 0 ? { items } : null;
}

function toIconNotificationImagePath(row: UserNotificationRow) {
  if (row.icon_storage_provider === "r2") {
    const notificationId = encodeURIComponent(row.notification_id);
    return `/api/assets/icons/${encodeURIComponent(row.target_id)}?notificationId=${notificationId}`;
  }
  return row.icon_image_path ?? undefined;
}

function toTitleIllustrationAwardNotification(rows: UserNotificationRow[]) {
  const items = rows
    .filter((row) => row.notification_type === "title_illustration_acquired" && row.target_type === "title_illustration")
    .map((row) => ({
      notificationId: row.notification_id,
      id: row.target_id,
      name: row.illustration_name ?? row.target_id,
      imagePath: row.illustration_image_path ?? undefined,
    }));

  return items.length > 0 ? { items } : null;
}

function normalizeNotificationIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const ids = new Set<string>();
  for (const item of value) {
    const id = getString(item).trim();
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

function toRarityStars(rarity: number) {
  const level = Math.min(5, Math.max(1, Math.round(Number(rarity) || 1)));
  return "☆".repeat(level);
}
