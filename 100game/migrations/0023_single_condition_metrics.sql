ALTER TABLE match_results ADD COLUMN all_participants_played_card INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_solo ADD COLUMN all_participants_played_card_match_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN all_participants_played_card_match_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_global ADD COLUMN title_acquired_count INTEGER NOT NULL DEFAULT 0;
