import { createId, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type MasterTargetType = "title" | "icon";

type TitleMasterRow = {
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
  created_at: string;
  updated_at: string;
};

type IconMasterRow = {
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
  created_at: string;
  updated_at: string;
};

type TitleInput = {
  titleId?: string;
  titleCode: string;
  titleName: string;
  description: string;
  unlockConditionText: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string | null;
  isInitial: 0 | 1;
  isActive: 0 | 1;
  sortOrder: number;
  iconRewardIds: string[];
  titleIconRewardChangeReason: string;
};

type IconSummaryRow = {
  icon_id: string;
  icon_code: string;
  icon_name: string;
};

type DraftBatchRow = {
  batch_id: string;
  batch_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ChangeItemRow = {
  item_id: string;
  batch_id: string;
  change_type: string;
  target_type: string;
  target_id: string;
  before_json: string | null;
  after_json: string | null;
  effect_json: string | null;
  reason: string;
  created_at: string;
  status: "draft" | "cancelled";
};

class AdminInputError extends Error { }

type IconInput = {
  iconId?: string;
  iconCode: string;
  iconName: string;
  description: string;
  unlockConditionText: string;
  imagePath: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string | null;
  isInitial: 0 | 1;
  isGuestAvailable: 0 | 1;
  isActive: 0 | 1;
  sortOrder: number;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const [titles, icons, titleIconRewards] = await Promise.all([
    readTitles(context.env),
    readIcons(context.env),
    readTitleIconRewards(context.env),
  ]);

  return json({
    ok: true,
    currentUser: {
      userId: session.user_id,
      email: session.email,
      role: session.role,
    },
    masters: {
      titles: titles.map((title) => toTitleResponse(title, titleIconRewards.get(title.title_id) ?? [])),
      icons: icons.map(toIconResponse),
    },
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const targetType = readTargetType(body.targetType);
  if (!targetType) return json({ ok: false, message: "管理対象が不正です。" }, { status: 400 });

  try {
    if (targetType === "title") {
      const input = readTitleInput(body, false);
      if (!input.ok) return json({ ok: false, message: "入力内容を確認してください。", errors: input.errors }, { status: 400 });
      const titleId = createId("title");
      await insertTitle(context.env, titleId, input.value);
      const title = await readTitle(context.env, titleId);
      const batchId = title
        ? await createTitleIconRewardsChangeBatchIfNeeded(context.env, title, input.value.iconRewardIds, input.value.titleIconRewardChangeReason, session.user_id)
        : null;
      return json({ ok: true, message: batchId ? "称号を追加し、アイコン報酬変更を一時保存しました。" : "称号を追加しました。", id: titleId, batchId });
    }

    const input = readIconInput(body, false);
    if (!input.ok) return json({ ok: false, message: "入力内容を確認してください。", errors: input.errors }, { status: 400 });
    const iconId = createId("icon");
    await insertIcon(context.env, iconId, input.value);
    return json({ ok: true, message: "アイコンを追加しました。", id: iconId });
  } catch (error) {
    return json({ ok: false, message: toSaveErrorMessage(error) }, { status: 409 });
  }
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const targetType = readTargetType(body.targetType);
  if (!targetType) return json({ ok: false, message: "管理対象が不正です。" }, { status: 400 });

  try {
    if (targetType === "title") {
      const input = readTitleInput(body, true);
      if (!input.ok) return json({ ok: false, message: "入力内容を確認してください。", errors: input.errors }, { status: 400 });
      await updateTitle(context.env, input.value);
      const title = input.value.titleId ? await readTitle(context.env, input.value.titleId) : null;
      const batchId = title
        ? await createTitleIconRewardsChangeBatchIfNeeded(context.env, title, input.value.iconRewardIds, input.value.titleIconRewardChangeReason, session.user_id)
        : null;
      return json({ ok: true, message: batchId ? "称号を更新し、アイコン報酬変更を一時保存しました。" : "称号を更新しました。", batchId });
    }

    const input = readIconInput(body, true);
    if (!input.ok) return json({ ok: false, message: "入力内容を確認してください。", errors: input.errors }, { status: 400 });
    await updateIcon(context.env, input.value);
    return json({ ok: true, message: "アイコンを更新しました。" });
  } catch (error) {
    return json({ ok: false, message: toSaveErrorMessage(error) }, { status: 409 });
  }
}

function readTargetType(value: unknown): MasterTargetType | null {
  if (value === "title" || value === "icon") return value;
  return null;
}

function readTitleInput(body: Record<string, unknown>, requireId: boolean): ValidationResult<TitleInput> {
  const errors: Record<string, string> = {};
  const titleId = getString(body.titleId).trim();
  const titleCode = getString(body.titleCode).trim();
  const titleName = getString(body.titleName).trim();
  const description = getString(body.description).trim();
  const unlockConditionText = getString(body.unlockConditionText).trim();
  const rarity = readInteger(body.rarity, 1);
  const conditionType = getString(body.conditionType).trim();
  const conditionParamsJson = normalizeJsonText(body.conditionParamsJson, errors);
  const isInitial = readFlag(body.isInitial);
  const isActive = readFlag(body.isActive);
  const sortOrder = readInteger(body.sortOrder, 0);
  const iconRewardIds = readIconRewardIds(body.iconRewardIds, errors);
  const titleIconRewardChangeReason = getString(body.titleIconRewardChangeReason).trim();

  if (requireId && !titleId) errors.titleId = "称号IDがありません。";
  if (!titleCode) errors.titleCode = "称号コードを入力してください。";
  if (!titleName) errors.titleName = "称号名を入力してください。";
  if (!description) errors.description = "説明を入力してください。";
  if (!unlockConditionText) errors.unlockConditionText = "取得条件テキストを入力してください。";
  if (rarity < 1 || rarity > 5) errors.rarity = "レア度は1〜5で入力してください。";
  if (!conditionType) errors.conditionType = "condition_typeを入力してください。";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      titleId: titleId || undefined,
      titleCode,
      titleName,
      description,
      unlockConditionText,
      rarity,
      conditionType,
      conditionParamsJson,
      isInitial,
      isActive,
      sortOrder,
      iconRewardIds,
      titleIconRewardChangeReason,
    },
  };
}

function readIconInput(body: Record<string, unknown>, requireId: boolean): ValidationResult<IconInput> {
  const errors: Record<string, string> = {};
  const iconId = getString(body.iconId).trim();
  const iconCode = getString(body.iconCode).trim();
  const iconName = getString(body.iconName).trim();
  const description = getString(body.description).trim();
  const unlockConditionText = getString(body.unlockConditionText).trim();
  const imagePath = getString(body.imagePath).trim();
  const rarity = readInteger(body.rarity, 1);
  const conditionType = getString(body.conditionType).trim();
  const conditionParamsJson = normalizeJsonText(body.conditionParamsJson, errors);
  const isInitial = readFlag(body.isInitial);
  const isGuestAvailable = readFlag(body.isGuestAvailable);
  const isActive = readFlag(body.isActive);
  const sortOrder = readInteger(body.sortOrder, 0);

  if (requireId && !iconId) errors.iconId = "アイコンIDがありません。";
  if (!iconCode) errors.iconCode = "アイコンコードを入力してください。";
  if (!iconName) errors.iconName = "アイコン名を入力してください。";
  if (!description) errors.description = "説明を入力してください。";
  if (!unlockConditionText) errors.unlockConditionText = "取得条件テキストを入力してください。";
  if (!imagePath) errors.imagePath = "画像パスを入力してください。";
  if (rarity < 1 || rarity > 5) errors.rarity = "レア度は1〜5で入力してください。";
  if (!conditionType) errors.conditionType = "condition_typeを入力してください。";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      iconId: iconId || undefined,
      iconCode,
      iconName,
      description,
      unlockConditionText,
      imagePath,
      rarity,
      conditionType,
      conditionParamsJson,
      isInitial,
      isGuestAvailable,
      isActive,
      sortOrder,
    },
  };
}

