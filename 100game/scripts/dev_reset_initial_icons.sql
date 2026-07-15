-- ローカル開発用：直接投入されていた初期アイコンを削除して、アイコン管理から入れ直せる状態にする。
-- 本番運用後のDBには適用しないこと。

UPDATE user_settings
SET current_icon_id = NULL,
    updated_at = datetime('now')
WHERE current_icon_id IN (
  SELECT icon_id
  FROM icons
  WHERE icon_code LIKE 'icon_player_%'
     OR condition_type = 'initial_grant'
     OR is_initial = 1
);

DELETE FROM user_icons
WHERE icon_id IN (
  SELECT icon_id
  FROM icons
  WHERE icon_code LIKE 'icon_player_%'
     OR condition_type = 'initial_grant'
     OR is_initial = 1
);

DELETE FROM title_icon_rewards
WHERE icon_id IN (
  SELECT icon_id
  FROM icons
  WHERE icon_code LIKE 'icon_player_%'
     OR condition_type = 'initial_grant'
     OR is_initial = 1
);

DELETE FROM user_notifications
WHERE target_type = 'icon'
  AND target_id IN (
    SELECT icon_id
    FROM icons
    WHERE icon_code LIKE 'icon_player_%'
       OR condition_type = 'initial_grant'
       OR is_initial = 1
  );

DELETE FROM admin_change_items
WHERE target_type = 'icon'
  AND target_id IN (
    SELECT icon_id
    FROM icons
    WHERE icon_code LIKE 'icon_player_%'
       OR condition_type = 'initial_grant'
       OR is_initial = 1
  );

DELETE FROM icons
WHERE icon_code LIKE 'icon_player_%'
   OR condition_type = 'initial_grant'
   OR is_initial = 1;
