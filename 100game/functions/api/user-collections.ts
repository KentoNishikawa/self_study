import { findActiveSession, json, nowIso, type Env, type PagesContext } from "./auth/_shared";

type TitleMasterSeed = {
  title_id: string;
  title_code: string;
  title_name: string;
  description: string;
  unlock_condition_text: string;
  rarity: number;
  condition_type: string;
  condition_params_json: string | null;
  is_initial: number;
  is_active: number;
  sort_order: number;
};

type IconMasterSeed = {
  icon_id: string;
  icon_code: string;
  icon_name: string;
  description: string;
  unlock_condition_text: string;
  image_path: string;
  rarity: number;
  condition_type: string;
  condition_params_json: string | null;
  is_initial: number;
  is_guest_available: number;
  is_active: number;
  sort_order: number;
};

type IllustrationMasterSeed = {
  illustration_id: string;
  illustration_code: string;
  illustration_name: string;
  description: string;
  unlock_condition_text: string;
  image_path: string;
  rarity: number;
  condition_type: string;
  condition_params_json: string | null;
  is_initial: number;
  is_rare: number;
  is_boost_excluded: number;
  is_active: number;
  sort_order: number;
};

type TitleCollectionRow = {
  title_id: string;
  title_name: string;
  description: string;
  unlock_condition_text: string;
  rarity: number;
  sort_order: number;
  acquired_at: string | null;
};

type IconCollectionRow = {
  icon_id: string;
  icon_name: string;
  description: string;
  unlock_condition_text: string;
  image_path: string;
  rarity: number;
  sort_order: number;
  storage_provider: string;
  acquired_at: string | null;
};

type IllustrationCollectionRow = {
  illustration_id: string;
  illustration_name: string;
  description: string;
  unlock_condition_text: string;
  image_path: string;
  rarity: number;
  sort_order: number;
  storage_provider: string;
  acquired_at: string | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  display_count: number | null;
};

const DEFAULT_TITLE_ID = "title-initial-001";
const DEFAULT_ICON_ID = "img_01_u7537_u306e_u5b50";

const TITLE_SEEDS: TitleMasterSeed[] = [
  createInitialTitleSeed("title-initial-001", "initial_first_step", "はじめの一歩", "まずはここから！", 1),
  createInitialTitleSeed("title-initial-002", "initial_challenger_100", "100への挑戦者", "千里の道も一歩よりだけど、ここでは100から", 2),
  createInitialTitleSeed("title-initial-003", "initial_hand_newbie", "手札の新人", "手札どころか全部新人だもん", 3),
  createInitialTitleSeed("title-initial-004", "initial_first_card", "まずは一枚", "とりあえずカード出したら良くできました！", 4),
  createInitialTitleSeed("title-initial-005", "initial_rule_checking", "ルール確認中", "ルールを守って楽しく・・・遊びましょう！", 5),
  createInitialTitleSeed("title-initial-006", "initial_relaxed_player", "まったり勢", "焦らず行こうよ。", 6),
  createInitialTitleSeed("title-initial-007", "initial_easy_please", "お手柔らかに", "この称号掲げてる人をいじめる人との関係は考えた方が良いと思う", 7),
  createInitialTitleSeed("title-initial-008", "initial_player_started", "プレイヤー、始めました", "ギターの代わりにカードを！", 8),
  createInitialTitleSeed("title-initial-009", "initial_match_entrance", "勝負の入口", "いざ！勝負！", 9),
  createInitialTitleSeed("title-initial-010", "initial_one_game_please", "一戦お願いします", "なんたる礼儀の良さ！", 10),
];

