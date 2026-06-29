import type { IconAwardNotification, TitleAwardNotification } from "../ui/userHome";

type NotificationItemWithId = {
  notificationId?: string;
};

type UserNotificationsApiResponse = {
  ok?: boolean;
  message?: string;
  titleAwardNotification?: TitleAwardNotification | null;
  iconAwardNotification?: IconAwardNotification | null;
};

let pendingTitleAwardNotification: TitleAwardNotification | null = null;
let pendingIconAwardNotification: IconAwardNotification | null = null;

export async function loadUserNotificationsFromApi(): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch("/api/user-notifications", {
      method: "GET",
      credentials: "include",
    });
  } catch {
    resetUserNotificationsCache();
    return false;
  }

  let result: UserNotificationsApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null) result = parsed as UserNotificationsApiResponse;
  } catch {
    // no-op
  }

  if (!response.ok || result.ok === false) {
    resetUserNotificationsCache();
    return false;
  }

  pendingTitleAwardNotification = normalizeTitleAwardNotification(result.titleAwardNotification);
  pendingIconAwardNotification = normalizeIconAwardNotification(result.iconAwardNotification);
  return true;
}

export function getPendingTitleAwardNotification(): TitleAwardNotification | null {
  return pendingTitleAwardNotification;
}

export function getPendingIconAwardNotification(): IconAwardNotification | null {
  return pendingIconAwardNotification;
}

export async function markPendingTitleNotificationsRead(): Promise<boolean> {
  const ids = extractNotificationIds(pendingTitleAwardNotification?.items);
  pendingTitleAwardNotification = null;
  if (ids.length === 0) return true;

  return markUserNotificationsRead(ids);
}

export async function markPendingIconNotificationsRead(): Promise<boolean> {
  const ids = extractNotificationIds(pendingIconAwardNotification?.items);
  pendingIconAwardNotification = null;
  if (ids.length === 0) return true;

  return markUserNotificationsRead(ids);
}

export function resetUserNotificationsCache() {
  pendingTitleAwardNotification = null;
  pendingIconAwardNotification = null;
}

async function markUserNotificationsRead(notificationIds: string[]): Promise<boolean> {
  try {
    const response = await fetch("/api/user-notifications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

function normalizeTitleAwardNotification(value: TitleAwardNotification | null | undefined): TitleAwardNotification | null {
  if (!value || !Array.isArray(value.items)) return null;

  const items = value.items.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.rarity === "string");
  return items.length > 0 ? { items } : null;
}

function normalizeIconAwardNotification(value: IconAwardNotification | null | undefined): IconAwardNotification | null {
  if (!value || !Array.isArray(value.items)) return null;

  const items = value.items.filter((item) => item && typeof item.id === "string" && typeof item.name === "string");
  return items.length > 0 ? { items } : null;
}

function extractNotificationIds(items: (NotificationItemWithId | null | undefined)[] | undefined): string[] {
  if (!items) return [];

  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.notificationId !== "string") continue;

    const notificationId = item.notificationId.trim();
    if (notificationId) ids.add(notificationId);
  }

  return Array.from(ids);
}
