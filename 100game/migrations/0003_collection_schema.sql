CREATE TABLE IF NOT EXISTS titles (
  title_id TEXT PRIMARY KEY,
  title_code TEXT NOT NULL UNIQUE,
  title_name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_condition_text TEXT NOT NULL,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  condition_type TEXT NOT NULL,
  condition_params_json TEXT,
  is_initial INTEGER NOT NULL DEFAULT 0 CHECK (is_initial IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_titles (
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (title_id) REFERENCES titles(title_id)
);

CREATE TABLE IF NOT EXISTS icons (
  icon_id TEXT PRIMARY KEY,
  icon_code TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_condition_text TEXT NOT NULL,
  image_path TEXT NOT NULL,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  condition_type TEXT NOT NULL,
  condition_params_json TEXT,
  is_initial INTEGER NOT NULL DEFAULT 0 CHECK (is_initial IN (0, 1)),
  is_guest_available INTEGER NOT NULL DEFAULT 0 CHECK (is_guest_available IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_icons (
  user_id TEXT NOT NULL,
  icon_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, icon_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (icon_id) REFERENCES icons(icon_id)
);

CREATE TABLE IF NOT EXISTS title_illustrations (
  illustration_id TEXT PRIMARY KEY,
  illustration_code TEXT NOT NULL UNIQUE,
  illustration_name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlock_condition_text TEXT NOT NULL,
  image_path TEXT NOT NULL,
  rarity INTEGER NOT NULL CHECK (rarity BETWEEN 1 AND 5),
  condition_type TEXT NOT NULL,
  condition_params_json TEXT,
  is_initial INTEGER NOT NULL DEFAULT 0 CHECK (is_initial IN (0, 1)),
  is_rare INTEGER NOT NULL DEFAULT 0 CHECK (is_rare IN (0, 1)),
  is_boost_excluded INTEGER NOT NULL DEFAULT 0 CHECK (is_boost_excluded IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_title_illustrations (
  user_id TEXT NOT NULL,
  illustration_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  first_viewed_at TEXT,
  last_viewed_at TEXT,
  display_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, illustration_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (illustration_id) REFERENCES title_illustrations(illustration_id)
);

CREATE INDEX IF NOT EXISTS idx_user_titles_title_id ON user_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_user_icons_icon_id ON user_icons(icon_id);
CREATE INDEX IF NOT EXISTS idx_user_title_illustrations_illustration_id ON user_title_illustrations(illustration_id);
