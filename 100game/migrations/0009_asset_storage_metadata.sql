ALTER TABLE icons ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE icons ADD COLUMN storage_key TEXT;
ALTER TABLE icons ADD COLUMN mime_type TEXT;
ALTER TABLE icons ADD COLUMN file_size INTEGER;
ALTER TABLE icons ADD COLUMN uploaded_by TEXT;
ALTER TABLE icons ADD COLUMN uploaded_at TEXT;
ALTER TABLE icons ADD COLUMN deleted_at TEXT;

ALTER TABLE title_illustrations ADD COLUMN required_title_id TEXT;
ALTER TABLE title_illustrations ADD COLUMN appearance_mode TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE title_illustrations ADD COLUMN manual_unviewed_rate REAL NOT NULL DEFAULT 70.0;
ALTER TABLE title_illustrations ADD COLUMN manual_viewed_rate REAL NOT NULL DEFAULT 30.0;
ALTER TABLE title_illustrations ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'local';
ALTER TABLE title_illustrations ADD COLUMN storage_key TEXT;
ALTER TABLE title_illustrations ADD COLUMN mime_type TEXT;
ALTER TABLE title_illustrations ADD COLUMN file_size INTEGER;
ALTER TABLE title_illustrations ADD COLUMN uploaded_by TEXT;
ALTER TABLE title_illustrations ADD COLUMN uploaded_at TEXT;
ALTER TABLE title_illustrations ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_icons_storage_provider ON icons(storage_provider);
CREATE INDEX IF NOT EXISTS idx_title_illustrations_storage_provider ON title_illustrations(storage_provider);
CREATE INDEX IF NOT EXISTS idx_title_illustrations_required_title_id ON title_illustrations(required_title_id);
