import { NAME_NG_WORDS } from "../../../src/core/nameNgWords";
import {
  isActorSourceCardPlayCountKey,
  isAllowedTitleConditionStatKeyForScope,
  isJokerEventCountKey,
  isMatchCountCompareActor,
  isMatchCountCompareMetric,
  isMatchCountCompareOperator,
  isTimeoutOnlyFinishCountKey,
} from "../../../src/shared/titleConditionMetrics";
import { getString } from "../auth/_shared";

type ParticipantIconRelation = "any" | "self" | "other" | "npc";
const TITLE_CONDITION_PARTICIPANT_SLOT_COUNT = 4;
const TITLE_CONDITION_NPC_ICON_ID = "npc_default";

export function validateTitleConditionInput(conditionType: string, conditionParamsJson: string | null, conditionBuilderJson: string | null) {
  if (!isAllowedTitleConditionType(conditionType)) return "未対応の condition_type は保存できません。";
  const builder = parseJson<Record<string, unknown>>(conditionBuilderJson);
  if (!builder || typeof builder.mode !== "string") return "condition_builder_json を確認してください。";
  if (builder.mode !== "builder" && builder.mode !== "raw_json" && builder.mode !== "condition_graph") return "condition_builder_json の入力方式を確認してください。";
  const params = parseJson<Record<string, unknown>>(conditionParamsJson) ?? {};
  const validation = validateConditionParams(conditionType, params);
  return validation.ok === true ? "" : validation.message;
}

