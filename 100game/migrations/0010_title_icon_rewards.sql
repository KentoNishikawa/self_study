CREATE TABLE IF NOT EXISTS title_icon_rewards (
  title_id TEXT NOT NULL,
  icon_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (title_id, icon_id),
  FOREIGN KEY (title_id) REFERENCES titles(title_id),
  FOREIGN KEY (icon_id) REFERENCES icons(icon_id)
);

CREATE INDEX IF NOT EXISTS idx_title_icon_rewards_icon_id ON title_icon_rewards(icon_id);
