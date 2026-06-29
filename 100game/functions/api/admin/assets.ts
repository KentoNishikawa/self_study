import { createId, getString, json, nowIso, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type AssetType = "icon" | "loading-illustration";
type AnnouncementCategory = "normal" | "maintenance" | "bug" | "update" | "important";

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

type IconAssetRow = {
  icon_id: string;
  icon_code: string;
  icon_name: string;
  image_path: string;
  is_active: number;
  sort_order: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
};

type IconReplaceTargetRow = IconAssetRow & {
  description: string;
  rarity: number;
  is_initial: number;
  deleted_at: string | null;
};

type LoadingIllustrationReplaceTargetRow = LoadingIllustrationAssetRow & {
  description: string;
  rarity: number;
  is_initial: number;
  is_rare: number;
  is_boost_excluded: number;
  deleted_at: string | null;
};

type LoadingIllustrationAssetRow = {
  illustration_id: string;
  illustration_code: string;
  illustration_name: string;
  image_path: string;
  is_active: number;
  sort_order: number;
  required_title_id: string | null;
  condition_params_json: string | null;
  appearance_mode: string;
  manual_unviewed_rate: number;
  manual_viewed_rate: number;
  storage_provider: string;
  storage_key: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
};

const ICON_MAX_BYTES = 3 * 1024 * 1024;
const LOADING_ILLUSTRATION_MAX_BYTES = 5 * 1024 * 1024;
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const [icons, loadingIllustrations] = await Promise.all([
    readIconAssets(context.env),
    readLoadingIllustrationAssets(context.env),
  ]);

  return json({
    ok: true,
    assets: {
      icons: icons.map(toIconAssetResponse),
      loadingIllustrations: loadingIllustrations.map(toLoadingIllustrationAssetResponse),
    },
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding が設定されていません。" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return json({ ok: false, message: "アップロード内容を読み取れませんでした。" }, { status: 400 });
  }

  const assetAction = getString(form.get("assetAction")).trim();
  if (assetAction === "icon_replace") return createIconReplaceChangeBatch(context, form, session.user_id);
  if (assetAction === "loading_illustration_replace") return createLoadingIllustrationReplaceChangeBatch(context, form, session.user_id);

  const assetType = readAssetType(form.get("assetType"));
  if (!assetType) return json({ ok: false, message: "素材種別が不正です。" }, { status: 400 });

  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "画像ファイルを選択してください。" }, { status: 400 });
  }

  const fileInfo = validateImageFile(fileValue, assetType);
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });

  const now = nowIso();
  const arrayBuffer = await fileValue.arrayBuffer();

  if (assetType === "icon") {
    const iconId = createId("icon");
    const storageKey = `icons/${iconId}.${fileInfo.ext}`;
    await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
    await insertIconAsset(context.env, {
      iconId,
      storageKey,
      mimeType: fileInfo.mimeType,
      fileSize: fileValue.size,
      uploadedBy: session.user_id,
      uploadedAt: now,
      assetName: readAssetName(form, fileValue.name, "追加アイコン"),
      description: readAssetDescription(form, "追加アイコン素材です。称号報酬として紐づけるまで通常ユーザーには公開されません。"),
    });
    return json({ ok: true, message: "アイコン素材をアップロードしました。", id: iconId });
  }

  const illustrationId = createId("illust");
  const storageKey = `loading-illustrations/${illustrationId}.${fileInfo.ext}`;
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });
  await insertLoadingIllustrationAsset(context.env, {
    illustrationId,
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedBy: session.user_id,
    uploadedAt: now,
    assetName: readAssetName(form, fileValue.name, "ロードイラスト"),
    description: readAssetDescription(form, "ロードイラスト素材です。出現設定を行うまで通常ユーザーには公開されません。"),
  });
  return json({ ok: true, message: "ロードイラスト素材をアップロードしました。", id: illustrationId });
}


