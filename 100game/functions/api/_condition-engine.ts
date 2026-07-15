export type ConditionType =
  | "stat_count_at_least"
  | "stat_value_at_least"
  | "stat_value_at_most"
  | "stat_flag_true"
  | "stat_json_contains_all"
  | "stat_json_contains_key"
  | "stat_json_value_at_least"
  | "stat_json_value_at_most"
  | "card_sequence_match"
  | "hand_sequence_match"
  | "table_all_suit_match"
  | "participant_icon_composition_match"
  | "match_count_compare"
  | "match_achievement_key"
  | "all_conditions"
  | "any_condition";

export type ConditionScope = "solo" | "multi" | "total" | "global" | "match";
export type StatsValue = number | string | boolean | readonly string[] | null | undefined;
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
  "stat_json_value_at_least",
  "stat_json_value_at_most",
  "card_sequence_match",
  "hand_sequence_match",
  "table_all_suit_match",
  "participant_icon_composition_match",
  "match_count_compare",
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
    case "stat_json_value_at_least":
      return evaluateStatJsonValueAtLeast(params, context);
    case "stat_json_value_at_most":
      return evaluateStatJsonValueAtMost(params, context);
    case "card_sequence_match":
      return evaluateCardSequenceMatch(params, context);
    case "hand_sequence_match":
      return evaluateHandSequenceMatch(params, context);
    case "table_all_suit_match":
      return evaluateTableAllSuitMatch(params, context);
    case "participant_icon_composition_match":
      return evaluateParticipantIconCompositionMatch(params, context);
    case "match_count_compare":
      return evaluateMatchCountCompare(params, context);
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

function evaluateStatJsonValueAtLeast(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const actualValue = readJsonNumericStatValue(params, context);
  const targetValue = readNumberParam(params, "value");
  return actualValue != null && targetValue != null && actualValue >= targetValue;
}

function evaluateStatJsonValueAtMost(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const actualValue = readJsonNumericStatValue(params, context);
  const targetValue = readNumberParam(params, "value");
  return actualValue != null && targetValue != null && actualValue <= targetValue;
}

function readJsonNumericStatValue(params: ConditionParams, context: ConditionEvaluationContext): number | null {
  const statRequest = readStatRequest(params);
  const key = readStringParam(params, "key");
  if (!statRequest || !key) return null;

  if (statRequest.scope === "total") {
    const soloHasValue = Boolean(context.soloStats && hasOwn(context.soloStats, statRequest.statKey));
    const multiHasValue = Boolean(context.multiStats && hasOwn(context.multiStats, statRequest.statKey));
    if (!soloHasValue && !multiHasValue) return null;

    const soloValue = soloHasValue ? readJsonNumericValue(context.soloStats?.[statRequest.statKey], key) : 0;
    const multiValue = multiHasValue ? readJsonNumericValue(context.multiStats?.[statRequest.statKey], key) : 0;
    return soloValue + multiValue;
  }

  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  return readJsonNumericValue(actualValue, key);
}

