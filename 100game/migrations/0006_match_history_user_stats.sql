-- Phase 5: match history and split user_stats persistence.
-- user_stats is intentionally split into solo / multi / global tables to avoid a very wide D1 table.
-- total_* values should be derived by summing user_stats_solo + user_stats_multi in SELECT queries.

CREATE TABLE IF NOT EXISTS match_results (
  match_id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'multi')),
  room_id TEXT,
  difficulty TEXT NOT NULL,
  game_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  direction_start TEXT NOT NULL CHECK (direction_start IN ('UP', 'DOWN')),
  final_total INTEGER NOT NULL,
  result_reason TEXT NOT NULL,
  winner_participant_no INTEGER,
  loser_participant_no INTEGER,
  turn_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_results_started_at ON match_results(started_at);
CREATE INDEX IF NOT EXISTS idx_match_results_mode ON match_results(mode);

CREATE TABLE IF NOT EXISTS match_participants (
  match_id TEXT NOT NULL,
  participant_no INTEGER NOT NULL,
  user_id TEXT,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('user', 'guest', 'npc')),
  display_name_snapshot TEXT NOT NULL,
  icon_id_snapshot TEXT,
  title_id_snapshot TEXT,
  is_host INTEGER NOT NULL DEFAULT 0 CHECK (is_host IN (0, 1)),
  is_winner INTEGER NOT NULL DEFAULT 0 CHECK (is_winner IN (0, 1)),
  is_loser INTEGER NOT NULL DEFAULT 0 CHECK (is_loser IN (0, 1)),
  final_hand_count INTEGER NOT NULL DEFAULT 0,
  played_card_count INTEGER NOT NULL DEFAULT 0,
  joker_play_count INTEGER NOT NULL DEFAULT 0,
  spade3_counter_count INTEGER NOT NULL DEFAULT 0,
  timeout_deck_play_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (match_id, participant_no)
);

CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON match_participants(user_id);

CREATE TABLE IF NOT EXISTS user_stats_solo (
  user_id TEXT PRIMARY KEY,

  match_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  lose_count INTEGER NOT NULL DEFAULT 0,

  casual_match_count INTEGER NOT NULL DEFAULT 0,
  smart_match_count INTEGER NOT NULL DEFAULT 0,

  type_100_match_count INTEGER NOT NULL DEFAULT 0,
  type_200_match_count INTEGER NOT NULL DEFAULT 0,
  type_300_match_count INTEGER NOT NULL DEFAULT 0,
  type_400_match_count INTEGER NOT NULL DEFAULT 0,
  type_500_match_count INTEGER NOT NULL DEFAULT 0,
  type_extra_match_count INTEGER NOT NULL DEFAULT 0,

  played_card_count INTEGER NOT NULL DEFAULT 0,
  joker_play_count INTEGER NOT NULL DEFAULT 0,
  spade3_counter_count INTEGER NOT NULL DEFAULT 0,
  ace_play_count INTEGER NOT NULL DEFAULT 0,
  jack_play_count INTEGER NOT NULL DEFAULT 0,
  queen_play_count INTEGER NOT NULL DEFAULT 0,
  king_play_count INTEGER NOT NULL DEFAULT 0,
  number_card_play_count INTEGER NOT NULL DEFAULT 0,

  bust_lose_count INTEGER NOT NULL DEFAULT 0,
  deck_end_match_count INTEGER NOT NULL DEFAULT 0,
  timeout_deck_play_count INTEGER NOT NULL DEFAULT 0,
  comeback_win_count INTEGER NOT NULL DEFAULT 0,
  last_player_win_count INTEGER NOT NULL DEFAULT 0,

  initial_hand_all_red_count INTEGER NOT NULL DEFAULT 0,
  initial_hand_all_black_count INTEGER NOT NULL DEFAULT 0,
  initial_hand_same_suit_count INTEGER NOT NULL DEFAULT 0,

  joker_created_losing_state_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stats_multi (
  user_id TEXT PRIMARY KEY,

  match_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  lose_count INTEGER NOT NULL DEFAULT 0,

  casual_match_count INTEGER NOT NULL DEFAULT 0,
  smart_match_count INTEGER NOT NULL DEFAULT 0,

  type_100_match_count INTEGER NOT NULL DEFAULT 0,
  type_200_match_count INTEGER NOT NULL DEFAULT 0,
  type_300_match_count INTEGER NOT NULL DEFAULT 0,
  type_400_match_count INTEGER NOT NULL DEFAULT 0,
  type_500_match_count INTEGER NOT NULL DEFAULT 0,
  type_extra_match_count INTEGER NOT NULL DEFAULT 0,

  played_card_count INTEGER NOT NULL DEFAULT 0,
  joker_play_count INTEGER NOT NULL DEFAULT 0,
  spade3_counter_count INTEGER NOT NULL DEFAULT 0,
  ace_play_count INTEGER NOT NULL DEFAULT 0,
  jack_play_count INTEGER NOT NULL DEFAULT 0,
  queen_play_count INTEGER NOT NULL DEFAULT 0,
  king_play_count INTEGER NOT NULL DEFAULT 0,
  number_card_play_count INTEGER NOT NULL DEFAULT 0,

  bust_lose_count INTEGER NOT NULL DEFAULT 0,
  deck_end_match_count INTEGER NOT NULL DEFAULT 0,
  timeout_deck_play_count INTEGER NOT NULL DEFAULT 0,
  comeback_win_count INTEGER NOT NULL DEFAULT 0,
  last_player_win_count INTEGER NOT NULL DEFAULT 0,

  initial_hand_all_red_count INTEGER NOT NULL DEFAULT 0,
  initial_hand_all_black_count INTEGER NOT NULL DEFAULT 0,
  initial_hand_same_suit_count INTEGER NOT NULL DEFAULT 0,

  joker_created_losing_state_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stats_global (
  user_id TEXT PRIMARY KEY,

  current_win_streak INTEGER NOT NULL DEFAULT 0,
  max_win_streak INTEGER NOT NULL DEFAULT 0,
  current_lose_streak INTEGER NOT NULL DEFAULT 0,
  max_lose_streak INTEGER NOT NULL DEFAULT 0,

  ever_hand_all_red INTEGER NOT NULL DEFAULT 0 CHECK (ever_hand_all_red IN (0, 1)),
  ever_hand_all_black INTEGER NOT NULL DEFAULT 0 CHECK (ever_hand_all_black IN (0, 1)),
  ever_hand_same_suit INTEGER NOT NULL DEFAULT 0 CHECK (ever_hand_same_suit IN (0, 1)),

  max_total_reached INTEGER,
  min_total_reached INTEGER,
  max_turn_count_in_match INTEGER NOT NULL DEFAULT 0,
  max_played_cards_in_match INTEGER NOT NULL DEFAULT 0,
  max_joker_play_in_match INTEGER NOT NULL DEFAULT 0,
  max_spade3_counter_in_match INTEGER NOT NULL DEFAULT 0,

  played_card_rank_set_json TEXT NOT NULL DEFAULT '[]',
  played_suit_set_json TEXT NOT NULL DEFAULT '[]',
  self_play_sequence_signatures_json TEXT NOT NULL DEFAULT '[]',
  hand_sequence_signatures_json TEXT NOT NULL DEFAULT '[]',
  cleared_title_condition_keys_json TEXT NOT NULL DEFAULT '[]',

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
