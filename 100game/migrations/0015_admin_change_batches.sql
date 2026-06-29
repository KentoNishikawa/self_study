CREATE TABLE IF NOT EXISTS admin_change_batches (
  batch_id TEXT PRIMARY KEY,
  batch_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'applied', 'cancelled', 'failed')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  scheduled_by TEXT,
  scheduled_at TEXT,
  applied_by TEXT,
  applied_at TEXT,
  cancelled_by TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS admin_change_items (
  item_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  effect_json TEXT,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES admin_change_batches(batch_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_change_batches_status ON admin_change_batches(status, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_change_batches_created_at ON admin_change_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_change_items_batch_id ON admin_change_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_admin_change_items_target ON admin_change_items(target_type, target_id);