async function createIconReplaceChangeBatch(context: PagesContext, form: FormData, adminId: string): Promise<Response> {
  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding が設定されていません。" }, { status: 500 });
  }

  const iconId = getString(form.get("iconId")).trim();
  const reason = getString(form.get("iconReplaceReason")).trim();
  if (!iconId) return json({ ok: false, message: "アイコンIDが不正です。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "差し替え理由を入力してください。" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "差し替え理由は500文字以内で入力してください。" }, { status: 400 });

  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "差し替え後の画像ファイルを選択してください。" }, { status: 400 });
  }

  const fileInfo = validateImageFile(fileValue, "icon");
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });

  const icon = await readIconReplaceTarget(context.env, iconId);
  if (!icon) return json({ ok: false, message: "アイコンが見つかりません。" }, { status: 404 });
  if (icon.deleted_at) return json({ ok: false, message: "削除済みアイコンは差し替えできません。" }, { status: 400 });
  if (icon.storage_provider !== "r2" || icon.is_initial === 1) return json({ ok: false, message: "追加アイコン以外は差し替えできません。" }, { status: 400 });

  const conflict = await hasOpenIconChange(context.env, iconId);
  if (conflict) return json({ ok: false, message: "このアイコンには未反映の変更があります。反映設定タブを確認してください。" }, { status: 400 });

  const announcement = readOptionalReplaceAnnouncement(form);
  if (announcement instanceof Response) return announcement;

  const now = nowIso();
  const batchName = `アイコン差し替え：${icon.icon_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const storageKey = `icons/replacements/${iconId}/${batchId}.${fileInfo.ext}`;
  const arrayBuffer = await fileValue.arrayBuffer();
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });

  const before = {
    ...icon,
    previewPath: `/api/admin/assets/icons/${iconId}?replacementBatchId=${batchId}&variant=before`,
  };
  const after = {
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedAt: now,
    previewPath: `/api/admin/assets/icons/${iconId}?replacementBatchId=${batchId}&variant=after`,
    createAnnouncement: Boolean(announcement),
  };
  const effect = await readIconEffect(context.env, iconId);
  const iconReplaceItemId = createId("chi");

  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'icon_replace', 'icon', ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(iconReplaceItemId, batchId, iconId, JSON.stringify(before), JSON.stringify(after), JSON.stringify(effect), reason, now)
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
      .bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, iconReplaceItemId)
      .run();
  }

  await refreshDraftBatchMeta(context.env, batchId, now);

  return json({ ok: true, message: "アイコン差し替えを一時保存しました。反映設定タブから反映してください。", batchId });
}


async function createLoadingIllustrationReplaceChangeBatch(context: PagesContext, form: FormData, adminId: string): Promise<Response> {
  if (!context.env.ASSETS_BUCKET) {
    return json({ ok: false, message: "R2 bucket binding が設定されていません。" }, { status: 500 });
  }

  const illustrationId = getString(form.get("illustrationId")).trim();
  const reason = getString(form.get("loadingIllustrationReplaceReason")).trim();
  if (!illustrationId) return json({ ok: false, message: "ロードイラストIDが不正です。" }, { status: 400 });
  if (!reason) return json({ ok: false, message: "差し替え理由を入力してください。" }, { status: 400 });
  if (reason.length > 500) return json({ ok: false, message: "差し替え理由は500文字以内で入力してください。" }, { status: 400 });

  const fileValue = form.get("imageFile");
  if (!(fileValue instanceof File)) {
    return json({ ok: false, message: "差し替え後のロードイラスト画像を選択してください。" }, { status: 400 });
  }

  const fileInfo = validateImageFile(fileValue, "loading-illustration");
  if (!fileInfo.ok) return json({ ok: false, message: fileInfo.message }, { status: 400 });

  const illustration = await readLoadingIllustrationReplaceTarget(context.env, illustrationId);
  if (!illustration) return json({ ok: false, message: "ロードイラストが見つかりません。" }, { status: 404 });
  if (illustration.deleted_at) return json({ ok: false, message: "削除済みロードイラストは差し替えできません。" }, { status: 400 });
  if (illustration.storage_provider !== "r2" || illustration.is_initial === 1) return json({ ok: false, message: "追加ロードイラスト以外は差し替えできません。" }, { status: 400 });

  const conflict = await hasOpenLoadingIllustrationChange(context.env, illustrationId);
  if (conflict) return json({ ok: false, message: "このロードイラストには未反映の変更があります。反映設定タブを確認してください。" }, { status: 400 });

  const announcement = readOptionalLoadingIllustrationReplaceAnnouncement(form);
  if (announcement instanceof Response) return announcement;

  const now = nowIso();
  const batchName = `ロードイラスト差し替え：${illustration.illustration_name}`;
  const batchId = await getOrCreateDraftBatchId(context.env, adminId, batchName, now);
  const storageKey = `loading-illustrations/replacements/${illustrationId}/${batchId}.${fileInfo.ext}`;
  const arrayBuffer = await fileValue.arrayBuffer();
  await context.env.ASSETS_BUCKET.put(storageKey, arrayBuffer, { httpMetadata: { contentType: fileInfo.mimeType } });

  const before = {
    ...illustration,
    previewPath: `/api/admin/assets/loading-illustrations/${illustrationId}?replacementBatchId=${batchId}&variant=before`,
  };
  const after = {
    storageKey,
    mimeType: fileInfo.mimeType,
    fileSize: fileValue.size,
    uploadedAt: now,
    previewPath: `/api/admin/assets/loading-illustrations/${illustrationId}?replacementBatchId=${batchId}&variant=after`,
    createAnnouncement: Boolean(announcement),
  };
  const effect = await readLoadingIllustrationEffect(context.env, illustrationId);
  const loadingReplaceItemId = createId("chi");

  await context.env.DB.prepare(
    `
    INSERT INTO admin_change_items (
      item_id, batch_id, change_type, target_type, target_id,
      before_json, after_json, effect_json, reason, created_at
    )
    VALUES (?, ?, 'loading_illustration_replace', 'loading_illustration', ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(loadingReplaceItemId, batchId, illustrationId, JSON.stringify(before), JSON.stringify(after), JSON.stringify(effect), reason, now)
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
      .bind(createId("chi"), batchId, createId("announcement"), JSON.stringify(announcement), reason, now, loadingReplaceItemId)
      .run();
  }

  await refreshDraftBatchMeta(context.env, batchId, now);

  return json({ ok: true, message: "ロードイラスト差し替えを一時保存しました。反映設定タブから反映してください。", batchId });
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

