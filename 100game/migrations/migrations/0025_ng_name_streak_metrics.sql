ALTER TABLE user_stats_global ADD COLUMN ng_name_total_counts_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_stats_global ADD COLUMN ng_name_current_streak_counts_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_stats_global ADD COLUMN ng_name_max_streak_counts_json TEXT NOT NULL DEFAULT '{}';
