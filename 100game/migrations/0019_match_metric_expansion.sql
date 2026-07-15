ALTER TABLE match_results ADD COLUMN match_log_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE match_participants ADD COLUMN hand_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN deck_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN joker_used_match_dead_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN joker_bust_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN dead_with_joker_in_hand_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN my_joker_countered_by_spade3_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN self_joker_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN self_spade3_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE match_participants ADD COLUMN self_spade3_after_previous_joker_dead_margin1_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_solo ADD COLUMN hand_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN deck_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN normal_finish_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN joker_used_match_dead_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN joker_bust_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN dead_with_joker_in_hand_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN my_joker_countered_by_spade3_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN self_joker_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN self_spade3_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN self_spade3_after_previous_joker_dead_margin1_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_multi ADD COLUMN hand_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN deck_play_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN normal_finish_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN joker_used_match_dead_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN joker_bust_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN dead_with_joker_in_hand_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN my_joker_countered_by_spade3_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN self_joker_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN self_spade3_after_previous_joker_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN self_spade3_after_previous_joker_dead_margin1_count INTEGER NOT NULL DEFAULT 0;