function normalizeJsonText(value: unknown, errors: Record<string, string>) {
  const text = getString(value).trim();
  if (!text) return null;

  try {
    JSON.parse(text);
  } catch {
    errors.conditionParamsJson = "condition_params_json は正しいJSONで入力してください。";
  }

  return text;
}

function readFlag(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function readIconRewardIds(value: unknown, errors: Record<string, string>) {
  if (!Array.isArray(value)) return [];

  const ids = value
    .map((item) => getString(item).trim())
    .filter(Boolean);
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length !== ids.length) errors.iconRewardIds = "同じアイコンを重複して紐づけることはできません。";
  if (uniqueIds.length > 3) errors.iconRewardIds = "紐づけるアイコンは最大3つまでです。";

  return uniqueIds.slice(0, 3);
}

function readInteger(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : fallback;
}

async function readTitles(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT *
    FROM titles
    ORDER BY sort_order ASC, title_id ASC
    `,
  ).all<TitleMasterRow>();

  return result.results ?? [];
}

async function readIcons(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT *
    FROM icons
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, icon_id ASC
    `,
  ).all<IconMasterRow>();

  return result.results ?? [];
}

type TitleIconRewardRow = {
  title_id: string;
  icon_id: string;
};

async function readTitleIconRewards(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.title_id, title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    ORDER BY title_icon_rewards.title_id ASC, title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `,
  ).all<TitleIconRewardRow>();

  const rewardMap = new Map<string, string[]>();
  for (const row of result.results ?? []) {
    const iconIds = rewardMap.get(row.title_id) ?? [];
    iconIds.push(row.icon_id);
    rewardMap.set(row.title_id, iconIds);
  }

  return rewardMap;
}

async function readTitle(env: Env, titleId: string) {
  return await env.DB.prepare(
    `
    SELECT *
    FROM titles
    WHERE title_id = ?
    LIMIT 1
    `,
  )
    .bind(titleId)
    .first<TitleMasterRow>();
}

async function readTitleIconRewardIds(env: Env, titleId: string) {
  const result = await env.DB.prepare(
    `
    SELECT title_icon_rewards.icon_id
    FROM title_icon_rewards
    INNER JOIN icons
      ON icons.icon_id = title_icon_rewards.icon_id
      AND icons.deleted_at IS NULL
    WHERE title_icon_rewards.title_id = ?
    ORDER BY title_icon_rewards.sort_order ASC, title_icon_rewards.icon_id ASC
    `,
  )
    .bind(titleId)
    .all<{ icon_id: string }>();

  return (result.results ?? []).map((row) => row.icon_id);
}

async function createTitleIconRewardsChangeBatchIfNeeded(env: Env, title: TitleMasterRow, iconRewardIds: string[], reason: string, adminId: string) {
  const currentIconRewardIds = await readTitleIconRewardIds(env, title.title_id);
  if (isSameIdList(currentIconRewardIds, iconRewardIds)) return null;

  if (!reason) throw new AdminInputError("アイコン報酬を変更する場合は、変更理由を入力してください。");
  if (reason.length > 500) throw new AdminInputError("変更理由は500文字以内で入力してください。");

  const openTitleChange = await hasOpenTitleIconRewardsChange(env, title.title_id);
  if (openTitleChange) throw new AdminInputError("この称号には未反映のアイコン報酬変更があります。反映設定タブを確認してください。");

  for (const iconId of iconRewardIds) {
    const openIconDelete = await hasOpenIconDelete(env, iconId);
    if (openIconDelete) throw new AdminInputError("選択中のアイコンには未反映の削除予定があります。反映設定タブを確認してください。");
  }

  const iconRewardsValid = await validateIconRewardIds(env, iconRewardIds);
  if (!iconRewardsValid) throw new AdminInputError("紐づけるアイコンを確認してください。");

  const [beforeIcons, afterIcons, effect] = await Promise.all([
    readIconSummaries(env, currentIconRewardIds),
    readIconSummaries(env, iconRewardIds),
    readTitleIconRewardsEffect(env, title.title_id, currentIconRewardIds, iconRewardIds),
  ]);

  const now = nowIso();
  const batchName = `称号アイコン報酬変更：${title.title_name}`;
  const batchId = await getOrCreateDraftBatchId(env, adminId, batchName, now);

  await env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'title_icon_rewards_update', 'title', ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      createId("chi"),
      batchId,
      title.title_id,
      JSON.stringify({ title, iconRewardIds: currentIconRewardIds, iconRewards: beforeIcons }),
      JSON.stringify({ iconRewardIds, iconRewards: afterIcons }),
      JSON.stringify(effect),
      reason,
      now,
    )
    .run();

  await refreshDraftBatchMeta(env, batchId, now);

  return batchId;
}

async function getOrCreateDraftBatchId(env: Env, adminId: string, batchName: string, now: string) {
  await ensureSingleDraftBatch(env);
  const draft = await readCurrentDraftBatch(env);
  if (draft) return draft.batch_id;

  const batchId = createId("chg");
  await env.DB.prepare(
    `
    INSERT INTO admin_change_batches (
      batch_id, batch_name, status, created_by, created_at, updated_at
    )
    VALUES (?, ?, 'draft', ?, ?, ?)
    `,
  )
    .bind(batchId, batchName, adminId, now, now)
    .run();
  return batchId;
}

async function refreshDraftBatchMeta(env: Env, batchId: string, now: string) {
  const items = await readBatchItems(env, batchId);
  const batchName = formatBatchDisplayNameFromItems(items) || "次回反映予定";
  await env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'")
    .bind(batchName, now, batchId)
    .run();
}

async function readCurrentDraftBatch(env: Env) {
  return await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    LIMIT 1
    `,
  ).first<DraftBatchRow>();
}

