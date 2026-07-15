export function isAllowedTitleConditionStatKeyForScope(scope: string, statKey: string) {
  if (
    statKey === "turn_count"
    || statKey === "match_log_count"
    || statKey === "joker_event_counts_json"
    || isMatchCardStatKey(statKey)
    || isHandSequenceStatKey(statKey)
    || isMatchFlagStatKey(statKey)
    || isRematchSessionStatKey(statKey)
    || isRelativeTimeoutDeckPlayStatKey(statKey)
  ) return scope === "match";

  if (
    statKey === "played_card_set_json"
    || statKey === "loading_illustration_display_counts_json"
    || statKey === "icon_use_counts_json"
    || statKey === "ng_name_max_streak_counts_json"
    || statKey === "lose_certain_event_counts_json"
  ) return scope === "global";

  if (statKey === "host_other_leave_pattern_counts_json") return scope === "multi";

  if (
    statKey === "actor_source_card_play_counts_json"
    || statKey === "timeout_only_finish_counts_json"
    || isCumulativeCardRankCountStatKey(statKey)
  ) return scope === "solo" || scope === "multi" || scope === "total";

  return TITLE_CONDITION_STAT_KEYS.has(statKey);
}

export function isActorSourceCardPlayCountKey(value: string) {
  return /^actor_(self|previous|all):source_(all|hand|deck):card_(all|ace|number|jack|queen|king|joker)$/.test(value);
}

export function isTimeoutOnlyFinishCountKey(value: string) {
  return value === "any" || value === "self" || value === "next_1" || value === "next_2" || value === "next_3";
}

export function isJokerEventCountKey(value: string) {
  return /^actor_(self|next_1|next_2|next_3):event_(spade3_counter|my_joker_countered|joker_after_previous_joker|joker_used_match_dead|joker_bust|dead_with_joker_in_hand)$/.test(value);
}

export function isMatchCountCompareActor(value: string) {
  return value === "any" || value === "self" || value === "next_1" || value === "next_2" || value === "next_3";
}

export function isMatchCountCompareMetric(value: string) {
  return value === "played_card_count"
    || value === "manual_card_play_count"
    || value === "hand_play_count"
    || value === "deck_play_count"
    || value === "manual_deck_play_count"
    || value === "timeout_deck_play_count"
    || value === "joker_play_count"
    || value === "spade3_counter_count"
    || value === "my_joker_countered_by_spade3_count"
    || value === "self_joker_after_previous_joker_count";
}

export function isMatchCountCompareOperator(value: string) {
  return value === "gt" || value === "gte" || value === "eq" || value === "lte" || value === "lt";
}

function isMatchCardStatKey(value: string) {
  return value === "self_play_rank_set_json"
    || value === "self_play_suit_set_json"
    || value === "self_play_card_set_json"
    || value === "self_play_rank_sequence_json"
    || value === "self_play_card_sequence_json"
    || value === "table_play_rank_set_json"
    || value === "table_play_suit_set_json"
    || value === "table_play_card_set_json"
    || value === "table_play_rank_sequence_json"
    || value === "table_play_card_sequence_json"
    || value === "table_play_actor_card_sequence_json";
}

function isMatchFlagStatKey(value: string) {
  return value === "is_solo_match" || value === "is_multi_match" || value === "all_participants_played_card";
}

function isRelativeTimeoutDeckPlayStatKey(value: string) {
  return value === "timeout_next_1_deck_play_count"
    || value === "timeout_next_2_deck_play_count"
    || value === "timeout_next_3_deck_play_count";
}

function isRematchSessionStatKey(value: string) {
  return value === "rematch_session_total_count"
    || value === "rematch_session_alive_total"
    || value === "rematch_session_dead_total"
    || value === "rematch_session_alive_streak"
    || value === "rematch_session_dead_streak";
}

function isHandSequenceStatKey(value: string) {
  return isInitialHandSequenceStatKey(value)
    || value === "hand_sequence_signatures_json"
    || value === "hand_next_1_sequence_signatures_json"
    || value === "hand_next_2_sequence_signatures_json"
    || value === "hand_next_3_sequence_signatures_json";
}

function isInitialHandSequenceStatKey(value: string) {
  return value === "initial_hand_card_sequence_json"
    || value === "initial_hand_next_1_sequence_json"
    || value === "initial_hand_next_2_sequence_json"
    || value === "initial_hand_next_3_sequence_json";
}

function isCumulativeCardRankCountStatKey(value: string) {
  return value === "ace_play_count"
    || value === "number_card_play_count"
    || value === "jack_play_count"
    || value === "queen_play_count"
    || value === "king_play_count";
}

const TITLE_CONDITION_STAT_KEYS = new Set([
  "match_count",
  "win_count",
  "lose_count",
  "void_match_count",
  "redeal_count",
  "casual_match_count",
  "smart_match_count",
  "type_100_match_count",
  "type_200_match_count",
  "type_300_match_count",
  "type_400_match_count",
  "type_500_match_count",
  "type_extra_match_count",
  "played_card_count",
  "hand_play_count",
  "deck_play_count",
  "ace_play_count",
  "number_card_play_count",
  "jack_play_count",
  "queen_play_count",
  "king_play_count",
  "normal_finish_count",
  "turn_count",
  "match_log_count",
  "joker_play_count",
  "spade3_counter_count",
  "timeout_deck_play_count",
  "timeout_next_1_deck_play_count",
  "timeout_next_2_deck_play_count",
  "timeout_next_3_deck_play_count",
  "timeout_only_finish_counts_json",
  "joker_event_counts_json",
  "joker_used_match_dead_count",
  "joker_bust_count",
  "dead_with_joker_in_hand_count",
  "my_joker_countered_by_spade3_count",
  "self_joker_after_previous_joker_count",
  "self_spade3_after_previous_joker_count",
  "self_spade3_after_previous_joker_dead_margin1_count",
  "initial_hand_all_red_count",
  "initial_hand_all_black_count",
  "initial_hand_same_suit_count",
  "played_card_set_json",
  "all_participants_played_card_match_count",
  "title_acquired_count",
  "loading_illustration_display_count",
  "loading_illustration_display_counts_json",
  "icon_use_count",
  "icon_use_counts_json",
  "ng_name_max_streak_counts_json",
  "lose_certain_event_counts_json",
  "host_other_leave_pattern_counts_json",
  "actor_source_card_play_counts_json",
]);
