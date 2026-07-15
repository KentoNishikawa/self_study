import { NAME_NG_WORDS } from "../../src/core/nameNgWords";
import type { Env } from "./auth/_shared";

type NgNameStreakRow = {
  ng_name_total_counts_json: string | null;
  ng_name_current_streak_counts_json: string | null;
  ng_name_max_streak_counts_json: string | null;
};

export type NgNameDecisionResult = "tracked_ng" | "reset";

const NORMALIZED_NG_NAMES = NAME_NG_WORDS
  .map((word) => String(word ?? "").trim())
  .filter(Boolean);

export function normalizeNgName(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeNgNameForMatch(value: unknown) {
  return normalizeNgName(value).toLowerCase();
}

export function findMatchedNgName(value: unknown) {
  const normalizedName = normalizeNgNameForMatch(value);
  if (!normalizedName) return null;

  for (const ngName of NORMALIZED_NG_NAMES) {
    const normalizedNgName = normalizeNgNameForMatch(ngName);
    if (normalizedNgName && normalizedName.includes(normalizedNgName)) return ngName;
  }

  return null;
}

export function isTrackedNgName(value: unknown) {
  return findMatchedNgName(value) !== null;
}

export async function recordNgNameDecisionForStreak(env: Env, userId: string, name: unknown, now: string): Promise<{ result: NgNameDecisionResult; ngName: string | null }> {
  await ensureUserStatsRows(env, userId, now);

  const matchedNgName = findMatchedNgName(name);
  if (!matchedNgName) {
    await resetNgNameCurrentStreak(env, userId, now);
    return { result: "reset", ngName: null };
  }

  const row = await env.DB.prepare(
    `
    SELECT
      ng_name_total_counts_json,
      ng_name_current_streak_counts_json,
      ng_name_max_streak_counts_json
    FROM user_stats_global
    WHERE user_id = ?
    LIMIT 1
    `,
  )
    .bind(userId)
    .first<NgNameStreakRow>();

  const totalCounts = readJsonNumberMap(row?.ng_name_total_counts_json);
  const currentStreaks = readJsonNumberMap(row?.ng_name_current_streak_counts_json);
  const maxStreaks = readJsonNumberMap(row?.ng_name_max_streak_counts_json);
  const nextCurrent = Math.floor((currentStreaks[matchedNgName] ?? 0) + 1);

  totalCounts[matchedNgName] = Math.floor((totalCounts[matchedNgName] ?? 0) + 1);
  maxStreaks[matchedNgName] = Math.max(Math.floor(maxStreaks[matchedNgName] ?? 0), nextCurrent);

  await env.DB.prepare(
    `
    UPDATE user_stats_global
    SET
      ng_name_total_counts_json = ?,
      ng_name_current_streak_counts_json = ?,
      ng_name_max_streak_counts_json = ?,
      updated_at = ?
    WHERE user_id = ?
    `,
  )
    .bind(
      JSON.stringify(totalCounts),
      JSON.stringify({ [matchedNgName]: nextCurrent }),
      JSON.stringify(maxStreaks),
      now,
      userId,
    )
    .run();

  return { result: "tracked_ng", ngName: matchedNgName };
}

async function resetNgNameCurrentStreak(env: Env, userId: string, now: string) {
  await env.DB.prepare(
    `
    UPDATE user_stats_global
    SET
      ng_name_current_streak_counts_json = '{}',
      updated_at = ?
    WHERE user_id = ?
    `,
  )
    .bind(now, userId)
    .run();
}

async function ensureUserStatsRows(env: Env, userId: string, now: string) {
  await env.DB.prepare("INSERT OR IGNORE INTO user_stats_solo (user_id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(userId, now, now)
    .run();
  await env.DB.prepare("INSERT OR IGNORE INTO user_stats_multi (user_id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(userId, now, now)
    .run();
  await env.DB.prepare("INSERT OR IGNORE INTO user_stats_global (user_id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(userId, now, now)
    .run();
}

function readJsonNumberMap(value: string | null | undefined): Record<string, number> {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, number> = {};
    for (const [key, rawValue] of Object.entries(parsed)) {
      const normalizedKey = key.trim();
      const numberValue = Number(rawValue);
      if (!normalizedKey || !Number.isFinite(numberValue) || numberValue <= 0) continue;
      result[normalizedKey] = Math.floor(numberValue);
    }
    return result;
  } catch {
    return {};
  }
}
