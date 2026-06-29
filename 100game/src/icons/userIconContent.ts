import { USER_ICON_DEFINITIONS, type UserIconDefinition } from "../core/userCollections";
import { DEFAULT_PLAYER_ICON_ID, PLAYER_ICON_PRESETS, iconContentHtml, resolveIconId } from "./iconPresets";

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

  const resolvedIconId = resolveIconId(rawIconId, DEFAULT_PLAYER_ICON_ID);
  return USER_ICON_DEFINITIONS.find((icon) => icon.id === resolvedIconId);
}

export function resolveUserIconId(iconId: unknown, fallbackId: string = DEFAULT_PLAYER_ICON_ID): string {
  const rawIconId = typeof iconId === "string" ? iconId.trim() : "";
  if (rawIconId && USER_ICON_DEFINITIONS.some((icon) => icon.id === rawIconId)) return rawIconId;
  return resolveIconId(rawIconId || fallbackId, fallbackId);
}

export function userIconContentHtml(iconId: unknown, sizePx: number, fallbackId?: string): string {
  const icon = findUserIconDefinition(iconId) ?? findUserIconDefinition(fallbackId);
  const imagePath = typeof icon?.imagePath === "string" ? icon.imagePath.trim() : "";

  if (imagePath && isDirectIconImagePath(imagePath)) {
    const alt = icon?.name || "プレイヤーアイコン";
    return `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(alt)}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;" />`;
  }

  return iconContentHtml(imagePath || iconId, sizePx, fallbackId);
}

export function getSelectableUserIconDefinitions(): Array<Pick<UserIconDefinition, "id" | "name" | "imagePath">> {
  const ownedIcons = USER_ICON_DEFINITIONS.filter((icon) => icon.owned);
  if (ownedIcons.length > 0) return ownedIcons;

  return PLAYER_ICON_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.label,
    imagePath: preset.src ?? preset.id,
  }));
}
