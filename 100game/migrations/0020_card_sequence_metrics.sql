ALTER TABLE match_results ADD COLUMN table_play_rank_set_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_results ADD COLUMN table_play_card_set_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_results ADD COLUMN table_play_rank_sequence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_results ADD COLUMN table_play_card_sequence_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE match_participants ADD COLUMN self_play_rank_set_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_participants ADD COLUMN self_play_card_set_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_participants ADD COLUMN self_play_rank_sequence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_participants ADD COLUMN self_play_card_sequence_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE user_stats_global ADD COLUMN played_card_set_json TEXT NOT NULL DEFAULT '[]';
