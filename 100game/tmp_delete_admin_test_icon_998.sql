BEGIN TRANSACTION;

INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at)
SELECT
  user_id,
  (SELECT icon_id FROM icons WHERE icon_code = 'icon_player_001'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM user_settings
WHERE current_icon_id = (SELECT icon_id FROM icons WHERE icon_code = 'admin_test_icon_998');

UPDATE user_settings
SET current_icon_id = (SELECT icon_id FROM icons WHERE icon_code = 'icon_player_001'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE current_icon_id = (SELECT icon_id FROM icons WHERE icon_code = 'admin_test_icon_998');

DELETE FROM title_icon_rewards
WHERE icon_id = (SELECT icon_id FROM icons WHERE icon_code = 'admin_test_icon_998');

DELETE FROM user_icons
WHERE icon_id = (SELECT icon_id FROM icons WHERE icon_code = 'admin_test_icon_998');

UPDATE icons
SET is_active = 0,
    deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE icon_code = 'admin_test_icon_998';

COMMIT;
