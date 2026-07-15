import { NPC_ICON_ID, resolveIconId } from "../icons/iconPresets";
import { activateAuthenticatedSoundScope, setAuthenticatedSoundVolumeLevel } from "./sound";
export const DEFAULT_USER_PLAYER_NAME = "プレイヤー";
export const MAX_PLAYER_NAME_LENGTH = 15;
const USER_PLAYER_NAME_KEY = "100game.settings.playerName";
const PREVIOUS_USER_PLAYER_NAME_KEY = "100game.settings.previousPlayerName";
const USER_ICON_ID_KEY = "100game.settings.iconId";
const LEGACY_USER_ICON_ID_KEY = "100game.iconId";
const USER_TITLE_ID_KEY = "100game.selectedTitleId";
const SOUND_VOLUME_LEVEL_KEY = "100game.settings.soundVolumeLevel";

export const DEFAULT_USER_TITLE_ID = "title-start-001";
export const DEFAULT_SOUND_VOLUME_LEVEL = 3;
let isUserSettingsCacheActive = false;
let userSettingsCacheVersion = 0;

export type SoundVolumeLevel = 1 | 2 | 3 | 4 | 5;

export type UserSettingsSnapshot = {
  displayName: string;
  previousDisplayName: string | null;
  currentIconId: string | null;
  currentTitleId: string | null;
  soundVolumeLevel: SoundVolumeLevel;
};

export type UserSettingsPatch = Partial<{
  displayName: string;
  currentIconId: string | null;
  currentTitleId: string | null;
  soundVolumeLevel: SoundVolumeLevel;
}>;

type UserSettingsApiResponse = {
  ok?: boolean;
  message?: string;
  settings?: Partial<UserSettingsSnapshot>;
};

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

function removeLocalStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

function normalizePlayerName(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_PLAYER_NAME_LENGTH).join("");
}

function normalizeSoundVolumeLevel(level: unknown): SoundVolumeLevel {
  const raw = Number(level);
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
  return DEFAULT_SOUND_VOLUME_LEVEL;
}

export function activateUserSettingsCache() {
  isUserSettingsCacheActive = true;
  activateAuthenticatedSoundScope(normalizeSoundVolumeLevel(readLocalStorage(SOUND_VOLUME_LEVEL_KEY)));
}

export function deactivateUserSettingsCache() {
  isUserSettingsCacheActive = false;
  userSettingsCacheVersion += 1;
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
  const savedIconId = readLocalStorage(USER_ICON_ID_KEY)?.trim();
  if (savedIconId) return savedIconId;

  const legacyIconId = readLocalStorage(LEGACY_USER_ICON_ID_KEY);
  if (legacyIconId) return resolveIconId(legacyIconId);

  return NPC_ICON_ID;
}

export function setUserIconId(nextIconId: string): string {
  const normalized = String(nextIconId || NPC_ICON_ID).trim() || NPC_ICON_ID;
  writeLocalStorage(USER_ICON_ID_KEY, normalized);
  return normalized;
}

export function getUserTitleId(): string {
  return readLocalStorage(USER_TITLE_ID_KEY) || DEFAULT_USER_TITLE_ID;
}

export function setUserTitleId(nextTitleId: string): string {
  const normalized = String(nextTitleId || DEFAULT_USER_TITLE_ID);
  writeLocalStorage(USER_TITLE_ID_KEY, normalized);
  return normalized;
}

export function getSoundVolumeLevel(): SoundVolumeLevel {
  if (!isUserSettingsCacheActive) return DEFAULT_SOUND_VOLUME_LEVEL;
  return normalizeSoundVolumeLevel(readLocalStorage(SOUND_VOLUME_LEVEL_KEY));
}

export function setSoundVolumeLevel(level: number): SoundVolumeLevel {
  const normalized = Math.min(5, Math.max(1, Math.round(Number(level) || 3))) as SoundVolumeLevel;
  writeLocalStorage(SOUND_VOLUME_LEVEL_KEY, String(normalized));
  setAuthenticatedSoundVolumeLevel(normalized);
  return normalized;
}

export function soundVolumeLevelToAudioVolume(level: SoundVolumeLevel): number {
  return level / 5;
}

export async function loadUserSettingsFromApi(): Promise<UserSettingsSnapshot | null> {
  const cacheVersion = userSettingsCacheVersion;
  const response = await fetchUserSettings("GET");
  if (cacheVersion !== userSettingsCacheVersion) return null;
  if (!response.settings) return null;
  return applyUserSettingsSnapshot(response.settings);
}

export async function updateUserSettingsOnApi(patch: UserSettingsPatch): Promise<UserSettingsSnapshot> {
  const cacheVersion = userSettingsCacheVersion;
  const response = await fetchUserSettings("PATCH", patch);
  if (cacheVersion !== userSettingsCacheVersion || !isUserSettingsCacheActive) throw new Error("設定の保存状態が切り替わりました。");
  if (!response.settings) throw new Error(response.message ?? "設定の保存に失敗しました。");
  return applyUserSettingsSnapshot(response.settings);
}

export function clearUserSettingsCache() {
  deactivateUserSettingsCache();
  removeLocalStorage(USER_PLAYER_NAME_KEY);
  removeLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY);
  removeLocalStorage(USER_ICON_ID_KEY);
  removeLocalStorage(LEGACY_USER_ICON_ID_KEY);
  removeLocalStorage(USER_TITLE_ID_KEY);
  removeLocalStorage(SOUND_VOLUME_LEVEL_KEY);
}

function applyUserSettingsSnapshot(settings: Partial<UserSettingsSnapshot>): UserSettingsSnapshot {
  activateUserSettingsCache();

  const displayName = normalizePlayerName(settings.displayName) ?? DEFAULT_USER_PLAYER_NAME;
  const previousDisplayName = normalizePlayerName(settings.previousDisplayName);
  const currentIconId = settings.currentIconId ? String(settings.currentIconId).trim() || null : null;
  const currentTitleId = settings.currentTitleId || DEFAULT_USER_TITLE_ID;
  const soundVolumeLevel = normalizeSoundVolumeLevel(settings.soundVolumeLevel);

  writeLocalStorage(USER_PLAYER_NAME_KEY, displayName);
  if (previousDisplayName) writeLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY, previousDisplayName);
  else removeLocalStorage(PREVIOUS_USER_PLAYER_NAME_KEY);
  if (currentIconId) writeLocalStorage(USER_ICON_ID_KEY, currentIconId);
  else removeLocalStorage(USER_ICON_ID_KEY);
  writeLocalStorage(USER_TITLE_ID_KEY, currentTitleId);
  writeLocalStorage(SOUND_VOLUME_LEVEL_KEY, String(soundVolumeLevel));
  activateAuthenticatedSoundScope(soundVolumeLevel);

  return {
    displayName,
    previousDisplayName,
    currentIconId,
    currentTitleId,
    soundVolumeLevel,
  };
}

async function fetchUserSettings(method: "GET" | "PATCH", patch?: UserSettingsPatch): Promise<UserSettingsApiResponse> {
  let response: Response;

  try {
    response = await fetch("/api/user-settings", {
      method,
      headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      body: method === "PATCH" ? JSON.stringify(patch ?? {}) : undefined,
    });
  } catch {
    throw new Error("通信に失敗しました。時間をおいて再度お試しください。");
  }

  let result: UserSettingsApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (typeof parsed === "object" && parsed !== null) result = parsed as UserSettingsApiResponse;
  } catch {
    // no-op
  }

  if (!response.ok || result.ok === false) {
    throw new Error(result.message ?? "設定の取得または保存に失敗しました。");
  }

  return result;
}
