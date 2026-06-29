CREATE TABLE IF NOT EXISTS user_account_status_logs (
  log_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('suspend', 'unsuspend')),
  before_status TEXT NOT NULL,
  after_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

CREATE INDEX IF NOT EXISTS idx_user_account_status_logs_user_id ON user_account_status_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_status_logs_admin_id ON user_account_status_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_account_status_logs_created_at ON user_account_status_logs(created_at);
