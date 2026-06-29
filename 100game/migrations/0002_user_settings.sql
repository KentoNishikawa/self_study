CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'プレイヤー',
  previous_display_name TEXT,
  current_icon_id TEXT,
  current_title_id TEXT,
  sound_volume_level INTEGER NOT NULL DEFAULT 3 CHECK (sound_volume_level BETWEEN 1 AND 5),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