function readJsonNumericValue(actualValue: StatsValue, key: string) {
  const parsed = parseJsonValue(actualValue);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return 0;

  const value = (parsed as Record<string, unknown>)[key];
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function evaluateCardSequenceMatch(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const rule = readStringParam(params, "rule") ?? "ordered_contains";
  const expected = readExpectedCardConditions(params);
  if (!statRequest || expected.length === 0) return false;
  if (rule !== "ordered_contains" && rule !== "contiguous_contains" && rule !== "contiguous_unordered" && rule !== "exact") return false;

  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const actualSequence = readJsonStringArray(actualValue).map(parseCardKey).filter((item): item is CardCondition => Boolean(item));
  if (actualSequence.length === 0) return false;

  const sameSuit = params.sameSuit === true || params.sameSuit === "true" || params.sameSuit === 1 || params.sameSuit === "1";
  if (rule === "exact") return actualSequence.length === expected.length && matchSequenceAt(actualSequence, expected, 0, sameSuit);
  if (rule === "contiguous_contains") {
    for (let start = 0; start <= actualSequence.length - expected.length; start += 1) {
      if (matchSequenceAt(actualSequence, expected, start, sameSuit)) return true;
    }
    return false;
  }
  if (rule === "contiguous_unordered") {
    for (let start = 0; start <= actualSequence.length - expected.length; start += 1) {
      if (matchUnorderedCards(actualSequence.slice(start, start + expected.length), expected)) return true;
    }
    return false;
  }

  return matchOrderedContains(actualSequence, expected, sameSuit);
}

function evaluateHandSequenceMatch(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const statRequest = readStatRequest(params);
  const rule = readStringParam(params, "rule") ?? "exact";
  if (!statRequest) return false;
  if (rule !== "exact" && rule !== "unordered" && rule !== "same_rank" && rule !== "same_suit") return false;

  const actualValue = readStatValue(statRequest.scope, statRequest.statKey, context);
  const candidates = readHandSequenceCandidates(actualValue);
  const expected = readExpectedCardConditions(params);
  if (rule === "same_rank") {
    const expectedRank = expected.find((card) => card.rank !== "any")?.rank;
    return candidates.some((sequence) => isSameNormalRankHand(sequence, expectedRank));
  }
  if (rule === "same_suit") {
    const allowedSuits = normalizeCardSuitList(Array.isArray(params.suits) ? params.suits : []);
    if (allowedSuits.length === 0) return false;
    return candidates.some((sequence) => {
      if (!isAllAllowedSuitHand(sequence, allowedSuits)) return false;
      if (expected.length === 0) return true;
      if (expected.length !== 4 || sequence.length !== 4) return false;
      const rankOnlyExpected = expected.map((card) => ({ ...card, suit: "any", suits: [] }));
      return matchSequenceAt(sequence, rankOnlyExpected, 0, false);
    });
  }

  if (expected.length === 0 || expected.length > 4) return false;
  return candidates.some((sequence) => {
    if (sequence.length !== 4) return false;
    if (rule === "unordered") return matchUnorderedCards(sequence, expected);
    return expected.length === 4 && matchSequenceAt(sequence, expected, 0, false);
  });
}

function isSameNormalRankHand(sequence: CardCondition[], expectedRank?: string): boolean {
  if (sequence.length !== 4) return false;
  const firstRank = sequence[0]?.rank;
  if (!firstRank || firstRank === "any" || firstRank === "JOKER") return false;
  if (expectedRank && expectedRank !== "any" && firstRank !== expectedRank) return false;
  return sequence.every((card) => card.rank === firstRank && card.rank !== "JOKER");
}

function isAllAllowedSuitHand(sequence: CardCondition[], allowedSuits: readonly string[]): boolean {
  if (sequence.length !== 4) return false;
  const allowed = new Set(allowedSuits);
  const normalCards = sequence.filter((card) => card.rank !== "JOKER");
  return normalCards.length > 0 && normalCards.every((card) => card.suit !== "any" && allowed.has(card.suit));
}


type CardActor = "any" | "self" | "not_self" | "other" | "npc";
type CardCondition = { rank: string; ranks?: string[]; suit: string; suits?: string[]; actor: CardActor };
type ParticipantIconRelation = "any" | "self" | "other" | "npc";
type ParticipantIconOrder = "unordered" | "turn_order";
type ParticipantIconSlot = { relation: ParticipantIconRelation; iconId: string; iconTypeId: string };
type ActualParticipantIconSlot = Omit<ParticipantIconSlot, "iconTypeId"> & { turnNo: number; iconTypeIds: string[] };
const NPC_ICON_ID = "npc_default";

function readExpectedCardConditions(params: ConditionParams): CardCondition[] {
  const values = readStringArrayParam(params, "values").map(parseCardKey).filter((item): item is CardCondition => Boolean(item));
  if (values.length > 0) return values;
  if (!Array.isArray(params.cards)) return [];

  const result: CardCondition[] = [];
  for (const item of params.cards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const rank = normalizeCardRank(record.rank);
    const suits = normalizeCardSuitList(Array.isArray(record.suits) ? record.suits : [record.suit]);
    if (record.wildcard === true) {
      result.push({ rank: "any", suit: "any", suits: [], actor: "any" });
      continue;
    }
    const suit = suits.length === 1 ? suits[0] ?? "any" : "any";
    const actor = normalizeCardActor(record.actor);
    if (!rank) continue;
    if (rank === "any" && suits.length === 0) continue;
    if (rank === "JQK") {
      result.push({ rank: "any", ranks: ["J", "Q", "K"], suit, suits, actor });
      continue;
    }
    result.push({ rank, suit: rank === "JOKER" ? "any" : suit, suits: rank === "JOKER" ? [] : suits, actor });
  }
  return result;
}

function parseCardKey(value: unknown): CardCondition | null {
  if (typeof value !== "string") return null;
  const rawText = value.trim().toUpperCase();
  if (!rawText) return null;
  const separatorIndex = rawText.indexOf(":");
  const actor = separatorIndex > 0 ? normalizeCardActor(rawText.slice(0, separatorIndex).toLowerCase()) : "any";
  const text = separatorIndex > 0 ? rawText.slice(separatorIndex + 1) : rawText;
  if (!text) return null;
  if (text === "JOKER") return { rank: "JOKER", suit: "any", actor };
  if (text === "JQK") return { rank: "any", ranks: ["J", "Q", "K"], suit: "any", actor };

  const suit = text.length > 1 && "SHDC".includes(text[0] ?? "") ? text[0] : "any";
  const rankText = suit === "any" ? text : text.slice(1);
  const rank = normalizeCardRank(rankText);
  if (!rank) return null;
  if (rank === "JQK") return { rank: "any", ranks: ["J", "Q", "K"], suit: "any", actor };
  return { rank, suit, actor };
}

function readHandSequenceCandidates(value: StatsValue): CardCondition[][] {
  const entries = readJsonStringArray(value);
  if (entries.length === 0) return [];

  if (entries.some((entry) => entry.startsWith("HAND_SEQ_"))) {
    return entries.map(parseHandSequenceSignature).filter((sequence) => sequence.length > 0);
  }

  const sequence = entries.map(parseCardKey).filter((item): item is CardCondition => Boolean(item));
  return sequence.length > 0 ? [sequence] : [];
}

function parseHandSequenceSignature(value: string): CardCondition[] {
  const text = value.trim().toUpperCase();
  const body = text.startsWith("HAND_SEQ_") ? text.slice("HAND_SEQ_".length) : text;
  return body.split("_").map(parseCardKey).filter((item): item is CardCondition => Boolean(item));
}

function normalizeCardRank(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const rank = value.trim().toUpperCase();
  if (rank === "ANY" || rank === "") return "any";
  if (["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JQK", "JOKER"].includes(rank)) return rank;
  return null;
}

function normalizeCardActor(value: unknown): CardActor {
  if (value === "self" || value === "not_self" || value === "other" || value === "npc") return value;
  return "any";
}

function normalizeCardSuit(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const suit = value.trim().toUpperCase();
  if (suit === "ANY" || suit === "") return "any";
  if (["S", "H", "D", "C"].includes(suit)) return suit;
  return null;
}

function normalizeCardSuitList(values: readonly unknown[]): string[] {
  const suits: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const suit = normalizeCardSuit(value);
    if (!suit || suit === "any" || seen.has(suit)) continue;

    seen.add(suit);
    suits.push(suit);
  }
  return suits;
}