export function validateConditionParams(conditionType: string, params: unknown): { ok: true } | { ok: false; message: string } {
  if (conditionType === "initial_grant") return { ok: true };
  if (conditionType === "all_conditions" || conditionType === "any_condition") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "複合条件の形式を確認してください。" };
    const conditions = (params as Record<string, unknown>).conditions;
    if (!Array.isArray(conditions) || conditions.length === 0) return { ok: false, message: "複合条件にはconditionsが必要です。" };
    for (const condition of conditions) {
      if (!condition || typeof condition !== "object" || Array.isArray(condition)) return { ok: false, message: "複合条件の形式を確認してください。" };
      const nested = condition as Record<string, unknown>;
      const nestedType = getString(nested.condition_type).trim();
      if (nestedType === "initial_grant") return { ok: false, message: "初期所持称号は複合条件に含められません。" };
      const nestedParams = nested.condition_params_json ?? {};
      const nestedValidation = validateConditionParams(nestedType, nestedParams);
      if (!nestedValidation.ok) return nestedValidation;
    }
    return { ok: true };
  }
  if (conditionType === "match_count_compare") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const actor = getString(record.actor).trim();
    const leftMetric = getString(record.leftMetric).trim();
    const operator = getString(record.operator).trim();
    const rightType = getString(record.rightType).trim();
    if (scope !== "match") return { ok: false, message: "1試合内の回数比較はmatch scopeのみ保存できます。" };
    if (!isMatchCountCompareActor(actor)) return { ok: false, message: "カウント対象を確認してください。" };
    if (!isMatchCountCompareMetric(leftMetric)) return { ok: false, message: "比較元を確認してください。" };
    if (!isMatchCountCompareOperator(operator)) return { ok: false, message: "比較条件を確認してください。" };
    if (rightType === "metric") {
      const rightMetric = getString(record.rightMetric).trim();
      if (!isMatchCountCompareMetric(rightMetric)) return { ok: false, message: "比較先を確認してください。" };
      if (rightMetric === leftMetric) return { ok: false, message: "比較元と比較先には異なる回数項目を指定してください。" };
    } else if (rightType === "value") {
      const value = Number(record.value);
      if (!Number.isInteger(value) || value < 0) return { ok: false, message: "値は0以上の整数で入力してください。" };
    } else {
      return { ok: false, message: "比較先を確認してください。" };
    }
    return { ok: true };
  }
  if (conditionType === "stat_count_at_least" || conditionType === "stat_value_at_least" || conditionType === "stat_value_at_most" || conditionType === "stat_flag_true" || conditionType === "stat_json_contains_all" || conditionType === "stat_json_contains_key" || conditionType === "stat_json_value_at_least" || conditionType === "stat_json_value_at_most") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const statKey = getString(record.statKey).trim();
    if (!isAllowedTitleConditionScope(scope)) return { ok: false, message: "未対応のscopeは保存できません。" };
    if (!isAllowedTitleConditionStatKeyForScope(scope, statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (conditionType === "stat_json_value_at_least" || conditionType === "stat_json_value_at_most") {
      const key = getString(record.key).trim();
      if (!key) return { ok: false, message: "対象IDを指定してください。" };
      const value = Number(record.value);
      if (statKey === "ng_name_max_streak_counts_json") {
        if (!TITLE_CONDITION_NG_NAME_OPTIONS.has(key)) return { ok: false, message: "対象NGネームを確認してください。" };
        if (!Number.isFinite(value) || value < 1) return { ok: false, message: "必要回数は1以上の数値で入力してください。" };
      } else if (statKey === "actor_source_card_play_counts_json") {
        if (!isActorSourceCardPlayCountKey(key)) return { ok: false, message: "カード使用回数の集計キーを確認してください。" };
        if (!Number.isFinite(value) || value < 1) return { ok: false, message: "必要回数は1以上の数値で入力してください。" };
      } else if (statKey === "timeout_only_finish_counts_json") {
        if (!isTimeoutOnlyFinishCountKey(key)) return { ok: false, message: "時間切れ終了のカウント対象を確認してください。" };
        if (!Number.isFinite(value) || value < 1) return { ok: false, message: "必要回数は1以上の数値で入力してください。" };
      } else if (statKey === "joker_event_counts_json") {
        if (!isJokerEventCountKey(key)) return { ok: false, message: "JOKER／♠3イベントのカウント対象を確認してください。" };
        if (!Number.isFinite(value) || value < 1) return { ok: false, message: "必要回数は1以上の数値で入力してください。" };
      } else if (statKey === "lose_certain_event_counts_json" || statKey === "host_other_leave_pattern_counts_json") {
        if (!Number.isFinite(value) || value < 1) return { ok: false, message: "必要回数は1以上の数値で入力してください。" };
      } else if (!Number.isFinite(value) || value < 0) {
        return { ok: false, message: "値は0以上の数値で入力してください。" };
      }
    } else if (conditionType !== "stat_flag_true" && conditionType !== "stat_json_contains_key" && conditionType !== "stat_json_contains_all") {
      const value = Number(record.value);
      if (!Number.isFinite(value) || value < 0) return { ok: false, message: "値は0以上の数値で入力してください。" };
    }
    return { ok: true };
  }
  if (conditionType === "table_all_suit_match") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const suits = normalizeConditionSuitList(Array.isArray(record.suits) ? record.suits : [record.suit]);
    const rule = getString(record.rule).trim();
    if (scope !== "match") return { ok: false, message: "場全体条件はmatch scopeのみ保存できます。" };
    if (suits.length === 0) return { ok: false, message: "指定スートを確認してください。" };
    if (rule && !isAllowedTableAllSuitRule(rule, suits.length)) return { ok: false, message: "スート条件の含み方を確認してください。" };
    return { ok: true };
  }
  if (conditionType === "card_sequence_match") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const statKey = getString(record.statKey).trim();
    const rule = getString(record.rule).trim();
    if (scope !== "match") return { ok: false, message: "カード順条件はmatch scopeのみ保存できます。" };
    if (!isCardSequenceStatKey(statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (rule !== "ordered_contains" && rule !== "contiguous_contains" && rule !== "contiguous_unordered" && rule !== "exact") return { ok: false, message: "カード順ルールを確認してください。" };
    const values = Array.isArray(record.values) ? record.values : [];
    const cards = Array.isArray(record.cards) ? record.cards : [];
    if (values.length === 0 && cards.length === 0) return { ok: false, message: "カード条件を1件以上指定してください。" };
    if (cards.length > 0) {
      const validation = validateConditionSequenceCards(cards);
      if (!validation.ok) return validation;
    }
    return { ok: true };
  }
  if (conditionType === "hand_sequence_match") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const statKey = getString(record.statKey).trim();
    const rule = getString(record.rule).trim() || "exact";
    if (scope !== "match") return { ok: false, message: "手札条件はmatch scopeのみ保存できます。" };
    if (!isHandSequenceStatKey(statKey)) return { ok: false, message: "未実装metricは保存できません。" };
    if (rule === "same_rank" || rule === "same_suit") {
      if (rule === "same_suit") {
        const suits = Array.isArray(record.suits) ? record.suits : [];
        if (suits.length === 0) return { ok: false, message: "4枚全てのスートを指定してください。" };
      }
      return { ok: true };
    }
    if (rule !== "exact" && rule !== "unordered") return { ok: false, message: "手札の判定方法を確認してください。" };
    const cards = Array.isArray(record.cards) ? record.cards : [];
    if (rule === "exact" && cards.length !== 4) return { ok: false, message: "順番まで一致ではカード1〜4を指定してください。" };
    if (rule === "unordered" && (cards.length === 0 || cards.length > 4)) return { ok: false, message: "順番は問わないではカード条件を1〜4件指定してください。" };
    return { ok: true };
  }
  if (conditionType === "participant_icon_composition_match") {
    if (!params || typeof params !== "object" || Array.isArray(params)) return { ok: false, message: "condition_params_json の形式を確認してください。" };
    const record = params as Record<string, unknown>;
    const scope = getString(record.scope).trim();
    const specMode = getString(record.specMode).trim();
    const order = getString(record.order).trim();
    if (scope !== "match") return { ok: false, message: "参加者アイコン構成条件はmatch scopeのみ保存できます。" };
    if (specMode !== "icon" && specMode !== "icon_type") return { ok: false, message: "指定条件を確認してください。" };
    if (order !== "unordered" && order !== "turn_order") return { ok: false, message: "各手番の並び順を確認してください。" };
    const slots = Array.isArray(record.slots) ? record.slots : [];
    if (slots.length !== TITLE_CONDITION_PARTICIPANT_SLOT_COUNT) return { ok: false, message: "手番1〜4の条件を指定してください。" };

    let selfCount = 0;
    for (const slot of slots) {
      if (!slot || typeof slot !== "object" || Array.isArray(slot)) return { ok: false, message: "手番条件の形式を確認してください。" };
      const slotRecord = slot as Record<string, unknown>;
      const relation = readParticipantIconRelation(slotRecord.relation);
      const iconId = getString(slotRecord.iconId).trim() || "any";
      const iconTypeId = getString(slotRecord.iconTypeId).trim() || "any";
      if (relation === "self") selfCount += 1;
      if (relation === "npc" && iconId !== TITLE_CONDITION_NPC_ICON_ID) return { ok: false, message: "NPCのアイコン条件を確認してください。" };
      if (relation === "npc" && iconTypeId !== "any") return { ok: false, message: "NPCにはアイコン種別を指定できません。" };
      if (relation !== "npc" && iconId !== "any" && iconId === TITLE_CONDITION_NPC_ICON_ID) return { ok: false, message: "NPC固定アイコンはNPC行でのみ指定できます。" };
    }
    if (selfCount !== 1) return { ok: false, message: "「自分」は手番1〜4のうち必ず1つだけ選択してください。" };
    return { ok: true };
  }
  if (conditionType === "match_achievement_key") return { ok: false, message: "match_achievement_key はPhase16Bでは保存できません。" };
  return { ok: false, message: "未対応の condition_type は保存できません。" };
}

