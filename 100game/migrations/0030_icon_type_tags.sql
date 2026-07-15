CREATE TABLE IF NOT EXISTS icon_types (
  icon_type_id TEXT PRIMARY KEY,
  icon_type_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS icon_type_links (
  icon_id TEXT NOT NULL,
  icon_type_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (icon_id, icon_type_id),
  FOREIGN KEY (icon_id) REFERENCES icons(icon_id),
  FOREIGN KEY (icon_type_id) REFERENCES icon_types(icon_type_id)
);

CREATE INDEX IF NOT EXISTS idx_icon_type_links_type_id ON icon_type_links(icon_type_id);
CREATE INDEX IF NOT EXISTS idx_icon_type_links_icon_id ON icon_type_links(icon_id);
