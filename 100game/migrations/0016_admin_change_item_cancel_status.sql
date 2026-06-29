ALTER TABLE admin_change_items ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'cancelled'));
ALTER TABLE admin_change_items ADD COLUMN parent_item_id TEXT;
ALTER TABLE admin_change_items ADD COLUMN cancelled_by TEXT;
ALTER TABLE admin_change_items ADD COLUMN cancelled_at TEXT;
ALTER TABLE admin_change_items ADD COLUMN cancel_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_admin_change_items_status ON admin_change_items(status, batch_id);
CREATE INDEX IF NOT EXISTS idx_admin_change_items_parent ON admin_change_items(parent_item_id);
