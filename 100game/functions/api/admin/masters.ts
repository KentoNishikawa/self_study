import { createId, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";
import { normalizeTitleConditionDefinition } from "./_condition-graph";
import { validateTitleConditionInput } from "./_title-condition-validation";

type MasterTargetType = "title" | "icon" | "iconType";

type TitleMasterRow = {
  title_id: string;
  title_code: string;
  title_name: string;
  description: string;
  unlock_condition_text: string;
  rarity: number;
  condition_type: string;
  condition_params_json: string | null;
  condition_builder_json: string | null;
  is_initial: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

type IconTypeRow = {
  icon_type_id: string;
  icon_type_name: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

type IconTypeLinkRow = {
  icon_id: string;
  icon_type_id: string;
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
  conditionBuilderJson: string | null;
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

const DEFAULT_ICON_SETTING_KEY = "default_icon_id";

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
  iconTypeIds: string[];
  isDefault: boolean;
};

type IconTypeInput = {
  iconTypeName: string;
};

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const [titles, icons, iconTypes, iconTypeLinks, titleIconRewards, defaultIconId] = await Promise.all([
    readTitles(context.env),
    readIcons(context.env),
    readIconTypes(context.env),
    readIconTypeLinks(context.env),
    readTitleIconRewards(context.env),
    readDefaultIconId(context.env),
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
      icons: icons.map((icon) => toIconResponse(icon, iconTypeLinks.get(icon.icon_id) ?? [], defaultIconId)),
      iconTypes: iconTypes.map(toIconTypeResponse),
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
    if (targetType === "iconType") {
      const input = readIconTypeInput(body);
      if (!input.ok) return json({ ok: false, message: "入力内容を確認してください。", errors: input.errors }, { status: 400 });
      const iconTypeId = createId("ict");
      await insertIconType(context.env, iconTypeId, input.value);
      return json({ ok: true, message: "アイコン種別を追加しました。", id: iconTypeId });
    }

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
    if (!await validateIconTypeIds(context.env, input.value.iconTypeIds)) return json({ ok: false, message: "アイコン種別を確認してください。" }, { status: 400 });
    const iconId = createId("icon");
    await insertIcon(context.env, iconId, input.value);
    await updateDefaultIconSetting(context.env, iconId, input.value.isDefault);
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
    if (targetType === "iconType") {
      return json({ ok: false, message: "アイコン種別の更新は未対応です。" }, { status: 400 });
    }

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
    if (!await validateIconTypeIds(context.env, input.value.iconTypeIds)) return json({ ok: false, message: "アイコン種別を確認してください。" }, { status: 400 });
    await updateIcon(context.env, input.value);
    await updateDefaultIconSetting(context.env, input.value.iconId ?? "", input.value.isDefault);
    return json({ ok: true, message: "アイコンを更新しました。" });
  } catch (error) {
    return json({ ok: false, message: toSaveErrorMessage(error) }, { status: 409 });
  }
}

function readTargetType(value: unknown): MasterTargetType | null {
  if (value === "title" || value === "icon" || value === "iconType") return value;
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
  let conditionType = getString(body.conditionType).trim();
  let conditionParamsJson = normalizeJsonText(body.conditionParamsJson, errors);
  let conditionBuilderJson = normalizeJsonText(body.conditionBuilderJson, errors, "conditionBuilderJson", "condition_builder_json は正しいJSONで入力してください。");
  let isInitial = readFlag(body.isInitial);
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
  if (!errors.conditionParamsJson && !errors.conditionBuilderJson) {
    const normalizedCondition = normalizeTitleConditionDefinition(conditionType, conditionParamsJson, conditionBuilderJson);
    if (normalizedCondition.ok === false) {
      errors.conditionType = normalizedCondition.message;
    } else {
      conditionType = normalizedCondition.value.conditionType;
      conditionParamsJson = normalizedCondition.value.conditionParamsJson;
      conditionBuilderJson = normalizedCondition.value.conditionBuilderJson;
      isInitial = conditionType === "initial_grant" ? 1 : 0;
      const conditionError = validateTitleConditionInput(conditionType, conditionParamsJson, conditionBuilderJson);
      if (conditionError) errors.conditionType = conditionError;
    }
  }

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
      conditionBuilderJson,
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
  const iconTypeIds = readIconTypeIds(body.iconTypeIds, errors);
  const isDefault = readFlag(body.isDefault) === 1;

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
      iconTypeIds,
      isDefault,
    },
  };
}

function readIconTypeInput(body: Record<string, unknown>): ValidationResult<IconTypeInput> {
  const errors: Record<string, string> = {};
  const iconTypeName = getString(body.iconTypeName).trim();

  if (!iconTypeName) errors.iconTypeName = "アイコン種別名を入力してください。";
  if (iconTypeName.length > 20) errors.iconTypeName = "アイコン種別名は20文字以内で入力してください。";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { iconTypeName } };
}

