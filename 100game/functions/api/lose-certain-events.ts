import { grantAutomaticAcquisitions } from "./_auto-acquisition";
import { findActiveSession, json, nowIso, readJsonRecord, type Env, type PagesContext } from "./auth/_shared";

type StatsRow = Record<string, number | string | null> & { user_id: string };

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const body = await readJsonRecord(request);
  const counts = normalizeCounts(body && typeof body === "object" ? (body as Record<string, unknown>).counts : null);
  if (Object.keys(counts).length === 0) {
    return json({ ok: true, skipped: true });
  }

  const now = nowIso();
  await ensureGlobalStats(env, session.user_id, now);

  const current = await env.DB.prepare("SELECT * FROM user_stats_global WHERE user_id = ? LIMIT 1")
    .bind(session.user_id)
    .first<StatsRow>();
  if (!current) return json({ ok: false, message: "ユーザー戦績を取得できませんでした。" }, { status: 500 });

  const merged = mergeJsonNumberMaps(readOptionalString(current.lose_certain_event_counts_json), counts);
  await env.DB.prepare("UPDATE user_stats_global SET lose_certain_event_counts_json = ?, updated_at = ? WHERE user_id = ?")
    .bind(merged, now, session.user_id)
    .run();

  await grantAutomaticAcquisitions(env, session.user_id, {
    acquiredAt: now,
    matchStats: null,
    matchAchievementKeys: [],
  });

  return json({ ok: true });
}

function normalizeCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const normalizedKey = key.trim();
    const amount = Math.floor(Number(rawValue));
    if (!normalizedKey || !Number.isFinite(amount) || amount <= 0) continue;
    if (!isAllowedLoseCertainEventKey(normalizedKey)) continue;
    result[normalizedKey] = amount;
  }
  return result;
}

function isAllowedLoseCertainEventKey(key: string) {
  return new Set([
    "creator:any",
    "creator:self_exit",
    "creator:target_exit",
    "creator:target_spade3",
    "creator:target_dead",
    "target:any",
    "target:self_exit",
    "target:creator_exit",
    "target:self_spade3",
    "target:self_dead",
    "witness:any",
    "witness:creator_exit",
    "witness:target_exit",
    "witness:target_spade3",
    "witness:target_dead",
  ]).has(key);
}

async function ensureGlobalStats(env: Env, userId: string, now: string) {
  await env.DB.prepare("INSERT OR IGNORE INTO user_stats_global (user_id, created_at, updated_at) VALUES (?, ?, ?)")
    .bind(userId, now, now)
    .run();
}

function mergeJsonNumberMaps(currentJson: string | null | undefined, additions: Record<string, number>) {
  const map = readJsonNumberMap(currentJson);
  for (const [key, amount] of Object.entries(additions)) {
    map[key] = (map[key] ?? 0) + amount;
  }
  return JSON.stringify(map);
}

function readJsonNumberMap(value: string | null | undefined): Record<string, number> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, number> = {};
    for (const [key, rawValue] of Object.entries(parsed)) {
      const normalizedKey = key.trim();
      const numberValue = Math.floor(Number(rawValue));
      if (!normalizedKey || !Number.isFinite(numberValue) || numberValue <= 0) continue;
      result[normalizedKey] = numberValue;
    }
    return result;
  } catch {
    return {};
  }
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
