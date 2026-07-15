import { USER_ICON_DEFINITIONS, getDefaultUserIconId, type UserIconDefinition } from "../core/userCollections";
import { NPC_ICON_ID, iconContentHtml, resolveIconId } from "./iconPresets";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isDirectIconImagePath(imagePath: string): boolean {
  return /^(?:https?:|data:|blob:)/.test(imagePath) || imagePath.startsWith("/") || imagePath.startsWith("./") || imagePath.startsWith("../");
}

export function findUserIconDefinition(iconId: unknown): UserIconDefinition | undefined {
  const rawIconId = typeof iconId === "string" ? iconId.trim() : "";
  const directMatch = USER_ICON_DEFINITIONS.find((icon) => icon.id === rawIconId);
  if (directMatch) return directMatch;

  const resolvedIconId = resolveIconId(rawIconId, NPC_ICON_ID);
  return USER_ICON_DEFINITIONS.find((icon) => icon.id === resolvedIconId);
}

export function resolveUserIconId(iconId: unknown): string {
  const rawIconId = typeof iconId === "string" ? iconId.trim() : "";
  if (rawIconId && USER_ICON_DEFINITIONS.some((icon) => icon.id === rawIconId)) return rawIconId;
  return NPC_ICON_ID;
}

export function getFirstSelectableUserIconId(): string {
  return USER_ICON_DEFINITIONS.find((icon) => icon.owned)?.id ?? NPC_ICON_ID;
}

export function getGuestDefaultUserIconId(): string {
  const defaultIconId = getDefaultUserIconId();
  if (defaultIconId && USER_ICON_DEFINITIONS.some((icon) => icon.id === defaultIconId && icon.owned)) return defaultIconId;
  return NPC_ICON_ID;
}

export function getDefaultSelectableUserIconId(): string {
  const defaultIconId = getDefaultUserIconId();
  if (defaultIconId && USER_ICON_DEFINITIONS.some((icon) => icon.id === defaultIconId && icon.owned)) return defaultIconId;
  return getFirstSelectableUserIconId();
}

export function resolveSelectableUserIconId(iconId: unknown): string {
  const rawIconId = typeof iconId === "string" ? iconId.trim() : "";
  if (rawIconId && USER_ICON_DEFINITIONS.some((icon) => icon.id === rawIconId && icon.owned)) return rawIconId;
  return getFirstSelectableUserIconId();
}

export function userIconContentHtml(iconId: unknown, sizePx: number, fallbackId?: string): string {
  const icon = findUserIconDefinition(iconId) ?? findUserIconDefinition(fallbackId);
  const imagePath = typeof icon?.imagePath === "string" ? icon.imagePath.trim() : "";

  if (imagePath && isDirectIconImagePath(imagePath)) {
    const alt = icon?.name || "プレイヤーアイコン";
    return `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(alt)}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;" />`;
  }

  return iconContentHtml(imagePath || icon?.id || fallbackId || NPC_ICON_ID, sizePx, fallbackId ?? NPC_ICON_ID);
}

export function getSelectableUserIconDefinitions(): Array<Pick<UserIconDefinition, "id" | "name" | "imagePath">> {
  return USER_ICON_DEFINITIONS.filter((icon) => icon.owned);
}
