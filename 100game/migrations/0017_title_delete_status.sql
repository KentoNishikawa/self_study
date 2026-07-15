ALTER TABLE titles ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_titles_deleted_active ON titles(deleted_at, is_active, sort_order);