function matchUnorderedCards(actual: CardCondition[], expected: CardCondition[]): boolean {
  const expectedByActual = Array<number>(actual.length).fill(-1);

  function assign(expectedIndex: number, visitedActual: Set<number>): boolean {
    const target = expected[expectedIndex];
    if (!target) return false;

    for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
      if (visitedActual.has(actualIndex)) continue;
      const current = actual[actualIndex];
      if (!current || !cardMatches(current, target)) continue;

      visitedActual.add(actualIndex);
      const previousExpectedIndex = expectedByActual[actualIndex] ?? -1;
      if (previousExpectedIndex === -1 || assign(previousExpectedIndex, visitedActual)) {
        expectedByActual[actualIndex] = expectedIndex;
        return true;
      }
    }
    return false;
  }

  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    if (!assign(expectedIndex, new Set<number>())) return false;
  }
  return true;
}

function matchSequenceAt(actual: CardCondition[], expected: CardCondition[], start: number, sameSuit: boolean): boolean {
  let requiredSuit: string | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const current = actual[start + index];
    const target = expected[index];
    if (!current || !target || !cardMatches(current, target)) return false;
    requiredSuit = mergeSameSuit(requiredSuit, current, target, sameSuit);
    if (requiredSuit === "__MISMATCH__") return false;
  }
  return true;
}