function readAssetType(value: FormDataEntryValue | null): AssetType | null {
  if (value === "icon" || value === "loading-illustration") return value;
  return null;
}

function validateImageFile(file: File, assetType: AssetType): { ok: true; ext: string; mimeType: string } | { ok: false; message: string } {
  const limit = assetType === "icon" ? ICON_MAX_BYTES : LOADING_ILLUSTRATION_MAX_BYTES;
  const limitText = assetType === "icon" ? "3MB" : "5MB";
  if (file.size <= 0) return { ok: false, message: "空のファイルはアップロードできません。" };
  if (file.size > limit) return { ok: false, message: `画像サイズは${limitText}までです。` };

  const ext = detectExtension(file);
  if (!ext) return { ok: false, message: "対応形式は png / jpg / jpeg / webp です。" };

  return { ok: true, ext: ext === "jpeg" ? "jpg" : ext, mimeType: EXT_TO_MIME[ext] ?? file.type };
}

function detectExtension(file: File) {
  if (file.type && MIME_TO_EXT[file.type]) return MIME_TO_EXT[file.type];

  const match = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = match?.[1] ?? "";
  return EXT_TO_MIME[ext] ? ext : "";
}

function readAssetName(form: FormData, fileName: string, fallback: string) {
  const inputName = getString(form.get("assetName")).trim();
  if (inputName) return inputName;

  const baseName = fileName.replace(/\.[^.]+$/, "").trim();
  return baseName || fallback;
}

function readAssetDescription(form: FormData, fallback: string) {
  const description = getString(form.get("description")).trim();
  return description || fallback;
}