function isAllowedTitleConditionType(value: string) {
  return value === "initial_grant"
    || value === "stat_count_at_least"
    || value === "stat_value_at_least"
    || value === "stat_value_at_most"
    || value === "stat_flag_true"
    || value === "stat_json_contains_all"
    || value === "stat_json_contains_key"
    || value === "stat_json_value_at_least"
    || value === "stat_json_value_at_most"
    || value === "card_sequence_match"
    || value === "hand_sequence_match"
    || value === "table_all_suit_match"
    || value === "participant_icon_composition_match"
    || value === "match_count_compare"
    || value === "match_achievement_key"
    || value === "all_conditions"
    || value === "any_condition";
}

function isAllowedTitleConditionScope(value: string) {
  return value === "solo" || value === "multi" || value === "total" || value === "global" || value === "match";
}

function isAllowedTableAllSuitRule(rule: string, selectedSuitCount: number) {
  if (rule === "exact") return true;
  if (rule === "exact_count_minus_1") return selectedSuitCount - 1 > 0;
  if (rule === "exact_count_minus_2") return selectedSuitCount - 2 > 0;
  if (rule === "exact_count_minus_3") return selectedSuitCount - 3 > 0;
  return false;
}

function validateConditionSequenceCards(cards: unknown[]): { ok: true } | { ok: false; message: string } {
  const allowedRanks = new Set(["ANY", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JQK", "JOKER"]);
  if (cards.length === 0 || cards.length > 14) return { ok: false, message: "カード条件は1〜14件で指定してください。" };
  for (const item of cards) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, message: "カード条件の形式を確認してください。" };
    const record = item as Record<string, unknown>;
    const rank = getString(record.rank).trim().toUpperCase();
    if (!allowedRanks.has(rank)) return { ok: false, message: "カード条件のランクを確認してください。" };
    const rawSuits = Array.isArray(record.suits) ? record.suits : [record.suit];
    if (rawSuits.some((value) => {
      const suit = getString(value).trim().toUpperCase();
      return Boolean(suit) && suit !== "ANY" && suit !== "S" && suit !== "H" && suit !== "D" && suit !== "C";
    })) return { ok: false, message: "カード条件のスートを確認してください。" };
    const suits = normalizeConditionSuitList(rawSuits);
    if (rank === "JOKER" && suits.length > 0) return { ok: false, message: "JOKERにはスートを指定できません。" };
    if (rank === "ANY" && suits.length === 0) return { ok: false, message: "ランクまたはスートを指定してください。" };
  }
  return { ok: true };
}