async function ensureSingleDraftBatch(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT batch_id, batch_name, created_by, created_at, updated_at
    FROM admin_change_batches
    WHERE status = 'draft'
    ORDER BY created_at ASC, batch_id ASC
    `,
  ).all<DraftBatchRow>();
  const drafts = result.results ?? [];
  if (drafts.length <= 1) return;

  const primary = drafts[0];
  for (const batchId of drafts.slice(1).map((draft) => draft.batch_id)) {
    await env.DB.prepare("UPDATE admin_change_items SET batch_id = ? WHERE batch_id = ?").bind(primary.batch_id, batchId).run();
    await env.DB.prepare("DELETE FROM admin_change_batches WHERE batch_id = ? AND status = 'draft'").bind(batchId).run();
  }

  const row = await env.DB.prepare(
    `
    SELECT MAX(created_at) AS updated_at
    FROM admin_change_items
    WHERE batch_id = ?
    `,
  )
    .bind(primary.batch_id)
    .first<{ updated_at: string | null }>();
  await refreshDraftBatchMeta(env, primary.batch_id, row?.updated_at || nowIso());
}

async function readBatchItems(env: Env, batchId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at, status
    FROM admin_change_items
    WHERE batch_id = ?
    ORDER BY created_at ASC, item_id ASC
    `,
  )
    .bind(batchId)
    .all<ChangeItemRow>();
  return result.results ?? [];
}

