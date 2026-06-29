export type ConditionType =
  | "stat_count_at_least"
  | "stat_value_at_least"
  | "stat_value_at_most"
  | "stat_flag_true"
  | "stat_json_contains_all"
  | "stat_json_contains_key"
  | "match_achievement_key"
  | "all_conditions"
  | "any_condition";

export type ConditionScope = "solo" | "multi" | "total" | "global" | "match";
export type StatsValue = number | string | boolean | null | undefined;
export type StatsRow = Record<string, StatsValue>;
export type ConditionParams = Record<string, unknown>;

export type ConditionEvaluationContext = {
  soloStats?: StatsRow | null;
  multiStats?: StatsRow | null;
  globalStats?: StatsRow | null;
  matchStats?: StatsRow | null;
  matchAchievementKeys?: readonly string[];
};

export type ConditionEvaluationSource = {
  condition_type?: unknown;
  conditionType?: unknown;
  condition_params_json?: unknown;
  conditionParamsJson?: unknown;
};

const CONDITION_TYPES = new Set<ConditionType>([
  "stat_count_at_least",
  "stat_value_at_least",
  "stat_value_at_most",
  "stat_flag_true",
  "stat_json_contains_all",
  "stat_json_contains_key",
  "match_achievement_key",
  "all_conditions",
  "any_condition",
]);

const CONDITION_SCOPES = new Set<ConditionScope>(["solo", "multi", "total", "global", "match"]);

export function evaluateCondition(condition: ConditionEvaluationSource, context: ConditionEvaluationContext): boolean {
  const conditionType = normalizeConditionType(condition.condition_type ?? condition.conditionType);
  if (!conditionType) return false;

  const params = parseConditionParams(condition.condition_params_json ?? condition.conditionParamsJson);
  if (!params) return false;

  switch (conditionType) {
    case "stat_count_at_least":
    case "stat_value_at_least":
      return evaluateStatValueAtLeast(params, context);
    case "stat_value_at_most":
      return evaluateStatValueAtMost(params, context);
    case "stat_flag_true":
      return evaluateStatFlagTrue(params, context);
    case "stat_json_contains_all":
      return evaluateStatJsonContainsAll(params, context);
    case "stat_json_contains_key":
      return evaluateStatJsonContainsKey(params, context);
    case "match_achievement_key":
      return evaluateMatchAchievementKey(params, context);
    case "all_conditions":
      return evaluateAllConditions(params, context);
    case "any_condition":
      return evaluateAnyCondition(params, context);
    default:
      return false;
  }
}

export function parseConditionParams(value: unknown): ConditionParams | null {
  if (value == null) return {};

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return {};

    try {
      const parsed: unknown = JSON.parse(trimmed);
      return normalizeParamsObject(parsed);
    } catch {
      return null;
    }
  }

  return normalizeParamsObject(value);
}

export function readStatValue(scope: ConditionScope, statKey: string, context: ConditionEvaluationContext): StatsValue {
  if (scope === "total") return readTotalStatValue(statKey, context);

  const row = getStatsRow(scope, context);
  if (!row || !hasOwn(row, statKey)) return undefined;
  return row[statKey];
}

function evaluateStatValueAtLeast(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const targetValue = readNumberParam(params, "value");
  if (!statRequest || targetValue == null) return false;

  const actualValue = readNumericStatValue(statRequest.scope, statRequest.statKey, context);
  return actualValue != null && actualValue >= targetValue;
}

function evaluateStatValueAtMost(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const targetValue = readNumberParam(params, "value");
  if (!statRequest || targetValue == null) return false;

  const actualValue = readNumericStatValue(statRequest.scope, statRequest.statKey, context);
  return actualValue != null && actualValue <= targetValue;
}

function evaluateStatFlagTrue(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  if (!statRequest) return false;

  return isTruthyFlag(readStatValue(statRequest.scope, statRequest.statKey, context));
}

function evaluateStatJsonContainsAll(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const expectedValues = readStringArrayParam(params, "values");
  if (!statRequest || expectedValues.length === 0) return false;

  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const actualSet = readJsonStringSet(actualValue);
  if (!actualSet) return false;

  return expectedValues.every((value) => actualSet.has(value));
}

