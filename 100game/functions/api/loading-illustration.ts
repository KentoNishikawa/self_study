import { findActiveSession, json, nowIso, type Env, type PagesContext } from "./auth/_shared";
import { ensureCollectionSeed } from "./user-collections";

type AppearanceMode = "auto" | "manual";

type LoadingIllustrationRow = {
  illustration_id: string;
  illustration_name: string;
  image_path: string;
  storage_provider: string;
  required_title_id: string | null;
  appearance_mode: string;
  manual_unviewed_rate: number | null;
  manual_viewed_rate: number | null;
  condition_type: string;
  condition_params_json: string | null;
  is_rare: number;
  first_viewed_at: string | null;
  display_count: number | null;
};

type UserTitleRow = {
  title_id: string;
  title_code: string;
};

type LoadingConditionParams = {
  titleId?: unknown;
  titleIds?: unknown;
  titleCode?: unknown;
  titleCodes?: unknown;
};

type CandidateViewState = "unviewed" | "viewed";

const FALLBACK_AUTH_LOADING_IMAGE = "/assets/loading-illustrations/01_load.png";

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  await ensureCollectionSeed(env, session.user_id);

  const illustration = await pickLoadingIllustration(env, session.user_id);
  if (!illustration) {
    return json({ ok: true, imagePath: FALLBACK_AUTH_LOADING_IMAGE });
  }

  await recordLoadingIllustrationView(env, session.user_id, illustration.illustration_id);

  return json({
    ok: true,
    illustrationId: illustration.illustration_id,
    imagePath: toLoadingIllustrationImagePath(illustration),
  });
}

function toLoadingIllustrationImagePath(illustration: LoadingIllustrationRow) {
  if (illustration.storage_provider === "r2") {
    return `/api/assets/loading-illustrations/${encodeURIComponent(illustration.illustration_id)}`;
  }

  return illustration.image_path;
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
}

async function pickLoadingIllustration(env: Env, userId: string) {
  const [illustrations, userTitles] = await Promise.all([
    readLoadingIllustrations(env, userId),
    readUserTitles(env, userId),
  ]);

  const titleIds = new Set(userTitles.map((title) => title.title_id));
  const titleCodes = new Set(userTitles.map((title) => title.title_code));
  const candidates = illustrations.filter((illustration) => isLoadingIllustrationEligible(illustration, titleIds, titleCodes));
  if (candidates.length <= 0) return null;

  return pickByAppearanceSettings(candidates);
}

async function readLoadingIllustrations(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      title_illustrations.illustration_id,
      title_illustrations.illustration_name,
      title_illustrations.image_path,
      title_illustrations.storage_provider,
      title_illustrations.required_title_id,
      title_illustrations.appearance_mode,
      title_illustrations.manual_unviewed_rate,
      title_illustrations.manual_viewed_rate,
      title_illustrations.condition_type,
      title_illustrations.condition_params_json,
      title_illustrations.is_rare,
      user_title_illustrations.first_viewed_at,
      user_title_illustrations.display_count
    FROM title_illustrations
    LEFT JOIN user_title_illustrations
      ON user_title_illustrations.illustration_id = title_illustrations.illustration_id
      AND user_title_illustrations.user_id = ?
    WHERE title_illustrations.is_active = 1
      AND title_illustrations.deleted_at IS NULL
    ORDER BY title_illustrations.sort_order ASC, title_illustrations.illustration_id ASC
    `,
  )
    .bind(userId)
    .all<LoadingIllustrationRow>();

  return result.results ?? [];
}

async function readUserTitles(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT titles.title_id, titles.title_code
    FROM user_titles
    INNER JOIN titles
      ON titles.title_id = user_titles.title_id
    WHERE user_titles.user_id = ?
      AND titles.is_active = 1
    `,
  )
    .bind(userId)
    .all<UserTitleRow>();

  return result.results ?? [];
}

function isLoadingIllustrationEligible(
  illustration: LoadingIllustrationRow,
  titleIds: Set<string>,
  titleCodes: Set<string>,
) {
  if (Number(illustration.is_rare) === 1) return false;

  const requiredTitleId = illustration.required_title_id?.trim();
  if (requiredTitleId) return titleIds.has(requiredTitleId);

  if (illustration.condition_type === "initial_grant") return true;

  if (illustration.condition_type !== "title_owned") return false;

  const params = parseConditionParams(illustration.condition_params_json);
  if (!params) return false;

  const requiredTitleIds = normalizeStringValues(params.titleIds, params.titleId);
  const requiredTitleCodes = normalizeStringValues(params.titleCodes, params.titleCode);

  if (requiredTitleIds.length <= 0 && requiredTitleCodes.length <= 0) return false;

  return (
    requiredTitleIds.some((titleId) => titleIds.has(titleId)) ||
    requiredTitleCodes.some((titleCode) => titleCodes.has(titleCode))
  );
}

