ALTER TABLE user_stats_global ADD COLUMN loading_illustration_display_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_global ADD COLUMN loading_illustration_display_counts_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_stats_global ADD COLUMN icon_use_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_stats_global ADD COLUMN icon_use_counts_json TEXT NOT NULL DEFAULT '{}';
