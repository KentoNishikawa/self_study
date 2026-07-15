ALTER TABLE match_participants ADD COLUMN initial_hand_card_sequence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE match_participants ADD COLUMN hand_sequence_signatures_json TEXT NOT NULL DEFAULT '[]';
