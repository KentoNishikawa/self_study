CREATE TABLE IF NOT EXISTS user_notifications (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('title_acquired', 'icon_acquired', 'title_illustration_acquired')),
  target_type TEXT NOT NULL CHECK (target_type IN ('title', 'icon', 'title_illustration')),
  target_id TEXT NOT NULL,
  priority INTEGER NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications (user_id, is_read, priority, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_unique_acquired_target
  ON user_notifications (user_id, notification_type, target_type, target_id);