const ICON_SEEDS: IconMasterSeed[] = [
  createIconSeed("img_01_u7537_u306e_u5b50", "icon_player_001", "男の子", 1, "/assets/icons/01_boy.png"),
  createIconSeed("img_02_u5973_u306e_u5b50_u59b9", "icon_player_002", "女の子 妹", 2, "/assets/icons/02_girl_sister.png"),
  createIconSeed("img_03_u7537_u6027", "icon_player_003", "男性", 3, "/assets/icons/03_man.png"),
  createIconSeed("img_04_u5973_u6027", "icon_player_004", "女性", 4, "/assets/icons/04_woman.png"),
  createIconSeed("img_05_u30a4_u30cc", "icon_player_005", "イヌ", 5, "/assets/icons/05_dog.png"),
  createIconSeed("img_06_u30cd_u30b3", "icon_player_006", "ネコ", 6, "/assets/icons/06_cat.png"),
];

const ILLUSTRATION_SEEDS: IllustrationMasterSeed[] = [
  {
    illustration_id: "load-illustration-001",
    illustration_code: "loading_boy_001",
    illustration_name: "ロード画面１(男の子)",
    description: "文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30",
    unlock_condition_text: "はじめの一歩を所持しているとロード画面に出現",
    image_path: "/assets/loading-illustrations/01_load.png",
    rarity: 1,
    condition_type: "title_owned",
    condition_params_json: '{"titleId":"title-initial-001"}',
    is_initial: 0,
    is_rare: 0,
    is_boost_excluded: 0,
    is_active: 1,
    sort_order: 1,
  },
  {
    illustration_id: "load-illustration-002",
    illustration_code: "loading_girl_001",
    illustration_name: "ロード画面２(女の子)",
    description: "文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30文字数30",
    unlock_condition_text: "100への挑戦者を所持しているとロード画面に出現",
    image_path: "/assets/loading-illustrations/02_load.png",
    rarity: 1,
    condition_type: "title_owned",
    condition_params_json: '{"titleId":"title-initial-002"}',
    is_initial: 0,
    is_rare: 0,
    is_boost_excluded: 0,
    is_active: 1,
    sort_order: 2,
  },
];

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  await ensureCollectionSeed(env, session.user_id);

  const [titles, icons, loadingIllustrations] = await Promise.all([
    readTitleCollection(env, session.user_id),
    readIconCollection(env, session.user_id),
    readIllustrationCollection(env, session.user_id),
  ]);

  return json({
    ok: true,
    collection: {
      titles: titles.map(toTitleResponse),
      icons: icons.map(toIconResponse),
      loadingIllustrations: loadingIllustrations.map(toIllustrationResponse),
    },
  });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGETのみ対応しています。" }, { status: 405 });
}

