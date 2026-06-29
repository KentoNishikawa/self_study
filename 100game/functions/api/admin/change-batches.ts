import { createId, getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type ChangeBatchStatus = "draft" | "scheduled" | "applied" | "cancelled" | "failed";
type ChangeItemStatus = "draft" | "cancelled";
type ChangeType = "icon_delete" | "icon_replace" | "loading_illustration_delete" | "loading_illustration_replace" | "announcement_create" | "title_icon_rewards_update";
type AnnouncementCategory = "normal" | "maintenance" | "bug" | "update" | "important";

type ChangeBatchRow = {
  batch_id: string;
  batch_name: string;
  status: ChangeBatchStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  scheduled_by: string | null;
  scheduled_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  error_message: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  applied_by_name: string | null;
  applied_by_email: string | null;
  cancelled_by_name: string | null;
  cancelled_by_email: string | null;
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
  change_type: ChangeType;
  target_type: string;
  target_id: string;
  before_json: string | null;
  after_json: string | null;
  effect_json: string | null;
  reason: string;
  created_at: string;
  status: ChangeItemStatus;
  parent_item_id: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by_name?: string | null;
  cancelled_by_email?: string | null;
};

type IconRow = {
  icon_id: string;
  icon_code: string;
  icon_name: string;
  description: string;
  image_path: string;
  rarity: number;
  is_initial: number;
  is_active: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by?: string | null;
  uploaded_at: string | null;
  deleted_at: string | null;
};

type TitleRow = {
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

type IconSummaryRow = {
  icon_id: string;
  icon_code: string;
  icon_name: string;
};

type LoadingIllustrationRow = {
  illustration_id: string;
  illustration_code: string;
  illustration_name: string;
  description: string;
  image_path: string;
  rarity: number;
  is_initial: number;
  is_active: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by?: string | null;
  uploaded_at: string | null;
  required_title_id: string | null;
  condition_params_json: string | null;
  appearance_mode: string;
  manual_unviewed_rate: number;
  manual_viewed_rate: number;
  deleted_at: string | null;
};

type AnnouncementInput = {
  title: string;
  summary: string;
  body: string;
  category: AnnouncementCategory;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type IconReplaceAfter = {
  storageKey?: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
};

type LoadingIllustrationReplaceAfter = IconReplaceAfter;

const DEFAULT_ICON_ID = "img_01_u7537_u306e_u5b50";
const MAIN_CHANGE_TYPES = new Set<ChangeType>([
  "icon_delete",
  "icon_replace",
  "loading_illustration_delete",
  "loading_illustration_replace",
  "title_icon_rewards_update",
]);


export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  await ensureSingleDraftBatch(context.env);
  const [batches, items] = await Promise.all([readBatches(context.env), readItems(context.env)]);
  const itemMap = new Map<string, ChangeItemRow[]>();
  for (const item of items) {
    const list = itemMap.get(item.batch_id) ?? [];
    list.push(item);
    itemMap.set(item.batch_id, list);
  }

  return json({
    ok: true,
    changeBatches: batches.map((batch) => toBatchResponse(batch, itemMap.get(batch.batch_id) ?? [])),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const changeType = getString(body.changeType).trim();
  if (changeType === "icon_delete") return createIconDeleteChangeBatch(context, body, session.user_id);
  if (changeType === "loading_illustration_delete") return createLoadingIllustrationDeleteChangeBatch(context, body, session.user_id);
  if (changeType === "title_icon_rewards_update") return createTitleIconRewardsChangeBatch(context, body, session.user_id);

  return json({ ok: false, message: "変更種別が不正です。" }, { status: 400 });
}

async function createIconDeleteChangeBatch(context: PagesContext, body: Record<string, unknown>, adminId: string): Promise<Response> {
  const iconId = getString(body.iconId).trim();
  const reason = getString(body.reason).trim();
  if (!iconId) return json({ ok: false, message: "アイコンIDが不正です。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "削除理由を入力してください。" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "削除理由は500文字以内で入力してください。" }, { status: 400 });

  const icon = await readIcon(context.env, iconId);
  if (!icon) return json({ ok: false, message: "アイコンが見つかりません。" }, { status: 404 });
  if (icon.deleted_at) return json({ ok: false, message: "削除済みアイコンは削除できません。" }, { status: 400 });
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) return json({ ok: false, message: "追加アイコン以外は削除できません。" }, { status: 400 });

  const fallback = await readIcon(context.env, DEFAULT_ICON_ID);
  if (!fallback || fallback.deleted_at) return json({ ok: false, message: "初期アイコンが見つからないため削除できません。" }, { status: 500 });

  const conflict = await hasOpenIconChange(context.env, iconId);
  if (conflict) return json({ ok: false, message: "このアイコンには未反映の変更があります。反映設定タブを確認してください。" }, { status: 400 });

  const announcement = readOptionalAnnouncement(body.announcement);
  if (announcement instanceof Response) return announcement;

  const now = nowIso();
  const batchName = `アイコン削除：${icon.icon_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const iconItemId = createId("chi");
  const effect = await readIconDeleteEffect(context.env, iconId);
  const after = { deletedAt: null, fallbackIconId: DEFAULT_ICON_ID, createAnnouncement: Boolean(announcement) };

  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'icon_delete', 'icon', ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(iconItemId, batchId, iconId, JSON.stringify(icon), JSON.stringify(after), JSON.stringify(effect), reason, now)
    .run();

  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `,
    )
      .bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, iconItemId)
      .run();
  }

  await refreshDraftBatchMeta(context.env, batchId, now);

  return json({ ok: true, message: "アイコン削除を一時保存しました。反映設定タブから反映してください。", batchId });
}


async function createLoadingIllustrationDeleteChangeBatch(context: PagesContext, body: Record<string, unknown>, adminId: string): Promise<Response> {
  const illustrationId = getString(body.illustrationId).trim();
  const reason = getString(body.reason).trim();
  if (!illustrationId) return json({ ok: false, message: "ロードイラストIDが不正です。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "削除理由を入力してください。" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "削除理由は500文字以内で入力してください。" }, { status: 400 });

  const illustration = await readLoadingIllustration(context.env, illustrationId);
  if (!illustration) return json({ ok: false, message: "ロードイラストが見つかりません。" }, { status: 404 });
  if (illustration.deleted_at) return json({ ok: false, message: "削除済みロードイラストは削除できません。" }, { status: 400 });
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) return json({ ok: false, message: "追加ロードイラスト以外は削除できません。" }, { status: 400 });

  const conflict = await hasOpenLoadingIllustrationChange(context.env, illustrationId);
  if (conflict) return json({ ok: false, message: "このロードイラストには未反映の変更があります。反映設定タブを確認してください。" }, { status: 400 });

  const announcement = readOptionalAnnouncement(body.announcement);
  if (announcement instanceof Response) return announcement;

  const now = nowIso();
  const batchName = `ロードイラスト削除：${illustration.illustration_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const effect = await readLoadingIllustrationEffect(context.env, illustrationId);
  const after = { deletedAt: null, unlinkReward: true, createAnnouncement: Boolean(announcement) };

  const loadingDeleteItemId = createId("chi");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'loading_illustration_delete', 'loading_illustration', ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(loadingDeleteItemId, batchId, illustrationId, JSON.stringify(illustration), JSON.stringify(after), JSON.stringify(effect), reason, now)
    .run();

  if (announcement) {
    await context.env.DB.prepare(
      `
      INSERT INTO admin_change_items (
        item_id, batch_id, change_type, target_type, target_id,
        before_json, after_json, effect_json, reason, created_at, parent_item_id
      )
      VALUES (?, ?, 'announcement_create', 'announcement', ?, NULL, ?, NULL, ?, ?, ?)
      `,
    )
      .bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, loadingDeleteItemId)
      .run();
  }

  await refreshDraftBatchMeta(context.env, batchId, now);

  return json({ ok: true, message: "ロードイラスト削除を一時保存しました。反映設定タブから反映してください。", batchId });
}

async function createTitleIconRewardsChangeBatch(context: PagesContext, body: Record<string, unknown>, adminId: string): Promise<Response> {
  const titleId = getString(body.titleId).trim();
  const reason = getString(body.reason).trim();
  const iconRewardIds = readIconRewardIds(body.iconRewardIds);

  if (!titleId) return json({ ok: false, message: "称号IDが不正です。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "変更理由を入力してください。" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "変更理由は500文字以内で入力してください。" }, { status: 400 });
  if (iconRewardIds.length > 3) return json({ ok: false, message: "紐づけるアイコンは最大3つまでです。" }, { status: 400 });

  const title = await readTitle(context.env, titleId);
  if (!title) return json({ ok: false, message: "称号が見つかりません。" }, { status: 404 });

  const iconRewardsValid = await validateIconRewardIds(context.env, iconRewardIds);
  if (!iconRewardsValid) return json({ ok: false, message: "紐づけるアイコンを確認してください。" }, { status: 400 });

  for (const iconId of iconRewardIds) {
    const iconConflict = await hasOpenIconDelete(context.env, iconId);
    if (iconConflict) return json({ ok: false, message: "選択中のアイコンには未反映の削除予定があります。反映設定タブを確認してください。" }, { status: 400 });
  }

  const conflict = await hasOpenTitleIconRewardsChange(context.env, titleId);
  if (conflict) return json({ ok: false, message: "この称号には未反映のアイコン報酬変更があります。反映設定タブを確認してください。" }, { status: 400 });

  const currentIconRewardIds = await readTitleIconRewardIds(context.env, titleId);
  if (isSameIdList(currentIconRewardIds, iconRewardIds)) return json({ ok: false, message: "アイコン報酬の変更内容がありません。" }, { status: 400 });

  const [beforeIcons, afterIcons, effect] = await Promise.all([
    readIconSummaries(context.env, currentIconRewardIds),
    readIconSummaries(context.env, iconRewardIds),
    readTitleIconRewardsEffect(context.env, titleId, currentIconRewardIds, iconRewardIds),
  ]);

  const now = nowIso();
  const batchName = `称号アイコン報酬変更：${title.title_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  await context.env.DB.prepare(
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
      titleId,
      JSON.stringify({ title, iconRewardIds: currentIconRewardIds, iconRewards: beforeIcons }),
      JSON.stringify({ iconRewardIds, iconRewards: afterIcons }),
      JSON.stringify(effect),
      reason,
      now,
    )
    .run();

  await refreshDraftBatchMeta(context.env, batchId, now);

  return json({ ok: true, message: "称号アイコン報酬変更を一時保存しました。反映設定タブから反映してください。", batchId });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const action = getString(body.action).trim();
  const batchId = getString(body.batchId).trim();
  if (!batchId) return json({ ok: false, message: "反映IDが不正です。" }, { status: 400 });

  if (action === "apply") return applyBatch(context.env, batchId, session.user_id);
  if (action === "cancelItem") {
    const itemId = getString(body.itemId).trim();
    const cancelReason = getString(body.cancelReason).trim();
    if (!itemId) return json({ ok: false, message: "変更IDが不正です。" }, { status: 400 });
    if (!cancelReason) return json({ ok: false, message: "キャンセル理由を入力してください。" }, { status: 400 });
    if (cancelReason.length > 500) return json({ ok: false, message: "キャンセル理由は500文字以内で入力してください。" }, { status: 400 });
    return cancelChangeItem(context.env, batchId, itemId, session.user_id, cancelReason);
  }
  if (action === "cancel") {
    const cancelReason = getString(body.cancelReason).trim();
    if (!cancelReason) return json({ ok: false, message: "キャンセル理由を入力してください。" }, { status: 400 });
    if (cancelReason.length > 500) return json({ ok: false, message: "キャンセル理由は500文字以内で入力してください。" }, { status: 400 });
    return cancelBatch(context.env, batchId, session.user_id, cancelReason);
  }

  return json({ ok: false, message: "操作種別が不正です。" }, { status: 400 });
}

async function applyBatch(env: Env, batchId: string, adminId: string) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "反映対象が見つかりません。" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "反映できる状態ではありません。" }, { status: 400 });

  const items = await readBatchItems(env, batchId);
  const activeItems = items.filter(isActiveChangeItem);
  const mainItems = activeItems.filter((item) => isMainChangeItem(item));
  if (mainItems.length === 0) return json({ ok: false, message: "反映対象の変更がありません。" }, { status: 400 });

  try {
    const now = nowIso();
    const statements: unknown[] = [];
    for (const item of mainItems) {
      if (item.change_type === "icon_delete") await appendIconDeleteApplyStatements(env, statements, item, now);
      else if (item.change_type === "icon_replace") await appendIconReplaceApplyStatements(env, statements, item, adminId, now);
      else if (item.change_type === "title_icon_rewards_update") await appendTitleIconRewardsApplyStatements(env, statements, item, now);
      else if (item.change_type === "loading_illustration_delete") await appendLoadingIllustrationDeleteApplyStatements(env, statements, item, now);
      else if (item.change_type === "loading_illustration_replace") await appendLoadingIllustrationReplaceApplyStatements(env, statements, item, adminId, now);
    }

    appendAnnouncementStatements(env, statements, activeItems, adminId, now);
    statements.push(
      env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
        .bind(adminId, now, now, batchId),
    );

    await batchStatements(env, statements);
    return json({ ok: true, message: "反映しました。" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "反映に失敗しました。";
    const now = nowIso();
    await env.DB.prepare("UPDATE admin_change_batches SET status = 'failed', error_message = ?, updated_at = ? WHERE batch_id = ?")
      .bind(message, now, batchId)
      .run();
    return json({ ok: false, message }, { status: 500 });
  }
}

async function appendIconDeleteApplyStatements(env: Env, statements: unknown[], iconDelete: ChangeItemRow, now: string) {
  const icon = await readIcon(env, iconDelete.target_id);
  if (!icon || icon.deleted_at) throw new Error("削除対象アイコンが見つかりません。");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("追加アイコン以外は削除できません。");

  const fallback = await readIcon(env, DEFAULT_ICON_ID);
  if (!fallback || fallback.deleted_at) throw new Error("初期アイコンが見つかりません。");

  statements.push(
    env.DB.prepare("DELETE FROM title_icon_rewards WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) SELECT user_id, ?, ?, ? FROM user_settings WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, now, icon.icon_id),
    env.DB.prepare("UPDATE user_settings SET current_icon_id = ?, updated_at = ? WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, icon.icon_id),
    env.DB.prepare("DELETE FROM user_icons WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("UPDATE icons SET is_active = 0, deleted_at = ?, updated_at = ? WHERE icon_id = ?").bind(now, now, icon.icon_id),
  );
}

async function appendIconReplaceApplyStatements(env: Env, statements: unknown[], iconReplace: ChangeItemRow, adminId: string, now: string) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding が設定されていません。");

  const icon = await readIcon(env, iconReplace.target_id);
  if (!icon || icon.deleted_at) throw new Error("差し替え対象アイコンが見つかりません。");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("追加アイコン以外は差し替えできません。");

  const after = parseJson<IconReplaceAfter>(iconReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("差し替え後画像の情報を読み取れませんでした。");

  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("差し替え後画像がR2に見つかりません。");

  statements.push(
    env.DB.prepare(
      `
      UPDATE icons
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE icon_id = ?
      `,
    )
      .bind(`/api/admin/assets/icons/${icon.icon_id}`, storageKey, mimeType, fileSize, adminId, now, now, icon.icon_id),
  );
}

async function appendLoadingIllustrationDeleteApplyStatements(env: Env, statements: unknown[], loadingDelete: ChangeItemRow, now: string) {
  const illustration = await readLoadingIllustration(env, loadingDelete.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("削除対象ロードイラストが見つかりません。");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("追加ロードイラスト以外は削除できません。");

  statements.push(
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET is_active = 0,
          required_title_id = NULL,
          condition_params_json = NULL,
          unlock_condition_text = '削除済み',
          deleted_at = ?,
          updated_at = ?
      WHERE illustration_id = ?
      `,
    ).bind(now, now, illustration.illustration_id),
  );
}

async function appendLoadingIllustrationReplaceApplyStatements(env: Env, statements: unknown[], loadingReplace: ChangeItemRow, adminId: string, now: string) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding が設定されていません。");

  const illustration = await readLoadingIllustration(env, loadingReplace.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("差し替え対象ロードイラストが見つかりません。");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("追加ロードイラスト以外は差し替えできません。");

  const after = parseJson<LoadingIllustrationReplaceAfter>(loadingReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("差し替え後画像の情報を読み取れませんでした。");

  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("差し替え後画像がR2に見つかりません。");

  statements.push(
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE illustration_id = ?
      `,
    )
      .bind(`/api/admin/assets/loading-illustrations/${illustration.illustration_id}`, storageKey, mimeType, fileSize, adminId, now, now, illustration.illustration_id),
  );
}

async function appendTitleIconRewardsApplyStatements(env: Env, statements: unknown[], item: ChangeItemRow, now: string) {
  const title = await readTitle(env, item.target_id);
  if (!title) throw new Error("称号が見つかりません。");

  const after = parseJson<{ iconRewardIds?: unknown }>(item.after_json);
  const iconRewardIds = readIconRewardIds(after?.iconRewardIds);
  if (iconRewardIds.length > 3) throw new Error("紐づけるアイコンは最大3つまでです。");

  const iconRewardsValid = await validateIconRewardIds(env, iconRewardIds);
  if (!iconRewardsValid) throw new Error("紐づけるアイコンを確認してください。");

  statements.push(env.DB.prepare("DELETE FROM title_icon_rewards WHERE title_id = ?").bind(title.title_id));
  for (const [index, iconId] of iconRewardIds.entries()) {
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO title_icon_rewards (title_id, icon_id, sort_order, created_at)
        VALUES (?, ?, ?, ?)
        `,
      )
        .bind(title.title_id, iconId, index + 1, now),
    );
  }

  for (const iconId of iconRewardIds) {
    const users = await readTitleUsersMissingIcon(env, title.title_id, iconId);
    for (const userId of users) {
      statements.push(
        env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) VALUES (?, ?, ?, ?)")
          .bind(userId, iconId, now, now),
      );
      statements.push(
        env.DB.prepare(
          `
          INSERT OR IGNORE INTO user_notifications (
            notification_id, user_id, notification_type, target_type, target_id,
            priority, is_read, read_at, created_at
          )
          VALUES (?, ?, 'icon_acquired', 'icon', ?, 20, 0, NULL, ?)
          `,
        )
          .bind(createId("ntf"), userId, iconId, now),
      );
    }
  }
}

async function applyIconDeleteBatch(env: Env, batchId: string, adminId: string, items: ChangeItemRow[], iconDelete: ChangeItemRow) {
  const icon = await readIcon(env, iconDelete.target_id);
  if (!icon || icon.deleted_at) throw new Error("削除対象アイコンが見つかりません。");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("追加アイコン以外は削除できません。");

  const fallback = await readIcon(env, DEFAULT_ICON_ID);
  if (!fallback || fallback.deleted_at) throw new Error("初期アイコンが見つかりません。");

  const now = nowIso();
  const statements = [
    env.DB.prepare("DELETE FROM title_icon_rewards WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) SELECT user_id, ?, ?, ? FROM user_settings WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, now, icon.icon_id),
    env.DB.prepare("UPDATE user_settings SET current_icon_id = ?, updated_at = ? WHERE current_icon_id = ?").bind(DEFAULT_ICON_ID, now, icon.icon_id),
    env.DB.prepare("DELETE FROM user_icons WHERE icon_id = ?").bind(icon.icon_id),
    env.DB.prepare("UPDATE icons SET is_active = 0, deleted_at = ?, updated_at = ? WHERE icon_id = ?").bind(now, now, icon.icon_id),
  ];

  appendAnnouncementStatements(env, statements, items, adminId, now);

  statements.push(
    env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
      .bind(adminId, now, now, batchId),
  );

  await batchStatements(env, statements);
  return json({ ok: true, message: "反映しました。" });
}


async function applyIconReplaceBatch(env: Env, batchId: string, adminId: string, items: ChangeItemRow[], iconReplace: ChangeItemRow) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding が設定されていません。");

  const icon = await readIcon(env, iconReplace.target_id);
  if (!icon || icon.deleted_at) throw new Error("差し替え対象アイコンが見つかりません。");
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) throw new Error("追加アイコン以外は差し替えできません。");

  const after = parseJson<IconReplaceAfter>(iconReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("差し替え後画像の情報を読み取れませんでした。");

  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("差し替え後画像がR2に見つかりません。");

  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE icons
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE icon_id = ?
      `,
    )
      .bind(`/api/admin/assets/icons/${icon.icon_id}`, storageKey, mimeType, fileSize, adminId, now, now, icon.icon_id),
  ];

  appendAnnouncementStatements(env, statements, items, adminId, now);

  statements.push(
    env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
      .bind(adminId, now, now, batchId),
  );

  await batchStatements(env, statements);
  return json({ ok: true, message: "反映しました。" });
}


async function applyLoadingIllustrationDeleteBatch(env: Env, batchId: string, adminId: string, items: ChangeItemRow[], loadingDelete: ChangeItemRow) {
  const illustration = await readLoadingIllustration(env, loadingDelete.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("削除対象ロードイラストが見つかりません。");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("追加ロードイラスト以外は削除できません。");

  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET is_active = 0,
          required_title_id = NULL,
          condition_params_json = NULL,
          unlock_condition_text = '削除済み',
          deleted_at = ?,
          updated_at = ?
      WHERE illustration_id = ?
      `,
    ).bind(now, now, illustration.illustration_id),
  ];

  appendAnnouncementStatements(env, statements, items, adminId, now);

  statements.push(
    env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
      .bind(adminId, now, now, batchId),
  );

  await batchStatements(env, statements);
  return json({ ok: true, message: "反映しました。" });
}

async function applyLoadingIllustrationReplaceBatch(env: Env, batchId: string, adminId: string, items: ChangeItemRow[], loadingReplace: ChangeItemRow) {
  if (!env.ASSETS_BUCKET) throw new Error("R2 bucket binding が設定されていません。");

  const illustration = await readLoadingIllustration(env, loadingReplace.target_id);
  if (!illustration || illustration.deleted_at) throw new Error("差し替え対象ロードイラストが見つかりません。");
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) throw new Error("追加ロードイラスト以外は差し替えできません。");

  const after = parseJson<LoadingIllustrationReplaceAfter>(loadingReplace.after_json);
  const storageKey = typeof after?.storageKey === "string" ? after.storageKey : "";
  const mimeType = typeof after?.mimeType === "string" ? after.mimeType : "";
  const fileSize = typeof after?.fileSize === "number" ? after.fileSize : Number(after?.fileSize ?? 0);
  if (!storageKey || !mimeType || !Number.isFinite(fileSize) || fileSize <= 0) throw new Error("差し替え後画像の情報を読み取れませんでした。");

  const object = await env.ASSETS_BUCKET.get(storageKey);
  if (!object) throw new Error("差し替え後画像がR2に見つかりません。");

  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE title_illustrations
      SET image_path = ?, storage_key = ?, mime_type = ?, file_size = ?, uploaded_by = ?, uploaded_at = ?, updated_at = ?
      WHERE illustration_id = ?
      `,
    )
      .bind(`/api/admin/assets/loading-illustrations/${illustration.illustration_id}`, storageKey, mimeType, fileSize, adminId, now, now, illustration.illustration_id),
  ];

  appendAnnouncementStatements(env, statements, items, adminId, now);

  statements.push(
    env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
      .bind(adminId, now, now, batchId),
  );

  await batchStatements(env, statements);
  return json({ ok: true, message: "反映しました。" });
}

async function applyTitleIconRewardsBatch(env: Env, batchId: string, adminId: string, item: ChangeItemRow) {
  const title = await readTitle(env, item.target_id);
  if (!title) throw new Error("称号が見つかりません。");

  const after = parseJson<{ iconRewardIds?: unknown }>(item.after_json);
  const iconRewardIds = readIconRewardIds(after?.iconRewardIds);
  if (iconRewardIds.length > 3) throw new Error("紐づけるアイコンは最大3つまでです。");

  const iconRewardsValid = await validateIconRewardIds(env, iconRewardIds);
  if (!iconRewardsValid) throw new Error("紐づけるアイコンを確認してください。");

  const now = nowIso();
  const statements = [env.DB.prepare("DELETE FROM title_icon_rewards WHERE title_id = ?").bind(title.title_id)];
  for (const [index, iconId] of iconRewardIds.entries()) {
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO title_icon_rewards (title_id, icon_id, sort_order, created_at)
        VALUES (?, ?, ?, ?)
        `,
      )
        .bind(title.title_id, iconId, index + 1, now),
    );
  }

  for (const iconId of iconRewardIds) {
    const users = await readTitleUsersMissingIcon(env, title.title_id, iconId);
    for (const userId of users) {
      statements.push(
        env.DB.prepare("INSERT OR IGNORE INTO user_icons (user_id, icon_id, acquired_at, created_at) VALUES (?, ?, ?, ?)")
          .bind(userId, iconId, now, now),
      );
      statements.push(
        env.DB.prepare(
          `
          INSERT OR IGNORE INTO user_notifications (
            notification_id, user_id, notification_type, target_type, target_id,
            priority, is_read, read_at, created_at
          )
          VALUES (?, ?, 'icon_acquired', 'icon', ?, 20, 0, NULL, ?)
          `,
        )
          .bind(createId("ntf"), userId, iconId, now),
      );
    }
  }

  statements.push(
    env.DB.prepare("UPDATE admin_change_batches SET status = 'applied', applied_by = ?, applied_at = ?, updated_at = ?, error_message = NULL WHERE batch_id = ?")
      .bind(adminId, now, now, batchId),
  );

  await batchStatements(env, statements);
  return json({ ok: true, message: "反映しました。" });
}

async function cancelBatch(env: Env, batchId: string, adminId: string, cancelReason: string) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "反映対象が見つかりません。" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "キャンセルできる状態ではありません。" }, { status: 400 });

  const now = nowIso();
  const statements = [
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE batch_id = ? AND status = 'draft'
      `,
    ).bind(adminId, now, cancelReason, batchId),
    env.DB.prepare(
      `
      UPDATE admin_change_batches
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ?
      WHERE batch_id = ?
      `,
    ).bind(adminId, now, cancelReason, now, batchId),
  ];
  await batchStatements(env, statements);

  return json({ ok: true, message: "反映をキャンセルしました。" });
}

async function cancelChangeItem(env: Env, batchId: string, itemId: string, adminId: string, cancelReason: string) {
  const batch = await readBatch(env, batchId);
  if (!batch) return json({ ok: false, message: "反映対象が見つかりません。" }, { status: 404 });
  if (batch.status !== "draft") return json({ ok: false, message: "キャンセルできる状態ではありません。" }, { status: 400 });

  const items = await readBatchItems(env, batchId);
  const item = items.find((entry) => entry.item_id === itemId);
  if (!item) return json({ ok: false, message: "変更が見つかりません。" }, { status: 404 });
  if (item.status !== "draft") return json({ ok: false, message: "この変更はキャンセルできる状態ではありません。" }, { status: 400 });
  if (!isMainChangeItem(item)) return json({ ok: false, message: "お知らせ作成は親の変更と一緒にキャンセルしてください。" }, { status: 400 });

  const now = nowIso();
  const statements: unknown[] = [
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE item_id = ? AND batch_id = ? AND status = 'draft'
      `,
    ).bind(adminId, now, cancelReason, itemId, batchId),
    env.DB.prepare(
      `
      UPDATE admin_change_items
      SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?
      WHERE batch_id = ?
        AND status = 'draft'
        AND change_type = 'announcement_create'
        AND (
          parent_item_id = ?
          OR (parent_item_id IS NULL AND reason = ? AND created_at = ?)
        )
      `,
    ).bind(adminId, now, cancelReason, batchId, itemId, item.reason, item.created_at),
  ];

  const remainingActiveMainCount = items.filter((entry) => entry.item_id !== itemId && isActiveChangeItem(entry) && isMainChangeItem(entry)).length;
  if (remainingActiveMainCount === 0) {
    const batchCancelReason = truncateText(`有効な変更が0件になったため。最後の個別キャンセル理由：${cancelReason}`, 500);
    statements.push(
      env.DB.prepare(
        `
        UPDATE admin_change_batches
        SET status = 'cancelled', cancelled_by = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ?
        WHERE batch_id = ?
        `,
      ).bind(adminId, now, batchCancelReason, now, batchId),
    );
  } else {
    const remainingItems = items.filter((entry) => entry.item_id !== itemId && isActiveChangeItem(entry));
    const batchName = formatBatchDisplayNameFromItems(remainingItems) || "次回反映予定";
    statements.push(
      env.DB.prepare("UPDATE admin_change_batches SET batch_name = ?, updated_at = ? WHERE batch_id = ? AND status = 'draft'")
        .bind(batchName, now, batchId),
    );
  }

  await batchStatements(env, statements);
  return json({ ok: true, message: "変更をキャンセルしました。" });
}


function appendAnnouncementStatements(env: Env, statements: unknown[], items: ChangeItemRow[], adminId: string, now: string) {
  for (const item of items.filter((entry) => isActiveChangeItem(entry) && entry.change_type === "announcement_create")) {
    const input = parseJson<AnnouncementInput>(item.after_json);
    if (!input) throw new Error("お知らせ内容を読み取れませんでした。");
    statements.push(
      env.DB.prepare(
        `
        INSERT INTO announcements (
          announcement_id, title, summary, body, category, priority, is_active,
          starts_at, ends_at, created_by, updated_by, created_at, updated_at, deleted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
        `,
      )
        .bind(
          item.target_id,
          input.title,
          input.summary || null,
          input.body,
          input.category,
          input.priority,
          input.isActive ? 1 : 0,
          input.startsAt,
          input.endsAt,
          adminId,
          adminId,
          now,
          now,
        ),
    );
  }
}

async function readBatches(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_batches.*,
      created_admin.display_name AS created_by_name,
      created_admin.email AS created_by_email,
      applied_admin.display_name AS applied_by_name,
      applied_admin.email AS applied_by_email,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_batches
    LEFT JOIN admin_users AS created_admin ON created_admin.admin_id = admin_change_batches.created_by
    LEFT JOIN admin_users AS applied_admin ON applied_admin.admin_id = admin_change_batches.applied_by
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_batches.cancelled_by
    ORDER BY CASE WHEN admin_change_batches.status = 'draft' THEN 0 ELSE 1 END, admin_change_batches.created_at DESC
    LIMIT 100
    `,
  ).all<ChangeBatchRow>();
  return result.results ?? [];
}

async function readItems(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_items.item_id,
      admin_change_items.batch_id,
      admin_change_items.change_type,
      admin_change_items.target_type,
      admin_change_items.target_id,
      admin_change_items.before_json,
      admin_change_items.after_json,
      admin_change_items.effect_json,
      admin_change_items.reason,
      admin_change_items.created_at,
      admin_change_items.status,
      admin_change_items.parent_item_id,
      admin_change_items.cancelled_by,
      admin_change_items.cancelled_at,
      admin_change_items.cancel_reason,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_items
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_items.cancelled_by
    ORDER BY admin_change_items.created_at ASC, admin_change_items.item_id ASC
    `,
  ).all<ChangeItemRow>();
  return result.results ?? [];
}

async function readBatch(env: Env, batchId: string) {
  return await env.DB.prepare("SELECT * FROM admin_change_batches WHERE batch_id = ? LIMIT 1")
    .bind(batchId)
    .first<ChangeBatchRow>();
}

async function readBatchItems(env: Env, batchId: string) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_change_items.item_id,
      admin_change_items.batch_id,
      admin_change_items.change_type,
      admin_change_items.target_type,
      admin_change_items.target_id,
      admin_change_items.before_json,
      admin_change_items.after_json,
      admin_change_items.effect_json,
      admin_change_items.reason,
      admin_change_items.created_at,
      admin_change_items.status,
      admin_change_items.parent_item_id,
      admin_change_items.cancelled_by,
      admin_change_items.cancelled_at,
      admin_change_items.cancel_reason,
      cancelled_admin.display_name AS cancelled_by_name,
      cancelled_admin.email AS cancelled_by_email
    FROM admin_change_items
    LEFT JOIN admin_users AS cancelled_admin ON cancelled_admin.admin_id = admin_change_items.cancelled_by
    WHERE admin_change_items.batch_id = ?
    ORDER BY admin_change_items.created_at ASC, admin_change_items.item_id ASC
    `,
  )
    .bind(batchId)
    .all<ChangeItemRow>();
  return result.results ?? [];
}

async function readIcon(env: Env, iconId: string) {
  return await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, description, image_path, rarity,
      is_initial, is_active, storage_provider, storage_key, mime_type, file_size,
      uploaded_at, deleted_at
    FROM icons
    WHERE icon_id = ?
    LIMIT 1
    `,
  )
    .bind(iconId)
    .first<IconRow>();
}


async function readLoadingIllustration(env: Env, illustrationId: string) {
  return await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, description, image_path, rarity,
      is_initial, is_active, storage_provider, storage_key, mime_type, file_size,
      uploaded_at, required_title_id, condition_params_json, appearance_mode,
      manual_unviewed_rate, manual_viewed_rate, deleted_at
    FROM title_illustrations
    WHERE illustration_id = ?
    LIMIT 1
    `,
  )
    .bind(illustrationId)
    .first<LoadingIllustrationRow>();
}

async function hasOpenIconChange(env: Env, iconId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'icon'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `,
  )
    .bind(iconId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
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


async function hasOpenLoadingIllustrationChange(env: Env, illustrationId: string) {
  const row = await env.DB.prepare(
    `
    SELECT COUNT(*) AS count
    FROM admin_change_items
    INNER JOIN admin_change_batches ON admin_change_batches.batch_id = admin_change_items.batch_id
    WHERE admin_change_items.target_type = 'loading_illustration'
      AND admin_change_items.target_id = ?
      AND admin_change_batches.status IN ('draft', 'scheduled')
      AND admin_change_items.status = 'draft'
    `,
  )
    .bind(illustrationId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0) > 0;
}

async function readTitle(env: Env, titleId: string) {
  return await env.DB.prepare(
    `
    SELECT
      title_id, title_code, title_name, description, unlock_condition_text,
      rarity, condition_type, condition_params_json, is_initial, is_active,
      sort_order, created_at, updated_at
    FROM titles
    WHERE title_id = ?
    LIMIT 1
    `,
  )
    .bind(titleId)
    .first<TitleRow>();
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

async function readTitleUsersMissingIcon(env: Env, titleId: string, iconId: string) {
  const result = await env.DB.prepare(
    `
    SELECT user_titles.user_id
    FROM user_titles
    LEFT JOIN user_icons
      ON user_icons.user_id = user_titles.user_id
      AND user_icons.icon_id = ?
    WHERE user_titles.title_id = ?
      AND user_icons.icon_id IS NULL
    ORDER BY user_titles.user_id ASC
    `,
  )
    .bind(iconId, titleId)
    .all<{ user_id: string }>();

  return (result.results ?? []).map((row) => row.user_id);
}

function readIconRewardIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((item) => getString(item).trim()).filter(Boolean);
  return Array.from(new Set(ids));
}

function isSameIdList(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

async function readIconDeleteEffect(env: Env, iconId: string) {
  const [owned, selected, rewards] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_icons WHERE icon_id = ?").bind(iconId).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_settings WHERE current_icon_id = ?").bind(iconId).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_icon_rewards WHERE icon_id = ?").bind(iconId).first<{ count: number }>(),
  ]);

  return {
    ownedUserCount: Number(owned?.count ?? 0),
    selectedUserCount: Number(selected?.count ?? 0),
    rewardLinkCount: Number(rewards?.count ?? 0),
    fallbackIconId: DEFAULT_ICON_ID,
  };
}


async function readLoadingIllustrationEffect(env: Env, illustrationId: string) {
  const [viewed, linked] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_title_illustrations WHERE illustration_id = ? AND first_viewed_at IS NOT NULL").bind(illustrationId).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_illustrations WHERE illustration_id = ? AND required_title_id IS NOT NULL").bind(illustrationId).first<{ count: number }>(),
  ]);

  return {
    viewedUserCount: Number(viewed?.count ?? 0),
    rewardLinkCount: Number(linked?.count ?? 0),
  };
}

function readOptionalAnnouncement(value: unknown): AnnouncementInput | null | Response {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const enabled = record.enabled === true;
  if (!enabled) return null;

  const title = getString(record.title).trim();
  const rawSummary = getString(record.summary).trim();
  const body = getString(record.body).trim();
  const category = readCategory(record.category);
  const priority = readPriority(record.priority);
  const startsAt = readNullableIso(record.startsAt);
  const endsAt = readNullableIso(record.endsAt);
  const isActive = record.isActive === true;

  if (!title) return json({ ok: false, message: "お知らせタイトルを入力してください。" }, { status: 400 });
  if (!body) return json({ ok: false, message: "お知らせ本文を入力してください。" }, { status: 400 });
  if (!category) return json({ ok: false, message: "お知らせ種別が不正です。" }, { status: 400 });
  if (startsAt === false || endsAt === false) return json({ ok: false, message: "お知らせ表示日時が不正です。" }, { status: 400 });
  if (startsAt && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
    return json({ ok: false, message: "お知らせ表示終了日時は表示開始日時以後にしてください。" }, { status: 400 });
  }

  return {
    title,
    summary: rawSummary || body.slice(0, 120),
    body,
    category,
    priority,
    isActive,
    startsAt: startsAt || null,
    endsAt: endsAt || null,
  };
}

function readCategory(value: unknown): AnnouncementCategory | null {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}

function readPriority(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(getString(value));
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}

function readNullableIso(value: unknown): string | null | false {
  const raw = getString(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString();
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
  const mergedIds = drafts.slice(1).map((draft) => draft.batch_id);
  for (const batchId of mergedIds) {
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

function isActiveChangeItem(item: ChangeItemRow) {
  return item.status === "draft";
}

function isMainChangeItem(item: ChangeItemRow) {
  return MAIN_CHANGE_TYPES.has(item.change_type);
}

function formatBatchDisplayName(batch: ChangeBatchRow, items: ChangeItemRow[]) {
  return formatBatchDisplayNameFromItems(items) || batch.batch_name;
}

function formatBatchDisplayNameFromItems(items: ChangeItemRow[]) {
  const mainItems = items.filter((item) => isActiveChangeItem(item) && isMainChangeItem(item));
  if (mainItems.length === 0) return "次回反映予定";
  const firstName = formatChangeItemDisplayName(mainItems[0]);
  if (mainItems.length === 1) return firstName;
  return `${firstName}＋他${mainItems.length - 1}件`;
}

function formatChangeItemDisplayName(item: ChangeItemRow) {
  const before = parseJson<Record<string, unknown>>(item.before_json) ?? {};
  const after = parseJson<Record<string, unknown>>(item.after_json) ?? {};
  if (item.change_type === "icon_delete") return `アイコン削除：${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "icon_replace") return `アイコン差し替え：${readRecordText(before, "icon_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_delete") return `ロードイラスト削除：${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "loading_illustration_replace") return `ロードイラスト差し替え：${readRecordText(before, "illustration_name", item.target_id)}`;
  if (item.change_type === "title_icon_rewards_update") {
    const title = before.title;
    if (title && typeof title === "object" && !Array.isArray(title)) return `称号アイコン報酬変更：${readRecordText(title as Record<string, unknown>, "title_name", item.target_id)}`;
    return `称号アイコン報酬変更：${item.target_id}`;
  }
  if (item.change_type === "announcement_create") return `お知らせ作成：${readRecordText(after, "title", item.target_id)}`;
  return item.target_id;
}

function readRecordText(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function countMainChangeItems(items: ChangeItemRow[]) {
  return items.filter((item) => isActiveChangeItem(item) && isMainChangeItem(item)).length;
}

function toBatchResponse(batch: ChangeBatchRow, items: ChangeItemRow[]) {
  return {
    id: batch.batch_id,
    name: formatBatchDisplayName(batch, items),
    status: batch.status,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    scheduledAt: batch.scheduled_at,
    appliedAt: batch.applied_at,
    cancelledAt: batch.cancelled_at,
    cancelReason: batch.cancel_reason,
    errorMessage: batch.error_message,
    createdBy: toAdminActor(batch.created_by, batch.created_by_name, batch.created_by_email),
    appliedBy: batch.applied_by ? toAdminActor(batch.applied_by, batch.applied_by_name, batch.applied_by_email) : null,
    cancelledBy: batch.cancelled_by ? toAdminActor(batch.cancelled_by, batch.cancelled_by_name, batch.cancelled_by_email) : null,
    changeItemCount: countMainChangeItems(items),
    items: items.map(toItemResponse),
  };
}

function toItemResponse(item: ChangeItemRow) {
  return {
    id: item.item_id,
    batchId: item.batch_id,
    changeType: item.change_type,
    targetType: item.target_type,
    targetId: item.target_id,
    before: parseJson(item.before_json),
    after: parseJson(item.after_json),
    effect: parseJson(item.effect_json),
    reason: item.reason,
    createdAt: item.created_at,
    status: item.status,
    parentItemId: item.parent_item_id,
    cancelledAt: item.cancelled_at,
    cancelReason: item.cancel_reason,
    cancelledBy: item.cancelled_by ? toAdminActor(item.cancelled_by, item.cancelled_by_name ?? null, item.cancelled_by_email ?? null) : null,
  };
}

function toAdminActor(id: string, displayName: string | null, email: string | null) {
  return { id, displayName: displayName ?? id, email: email ?? "" };
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function parseJson<T = unknown>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function batchStatements(env: Env, statements: unknown[]) {
  const db = env.DB as unknown as { batch?: (statements: unknown[]) => Promise<unknown[]> };
  if (typeof db.batch === "function") {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await (statement as { run: () => Promise<unknown> }).run();
  }
}