function evaluateStatJsonContainsKey(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const key = readStringParam(params, "key");
  if (!statRequest || !key) return false;

  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const parsed = parseJsonValue(actualValue);
  if (Array.isArray(parsed)) return readJsonStringSet(parsed)?.has(key) ?? false;
  if (parsed && typeof parsed === "object") return Object.prototype.hasOwnProperty.call(parsed, key);
  return false;
}

function evaluateMatchAchievementKey(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const key = readStringParam(params, "key");
  if (!key) return false;

  return new Set(context.matchAchievementKeys ?? []).has(key);
}

function evaluateAllConditions(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const conditions = readNestedConditions(params);
  if (conditions.length === 0) return false;

  return conditions.every((condition) => evaluateCondition(condition, context));
}

function evaluateAnyCondition(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const conditions = readNestedConditions(params);
  if (conditions.length === 0) return false;

  return conditions.some((condition) => evaluateCondition(condition, context));
}

function readNumericStatValue(scope: ConditionScope, statKey: string, context: ConditionEvaluationContext): number | null {
  const value = readStatValue(scope, statKey, context);
  if (value == null) return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readTotalStatValue(statKey: string, context: ConditionEvaluationContext): StatsValue {
  const soloHasValue = Boolean(context.soloStats && hasOwn(context.soloStats, statKey));
  const multiHasValue = Boolean(context.multiStats && hasOwn(context.multiStats, statKey));
  if (!soloHasValue && !multiHasValue) return undefined;

  const soloValue = soloHasValue ? readNumericValue(context.soloStats?.[statKey]) : 0;
  const multiValue = multiHasValue ? readNumericValue(context.multiStats?.[statKey]) : 0;
  if (soloValue == null || multiValue == null) return undefined;

  return soloValue + multiValue;
}

function getStatsRow(scope: Exclude<ConditionScope, "total">, context: ConditionEvaluationContext): StatsRow | null | undefined {
  if (scope === "solo") return context.soloStats;
  if (scope === "multi") return context.multiStats;
  if (scope === "global") return context.globalStats;
  return context.matchStats;
}

function readStatRequest(params: ConditionParams): { scope: ConditionScope; statKey: string } | null {
  const scope = normalizeScope(params.scope);
  const statKey = readStringParam(params, "statKey");
  if (!scope || !statKey) return null;

  return { scope, statKey };
}

function readNestedConditions(params: ConditionParams): ConditionEvaluationSource[] {
  if (!Array.isArray(params.conditions)) return [];

  return params.conditions.filter((condition): condition is ConditionEvaluationSource => {
    return Boolean(condition && typeof condition === "object");
  });
}

function normalizeConditionType(value: unknown): ConditionType | null {
  if (typeof value !== "string") return null;
  return CONDITION_TYPES.has(value as ConditionType) ? value as ConditionType : null;
}

function normalizeScope(value: unknown): ConditionScope | null {
  if (typeof value !== "string") return null;
  return CONDITION_SCOPES.has(value as ConditionScope) ? value as ConditionScope : null;
}

function normalizeParamsObject(value: unknown): ConditionParams | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as ConditionParams;
}

function readStringParam(params: ConditionParams, key: string): string | null {
  const value = params[key];
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized || null;
}

function readNumberParam(params: ConditionParams, key: string): number | null {
  const value = params[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function readStringArrayParam(params: ConditionParams, key: string): string[] {
  if (!Array.isArray(params[key])) return [];

  const values: string[] = [];
  const seen = new Set<string>();
  for (const item of params[key]) {
    if (typeof item !== "string") continue;

    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    values.push(normalized);
  }

  return values;
}

function readJsonStringSet(value: unknown): Set<string> | null {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return null;

  const result = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string") continue;

    const normalized = item.trim();
    if (normalized) result.add(normalized);
  }

  return result;
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return value;
  return null;
}

function isTruthyFlag(value: StatsValue): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function readNumericValue(value: StatsValue): number | null {
  if (value == null) return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasOwn(source: StatsRow, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}
