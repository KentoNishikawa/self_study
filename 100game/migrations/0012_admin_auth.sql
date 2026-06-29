CREATE TABLE IF NOT EXISTS admin_users (
  admin_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  must_change_password INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  password_changed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_email_normalized ON admin_users(email_normalized);

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admin_users(admin_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

INSERT OR IGNORE INTO admin_users (
  admin_id,
  display_name,
  email,
  email_normalized,
  password_hash,
  role,
  status,
  must_change_password,
  last_login_at,
  password_changed_at,
  created_at,
  updated_at,
  deleted_at
)
VALUES (
  'adm_initial_owner',
  '西川 拳人',
  'abnishikawa@acceble.com',
  'abnishikawa@acceble.com',
  'PBKDF2-SHA256:210000:yRSAmVjcJpkZ_XpbOc6FAQ:L99BsFFwiVVu62tyik3OlhR7AYhTsTPrfqozp6wwpwc',
  'owner',
  'active',
  1,
  NULL,
  NULL,
  '2026-06-27T00:00:00.000Z',
  '2026-06-27T00:00:00.000Z',
  NULL
);