async function insertIconAsset(
  env: Env,
  input: {
    iconId: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
    assetName: string;
    description: string;
  },
) {
  const sortOrder = await nextSortOrder(env, "icons");
  await env.DB.prepare(
    `
    INSERT INTO icons (
      icon_id, icon_code, icon_name, description, unlock_condition_text, image_path,
      rarity, condition_type, condition_params_json, is_initial, is_guest_available,
      is_active, sort_order, created_at, updated_at, storage_provider, storage_key,
      mime_type, file_size, uploaded_by, uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, 'title_reward', NULL, 0, 0, 0, ?, ?, ?, 'r2', ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      input.iconId,
      `uploaded_${normalizeCodePart(input.iconId)}`,
      input.assetName,
      input.description,
      "称号報酬として開放",
      `/api/admin/assets/icons/${input.iconId}`,
      sortOrder,
      input.uploadedAt,
      input.uploadedAt,
      input.storageKey,
      input.mimeType,
      input.fileSize,
      input.uploadedBy,
      input.uploadedAt,
    )
    .run();
}

async function insertLoadingIllustrationAsset(
  env: Env,
  input: {
    illustrationId: string;
    storageKey: string;
    mimeType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
    assetName: string;
    description: string;
  },
) {
  const sortOrder = await nextSortOrder(env, "title_illustrations");
  await env.DB.prepare(
    `
    INSERT INTO title_illustrations (
      illustration_id, illustration_code, illustration_name, description, unlock_condition_text,
      image_path, rarity, condition_type, condition_params_json, is_initial, is_rare,
      is_boost_excluded, is_active, sort_order, created_at, updated_at, required_title_id,
      appearance_mode, manual_unviewed_rate, manual_viewed_rate, storage_provider, storage_key,
      mime_type, file_size, uploaded_by, uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 1, 'title_owned', NULL, 0, 0, 0, 0, ?, ?, ?, NULL, 'auto', 70.0, 30.0, 'r2', ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      input.illustrationId,
      `uploaded_${normalizeCodePart(input.illustrationId)}`,
      input.assetName,
      input.description,
      "称号所持でロード画面に出現",
      `/api/admin/assets/loading-illustrations/${input.illustrationId}`,
      sortOrder,
      input.uploadedAt,
      input.uploadedAt,
      input.storageKey,
      input.mimeType,
      input.fileSize,
      input.uploadedBy,
      input.uploadedAt,
    )
    .run();
}

async function nextSortOrder(env: Env, tableName: "icons" | "title_illustrations") {
  const row = await env.DB.prepare(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS sort_order FROM ${tableName}`).first<{ sort_order: number }>();
  return Number(row?.sort_order ?? 1);
}

async function readIconAssets(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, image_path, is_active, sort_order,
      storage_provider, storage_key, mime_type, file_size, uploaded_at
    FROM icons
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, icon_id ASC
    `,
  ).all<IconAssetRow>();

  return result.results ?? [];
}

async function readLoadingIllustrationAssets(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, image_path, is_active, sort_order,
      required_title_id, condition_params_json, appearance_mode, manual_unviewed_rate, manual_viewed_rate,
      storage_provider, storage_key, mime_type, file_size, uploaded_at
    FROM title_illustrations
    WHERE deleted_at IS NULL
    ORDER BY sort_order ASC, illustration_id ASC
    `,
  ).all<LoadingIllustrationAssetRow>();

  return result.results ?? [];
}


async function readIconReplaceTarget(env: Env, iconId: string) {
  return await env.DB.prepare(
    `
    SELECT
      icon_id, icon_code, icon_name, description, image_path, rarity, is_active, sort_order,
      storage_provider, storage_key, mime_type, file_size, uploaded_at, is_initial, deleted_at
    FROM icons
    WHERE icon_id = ?
    LIMIT 1
    `,
  )
    .bind(iconId)
    .first<IconReplaceTargetRow>();
}


async function readLoadingIllustrationReplaceTarget(env: Env, illustrationId: string) {
  return await env.DB.prepare(
    `
    SELECT
      illustration_id, illustration_code, illustration_name, description, image_path, rarity,
      is_initial, is_rare, is_boost_excluded, is_active, sort_order,
      required_title_id, condition_params_json, appearance_mode, manual_unviewed_rate, manual_viewed_rate,
      storage_provider, storage_key, mime_type, file_size, uploaded_at, deleted_at
    FROM title_illustrations
    WHERE illustration_id = ?
    LIMIT 1
    `,
  )
    .bind(illustrationId)
    .first<LoadingIllustrationReplaceTargetRow>();
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

async function readIconEffect(env: Env, iconId: string) {
  const [owned, selected, rewards] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_icons WHERE icon_id = ?").bind(iconId).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM user_settings WHERE current_icon_id = ?").bind(iconId).first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM title_icon_rewards WHERE icon_id = ?").bind(iconId).first<{ count: number }>(),
  ]);

  return {
    ownedUserCount: Number(owned?.count ?? 0),
    selectedUserCount: Number(selected?.count ?? 0),
    rewardLinkCount: Number(rewards?.count ?? 0),
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

function readOptionalReplaceAnnouncement(form: FormData): AnnouncementInput | null | Response {
  const enabled = form.has("iconReplaceCreateAnnouncement");
  if (!enabled) return null;

  const title = getString(form.get("iconReplaceAnnouncementTitle")).trim();
  const rawSummary = getString(form.get("iconReplaceAnnouncementSummary")).trim();
  const body = getString(form.get("iconReplaceAnnouncementBody")).trim();
  const category = readCategory(getString(form.get("iconReplaceAnnouncementCategory")).trim());
  const priority = readPriority(getString(form.get("iconReplaceAnnouncementPriority")).trim());
  const startsAt = readNullableIso(getString(form.get("iconReplaceAnnouncementStartsAt")).trim());
  const endsAt = readNullableIso(getString(form.get("iconReplaceAnnouncementEndsAt")).trim());
  const isActive = form.has("iconReplaceAnnouncementIsActive");

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


function readOptionalLoadingIllustrationReplaceAnnouncement(form: FormData): AnnouncementInput | null | Response {
  const enabled = form.has("loadingIllustrationReplaceCreateAnnouncement");
  if (!enabled) return null;

  const title = getString(form.get("loadingIllustrationReplaceAnnouncementTitle")).trim();
  const rawSummary = getString(form.get("loadingIllustrationReplaceAnnouncementSummary")).trim();
  const body = getString(form.get("loadingIllustrationReplaceAnnouncementBody")).trim();
  const category = readCategory(getString(form.get("loadingIllustrationReplaceAnnouncementCategory")).trim());
  const priority = readPriority(getString(form.get("loadingIllustrationReplaceAnnouncementPriority")).trim());
  const startsAt = readNullableIso(getString(form.get("loadingIllustrationReplaceAnnouncementStartsAt")).trim());
  const endsAt = readNullableIso(getString(form.get("loadingIllustrationReplaceAnnouncementEndsAt")).trim());
  const isActive = form.has("loadingIllustrationReplaceAnnouncementIsActive");

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

function readCategory(value: string): AnnouncementCategory | null {
  if (value === "normal" || value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return null;
}

function readPriority(value: string) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.trunc(numberValue);
}

function readNullableIso(value: string): string | null | false {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString();
}

function toIconAssetResponse(row: IconAssetRow) {
  return {
    id: row.icon_id,
    code: row.icon_code,
    name: row.icon_name,
    imagePath: row.image_path,
    previewPath: row.storage_provider === "r2" ? `/api/admin/assets/icons/${row.icon_id}` : row.image_path,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

function toLoadingIllustrationAssetResponse(row: LoadingIllustrationAssetRow) {
  return {
    id: row.illustration_id,
    code: row.illustration_code,
    name: row.illustration_name,
    imagePath: row.image_path,
    previewPath: row.storage_provider === "r2" ? `/api/admin/assets/loading-illustrations/${row.illustration_id}` : row.image_path,
    isActive: row.is_active === 1,
    sortOrder: row.sort_order,
    requiredTitleId: row.required_title_id ?? readTitleIdFromParams(row.condition_params_json),
    appearanceMode: row.appearance_mode === "manual" ? "manual" : "auto",
    manualUnviewedRate: Number(row.manual_unviewed_rate ?? 70),
    manualViewedRate: Number(row.manual_viewed_rate ?? 30),
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

function readTitleIdFromParams(value: string | null) {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const titleId = (parsed as { titleId?: unknown }).titleId;
    return typeof titleId === "string" && titleId.trim() ? titleId.trim() : null;
  } catch {
    return null;
  }
}

function normalizeCodePart(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "_").toLowerCase();
}
