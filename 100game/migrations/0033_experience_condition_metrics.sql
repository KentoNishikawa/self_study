ALTER TABLE user_stats_solo ADD COLUMN timeout_only_finish_counts_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_stats_multi ADD COLUMN timeout_only_finish_counts_json TEXT NOT NULL DEFAULT '{}';