function parseConditionParams(value: string | null): LoadingConditionParams | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as LoadingConditionParams;
  } catch {
    return null;
  }
}

function normalizeStringValues(arrayValue: unknown, singleValue: unknown) {
  const values: string[] = [];

  if (Array.isArray(arrayValue)) {
    for (const value of arrayValue) {
      if (typeof value !== "string") continue;
      const normalized = value.trim();
      if (normalized) values.push(normalized);
    }
  }

  if (typeof singleValue === "string") {
    const normalized = singleValue.trim();
    if (normalized) values.push(normalized);
  }

  return values;
}

function pickByAppearanceSettings(items: LoadingIllustrationRow[]) {
  const unviewed = items.filter((item) => !item.first_viewed_at);
  const viewed = items.filter((item) => Boolean(item.first_viewed_at));

  if (unviewed.length <= 0) return pickWithinViewState(viewed, "viewed");
  if (viewed.length <= 0) return pickWithinViewState(unviewed, "unviewed");

  const unviewedWeight = viewStateGroupWeight(unviewed, "unviewed");
  const viewedWeight = viewStateGroupWeight(viewed, "viewed");
  const totalWeight = unviewedWeight + viewedWeight;
  if (totalWeight <= 0) return null;

  const group = Math.random() * totalWeight < unviewedWeight ? unviewed : viewed;
  const state: CandidateViewState = group === unviewed ? "unviewed" : "viewed";
  return pickWithinViewState(group, state);
}

function viewStateGroupWeight(items: LoadingIllustrationRow[], state: CandidateViewState) {
  let total = 0;
  const autoItems = items.filter((item) => readAppearanceMode(item) === "auto");
  if (autoItems.length > 0) total += state === "unviewed" ? 70 : 30;

  for (const item of items) {
    if (readAppearanceMode(item) !== "manual") continue;
    total += manualRate(item, state);
  }

  return total;
}

function pickWithinViewState(items: LoadingIllustrationRow[], state: CandidateViewState) {
  const manualItems = items
    .filter((item) => readAppearanceMode(item) === "manual")
    .map((item) => ({ item, rate: manualRate(item, state) }))
    .filter((entry) => entry.rate > 0);
  const autoItems = items.filter((item) => readAppearanceMode(item) === "auto");

  const totalManualRate = manualItems.reduce((sum, entry) => sum + entry.rate, 0);
  if (totalManualRate <= 0) return pickRandomItem(autoItems);

  if (totalManualRate >= 100 || autoItems.length <= 0) {
    return pickWeightedManualItem(manualItems);
  }

  const threshold = Math.random() * 100;
  if (threshold < totalManualRate) {
    return pickWeightedManualItem(manualItems);
  }

  return pickRandomItem(autoItems);
}

function pickRandomItem(items: LoadingIllustrationRow[]) {
  if (items.length <= 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function pickWeightedManualItem(items: { item: LoadingIllustrationRow; rate: number }[]) {
  const totalRate = items.reduce((sum, entry) => sum + entry.rate, 0);
  if (totalRate <= 0) return null;

  let threshold = Math.random() * totalRate;
  for (const entry of items) {
    threshold -= entry.rate;
    if (threshold <= 0) return entry.item;
  }

  return items[items.length - 1]?.item ?? null;
}

function manualRate(item: LoadingIllustrationRow, state: CandidateViewState) {
  const rawRate = state === "unviewed" ? item.manual_unviewed_rate : item.manual_viewed_rate;
  const rate = Number(rawRate ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.min(rate, 100);
}

function readAppearanceMode(item: LoadingIllustrationRow): AppearanceMode {
  return item.appearance_mode === "manual" ? "manual" : "auto";
}

async function recordLoadingIllustrationView(env: Env, userId: string, illustrationId: string) {
  const now = nowIso();

  await env.DB.prepare(
    `
    INSERT INTO user_title_illustrations (
      user_id, illustration_id, acquired_at, first_viewed_at, last_viewed_at,
      display_count, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, illustration_id) DO UPDATE SET
      first_viewed_at = COALESCE(user_title_illustrations.first_viewed_at, excluded.first_viewed_at),
      last_viewed_at = excluded.last_viewed_at,
      display_count = user_title_illustrations.display_count + 1,
      updated_at = excluded.updated_at
    `,
  )
    .bind(userId, illustrationId, now, now, now, now, now)
    .run();
}