function formatBatchDisplayNameFromItems(items: ChangeItemRow[]) {
  const mainItems = items.filter((item) => item.status === "draft" && item.change_type !== "announcement_create");
  if (mainItems.length === 0) return "次回反映予定";
  const firstName = formatChangeItemDisplayName(mainItems[0]);
  if (mainItems.length === 1) return firstName;
  return `${firstName}＋他${mainItems.length - 1}件`;
}

function formatChangeItemDisplayName(item: ChangeItemRow) {
  const before = parseJson<Record<string, unknown>>(item.before_json) ?? {};
  if (item.change_type === "icon_delete") return `アイコン削除：${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "icon_replace") return `アイコン差し替え：${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_delete") return `ロードイラスト削除：${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_replace") return `ロードイラスト差し替え：${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "title_icon_rewards_update") {
    const title = before.title;
    if (title && typeof title === "object" && !Array.isArray(title)) return `称号アイコン報酬変更：${readRecordText(title as Record<string, unknown>, "title_name", item.target_id)}`;
    return `称号アイコン報酬変更：${item.target_id}`;
  }
  return item.target_id;
}

function readRecordText(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function parseJson<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function validateIconRewardIds(env: Env, iconRewardIds: string[]) {
  if (iconRewardIds.length === 0) return true;

  const placeholders = iconRewardIds.map(() => "?").join(", ");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM icons WHERE icon_id IN (${placeholders}) AND deleted_at IS NULL`,
  )
    .bind(...iconRewardIds)
    .first<{ count: number }>();

  return Number(row?.count ?? 0) === iconRewardIds.length;
}

