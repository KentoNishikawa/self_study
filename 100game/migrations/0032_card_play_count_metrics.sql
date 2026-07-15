ALTER TABLE match_participants ADD COLUMN source_card_play_counts_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE user_stats_solo ADD COLUMN actor_source_card_play_counts_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE user_stats_multi ADD COLUMN actor_source_card_play_counts_json TEXT NOT NULL DEFAULT '{}';
