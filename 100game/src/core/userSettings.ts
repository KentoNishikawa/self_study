import { DEFAULT_PLAYER_ICON_ID, resolveIconId } from "../icons/iconPresets";
export const DEFAULT_USER_PLAYER_NAME = "プレイヤー";
export const MAX_PLAYER_NAME_LENGTH = 15;
const USER_PLAYER_NAME_KEY = "100game.settings.playerName";
const PREVIOUS_USER_PLAYER_NAME_KEY = "100game.settings.previousPlayerName";
const USER_ICON_ID_KEY = "100game.settings.iconId";
const LEGACY_USER_ICON_ID_KEY = "100game.iconId";
const SOUND_VOLUME_LEVEL_KEY = "100game.settings.soundVolumeLevel";

export type SoundVolumeLevel = 1 | 2 | 3 | 4 | 5;

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

function normalizePlayerName(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_PLAYER_NAME_LENGTH).join("");
}

export function countPlayerNameChars(value: string): number {
  return Array.from(value.trim()).length;
}

export function getUserPlayerName(): string {
  return normalizePlayerName(readLocalStorage(USER_PLAYER_NAME_KEY)) ?? DEFAULT_USER_PLAYER_NAME;
}

export function hasChangedUserPlayerName(): boolean {
  return normalizePlayerName(readLocalStorage(USER_PLAYER_NAME_KEY)) !== null;
}

export function getPreviousUserPlayerName(): string | null {
  return normalizePlayerName(readLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY));
}

export function setUserPlayerName(nextName: string): string {
  const normalized = normalizePlayerName(nextName) ?? DEFAULT_USER_PLAYER_NAME;
  const currentName = getUserPlayerName();

  if (normalized !== currentName) {
    writeLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY, currentName);
    writeLocalStorage(USER_PLAYER_NAME_KEY, normalized);
  }

  return normalized;
}

export function restorePreviousUserPlayerName(): string | null {
  const previousName = getPreviousUserPlayerName();
  if (!previousName) return null;

  const currentName = getUserPlayerName();
  writeLocalStorage(USER_PLAYER_NAME_KEY, previousName);
  writeLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY, currentName);
  return previousName;
}

export function getUserIconId(): string {
  const savedIconId = readLocalStorage(USER_ICON_ID_KEY);
  if (savedIconId) return resolveIconId(savedIconId);

  const legacyIconId = readLocalStorage(LEGACY_USER_ICON_ID_KEY);
  if (legacyIconId) return resolveIconId(legacyIconId);

  return DEFAULT_PLAYER_ICON_ID;
}

export function setUserIconId(nextIconId: string): string {
  const normalized = resolveIconId(nextIconId);
  writeLocalStorage(USER_ICON_ID_KEY, normalized);
  return normalized;
}

export function getSoundVolumeLevel(): SoundVolumeLevel {
  const raw = Number(readLocalStorage(SOUND_VOLUME_LEVEL_KEY));
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
  return 3;
}

export function setSoundVolumeLevel(level: number): SoundVolumeLevel {
  const normalized = Math.min(5, Math.max(1, Math.round(Number(level) || 3))) as SoundVolumeLevel;
  writeLocalStorage(SOUND_VOLUME_LEVEL_KEY, String(normalized));
  return normalized;
}

export function soundVolumeLevelToAudioVolume(level: SoundVolumeLevel): number {
  return level / 5;
}
