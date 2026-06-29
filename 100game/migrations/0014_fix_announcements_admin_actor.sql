DROP TABLE IF EXISTS announcements_new;

CREATE TABLE IF NOT EXISTS announcements_new (
  announcement_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'normal',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

INSERT INTO announcements_new (
  announcement_id,
  title,
  summary,
  body,
  category,
  priority,
  is_active,
  starts_at,
  ends_at,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  announcement_id,
  title,
  summary,
  body,
  category,
  priority,
  is_active,
  starts_at,
  ends_at,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at
FROM announcements;

DROP TABLE announcements;

ALTER TABLE announcements_new RENAME TO announcements;

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, deleted_at, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_order ON announcements(priority, starts_at, created_at);