export async function ensureCollectionSeed(env: Env, userId: string) {
  const now = nowIso();

  for (const title of TITLE_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO titles (
        title_id, title_code, title_name, description, unlock_condition_text,
        rarity, condition_type, condition_params_json, is_initial, is_active,
        sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(title_id) DO NOTHING
      `,
    )
      .bind(
        title.title_id,
        title.title_code,
        title.title_name,
        title.description,
        title.unlock_condition_text,
        title.rarity,
        title.condition_type,
        title.condition_params_json,
        title.is_initial,
        title.is_active,
        title.sort_order,
        now,
        now,
      )
      .run();
  }

  for (const icon of ICON_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO icons (
        icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
        rarity, condition_type, condition_params_json, is_initial, is_guest_available,
        is_active, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(icon_id) DO NOTHING
      `,
    )
      .bind(
        icon.icon_id,
        icon.icon_code,
        icon.icon_name,
        icon.description,
        icon.unlock_condition_text,
        icon.image_path,
        icon.rarity,
        icon.condition_type,
        icon.condition_params_json,
        icon.is_initial,
        icon.is_guest_available,
        icon.is_active,
        icon.sort_order,
        now,
        now,
      )
      .run();
  }

  await grantInitialTitlesFromDb(env, userId, now);
  await grantInitialIconsFromDb(env, userId, now);

  for (const illustration of ILLUSTRATION_SEEDS) {
    await env.DB.prepare(
      `
      INSERT INTO title_illustrations (
        illustration_id, illustration_code, illustration_name, description, unlock_condition_text,
        image_path, rarity, condition_type, condition_params_json, is_initial, is_rare,
        is_boost_excluded, is_active, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(illustration_id) DO UPDATE SET
        illustration_code = excluded.illustration_code,
        illustration_name = excluded.illustration_name,
        description = excluded.description,
        unlock_condition_text = excluded.unlock_condition_text,
        image_path = excluded.image_path,
        rarity = excluded.rarity,
        condition_type = excluded.condition_type,
        condition_params_json = excluded.condition_params_json,
        is_initial = excluded.is_initial,
        is_rare = excluded.is_rare,
        is_boost_excluded = excluded.is_boost_excluded,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
      `,
    )
      .bind(
        illustration.illustration_id,
        illustration.illustration_code,
        illustration.illustration_name,
        illustration.description,
        illustration.unlock_condition_text,
        illustration.image_path,
        illustration.rarity,
        illustration.condition_type,
        illustration.condition_params_json,
        illustration.is_initial,
        illustration.is_rare,
        illustration.is_boost_excluded,
        illustration.is_active,
        illustration.sort_order,
        now,
        now,
      )
      .run();

  }

  await env.DB.prepare(
    `
    UPDATE user_settings
    SET
      current_icon_id = COALESCE(current_icon_id, ?),
      current_title_id = COALESCE(current_title_id, ?),
      updated_at = ?
    WHERE user_id = ?
    `,
  )
    .bind(DEFAULT_ICON_ID, DEFAULT_TITLE_ID, now, userId)
    .run();
}

async function grantInitialTitlesFromDb(env: Env, userId: string, now: string) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_titles (user_id, title_id, acquired_at, created_at)
    SELECT ?, title_id, ?, ?
    FROM titles
    WHERE is_initial = 1
      AND is_active = 1
    `,
  )
    .bind(userId, now, now)
    .run();
}

async function grantInitialIconsFromDb(env: Env, userId: string, now: string) {
  await env.DB.prepare(
    `
    INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at)
    SELECT ?, icon_id, ?, ?
    FROM icons
    WHERE is_initial = 1
      AND is_active = 1
    `,
  )
    .bind(userId, now, now)
    .run();
}

async function readTitleCollection(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      titles.title_id,
      titles.title_name,
      titles.description,
      titles.unlock_condition_text,
      titles.rarity,
      titles.sort_order,
      user_titles.acquired_at
    FROM titles
    LEFT JOIN user_titles
      ON user_titles.title_id = titles.title_id
      AND user_titles.user_id = ?
    WHERE titles.is_active = 1
    ORDER BY titles.sort_order ASC, titles.title_id ASC
    `,
  )
    .bind(userId)
    .all<TitleCollectionRow>();

  return result.results ?? [];
}

async function readIconCollection(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      icons.icon_id,
      icons.icon_name,
      icons.description,
      icons.unlock_condition_text,
      icons.image_path,
      icons.rarity,
      icons.sort_order,
      icons.storage_provider,
      user_icons.acquired_at
    FROM icons
    LEFT JOIN user_icons
      ON user_icons.icon_id = icons.icon_id
      AND user_icons.user_id = ?
    WHERE icons.deleted_at IS NULL
      AND (icons.is_active = 1 OR user_icons.acquired_at IS NOT NULL)
      AND (COALESCE(icons.storage_provider, 'local') <> 'r2' OR user_icons.acquired_at IS NOT NULL)
    ORDER BY icons.sort_order ASC, icons.icon_id ASC
    `,
  )
    .bind(userId)
    .all<IconCollectionRow>();

  return result.results ?? [];
}

async function readIllustrationCollection(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      title_illustrations.illustration_id,
      title_illustrations.illustration_name,
      title_illustrations.description,
      title_illustrations.unlock_condition_text,
      title_illustrations.image_path,
      title_illustrations.rarity,
      title_illustrations.sort_order,
      title_illustrations.storage_provider,
      user_title_illustrations.acquired_at,
      user_title_illustrations.first_viewed_at,
      user_title_illustrations.last_viewed_at,
      user_title_illustrations.display_count
    FROM title_illustrations
    INNER JOIN user_title_illustrations
      ON user_title_illustrations.illustration_id = title_illustrations.illustration_id
      AND user_title_illustrations.user_id = ?
      AND user_title_illustrations.first_viewed_at IS NOT NULL
    WHERE title_illustrations.is_active = 1
      AND title_illustrations.deleted_at IS NULL
    ORDER BY title_illustrations.sort_order ASC, title_illustrations.illustration_id ASC
    `,
  )
    .bind(userId)
    .all<IllustrationCollectionRow>();

  return result.results ?? [];
}

