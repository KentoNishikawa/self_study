ALTER TABLE match_participants ADD COLUMN timeout_play_count INTEGER NOT NULL DEFAULT 0;
UPDATE match_participants SET timeout_play_count = timeout_deck_play_count;
ALTER TABLE match_participants ADD COLUMN initial_seat_kind TEXT;
ALTER TABLE match_participants ADD COLUMN initial_icon_id_snapshot TEXT;
ALTER TABLE match_participants ADD COLUMN initial_icon_type_ids_json TEXT;