function normalizeConditionSuitList(values: readonly unknown[]) {
  const suits: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const suit = getString(value).trim();
    if ((suit !== "S" && suit !== "H" && suit !== "D" && suit !== "C") || seen.has(suit)) continue;

    seen.add(suit);
    suits.push(suit);
  }
  return suits;
}

function readParticipantIconRelation(value: unknown): ParticipantIconRelation {
  if (value === "self" || value === "other" || value === "npc") return value;
  return "any";
}

function isCardSequenceStatKey(value: string) {
  return value === "self_play_rank_sequence_json"
    || value === "self_play_card_sequence_json"
    || value === "table_play_rank_sequence_json"
    || value === "table_play_card_sequence_json"
    || value === "table_play_actor_card_sequence_json";
}

function isHandSequenceStatKey(value: string) {
  return isInitialHandSequenceStatKey(value)
    || value === "hand_sequence_signatures_json"
    || value === "hand_next_1_sequence_signatures_json"
    || value === "hand_next_2_sequence_signatures_json"
    || value === "hand_next_3_sequence_signatures_json";
}

function isInitialHandSequenceStatKey(value: string) {
  return value === "initial_hand_card_sequence_json" || value === "initial_hand_next_1_sequence_json" || value === "initial_hand_next_2_sequence_json" || value === "initial_hand_next_3_sequence_json";
}

const TITLE_CONDITION_NG_NAME_OPTIONS = new Set(NAME_NG_WORDS.map((word) => String(word ?? "").trim()).filter(Boolean));

function parseJson<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