function matchOrderedContains(actual: CardCondition[], expected: CardCondition[], sameSuit: boolean): boolean {
  function search(actualIndex: number, expectedIndex: number, requiredSuit: string | null): boolean {
    if (expectedIndex >= expected.length) return true;
    const target = expected[expectedIndex];
    if (!target) return false;
    for (let index = actualIndex; index < actual.length; index += 1) {
      const current = actual[index];
      if (!current || !cardMatches(current, target)) continue;
      const nextSuit = mergeSameSuit(requiredSuit, current, target, sameSuit);
      if (nextSuit === "__MISMATCH__") continue;
      if (search(index + 1, expectedIndex + 1, nextSuit)) return true;
    }
    return false;
  }
  return search(0, 0, null);
}

function cardMatches(actual: CardCondition, expected: CardCondition): boolean {
  if (!cardActorMatches(actual.actor, expected.actor)) return false;
  if (expected.ranks && expected.ranks.length > 0) {
    if (!expected.ranks.includes(actual.rank)) return false;
  } else if (expected.rank !== "any" && expected.rank !== actual.rank) {
    return false;
  }
  if (expected.rank === "JOKER") return true;
  if (expected.suits && expected.suits.length > 0) return expected.suits.includes(actual.suit);
  return expected.suit === "any" || actual.suit === expected.suit;
}

function cardActorMatches(actual: CardActor | undefined, expected: CardActor | undefined): boolean {
  const actualActor = actual ?? "any";
  const expectedActor = expected ?? "any";
  if (expectedActor === "any") return true;
  if (expectedActor === "not_self") return actualActor === "other" || actualActor === "npc";
  return actualActor === expectedActor;
}

function mergeSameSuit(requiredSuit: string | null, actual: CardCondition, expected: CardCondition, sameSuit: boolean): string | null {
  if (!sameSuit || actual.rank === "JOKER") return requiredSuit;
  if (expected.suit !== "any") return requiredSuit;
  if (actual.suit === "any") return requiredSuit;
  if (!requiredSuit) return actual.suit;
  return requiredSuit === actual.suit ? requiredSuit : "__MISMATCH__";
}

function evaluateTableAllSuitMatch(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const scope = normalizeScope(params.scope) ?? "match";
  const suits = normalizeCardSuitList(Array.isArray(params.suits) ? params.suits : [params.suit]);
  if (scope !== "match" || suits.length === 0) return false;

  const allowedSuits = new Set(suits);
  const suitSet = readJsonStringSet(readStatValue(scope, "table_play_suit_set_json", context));
  const rankSet = readJsonStringSet(readStatValue(scope, "table_play_rank_set_json", context));
  if (!suitSet || !rankSet) return false;
  if (rankSet.size === 0 || rankSet.has("JOKER")) return false;
  if (suitSet.size === 0) return false;

  for (const suit of suitSet) {
    if (!allowedSuits.has(suit)) return false;
  }

  const rule = readStringParam(params, "rule");
  if (!rule) return true;

  const requiredCount = readTableAllSuitRequiredCount(rule, suits.length);
  return requiredCount != null && suitSet.size === requiredCount;
}