async function readIconSummaries(env: Env, iconIds: string[]) {
  if (iconIds.length === 0) return [];

  const placeholders = iconIds.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `
    SELECT icon_id, icon_code, icon_name
    FROM icons
    WHERE icon_id IN (${placeholders})
    `,
  )
    .bind(...iconIds)
    .all<IconSummaryRow>();

  const iconMap = new Map((result.results ?? []).map((row) => [row.icon_id, row]));
  return iconIds.map((iconId) => iconMap.get(iconId) ?? { icon_id: iconId, icon_code: iconId, icon_name: iconId });
}

async function hasOpenIconDelete(env: Env, iconId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'icon_delete'
      AND admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `,
  )
    .bind(iconId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

async function hasOpenTitleIconRewardsChange(env: Env, titleId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'title_icon_rewards_update'
      AND admin_change_items.target_type = 'title'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `,
  )
    .bind(titleId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

async function readTitleIconRewardsEffect(env: Env, titleId: string, beforeIds: string[], afterIds: string[]) {
  const addedIconIds = afterIds.filter((iconId) => !beforeIds.includes(iconId));
  const removedIconIds = beforeIds.filter((iconId) => !afterIds.includes(iconId));
  const titleHolder = await env.DB.prepare("SELECT COUNT(*) AS count FROM user_titles WHERE title_id = ?").bind(titleId).first<{ count: number }>();
  let retroactiveGrantCount = 0;
  for (const iconId of afterIds) {
    const missing = await env.DB.prepare(
      `
      SELECT COUNT(*) AS count
      FROM user_titles
      LEFT JOIN user_icons
        ON user_icons.user_id = user_titles.user_id
        AND user_icons.icon_id = ?
      WHERE user_titles.title_id = ?
        AND user_icons.icon_id IS NULL
      `,
    )
      .bind(iconId, titleId)
      .first<{ count: number }>();
    retroactiveGrantCount += Number(missing?.count ?? 0);
  }

  return {
    beforeCount: beforeIds.length,
    afterCount: afterIds.length,
    addedIconIds,
    removedIconIds,
    titleHolderCount: Number(titleHolder?.count ?? 0),
    retroactiveGrantCount,
  };
}

function isSameIdList(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

async function replaceTitleIconRewards(env: Env, titleId: string, iconRewardIds: string[]) {
  await env.DB.prepare("DELETE FROM title_icon_rewards WHERE title_id = ?").bind(titleId).run();

  for (const [index, iconId] of iconRewardIds.entries()) {
    await env.DB.prepare(
      `
      INSERT INTO title_icon_rewards (title_id, icon_id, sort_order, created_at)
      VALUES (?, ?, ?, ?)
      `,
    )
      .bind(titleId, iconId, index + 1, nowIso())
      .run();
  }
}

async function insertTitle(env: Env, titleId: string, input: TitleInput) {
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT INTO titles (
      title_id, title_code, title_name, description, unlock_condition_text,
      rarity, condition_type, condition_params_json, is_initial, is_active,
      sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      titleId,
      input.titleCode,
      input.titleName,
      input.description,
      input.unlockConditionText,
      input.rarity,
      input.conditionType,
      input.conditionParamsJson,
      input.isInitial,
      input.isActive,
      input.sortOrder,
      now,
      now,
    )
    .run();
}

async function updateTitle(env: Env, input: TitleInput) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE titles
    SET
      title_code = ?,
      title_name = ?,
      description = ?,
      unlock_condition_text = ?,
      rarity = ?,
      condition_type = ?,
      condition_params_json = ?,
      is_initial = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE title_id = ?
    `,
  )
    .bind(
      input.titleCode,
      input.titleName,
      input.description,
      input.unlockConditionText,
      input.rarity,
      input.conditionType,
      input.conditionParamsJson,
      input.isInitial,
      input.isActive,
      input.sortOrder,
      now,
      input.titleId,
    )
    .run();
}

async function insertIcon(env: Env, iconId: string, input: IconInput) {
  const now = nowIso();
  await env.DB.prepare(
    `
    INSERT INTO icons (
      icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
      rarity, condition_type, condition_params_json, is_initial, is_guest_available,
      is_active, sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      iconId,
      input.iconCode,
      input.iconName,
      input.description,
      input.unlockConditionText,
      input.imagePath,
      input.rarity,
      input.conditionType,
      input.conditionParamsJson,
      input.isInitial,
      input.isGuestAvailable,
      input.isActive,
      input.sortOrder,
      now,
      now,
    )
    .run();
}

async function updateIcon(env: Env, input: IconInput) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE icons
    SET
      icon_code = ?,
      icon_name = ?,
      description = ?,
      unlock_condition_text = ?,
      image_path = ?,
      rarity = ?,
      condition_type = ?,
      condition_params_json = ?,
      is_initial = ?,
      is_guest_available = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE icon_id = ?
    `,
  )
    .bind(
      input.iconCode,
      input.iconName,
      input.description,
      input.unlockConditionText,
      input.imagePath,
      input.rarity,
      input.conditionType,
      input.conditionParamsJson,
      input.isInitial,
      input.isGuestAvailable,
      input.isActive,
      input.sortOrder,
      now,
      input.iconId,
    )
    .run();
}

function toTitleResponse(row: TitleMasterRow, iconRewardIds: string[]) {
  return {
    id: row.title_id,
    code: row.title_code,
    name: row.title_name,
    description: row.description,
    unlockConditionText: row.unlock_condition_text,
    rarity: row.rarity,
    conditionType: row.condition_type,
    conditionParamsJson: row.condition_params_json ?? "",
    isInitial: row.is_initial === 1,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    iconRewardIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIconResponse(row: IconMasterRow) {
  return {
    id: row.icon_id,
    code: row.icon_code,
    name: row.icon_name,
    description: row.description,
    unlockConditionText: row.unlock_condition_text,
    imagePath: row.image_path,
    rarity: row.rarity,
    conditionType: row.condition_type,
    conditionParamsJson: row.condition_params_json ?? "",
    isInitial: row.is_initial === 1,
    isGuestAvailable: row.is_guest_available === 1,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSaveErrorMessage(error: unknown) {
  if (error instanceof AdminInputError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("UNIQUE")) return "コードが既に使用されています。";
  return "保存に失敗しました。入力内容を確認してください。";
}
