import { evaluateCondition, type ConditionEvaluationContext, type StatsRow } from "./_condition-engine";
import { createAcquiredNotification } from "./user-notifications";
import type { Env } from "./auth/_shared";

type AcquisitionMasterRow = {
  target_id: string;
  condition_type: string;
  condition_params_json: string | null;
};

type StatsDbRow = Record<string, number | string | null> & {
  user_id: string;
};

export type AutomaticAcquisitionOptions = {
  acquiredAt: string;
  matchStats?: StatsRow | null;
  matchAchievementKeys?: readonly string[];
};

export type AutomaticAcquisitionResult = {
  grantedTitleIds: string[];
  grantedIconIds: string[];
};

export async function grantAutomaticAcquisitions(
  env: Env,
  userId: string,
  options: AutomaticAcquisitionOptions,
): Promise<AutomaticAcquisitionResult> {
  const context = await buildConditionContext(env, userId, options);
  if (!context) {
    return { grantedTitleIds: [], grantedIconIds: [] };
  }

  const grantedTitleIds = await grantAutomaticTitles(env, userId, context, options.acquiredAt);
  for (const titleId of grantedTitleIds) await createAcquiredNotification(env, userId, "title_acquired", titleId);
  const titleRewardIconIds = await grantTitleRewardIcons(env, userId, grantedTitleIds, options.acquiredAt);
  const automaticIconIds = await grantAutomaticIcons(env, userId, context, options.acquiredAt);

  return {
    grantedTitleIds,
    grantedIconIds: uniqueIds([...titleRewardIconIds, ...automaticIconIds]),
  };
}

async function buildConditionContext(
  env: Env,
  userId: string,
  options: AutomaticAcquisitionOptions,
): Promise<ConditionEvaluationContext | null> {
  const [soloStats, multiStats, globalStats, titleAcquiredCount] = await Promise.all([
    readStatsRow(env, "user_stats_solo", userId),
    readStatsRow(env, "user_stats_multi", userId),
    readStatsRow(env, "user_stats_global", userId),
    readActiveTitleAcquiredCount(env, userId),
  ]);

  if (!soloStats || !multiStats || !globalStats) return null;

  return {
    soloStats,
    multiStats,
    globalStats: { ...globalStats, title_acquired_count: titleAcquiredCount },
    matchStats: options.matchStats ?? null,
    matchAchievementKeys: options.matchAchievementKeys ?? [],
  };
}