function readTableAllSuitRequiredCount(rule: string, selectedSuitCount: number): number | null {
  if (rule === "exact") return selectedSuitCount;
  if (rule === "exact_count_minus_1") return selectedSuitCount - 1 > 0 ? selectedSuitCount - 1 : null;
  if (rule === "exact_count_minus_2") return selectedSuitCount - 2 > 0 ? selectedSuitCount - 2 : null;
  if (rule === "exact_count_minus_3") return selectedSuitCount - 3 > 0 ? selectedSuitCount - 3 : null;
  return null;
}

function evaluateParticipantIconCompositionMatch(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  const scope = normalizeScope(params.scope) ?? "match";
  const specMode = readStringParam(params, "specMode") ?? "icon";
  const order = readParticipantIconOrder(params.order);
  const expectedSlots = readParticipantIconSlotsParam(params.slots);
  if (scope !== "match" || (specMode !== "icon" && specMode !== "icon_type") || !order || expectedSlots.length !== 4) return false;
  if (expectedSlots.filter((slot) => slot.relation === "self").length !== 1) return false;

  const actualSlots = readActualParticipantIconSlots(readStatValue(scope, "participant_icon_slots_json", context));
  if (actualSlots.length !== expectedSlots.length) return false;

  if (order === "turn_order") {
    return expectedSlots.every((slot, index) => participantIconSlotMatches(actualSlots[index], slot));
  }

  return matchParticipantIconSlotsUnordered(actualSlots, expectedSlots);
}

function matchParticipantIconSlotsUnordered(actualSlots: ActualParticipantIconSlot[], expectedSlots: ParticipantIconSlot[]): boolean {
  const used = new Set<number>();

  function search(expectedIndex: number): boolean {
    if (expectedIndex >= expectedSlots.length) return true;
    const expected = expectedSlots[expectedIndex];
    if (!expected) return false;

    for (let actualIndex = 0; actualIndex < actualSlots.length; actualIndex += 1) {
      if (used.has(actualIndex)) continue;
      const actual = actualSlots[actualIndex];
      if (!participantIconSlotMatches(actual, expected)) continue;

      used.add(actualIndex);
      if (search(expectedIndex + 1)) return true;
      used.delete(actualIndex);
    }
    return false;
  }

  return search(0);
}

function participantIconSlotMatches(actual: ActualParticipantIconSlot | undefined, expected: ParticipantIconSlot): boolean {
  if (!actual) return false;
  if (expected.relation !== "any" && actual.relation !== expected.relation) return false;
  if (expected.iconId !== "any" && actual.iconId !== expected.iconId) return false;
  if (expected.iconTypeId !== "any" && !actual.iconTypeIds.includes(expected.iconTypeId)) return false;
  return true;
}

function readParticipantIconSlotsParam(value: unknown): ParticipantIconSlot[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { relation: "any" as ParticipantIconRelation, iconId: "any", iconTypeId: "any" };
    const record = item as Record<string, unknown>;
    const relation = readParticipantIconRelation(record.relation);
    return {
      relation,
      iconId: relation === "npc" ? NPC_ICON_ID : readParticipantIconId(record.iconId),
      iconTypeId: relation === "npc" ? "any" : readParticipantIconId(record.iconTypeId),
    };
  });
}

function readActualParticipantIconSlots(value: unknown): ActualParticipantIconSlot[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    const turnNoValue = Number(record.turnNo ?? record.participantNo);
    const relation = readParticipantIconRelation(record.relation);
    const iconId = readParticipantIconId(record.iconId);
    if (!Number.isSafeInteger(turnNoValue) || turnNoValue < 1 || turnNoValue > 4) return null;
    return {
      turnNo: turnNoValue,
      relation,
      iconId: relation === "npc" && iconId === "any" ? NPC_ICON_ID : iconId,
      iconTypeIds: readParticipantIconTypeIds(record.iconTypeIds),
    };
  }).filter((item): item is ActualParticipantIconSlot => Boolean(item)).sort((a, b) => a.turnNo - b.turnNo);
}

function readParticipantIconTypeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    const id = readParticipantIconId(item);
    if (id === "any" || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function readParticipantIconOrder(value: unknown): ParticipantIconOrder | null {
  return value === "unordered" || value === "turn_order" ? value : null;
}

function readParticipantIconRelation(value: unknown): ParticipantIconRelation {
  if (value === "self" || value === "other" || value === "npc") return value;
  return "any";
}

function readParticipantIconId(value: unknown): string {
  if (typeof value !== "string") return "any";
  const normalized = value.trim();
  return normalized || "any";
}

const MATCH_COUNT_COMPARE_ACTORS = ["self", "next_1", "next_2", "next_3"] as const;
const MATCH_COUNT_COMPARE_METRICS = new Set([
  "played_card_count",
  "manual_card_play_count",
  "hand_play_count",
  "deck_play_count",
  "manual_deck_play_count",
  "timeout_deck_play_count",
  "joker_play_count",
  "spade3_counter_count",
  "my_joker_countered_by_spade3_count",
  "self_joker_after_previous_joker_count",
]);
const MATCH_COUNT_COMPARE_OPERATORS = new Set(["gt", "gte", "eq", "lte", "lt"]);

function evaluateMatchCountCompare(params: ConditionParams, context: ConditionEvaluationContext): boolean {
  if (params.scope !== "match") return false;
  const actor = readStringParam(params, "actor");
  const leftMetric = readStringParam(params, "leftMetric");
  const operator = readStringParam(params, "operator");
  const rightType = readStringParam(params, "rightType");
  if (!actor || (actor !== "any" && !MATCH_COUNT_COMPARE_ACTORS.includes(actor as typeof MATCH_COUNT_COMPARE_ACTORS[number]))) return false;
  if (!leftMetric || !MATCH_COUNT_COMPARE_METRICS.has(leftMetric)) return false;
  if (!operator || !MATCH_COUNT_COMPARE_OPERATORS.has(operator)) return false;
  if (rightType !== "metric" && rightType !== "value") return false;

  const rightMetric = rightType === "metric" ? readStringParam(params, "rightMetric") : null;
  const fixedValue = rightType === "value" ? readNumberParam(params, "value") : null;
  if (rightType === "metric" && (!rightMetric || !MATCH_COUNT_COMPARE_METRICS.has(rightMetric) || rightMetric === leftMetric)) return false;
  if (rightType === "value" && (fixedValue == null || fixedValue < 0 || !Number.isInteger(fixedValue))) return false;

  const rawMetrics = readStatValue("match", "match_count_compare_metrics_json", context);
  const parsed = parseJsonValue(rawMetrics);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
  const metricsByActor = parsed as Record<string, unknown>;
  const actors = actor === "any" ? MATCH_COUNT_COMPARE_ACTORS : [actor as typeof MATCH_COUNT_COMPARE_ACTORS[number]];

  return actors.some((targetActor) => {
    const rowValue = metricsByActor[targetActor];
    if (!rowValue || typeof rowValue !== "object" || Array.isArray(rowValue)) return false;
    const row = rowValue as Record<string, unknown>;
    const leftValue = readFiniteNumber(row[leftMetric]);
    if (leftValue == null) return false;
    const rightValue = rightType === "metric" ? readFiniteNumber(row[rightMetric as string]) : fixedValue;
    if (rightValue == null) return false;
    if (rightType === "metric" && leftValue === 0 && rightValue === 0) return false;
    return compareMatchCountValues(leftValue, rightValue, operator);
  });
}

function readFiniteNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function compareMatchCountValues(leftValue: number, rightValue: number, operator: string) {
  if (operator === "gt") return leftValue > rightValue;
  if (operator === "gte") return leftValue >= rightValue;
  if (operator === "eq") return leftValue === rightValue;
  if (operator === "lte") return leftValue <= rightValue;
  if (operator === "lt") return leftValue < rightValue;
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

function readJsonStringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  const result: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (normalized) result.push(normalized);
  }
  return result;
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
