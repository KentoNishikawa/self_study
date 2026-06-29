INSERT OR IGNORE INTO titles (
  title_id, title_code, title_name, description, unlock_condition_text,
  rarity, condition_type, condition_params_json, is_initial, is_active,
  sort_order, created_at, updated_at
)
VALUES (
  'title-phase7-test-001',
  'phase7_test_title_001',
  'Phase7テスト称号',
  '自動獲得接続の確認用称号',
  '合計1試合以上',
  1,
  'stat_count_at_least',
  '{"scope":"total","statKey":"match_count","value":1}',
  0,
  1,
  9991,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO icons (
  icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
  rarity, condition_type, condition_params_json, is_initial, is_guest_available,
  is_active, sort_order, created_at, updated_at
)
VALUES (
  'icon-phase7-test-001',
  'phase7_test_icon_001',
  'Phase7テストアイコン',
  '自動獲得接続の確認用アイコン',
  '合計1試合以上',
  '/assets/icons/01_boy.png',
  1,
  'stat_count_at_least',
  '{"scope":"total","statKey":"match_count","value":1}',
  0,
  0,
  1,
  9991,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
