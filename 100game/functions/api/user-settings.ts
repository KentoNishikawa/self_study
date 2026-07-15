import { findActiveSession, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

type UserSettingsRow = {
  user_id: string;
  display_name: string;
  previous_display_name: string | null;
  current_icon_id: string | null;
  current_title_id: string | null;
  sound_volume_level: number;
  created_at: string;
  updated_at: string;
};

type UserSettingsPatch = {
  displayName?: string;
  currentIconId?: string | null;
  currentTitleId?: string | null;
  soundVolumeLevel?: number;
};

type UserSettingsErrors = Partial<Record<"displayName" | "soundVolumeLevel" | "currentIconId" | "currentTitleId", string>>;

const DEFAULT_DISPLAY_NAME = "プレイヤー";
const DEFAULT_SOUND_VOLUME_LEVEL = 3;
const MAX_DISPLAY_NAME_LENGTH = 15;

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const settings = await ensureUserSettings(env, session.user_id);
  return json({ ok: true, settings: toResponseSettings(settings) });
}

export async function onRequestPatch({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const currentSettings = await ensureUserSettings(env, session.user_id);
  const patch = readSettingsPatch(body);
  const errors = validateSettingsPatch(patch);

  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const now = nowIso();
  let displayName = currentSettings.display_name || DEFAULT_DISPLAY_NAME;
  let previousDisplayName = currentSettings.previous_display_name;
  let currentIconId = currentSettings.current_icon_id;
  let currentTitleId = currentSettings.current_title_id;
  let soundVolumeLevel = normalizeSoundVolumeLevel(currentSettings.sound_volume_level);

  if (patch.displayName !== undefined) {
    const nextDisplayName = normalizeDisplayName(patch.displayName) ?? DEFAULT_DISPLAY_NAME;
    if (nextDisplayName !== displayName) {
      previousDisplayName = displayName;
      displayName = nextDisplayName;
    }
  }

  if (patch.currentIconId !== undefined) {
    currentIconId = normalizeNullableText(patch.currentIconId);
    if (currentIconId && !(await ownsIcon(env, session.user_id, currentIconId))) {
      return json({ ok: false, message: "所持していないアイコンは設定できません。", errors: { currentIconId: "所持していないアイコンです。" } }, { status: 400 });
    }
  }

  if (patch.currentTitleId !== undefined) {
    currentTitleId = normalizeNullableText(patch.currentTitleId);
    if (currentTitleId && !(await ownsTitle(env, session.user_id, currentTitleId))) {
      return json({ ok: false, message: "所持していない称号は設定できません。", errors: { currentTitleId: "所持していない称号です。" } }, { status: 400 });
    }
  }

  if (patch.soundVolumeLevel !== undefined) {
    soundVolumeLevel = normalizeSoundVolumeLevel(patch.soundVolumeLevel);
  }

  await env.DB.prepare(
    `
    UPDATE user_settings
    SET
      display_name = ?,
      previous_display_name = ?,
      current_icon_id = ?,
      current_title_id = ?,
      sound_volume_level = ?,
      updated_at = ?
    WHERE user_id = ?
    `,
  )
    .bind(displayName, previousDisplayName, currentIconId, currentTitleId, soundVolumeLevel, now, session.user_id)
    .run();

  const updatedSettings: UserSettingsRow = {
    ...currentSettings,
    display_name: displayName,
    previous_display_name: previousDisplayName,
    current_icon_id: currentIconId,
    current_title_id: currentTitleId,
    sound_volume_level: soundVolumeLevel,
    updated_at: now,
  };

  return json({ ok: true, settings: toResponseSettings(updatedSettings) });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETまたはPATCH送信のみ対応しています。" }, { status: 405 });
}

async function ensureUserSettings(env: Env, userId: string): Promise<UserSettingsRow> {
  const existingSettings = await env.DB.prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1")
    .bind(userId)
    .first<UserSettingsRow>();

  if (existingSettings) return existingSettings;

  const now = nowIso();
  const settings: UserSettingsRow = {
    user_id: userId,
    display_name: DEFAULT_DISPLAY_NAME,
    previous_display_name: null,
    current_icon_id: null,
    current_title_id: null,
    sound_volume_level: DEFAULT_SOUND_VOLUME_LEVEL,
    created_at: now,
    updated_at: now,
  };

  await env.DB.prepare(
    `
    INSERT INTO user_settings (
      user_id,
      display_name,
      previous_display_name,
      current_icon_id,
      current_title_id,
      sound_volume_level,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      settings.user_id,
      settings.display_name,
      settings.previous_display_name,
      settings.current_icon_id,
      settings.current_title_id,
      settings.sound_volume_level,
      settings.created_at,
      settings.updated_at,
    )
    .run();

  return settings;
}

async function ownsIcon(env: Env, userId: string, iconId: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT icon_id FROM user_icons WHERE user_id = ? AND icon_id = ? LIMIT 1")
    .bind(userId, iconId)
    .first<{ icon_id: string }>();
  return Boolean(row);
}

async function ownsTitle(env: Env, userId: string, titleId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `
    SELECT user_titles.title_id
    FROM user_titles
    INNER JOIN titles
      ON titles.title_id = user_titles.title_id
      AND titles.deleted_at IS NULL
    WHERE user_titles.user_id = ?
      AND user_titles.title_id = ?
    LIMIT 1
    `,
  )
    .bind(userId, titleId)
    .first<{ title_id: string }>();
  return Boolean(row);
}

function readSettingsPatch(body: Record<string, unknown>): UserSettingsPatch {
  const patch: UserSettingsPatch = {};

  if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
    patch.displayName = getString(body.displayName);
  }

  if (Object.prototype.hasOwnProperty.call(body, "currentIconId")) {
    patch.currentIconId = getNullableString(body.currentIconId);
  }

  if (Object.prototype.hasOwnProperty.call(body, "currentTitleId")) {
    patch.currentTitleId = getNullableString(body.currentTitleId);
  }

  if (Object.prototype.hasOwnProperty.call(body, "soundVolumeLevel")) {
    patch.soundVolumeLevel = Number(body.soundVolumeLevel);
  }

  return patch;
}

function validateSettingsPatch(patch: UserSettingsPatch) {
  const errors: UserSettingsErrors = {};

  if (patch.displayName !== undefined) {
    const displayName = String(patch.displayName ?? "").trim();
    if (!displayName) errors.displayName = "プレイヤーネームを入力してください。";
    else if (Array.from(displayName).length > MAX_DISPLAY_NAME_LENGTH) errors.displayName = `プレイヤーネームは${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください。`;
  }

  if (patch.soundVolumeLevel !== undefined) {
    if (![1, 2, 3, 4, 5].includes(patch.soundVolumeLevel)) {
      errors.soundVolumeLevel = "音量は1〜5で指定してください。";
    }
  }

  return errors;
}

function toResponseSettings(settings: UserSettingsRow) {
  return {
    displayName: settings.display_name || DEFAULT_DISPLAY_NAME,
    previousDisplayName: settings.previous_display_name,
    currentIconId: settings.current_icon_id,
    currentTitleId: settings.current_title_id,
    soundVolumeLevel: normalizeSoundVolumeLevel(settings.sound_volume_level),
  };
}

function getNullableString(value: unknown): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : null;
}

function normalizeDisplayName(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_DISPLAY_NAME_LENGTH).join("");
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeSoundVolumeLevel(value: number): 1 | 2 | 3 | 4 | 5 {
  const normalized = Math.min(5, Math.max(1, Math.round(Number(value) || DEFAULT_SOUND_VOLUME_LEVEL)));
  return normalized as 1 | 2 | 3 | 4 | 5;
}
