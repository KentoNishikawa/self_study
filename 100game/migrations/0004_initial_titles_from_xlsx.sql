-- Phase 3 hotfix: replace temporary title seed with the initial-owned titles from 称号一覧 (1).xlsx.
-- At this phase, only initial-owned titles are inserted. Other titles will be added later from the admin screen.

DELETE FROM user_titles
WHERE title_id IN (
  'title-start-001',
  'title-joker-001',
  'title-fate-001',
  'title-alive-001',
  'title-boundary-001',
  'title-abyss-001',
  'title-spade3-001',
  'title-unknown-001',
  'title-unknown-002'
);

DELETE FROM titles
WHERE title_id IN (
  'title-start-001',
  'title-joker-001',
  'title-fate-001',
  'title-alive-001',
  'title-boundary-001',
  'title-abyss-001',
  'title-spade3-001',
  'title-unknown-001',
  'title-unknown-002'
);

INSERT INTO titles (
  title_id, title_code, title_name, description, unlock_condition_text,
  rarity, condition_type, condition_params_json, is_initial, is_active,
  sort_order, created_at, updated_at
)
VALUES
  ('title-initial-001', 'initial_first_step', 'はじめの一歩', 'まずはここから！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-002', 'initial_challenger_100', '100への挑戦者', '千里の道も一歩よりだけど、ここでは100から', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-003', 'initial_hand_newbie', '手札の新人', '手札どころか全部新人だもん', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-004', 'initial_first_card', 'まずは一枚', 'とりあえずカード出したら良くできました！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-005', 'initial_rule_checking', 'ルール確認中', 'ルールを守って楽しく・・・遊びましょう！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-006', 'initial_relaxed_player', 'まったり勢', '焦らず行こうよ。', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-007', 'initial_easy_please', 'お手柔らかに', 'この称号掲げてる人をいじめる人との関係は考えた方が良いと思う', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-008', 'initial_player_started', 'プレイヤー、始めました', 'ギターの代わりにカードを！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-009', 'initial_match_entrance', '勝負の入口', 'いざ！勝負！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('title-initial-010', 'initial_one_game_please', '一戦お願いします', 'なんたる礼儀の良さ！', '初期から所持', 1, 'initial_grant', NULL, 1, 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(title_id) DO UPDATE SET
  title_code = excluded.title_code,
  title_name = excluded.title_name,
  description = excluded.description,
  unlock_condition_text = excluded.unlock_condition_text,
  rarity = excluded.rarity,
  condition_type = excluded.condition_type,
  condition_params_json = excluded.condition_params_json,
  is_initial = excluded.is_initial,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;

INSERT OR IGNORE INTO user_titles (user_id, title_id, acquired_at, created_at)
SELECT users.user_id, titles.title_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users
CROSS JOIN titles
WHERE titles.is_initial = 1
  AND titles.title_id LIKE 'title-initial-%'
  AND users.status <> 'deleted';

UPDATE user_settings
SET
  current_title_id = 'title-initial-001',
  updated_at = CURRENT_TIMESTAMP
WHERE current_title_id IS NULL
  OR current_title_id IN (
    'title-start-001',
    'title-joker-001',
    'title-fate-001',
    'title-alive-001',
    'title-boundary-001',
    'title-abyss-001',
    'title-spade3-001',
    'title-unknown-001',
    'title-unknown-002'
  )
  OR current_title_id NOT IN (SELECT title_id FROM titles);
