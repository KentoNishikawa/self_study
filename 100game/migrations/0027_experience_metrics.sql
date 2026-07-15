ALTER TABLE match_results ADD COLUMN redeal_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_solo ADD COLUMN void_match_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_solo ADD COLUMN redeal_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_stats_multi ADD COLUMN void_match_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_multi ADD COLUMN redeal_count INTEGER NOT NULL DEFAULT 0;