function normalizeJsonText(value: unknown, errors: Record<string, string>, errorKey = "conditionParamsJson", errorMessage = "condition_params_json は正しいJSONで入力してください。") {
  const text = getString(value).trim();
  if (!text) return null;

  try {
    JSON.parse(text);
  } catch {
    errors[errorKey] = errorMessage;
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

function readIconTypeIds(value: unknown, errors: Record<string, string>) {
  const rawValues = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const ids = rawValues
    .map((item) => getString(item).trim())
    .filter(Boolean);
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length !== ids.length) errors.iconTypeIds = "同じアイコン種別を重複して付与することはできません。";
  if (uniqueIds.length > 3) errors.iconTypeIds = "アイコン種別は最大3つまでです。";

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
    WHERE deleted_at IS NULL
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

async function readIconTypes(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT *
    FROM icon_types
    WHERE is_active = 1
    ORDER BY sort_order ASC, icon_type_id ASC
    `,
  ).all<IconTypeRow>();

  return result.results ?? [];
}

async function readIconTypeLinks(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT icon_type_links.icon_id, icon_type_links.icon_type_id
    FROM icon_type_links
    INNER JOIN icon_types
      ON icon_types.icon_type_id = icon_type_links.icon_type_id
      AND icon_types.is_active = 1
    INNER JOIN icons
      ON icons.icon_id = icon_type_links.icon_id
      AND icons.deleted_at IS NULL
    ORDER BY icon_type_links.icon_id ASC, icon_type_links.sort_order ASC, icon_type_links.icon_type_id ASC
    `,
  ).all<IconTypeLinkRow>();

  const linkMap = new Map<string, string[]>();
  for (const row of result.results ?? []) {
    const ids = linkMap.get(row.icon_id) ?? [];
    ids.push(row.icon_type_id);
    linkMap.set(row.icon_id, ids);
  }

  return linkMap;
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
      AND deleted_at IS NULL
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

  const openTitleDelete = await hasOpenTitleDelete(env, title.title_id);
  if (openTitleDelete) throw new AdminInputError("この称号には未反映の削除予定があります。反映設定タブを確認してください。");

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
  if (item.change_type === "title_delete") return `称号削除：${readRecordText(before, "title_name", item.target_id)}`;
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

async function validateIconTypeIds(env: Env, iconTypeIds: string[]) {
  if (iconTypeIds.length === 0) return true;
  const placeholders = iconTypeIds.map(() => "?").join(", ");
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM icon_types WHERE icon_type_id IN (${placeholders}) AND is_active = 1`,
  )
    .bind(...iconTypeIds)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) === iconTypeIds.length;
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


async function hasOpenTitleDelete(env: Env, titleId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.change_type = 'title_delete'
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
      rarity, condition_type, condition_params_json, condition_builder_json, is_initial, is_active,
      sort_order, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.conditionBuilderJson,
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
      condition_builder_json = ?,
      is_initial = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = ?
    WHERE title_id = ?
      AND deleted_at IS NULL
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
      input.conditionBuilderJson,
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
  await replaceIconTypeLinks(env, iconId, input.iconTypeIds, now);
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
  await replaceIconTypeLinks(env, input.iconId ?? "", input.iconTypeIds, now);
}

async function readDefaultIconId(env: Env) {
  const row = await env.DB.prepare(
    `
    SELECT setting_value
    FROM app_settings
    WHERE setting_key = ?
    LIMIT 1
    `,
  )
    .bind(DEFAULT_ICON_SETTING_KEY)
    .first<{ setting_value: string | null }>();

  const value = typeof row?.setting_value === "string" ? row.setting_value.trim() : "";
  return value || null;
}

async function updateDefaultIconSetting(env: Env, iconId: string, enabled: boolean) {
  if (!iconId) return;
  const now = nowIso();

  if (enabled) {
    await env.DB.prepare(
      `
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
      `,
    )
      .bind(DEFAULT_ICON_SETTING_KEY, iconId, now)
      .run();
    return;
  }

  const currentDefaultIconId = await readDefaultIconId(env);
  if (currentDefaultIconId !== iconId) return;

  await env.DB.prepare("DELETE FROM app_settings WHERE setting_key = ?").bind(DEFAULT_ICON_SETTING_KEY).run();
}

async function insertIconType(env: Env, iconTypeId: string, input: IconTypeInput) {
  const now = nowIso();
  const sortOrder = await nextIconTypeSortOrder(env);
  await env.DB.prepare(
    `
    INSERT INTO icon_types (
      icon_type_id, icon_type_name, sort_order, is_active, created_at, updated_at
    )
    VALUES (?, ?, ?, 1, ?, ?)
    `,
  )
    .bind(iconTypeId, input.iconTypeName, sortOrder, now, now)
    .run();
}

async function replaceIconTypeLinks(env: Env, iconId: string, iconTypeIds: string[], now: string) {
  if (!iconId) return;
  await env.DB.prepare("DELETE FROM icon_type_links WHERE icon_id = ?").bind(iconId).run();

  for (const [index, iconTypeId] of iconTypeIds.entries()) {
    await env.DB.prepare(
      `
      INSERT INTO icon_type_links (icon_id, icon_type_id, sort_order, created_at)
      VALUES (?, ?, ?, ?)
      `,
    )
      .bind(iconId, iconTypeId, index + 1, now)
      .run();
  }
}

async function nextIconTypeSortOrder(env: Env) {
  const row = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order FROM icon_types").first<{ sort_order: number }>();
  return Number(row?.sort_order ?? 1);
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
    conditionBuilderJson: row.condition_builder_json ?? "",
    isInitial: row.is_initial === 1,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    iconRewardIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIconResponse(row: IconMasterRow, iconTypeIds: string[], defaultIconId: string | null) {
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
    iconTypeIds,
    isDefault: row.icon_id === defaultIconId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toIconTypeResponse(row: IconTypeRow) {
  return {
    id: row.icon_type_id,
    name: row.icon_type_name,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
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