async function readStatsRow(env: Env, tableName: "user_stats_solo" | "user_stats_multi" | "user_stats_global", userId: string) {
  return await env.DB.prepare(`SELECT * FROM ${tableName} WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<StatsDbRow>();
}

async function readActiveTitleAcquiredCount(env: Env, userId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM user_titles
    INNER JOIN titles
      ON titles.title_id = user_titles.title_id
      AND titles.deleted_at IS NULL
      AND titles.is_active = 1
    WHERE user_titles.user_id = ?
    `,
  )
    .bind(userId)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

async function grantAutomaticTitles(env: Env, userId: string, context: ConditionEvaluationContext, acquiredAt: string) {
  let candidates = await readTitleCandidates(env, userId);
  const grantedTitleIds: string[] = [];
  const maxRounds = candidates.length;

  for (let round = 0; round < maxRounds && candidates.length > 0; round += 1) {
    const grantedThisRound: string[] = [];
    const remaining: AcquisitionMasterRow[] = [];

    for (const candidate of candidates) {
      if (!evaluateCondition(candidate, context)) {
        remaining.push(candidate);
        continue;
      }

      const result = await env.DB.prepare(
        `
        INSERT OR IGNORE INTO user_titles (user_id, title_id, acquired_at, created_at)
        VALUES (?, ?, ?, ?)
        `,
      )
        .bind(userId, candidate.target_id, acquiredAt, acquiredAt)
        .run() as { meta?: { changes?: number } };

      if (Number(result.meta?.changes ?? 0) <= 0) continue;
      grantedThisRound.push(candidate.target_id);
      grantedTitleIds.push(candidate.target_id);
    }

    if (grantedThisRound.length === 0) break;
    const currentCount = Number(context.globalStats?.title_acquired_count ?? 0);
    if (context.globalStats) context.globalStats.title_acquired_count = currentCount + grantedThisRound.length;
    candidates = remaining;
  }

  return grantedTitleIds;
}

async function grantAutomaticIcons(env: Env, userId: string, context: ConditionEvaluationContext, acquiredAt: string) {
  const candidates = await readIconCandidates(env, userId);
  const grantedIconIds: string[] = [];

  for (const candidate of candidates) {
    if (!evaluateCondition(candidate, context)) continue;

    const granted = await grantIconIfMissing(env, userId, candidate.target_id, acquiredAt);
    if (granted) grantedIconIds.push(candidate.target_id);
  }

  return grantedIconIds;
}

async function grantTitleRewardIcons(env: Env, userId: string, titleIds: string[], acquiredAt: string) {
  if (titleIds.length === 0) return [];

  const grantedIconIds: string[] = [];
  const checkedIconIds = new Set<string>();

  for (const titleId of titleIds) {
    const rewardIconIds = await readTitleRewardIconIds(env, titleId);

    for (const iconId of rewardIconIds) {
      if (checkedIconIds.has(iconId)) continue;
      checkedIconIds.add(iconId);

      const granted = await grantIconIfMissing(env, userId, iconId, acquiredAt);
      if (granted) grantedIconIds.push(iconId);
    }
  }

  return grantedIconIds;
}

async function grantIconIfMissing(env: Env, userId: string, iconId: string, acquiredAt: string) {
  const owned = await env.DB.prepare(
    `
    SELECT 1 AS owned
    FROM user_icons
    WHERE user_id = ?
      AND icon_id = ?
    LIMIT 1
    `,
  )
    .bind(userId, iconId)
    .first<{ owned: number }>();

  if (owned?.owned) return false;

  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at)
    VALUES (?, ?, ?, ?)
    `,
  )
    .bind(userId, iconId, acquiredAt, acquiredAt)
    .run();

  await createAcquiredNotification(env, userId, "icon_acquired", iconId);
  return true;
}

async function readTitleRewardIconIds(env: Env, titleId: string) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    WHERE title_icon_rewards.title_id = ?
    ORDER BY title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `,
  )
    .bind(titleId)
    .all<{ icon_id: string }>();

  return (result.results ?? []).map((row) => row.icon_id);
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

async function readTitleCandidates(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      titles.title_id AS target_id,
      titles.condition_type,
      titles.condition_params_json
    FROM titles
    LEFT JOIN user_titles
      ON user_titles.title_id = titles.title_id
      AND user_titles.user_id = ?
    WHERE titles.is_active = 1
      AND titles.deleted_at IS NULL
      AND titles.is_initial = 0
      AND titles.condition_type <> 'initial_grant'
      AND user_titles.title_id IS NULL
    ORDER BY titles.sort_order ASC, titles.title_id ASC
    `,
  )
    .bind(userId)
    .all<AcquisitionMasterRow>();

  return result.results ?? [];
}

async function readIconCandidates(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      icons.icon_id AS target_id,
      icons.condition_type,
      icons.condition_params_json
    FROM icons
    LEFT JOIN user_icons
      ON user_icons.icon_id = icons.icon_id
      AND user_icons.user_id = ?
    WHERE icons.is_active = 1
      AND icons.is_initial = 0
      AND icons.condition_type <> 'initial_grant'
      AND user_icons.icon_id IS NULL
    ORDER BY icons.sort_order ASC, icons.icon_id ASC
    `,
  )
    .bind(userId)
    .all<AcquisitionMasterRow>();

  return result.results ?? [];
}
