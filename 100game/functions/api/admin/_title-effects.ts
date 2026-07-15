import { evaluateCondition, parseConditionParams, type ConditionEvaluationContext, type ConditionType, type ConditionScope, type StatsRow } from "../_condition-engine";
import type { Env } from "../auth/_shared";

export type TitleAchievementEffect = {
  achievementCountStatus: "counted" | "not_countable";
  achievedUserCount: number | null;
  note: string;
};


const COUNTABLE_CONDITION_TYPES = new Set<ConditionType>([
  "stat_count_at_least",
  "stat_value_at_least",
  "stat_value_at_most",
  "stat_flag_true",
  "stat_json_contains_all",
  "stat_json_contains_key",
  "stat_json_value_at_least",
  "stat_json_value_at_most",
  "all_conditions",
  "any_condition",
]);

const COUNTABLE_SCOPES = new Set<ConditionScope>(["solo", "multi", "total", "global"]);

export async function readTitleAchievementEffect(env: Env, conditionType: string, conditionParamsJson: string | null): Promise<TitleAchievementEffect> {
  if (conditionType === "initial_grant") {
    const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE status != 'deleted'").first<{ count: number }>();
    return {
      achievementCountStatus: "counted",
      achievedUserCount: Number(row?.count ?? 0),
      note: "初期所持称号のため、削除済み以外のユーザー数を表示しています。",
    };
  }

  const params = parseConditionParams(conditionParamsJson ?? "{}");
  if (!params || !isCountableCondition(conditionType, params)) {
    return {
      achievementCountStatus: "not_countable",
      achievedUserCount: null,
      note: "この条件は過去試合を再判定しません。反映後、新たに条件を満たした場合に取得対象になります。",
    };
  }

  const [users, soloRows, multiRows, globalRows, titleCountRows] = await Promise.all([
    env.DB.prepare("SELECT user_id FROM users WHERE status != 'deleted'").all<{ user_id: string }>(),
    env.DB.prepare("SELECT * FROM user_stats_solo").all<StatsRow & { user_id: string }>(),
    env.DB.prepare("SELECT * FROM user_stats_multi").all<StatsRow & { user_id: string }>(),
    env.DB.prepare("SELECT * FROM user_stats_global").all<StatsRow & { user_id: string }>(),
    env.DB.prepare(
      `
      SELECT user_titles.user_id, COUNT(*) AS title_count
      FROM user_titles
      INNER JOIN titles
        ON titles.title_id = user_titles.title_id
        AND titles.is_active = 1
        AND titles.deleted_at IS NULL
      GROUP BY user_titles.user_id
      `,
    ).all<{ user_id: string; title_count: number }>(),
  ]);

  const soloMap = toStatsMap(soloRows.results ?? []);
  const multiMap = toStatsMap(multiRows.results ?? []);
  const globalMap = toStatsMap(globalRows.results ?? []);
  const titleCountMap = new Map((titleCountRows.results ?? []).map((row) => [row.user_id, Number(row.title_count ?? 0)]));

  let count = 0;
  for (const user of users.results ?? []) {
    const context: ConditionEvaluationContext = {
      soloStats: soloMap.get(user.user_id) ?? null,
      multiStats: multiMap.get(user.user_id) ?? null,
      globalStats: {
        ...(globalMap.get(user.user_id) ?? {}),
        title_acquired_count: titleCountMap.get(user.user_id) ?? 0,
      },
    };
    if (evaluateCondition({ condition_type: conditionType, condition_params_json: conditionParamsJson ?? "{}" }, context)) count += 1;
  }

  return {
    achievementCountStatus: "counted",
    achievedUserCount: count,
    note: "現在保存されている内部戦績をもとに集計しています。",
  };
}

function toStatsMap(rows: Array<StatsRow & { user_id: string }>) {
  return new Map(rows.map((row) => [row.user_id, row as StatsRow]));
}

function isCountableCondition(conditionType: string, params: Record<string, unknown>): boolean {
  if (!COUNTABLE_CONDITION_TYPES.has(conditionType as ConditionType)) return false;

  if (conditionType === "all_conditions" || conditionType === "any_condition") {
    const conditions = Array.isArray(params.conditions) ? params.conditions : [];
    if (conditions.length === 0) return false;
    return conditions.every((condition) => {
      if (!condition || typeof condition !== "object" || Array.isArray(condition)) return false;
      const record = condition as Record<string, unknown>;
      const nestedType = typeof record.condition_type === "string" ? record.condition_type : typeof record.conditionType === "string" ? record.conditionType : "";
      const nestedParams = parseConditionParams(record.condition_params_json ?? record.conditionParamsJson ?? {});
      return Boolean(nestedParams && isCountableCondition(nestedType, nestedParams));
    });
  }

  const scope = typeof params.scope === "string" ? params.scope : "";
  return COUNTABLE_SCOPES.has(scope as ConditionScope);
}
