ALTER TABLE match_results ADD COLUMN table_play_suit_set_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_participants ADD COLUMN self_play_suit_set_json TEXT NOT NULL DEFAULT '[]';