function toTitleResponse(row: TitleCollectionRow) {
  const owned = Boolean(row.acquired_at);
  return {
    id: row.title_id,
    name: owned ? row.title_name : "未開放",
    rarity: toRarityStars(row.rarity),
    condition: owned ? row.unlock_condition_text : "未所持",
    acquiredAt: owned ? formatAcquiredAt(row.acquired_at) : undefined,
    acquiredAtOrder: owned ? toEpochMillis(row.acquired_at) : undefined,
    comment: owned ? row.description : "未所持",
    owned,
    sortOrder: row.sort_order,
  };
}

function toIconResponse(row: IconCollectionRow) {
  const owned = Boolean(row.acquired_at);
  const imagePath = row.storage_provider === "r2" ? `/api/assets/icons/${encodeURIComponent(row.icon_id)}` : row.image_path;
  return {
    id: row.icon_id,
    name: owned ? row.icon_name : "未開放",
    comment: owned ? row.description : "未所持",
    imagePath,
    owned,
    sortOrder: row.sort_order,
  };
}

function toIllustrationResponse(row: IllustrationCollectionRow) {
  const owned = Boolean(row.first_viewed_at);
  const src = row.storage_provider === "r2" ? `/api/assets/loading-illustrations/${encodeURIComponent(row.illustration_id)}` : row.image_path;
  return {
    id: row.illustration_id,
    name: owned ? row.illustration_name : "未開放",
    src,
    comment: owned ? row.description : "未所持",
    owned,
    firstViewedAt: row.first_viewed_at,
    lastViewedAt: row.last_viewed_at,
    displayCount: row.display_count ?? 0,
    sortOrder: row.sort_order,
  };
}

function createInitialTitleSeed(
  titleId: string,
  titleCode: string,
  titleName: string,
  description: string,
  sortOrder: number,
): TitleMasterSeed {
  return {
    title_id: titleId,
    title_code: titleCode,
    title_name: titleName,
    description,
    unlock_condition_text: "初期から所持",
    rarity: 1,
    condition_type: "initial_grant",
    condition_params_json: null,
    is_initial: 1,
    is_active: 1,
    sort_order: sortOrder,
  };
}

function createIconSeed(iconId: string, iconCode: string, name: string, sortOrder: number, imagePath: string): IconMasterSeed {
  return {
    icon_id: iconId,
    icon_code: iconCode,
    icon_name: name,
    description: `${name}のプレイヤーアイコンです。ゲーム内で選択できるようになります。`,
    unlock_condition_text: "最初から所持",
    image_path: imagePath,
    rarity: 1,
    condition_type: "initial_grant",
    condition_params_json: null,
    is_initial: 1,
    is_guest_available: 1,
    is_active: 1,
    sort_order: sortOrder,
  };
}

function toRarityStars(rarity: number) {
  const level = Math.min(5, Math.max(1, Math.round(Number(rarity) || 1)));
  return "☆".repeat(level);
}

function toEpochMillis(value: string | null) {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? undefined : time;
}

function formatAcquiredAt(value: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}年${month}月${day}日に取得`;
}
