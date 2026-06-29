import "./admin.css";

type AdminRole = "admin" | "owner";
type AdminTab = "titles" | "icons" | "assets" | "loadingIllustrations" | "announcements" | "changeBatches" | "playerUsers" | "users";
type MasterTargetType = "title" | "icon";
type AppearanceMode = "auto" | "manual";
type AnnouncementCategory = "normal" | "maintenance" | "bug" | "update" | "important";

type TitleMaster = {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockConditionText: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string;
  isInitial: boolean;
  isActive: boolean;
  sortOrder: number;
  iconRewardIds: string[];
  updatedAt: string;
};

type IconMaster = {
  id: string;
  code: string;
  name: string;
  description: string;
  unlockConditionText: string;
  imagePath: string;
  rarity: number;
  conditionType: string;
  conditionParamsJson: string;
  isInitial: boolean;
  isGuestAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

type AdminUser = {
  userId: string;
  adminId?: string;
  email: string;
  status: string;
  role: AdminRole;
  roleLabel: string;
  displayName: string;
  lastLoginAt: string | null;
  passwordChangedAt?: string | null;
  mustChangePassword?: boolean;
  isSelf?: boolean;
  createdAt: string;
};

type PlayerUser = {
  userId: string;
  email: string;
  emailNormalized: string;
  status: string;
  role: string;
  roleLabel: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  displayName: string;
  lastLoginAt: string | null;
  createdAt: string;
  titleCount: number;
  iconCount: number;
  stats: {
    matchCount: number;
    winCount: number;
    loseCount: number;
    winRate: number;
    soloMatchCount: number;
    multiMatchCount: number;
  };
};

type PlayerStatsSummary = {
  matchCount: number;
  winCount: number;
  loseCount: number;
  winRate: number;
};

type PlayerUserStatusAction = "suspend" | "unsuspend";

type PlayerUserDetail = {
  user: {
    userId: string;
    email: string;
    emailNormalized: string;
    status: string;
    role: string;
    roleLabel: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    displayName: string;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    settingsUpdatedAt: string | null;
  };
  current: {
    title: { id: string; name: string; rarity: number } | null;
    icon: { id: string; name: string; imagePath: string; rarity: number } | null;
  };
  collectionSummary: {
    titleCount: number;
    iconCount: number;
    illustrationCount: number;
    viewedIllustrationCount: number;
    unreadNotificationCount: number;
    activeSessionCount: number;
  };
  stats: {
    total: PlayerStatsSummary;
    solo: PlayerStatsSummary;
    multi: PlayerStatsSummary;
    currentWinStreak: number;
    maxWinStreak: number;
    currentLoseStreak: number;
    maxLoseStreak: number;
  };
  titles: Array<{ id: string; name: string; description: string; rarity: number; acquiredAt: string }>;
  icons: Array<{ id: string; name: string; description: string; imagePath: string; rarity: number; acquiredAt: string }>;
  matchHistory: Array<{ matchId: string; mode: string; difficulty: string; gameType: string; result: string; endedAt: string }>;
  statusLogs: Array<{
    id: string;
    actionType: PlayerUserStatusAction;
    beforeStatus: string;
    afterStatus: string;
    reason: string;
    createdAt: string;
    admin: { id: string; displayName: string; email: string };
  }>;
};

type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

type AnnouncementItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: AnnouncementCategory;
  categoryLabel: string;
  priority: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AssetItem = {
  id: string;
  code: string;
  name: string;
  imagePath: string;
  previewPath: string;
  isActive: boolean;
  sortOrder: number;
  storageProvider: string;
  storageKey: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
};

type LoadingIllustrationAssetItem = AssetItem & {
  requiredTitleId: string | null;
  appearanceMode: AppearanceMode;
  manualUnviewedRate: number;
  manualViewedRate: number;
};

type ChangeBatchStatus = "draft" | "scheduled" | "applied" | "cancelled" | "failed";
type ChangeBatchActionMode = "detail" | "apply" | "cancel" | "itemCancel";

type ChangeBatchActor = {
  id: string;
  displayName: string;
  email: string;
};

type ChangeBatchItem = {
  id: string;
  batchId?: string;
  changeType: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  effect: Record<string, unknown> | null;
  reason: string;
  createdAt: string;
  status: "draft" | "cancelled";
  parentItemId: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: ChangeBatchActor | null;
};

type ChangeBatch = {
  id: string;
  name: string;
  status: ChangeBatchStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  appliedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  errorMessage: string | null;
  createdBy: ChangeBatchActor;
  appliedBy: ChangeBatchActor | null;
  cancelledBy: ChangeBatchActor | null;
  changeItemCount?: number;
  items: ChangeBatchItem[];
};

type CurrentUser = {
  userId: string;
  email: string;
  displayName?: string;
  role: AdminRole;
  roleLabel?: string;
  mustChangePassword?: boolean;
};

type AdminApiResponse = {
  ok?: boolean;
  message?: string;
  id?: string;
  currentUser?: CurrentUser;
  masters?: {
    titles?: TitleMaster[];
    icons?: IconMaster[];
  };
  users?: AdminUser[];
  playerUsers?: PlayerUser[];
  playerUserDetail?: PlayerUserDetail;
  pagination?: PaginationState;
  query?: string;
  announcements?: AnnouncementItem[];
  changeBatches?: ChangeBatch[];
  batchId?: string;
  assets?: {
    icons?: AssetItem[];
    loadingIllustrations?: LoadingIllustrationAssetItem[];
  };
};

type SavePayloadValue = string | number | boolean | null | string[] | Record<string, unknown>;
type SavePayload = Record<string, SavePayloadValue>;

const appElement = document.querySelector<HTMLDivElement>("#adminApp");
if (!appElement) throw new Error("#adminApp not found");

const app = appElement;
let activeTab: AdminTab = "titles";
let currentUser: CurrentUser | null = null;
let titles: TitleMaster[] = [];
let icons: IconMaster[] = [];
let users: AdminUser[] = [];
let playerUsers: PlayerUser[] = [];
let playerUserPagination: PaginationState = { page: 1, pageSize: 50, total: 0, totalPages: 1, hasPrevious: false, hasNext: false };
let playerUserQuery = "";
let playerUserSearchInput = "";
let selectedPlayerUserDetail: PlayerUserDetail | null = null;
let isPlayerUserHistoryModalOpen = false;
let playerUserStatusAction: PlayerUserStatusAction | null = null;
let announcements: AnnouncementItem[] = [];
let changeBatches: ChangeBatch[] = [];
let assetIcons: AssetItem[] = [];
let assetLoadingIllustrations: LoadingIllustrationAssetItem[] = [];
let editingTitle: TitleMaster | null = null;
let editingIcon: IconMaster | null = null;
let editingLoadingIllustration: LoadingIllustrationAssetItem | null = null;
let editingAnnouncement: AnnouncementItem | null = null;
let iconDeleteTargetId: string | null = null;
let iconReplaceTargetId: string | null = null;
let loadingIllustrationDeleteTargetId: string | null = null;
let loadingIllustrationReplaceTargetId: string | null = null;
let changeBatchActionTarget: { batchId: string; mode: ChangeBatchActionMode; itemId?: string } | null = null;
let isTitleCreateModalOpen = false;
let isIconCreateModalOpen = false;
let isAnnouncementCreateModalOpen = false;
let isAdminCreateModalOpen = false;
let adminNameTargetAdminId: string | null = null;
let adminRoleTargetAdminId: string | null = null;
let passwordTargetAdminId: string | null = null;
let messageText = "";
let errorText = "";
let isLoading = false;

void initialize();

async function initialize() {
  await loadAdminMe();
  if (currentUser) await loadAdminData();
  render();
}

async function loadAdminData() {
  await Promise.all([loadMasters(), loadUsers(), loadPlayerUsers(), loadAssets(), loadAnnouncements(), loadChangeBatches()]);
}

async function loadAdminMe() {
  const result = await fetchAdminJson("/api/admin/auth/me", {}, { suppressError: true });
  currentUser = result.ok && result.currentUser ? result.currentUser : null;
  if (!currentUser) {
    messageText = "";
    errorText = "";
  }
}

async function loadMasters() {
  const result = await fetchAdminJson("/api/admin/masters");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  titles = result.masters?.titles ?? [];
  icons = result.masters?.icons ?? [];
}

async function loadUsers() {
  const result = await fetchAdminJson("/api/admin/users");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  users = result.users ?? [];
}

async function loadPlayerUsers() {
  const params = new URLSearchParams();
  params.set("page", String(playerUserPagination.page));
  if (playerUserQuery) params.set("q", playerUserQuery);

  const result = await fetchAdminJson(`/api/admin/player-users?${params.toString()}`);
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  playerUsers = result.playerUsers ?? [];
  playerUserPagination = result.pagination ?? playerUserPagination;
  playerUserSearchInput = result.query ?? playerUserQuery;
}

async function loadAssets() {
  const result = await fetchAdminJson("/api/admin/assets");
  if (!result.ok) return;

  assetIcons = result.assets?.icons ?? [];
  assetLoadingIllustrations = result.assets?.loadingIllustrations ?? [];
}

async function loadAnnouncements() {
  const result = await fetchAdminJson("/api/admin/announcements");
  if (!result.ok) return;

  currentUser = result.currentUser ?? currentUser;
  announcements = result.announcements ?? [];
}

async function loadChangeBatches() {
  const result = await fetchAdminJson("/api/admin/change-batches");
  if (!result.ok) return;

  changeBatches = result.changeBatches ?? [];
}

async function fetchAdminJson(path: string, init: RequestInit = {}, options: { suppressError?: boolean } = {}): Promise<AdminApiResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    errorText = "通信に失敗しました。";
    return { ok: false };
  }

  return readAdminResponse(response, options);
}

async function fetchAdminFormJson(path: string, formData: FormData): Promise<AdminApiResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    errorText = "通信に失敗しました。";
    return { ok: false };
  }

  return readAdminResponse(response);
}

async function readAdminResponse(response: Response, options: { suppressError?: boolean } = {}): Promise<AdminApiResponse> {
  let result: AdminApiResponse = {};
  try {
    const parsed: unknown = await response.json();
    if (isRecord(parsed)) result = parsed as AdminApiResponse;
  } catch { }

  if (!response.ok || result.ok === false) {
    const message = result.message ?? "処理に失敗しました。";
    if (!options.suppressError) errorText = message;
    return { ok: false, message };
  }

  if (result.message) messageText = result.message;
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAdminDisplayName(user: { displayName?: string; email: string }) {
  const displayName = (user.displayName ?? "").trim();
  if (!displayName) return "";
  if (displayName.toLowerCase() === user.email.toLowerCase()) return "";
  return displayName;
}

function formatAdminIdentity(user: { displayName?: string; email: string; role?: AdminRole; roleLabel?: string }) {
  const displayName = getAdminDisplayName(user);
  const parts = displayName ? [displayName, user.email] : [user.email];
  if (user.role) parts.push(user.roleLabel ?? roleLabel(user.role));
  return parts.join(" / ");
}

function renderAdminIdentity(user: { displayName?: string; email: string; role?: AdminRole; roleLabel?: string }) {
  return formatAdminIdentity(user).split(" / ").map((part) => escapeHtml(part)).join(" / ");
}

function render() {
  if (!currentUser) {
    app.innerHTML = renderAdminLoginPage();
    bindAdminLoginEvents();
    return;
  }

  app.innerHTML = `
    <main class="adminPage">
      <div class="adminShell">
        <header class="adminHeader">
          <div>
            <div class="adminBrand">100GAME⁺</div>
            <h1>管理者ページ</h1>
            <p>${renderAdminIdentity(currentUser)}</p>
          </div>
          <button type="button" class="adminBtn" data-admin-logout>ログアウト</button>
        </header>
        ${currentUser.mustChangePassword ? `<div class="adminMessage is-error">初期パスワードのままです。管理者管理タブの自分の行からパスワードを変更してください。</div>` : ""}
        ${renderMessages()}
        ${renderTabs()}
        ${renderActiveTab()}
      </div>
    </main>
  `;

  bindCommonEvents();
  if (activeTab === "titles") bindTitleEvents();
  if (activeTab === "icons") bindIconEvents();
  if (activeTab === "assets") bindAssetEvents();
  if (activeTab === "loadingIllustrations") bindLoadingIllustrationEvents();
  if (activeTab === "announcements") bindAnnouncementEvents();
  if (activeTab === "changeBatches") bindChangeBatchEvents();
  if (activeTab === "playerUsers") bindPlayerUserEvents();
  if (activeTab === "users") bindUserEvents();
}

function renderMessages() {
  if (errorText) return `<div class="adminMessage is-error">${escapeHtml(errorText)}</div>`;
  if (messageText) return `<div class="adminMessage">${escapeHtml(messageText)}</div>`;
  return "";
}

function renderAdminLoginPage() {
  return `
    <main class="adminPage adminLoginPage">
      <section class="adminLoginCard">
        <div class="adminBrand">100GAME⁺</div>
        <h1>管理者ログイン</h1>
        <p class="adminMuted">管理者用のメールアドレスとパスワードを入力してください。100GAME⁺のプレイヤーログイン状態とは別管理です。</p>
        ${renderMessages()}
        <form id="adminLoginForm" class="adminForm">
          ${renderTextField("adminLoginEmail", "メールアドレス", "")}
          <div class="adminField">
            <label for="adminLoginPassword">パスワード</label>
            <input id="adminLoginPassword" name="adminLoginPassword" type="password" autocomplete="current-password">
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>ログイン</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderTabs() {
  return `
    <nav class="adminTabs" aria-label="管理メニュー">
      ${renderTabButton("titles", "称号管理")}
      ${renderTabButton("icons", "アイコン管理")}
      ${renderTabButton("assets", "画像素材管理")}
      ${renderTabButton("loadingIllustrations", "ロードイラスト管理")}
      ${renderTabButton("announcements", "お知らせ管理")}
      ${renderTabButton("changeBatches", "反映設定")}
      ${renderTabButton("playerUsers", "ユーザー管理")}
      ${renderTabButton("users", "管理者管理")}
    </nav>
  `;
}

function renderTabButton(tab: AdminTab, label: string) {
  return `<button type="button" class="adminTab${activeTab === tab ? " is-active" : ""}" data-tab="${tab}">${label}</button>`;
}

function renderActiveTab() {
  if (activeTab === "titles") return renderTitleTab();
  if (activeTab === "icons") return renderIconTab();
  if (activeTab === "assets") return renderAssetTab();
  if (activeTab === "loadingIllustrations") return renderLoadingIllustrationTab();
  if (activeTab === "announcements") return renderAnnouncementTab();
  if (activeTab === "changeBatches") return renderChangeBatchTab();
  if (activeTab === "playerUsers") return renderPlayerUserTab();
  return renderUserTab();
}

function renderTitleTab() {
  const detailPanel = editingTitle ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>称号詳細・編集</h2>
          <button type="button" class="adminIconBtn" aria-label="称号詳細を閉じる" data-close-title-detail>×</button>
        </div>
        ${renderTitleForm()}
      </div>` : "";

  return `
    <section class="adminGrid${editingTitle ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>称号一覧</h2>
          <button type="button" class="adminBtn primary" data-open-title-create>称号追加</button>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>並び</th><th>称号</th><th>状態</th><th>条件</th><th>操作</th></tr></thead>
            <tbody>${titles.map(renderTitleRow).join("") || `<tr><td colspan="5">称号がありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${detailPanel}
    </section>
    ${isTitleCreateModalOpen ? renderTitleCreateModal() : ""}
  `;
}

function renderTitleRow(title: TitleMaster) {
  const hasPendingIconRewardChange = Boolean(findPendingTitleIconRewardsBatch(title.id));
  return `
    <tr>
      <td>${title.sortOrder}</td>
      <td>
        <strong>${escapeHtml(title.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(title.code)}</span>
      </td>
      <td>
        <span class="adminBadge${title.isActive ? " is-on" : ""}">${title.isActive ? "公開" : "非公開"}</span>
        ${title.isInitial ? `<span class="adminBadge">初期</span>` : ""}
        ${title.iconRewardIds.length > 0 ? `<span class="adminBadge is-on">アイコン${title.iconRewardIds.length}</span>` : ""}
        ${hasPendingIconRewardChange ? `<span class="adminBadge is-owner">報酬変更あり</span>` : ""}
      </td>
      <td><span class="adminMuted">${escapeHtml(title.conditionType)}</span></td>
      <td><button type="button" class="adminBtn" data-edit-title="${escapeHtml(title.id)}">編集</button></td>
    </tr>
  `;
}

function renderTitleForm() {
  const title = editingTitle;
  return `
    <form id="titleForm" class="adminForm">
      ${title ? `<input type="hidden" name="titleId" value="${escapeAttribute(title.id)}">` : ""}
      <div class="adminFormGrid">
        ${renderTextField("titleCode", "称号コード", title?.code ?? "")}
        ${renderTextField("titleName", "称号名", title?.name ?? "")}
        ${renderNumberField("rarity", "レア度", title?.rarity ?? 1, 1, 5)}
        ${renderNumberField("sortOrder", "並び順", title?.sortOrder ?? nextSortOrder(titles), -999999, 999999)}
        ${renderTextField("conditionType", "condition_type", title?.conditionType ?? "stat_count_at_least")}
        ${renderTextareaField("conditionParamsJson", "condition_params_json", title?.conditionParamsJson ?? `{"scope":"total","statKey":"match_count","value":1}`)}
        ${renderTextareaField("unlockConditionText", "取得条件テキスト", title?.unlockConditionText ?? "")}
        ${renderTextareaField("description", "説明", title?.description ?? "")}
      </div>
      <div class="adminActions">
        ${renderCheckField("isInitial", "初期所持", title?.isInitial ?? false)}
        ${renderCheckField("isActive", "公開", title?.isActive ?? true)}
      </div>
      ${renderTitleIconRewardField(title)}
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        ${title ? `<button type="button" class="adminBtn" data-cancel-title>詳細を閉じる</button>` : ""}
      </div>
    </form>
  `;
}

function renderIconTab() {
  const detailPanel = editingIcon ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>アイコン詳細・編集</h2>
          <button type="button" class="adminIconBtn" aria-label="アイコン詳細を閉じる" data-close-icon-detail>×</button>
        </div>
        ${renderIconForm()}
      </div>` : "";
  const iconDeleteTarget = iconDeleteTargetId ? assetIcons.find((item) => item.id === iconDeleteTargetId) ?? null : null;

  return `
    <section class="adminGrid${editingIcon ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>アイコン一覧</h2>
          <button type="button" class="adminBtn primary" data-open-icon-create>アイコン追加</button>
        </div>
        <p class="adminMuted">画像素材管理に存在する有効なアイコンだけを表示します。</p>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>並び</th><th>アイコン</th><th>状態</th><th>画像</th><th>操作</th></tr></thead>
            <tbody>${icons.map(renderIconRow).join("") || `<tr><td colspan="5">アイコンがありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${detailPanel}
    </section>
    ${isIconCreateModalOpen ? renderIconCreateModal() : ""}
    ${iconDeleteTarget ? renderIconDeleteModal(iconDeleteTarget) : ""}
  `;
}

function renderIconRow(icon: IconMaster) {
  const pendingDelete = hasPendingIconDelete(icon.id);
  return `
    <tr>
      <td>${icon.sortOrder}</td>
      <td>
        <strong>${escapeHtml(icon.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(icon.code)}</span>
      </td>
      <td>
        <span class="adminBadge${icon.isActive ? " is-on" : ""}">${icon.isActive ? "公開" : "非公開"}</span>
        ${icon.isInitial ? `<span class="adminBadge">初期</span>` : ""}
        ${icon.isGuestAvailable ? `<span class="adminBadge">ゲスト可</span>` : ""}
        ${pendingDelete ? `<span class="adminBadge is-owner">削除予定</span>` : ""}
      </td>
      <td><span class="adminMuted">${escapeHtml(icon.imagePath)}</span></td>
      <td>${renderIconManagementActions(icon, pendingDelete)}</td>
    </tr>
  `;
}

function renderIconManagementActions(icon: IconMaster, pendingDelete: boolean) {
  const asset = assetIcons.find((item) => item.id === icon.id);
  const editButton = `<button type="button" class="adminBtn" data-edit-icon="${escapeHtml(icon.id)}">編集</button>`;
  if (pendingDelete) return `${editButton} <button type="button" class="adminBtn" disabled>削除予定</button>`;
  if (!asset) return `${editButton} <span class="adminMuted">素材なし</span>`;
  if (asset.storageProvider !== "r2") return `${editButton} <button type="button" class="adminBtn" disabled>削除不可</button>`;
  return `${editButton} <button type="button" class="adminBtn danger" data-open-icon-delete="${escapeAttribute(icon.id)}">削除</button>`;
}

function renderIconForm() {
  const icon = editingIcon;
  return `
    <form id="iconForm" class="adminForm">
      ${icon ? `<input type="hidden" name="iconId" value="${escapeAttribute(icon.id)}">` : ""}
      <div class="adminFormGrid">
        ${renderTextField("iconCode", "アイコンコード", icon?.code ?? "")}
        ${renderTextField("iconName", "アイコン名", icon?.name ?? "")}
        ${renderTextField("imagePath", "画像パス", icon?.imagePath ?? "/assets/icons/01_boy.png")}
        ${renderNumberField("rarity", "レア度", icon?.rarity ?? 1, 1, 5)}
        ${renderNumberField("sortOrder", "並び順", icon?.sortOrder ?? nextSortOrder(icons), -999999, 999999)}
        ${renderTextField("conditionType", "condition_type", icon?.conditionType ?? "stat_count_at_least")}
        ${renderTextareaField("conditionParamsJson", "condition_params_json", icon?.conditionParamsJson ?? `{"scope":"total","statKey":"match_count","value":1}`)}
        ${renderTextareaField("unlockConditionText", "取得条件テキスト", icon?.unlockConditionText ?? "")}
        ${renderTextareaField("description", "説明", icon?.description ?? "")}
      </div>
      <div class="adminActions">
        ${renderCheckField("isInitial", "初期所持", icon?.isInitial ?? false)}
        ${renderCheckField("isGuestAvailable", "ゲスト利用可", icon?.isGuestAvailable ?? false)}
        ${renderCheckField("isActive", "公開", icon?.isActive ?? true)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        ${icon ? `<button type="button" class="adminBtn" data-cancel-icon>詳細を閉じる</button>` : ""}
      </div>
    </form>
  `;
}

function renderTitleCreateModal() {
  return `
    <div class="adminModalBackdrop" data-title-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="titleCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="titleCreateModalTitle">称号追加</h2>
          <button type="button" class="adminIconBtn" aria-label="称号追加を閉じる" data-close-title-create>×</button>
        </div>
        ${renderTitleForm()}
      </section>
    </div>
  `;
}

function renderIconCreateModal() {
  return `
    <div class="adminModalBackdrop" data-icon-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="iconCreateModalTitle">アイコン追加</h2>
          <button type="button" class="adminIconBtn" aria-label="アイコン追加を閉じる" data-close-icon-create>×</button>
        </div>
        ${renderIconForm()}
      </section>
    </div>
  `;
}

function renderAssetTab() {
  const iconDeleteTarget = iconDeleteTargetId ? assetIcons.find((item) => item.id === iconDeleteTargetId) ?? null : null;
  const iconReplaceTarget = iconReplaceTargetId ? assetIcons.find((item) => item.id === iconReplaceTargetId) ?? null : null;
  const loadingIllustrationDeleteTarget = loadingIllustrationDeleteTargetId ? assetLoadingIllustrations.find((item) => item.id === loadingIllustrationDeleteTargetId) ?? null : null;
  const loadingIllustrationReplaceTarget = loadingIllustrationReplaceTargetId ? assetLoadingIllustrations.find((item) => item.id === loadingIllustrationReplaceTargetId) ?? null : null;
  return `
    <section class="adminAssetGrid">
      <div class="adminCard">
        <h2>アイコン素材アップロード</h2>
        <p class="adminMuted">png / jpg / jpeg / webp、3MBまで。登録直後は非公開です。</p>
        ${renderAssetUploadForm("icon", "assetIconForm", "アイコン画像を選択", "アイコン素材名")}${renderAssetTable(assetIcons, "アイコン素材", "icon")}
      </div>
      <div class="adminCard">
        <h2>ロードイラスト素材アップロード</h2>
        <p class="adminMuted">png / jpg / jpeg / webp、5MBまで。登録直後は非公開です。</p>
        ${renderAssetUploadForm("loading-illustration", "assetLoadingIllustrationForm", "ロードイラスト画像を選択", "ロードイラスト素材名")}${renderAssetTable(assetLoadingIllustrations, "ロードイラスト素材", "loading-illustration")}
      </div>
    </section>
    ${iconDeleteTarget ? renderIconDeleteModal(iconDeleteTarget) : ""}
    ${iconReplaceTarget ? renderIconReplaceModal(iconReplaceTarget) : ""}
    ${loadingIllustrationDeleteTarget ? renderLoadingIllustrationDeleteModal(loadingIllustrationDeleteTarget) : ""}
    ${loadingIllustrationReplaceTarget ? renderLoadingIllustrationReplaceModal(loadingIllustrationReplaceTarget) : ""}
  `;
}

function renderAssetUploadForm(assetType: "icon" | "loading-illustration", formId: string, fileLabel: string, nameLabel: string) {
  return `
    <form id="${formId}" class="adminForm adminAssetForm">
      <input type="hidden" name="assetType" value="${assetType}">
      <div class="adminField">
        <label for="${formId}File">${fileLabel}</label>
        <input id="${formId}File" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
      </div>
      <div class="adminField">
        <label for="${formId}AssetName">${nameLabel}</label>
        <input id="${formId}AssetName" name="assetName" type="text" value="">
      </div>
      <div class="adminField adminFull">
        <label for="${formId}Description">説明（任意）</label>
        <textarea id="${formId}Description" name="description"></textarea>
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>アップロード</button>
      </div>
    </form>
  `;
}

function renderAssetTable(items: AssetItem[], label: string, assetType: "icon" | "loading-illustration") {
  return `
    <div class="adminAssetList">
      <h3>${label}一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>プレビュー</th><th>素材</th><th>保存</th><th>状態</th><th>操作</th></tr></thead>
          <tbody>${items.map((item) => renderAssetRow(item, assetType)).join("") || `<tr><td colspan="5">素材がありません。</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAssetRow(item: AssetItem, assetType: "icon" | "loading-illustration") {
  const previewClass = assetType === "icon" ? "adminAssetPreview is-icon" : "adminAssetPreview";
  return `
    <tr>
      <td><img class="${previewClass}" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}"></td>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(item.code)}</span><br>
        <span class="adminMuted">${escapeHtml(item.id)}</span>
      </td>
      <td>
        <span class="adminBadge${item.storageProvider === "r2" ? " is-on" : ""}">${escapeHtml(item.storageProvider)}</span><br>
        <span class="adminMuted">${escapeHtml(formatBytes(item.fileSize))}</span><br>
        <span class="adminMuted">${escapeHtml(item.mimeType ?? "-")}</span>
      </td>
      <td>
        <span class="adminBadge${item.isActive ? " is-on" : ""}">${item.isActive ? "公開" : "非公開"}</span><br>
        <span class="adminMuted">${escapeHtml(formatDateTime(item.uploadedAt))}</span>
      </td>
      <td>${renderAssetActions(item, assetType)}</td>
    </tr>
  `;
}

function renderAssetActions(item: AssetItem, assetType: "icon" | "loading-illustration") {
  if (assetType === "icon") {
    if (hasPendingIconDelete(item.id)) return `<button type="button" class="adminBtn" disabled>削除予定</button>`;
    if (hasPendingIconReplace(item.id)) return `<button type="button" class="adminBtn" disabled>差し替え予定</button>`;
    if (item.storageProvider !== "r2") return `<button type="button" class="adminBtn" disabled>差し替え不可 / 削除不可</button>`;
    return `<div class="adminActions"><button type="button" class="adminBtn" data-open-icon-replace="${escapeAttribute(item.id)}">差し替え</button><button type="button" class="adminBtn danger" data-open-icon-delete="${escapeAttribute(item.id)}">削除</button></div>`;
  }

  if (hasPendingLoadingIllustrationDelete(item.id)) return `<button type="button" class="adminBtn" disabled>削除予定</button>`;
  if (hasPendingLoadingIllustrationReplace(item.id)) return `<button type="button" class="adminBtn" disabled>差し替え予定</button>`;
  if (item.storageProvider !== "r2") return `<button type="button" class="adminBtn" disabled>差し替え不可 / 削除不可</button>`;
  return `<div class="adminActions"><button type="button" class="adminBtn" data-open-loading-illustration-replace="${escapeAttribute(item.id)}">差し替え</button><button type="button" class="adminBtn danger" data-open-loading-illustration-delete="${escapeAttribute(item.id)}">削除</button></div>`;
}

function renderIconDeleteModal(item: AssetItem) {
  return `
    <div class="adminModalBackdrop" data-icon-delete-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconDeleteModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="iconDeleteModalTitle">アイコン削除の一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="アイコン削除を閉じる" data-close-icon-delete>×</button>
        </div>
        <form id="iconDeleteForm" class="adminForm">
          <input type="hidden" name="iconId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview is-icon" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このアイコンは一覧から削除され、所持ユーザーからも外れます。現在設定中のユーザーは初期アイコンへ戻ります。</p>
          ${renderTextareaField("iconDeleteReason", "削除理由（必須）", "")}
          ${renderCheckField("iconDeleteCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("iconDeleteAnnouncementTitle", "タイトル", `${item.name}の削除について`)}
              ${renderNumberField("iconDeleteAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="iconDeleteAnnouncementCategory">種別</label>
                <select id="iconDeleteAnnouncementCategory" name="iconDeleteAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "important")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "important")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "important")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "important")}
                  ${renderAnnouncementCategoryOption("important", "重要", "important")}
                </select>
              </div>
              ${renderDateTimeField("iconDeleteAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("iconDeleteAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("iconDeleteAnnouncementSummary", "概要", `${item.name}のアイコンを削除します。`)}
              ${renderTextareaField("iconDeleteAnnouncementBody", "本文", `${item.name}のアイコンを削除します。現在このアイコンを設定している場合は、初期アイコンへ変更されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("iconDeleteAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}


function renderIconReplaceModal(item: AssetItem) {
  return `
    <div class="adminModalBackdrop" data-icon-replace-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="iconReplaceModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="iconReplaceModalTitle">アイコン差し替えの一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="アイコン差し替えを閉じる" data-close-icon-replace>×</button>
        </div>
        <form id="iconReplaceForm" class="adminForm">
          <input type="hidden" name="assetAction" value="icon_replace">
          <input type="hidden" name="iconId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview is-icon" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このアイコンの画像だけを差し替えます。所持ユーザー、設定中ユーザー、称号報酬紐づけは維持されます。</p>
          <div class="adminField">
            <label for="iconReplaceFile">差し替え後のアイコン画像（png / jpg / jpeg / webp、3MBまで）</label>
            <input id="iconReplaceFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
          </div>
          ${renderTextareaField("iconReplaceReason", "差し替え理由（必須）", "")}
          ${renderCheckField("iconReplaceCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("iconReplaceAnnouncementTitle", "タイトル", `${item.name}の画像差し替えについて`)}
              ${renderNumberField("iconReplaceAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="iconReplaceAnnouncementCategory">種別</label>
                <select id="iconReplaceAnnouncementCategory" name="iconReplaceAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "update")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "update")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "update")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "update")}
                  ${renderAnnouncementCategoryOption("important", "重要", "update")}
                </select>
              </div>
              ${renderDateTimeField("iconReplaceAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("iconReplaceAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("iconReplaceAnnouncementSummary", "概要", `${item.name}のアイコン画像を差し替えます。`)}
              ${renderTextareaField("iconReplaceAnnouncementBody", "本文", `${item.name}のアイコン画像を差し替えます。所持状態や設定状態はそのまま維持されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("iconReplaceAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}


function renderLoadingIllustrationDeleteModal(item: LoadingIllustrationAssetItem) {
  return `
    <div class="adminModalBackdrop" data-loading-illustration-delete-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="loadingIllustrationDeleteModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="loadingIllustrationDeleteModalTitle">ロードイラスト削除の一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト削除を閉じる" data-close-loading-illustration-delete>×</button>
        </div>
        <form id="loadingIllustrationDeleteForm" class="adminForm">
          <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このロードイラストは抽選・表示・管理対象から外れます。閲覧済み履歴は内部的に残し、報酬紐づきは解除します。</p>
          ${renderTextareaField("loadingIllustrationDeleteReason", "削除理由（必須）", "")}
          ${renderCheckField("loadingIllustrationDeleteCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("loadingIllustrationDeleteAnnouncementTitle", "タイトル", `${item.name}の削除について`)}
              ${renderNumberField("loadingIllustrationDeleteAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="loadingIllustrationDeleteAnnouncementCategory">種別</label>
                <select id="loadingIllustrationDeleteAnnouncementCategory" name="loadingIllustrationDeleteAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "important")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "important")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "important")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "important")}
                  ${renderAnnouncementCategoryOption("important", "重要", "important")}
                </select>
              </div>
              ${renderDateTimeField("loadingIllustrationDeleteAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("loadingIllustrationDeleteAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("loadingIllustrationDeleteAnnouncementSummary", "概要", `${item.name}のロードイラストを削除します。`)}
              ${renderTextareaField("loadingIllustrationDeleteAnnouncementBody", "本文", `${item.name}のロードイラストを削除します。反映後、このロードイラストはロード画面や図鑑に表示されなくなります。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("loadingIllustrationDeleteAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderLoadingIllustrationReplaceModal(item: LoadingIllustrationAssetItem) {
  return `
    <div class="adminModalBackdrop" data-loading-illustration-replace-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="loadingIllustrationReplaceModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="loadingIllustrationReplaceModalTitle">ロードイラスト差し替えの一時保存</h2>
            <p class="adminMuted">この時点ではまだ反映されません。反映設定タブから反映してください。</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト差し替えを閉じる" data-close-loading-illustration-replace>×</button>
        </div>
        <form id="loadingIllustrationReplaceForm" class="adminForm">
          <input type="hidden" name="assetAction" value="loading_illustration_replace">
          <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
          <div class="adminLoadingPreview">
            <img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
            <div>
              <strong>${escapeHtml(item.name)}</strong><br>
              <span class="adminMuted">${escapeHtml(item.code)}</span><br>
              <span class="adminMuted">${escapeHtml(item.id)}</span>
            </div>
          </div>
          <p class="adminMuted">反映時に、このロードイラストの画像だけを差し替えます。閲覧済み履歴、出現設定、報酬紐づきは維持されます。</p>
          <div class="adminField">
            <label for="loadingIllustrationReplaceFile">差し替え後のロードイラスト画像（png / jpg / jpeg / webp、5MBまで）</label>
            <input id="loadingIllustrationReplaceFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" required>
          </div>
          ${renderTextareaField("loadingIllustrationReplaceReason", "差し替え理由（必須）", "")}
          ${renderCheckField("loadingIllustrationReplaceCreateAnnouncement", "お知らせで周知する", false)}
          <div class="adminSubCard adminFullWidthCard">
            <h3>お知らせ内容</h3>
            <p class="adminMuted">周知する場合のみ入力してください。反映時にお知らせも作成されます。</p>
            <div class="adminFormGrid">
              ${renderTextField("loadingIllustrationReplaceAnnouncementTitle", "タイトル", `${item.name}の画像差し替えについて`)}
              ${renderNumberField("loadingIllustrationReplaceAnnouncementPriority", "優先度", 0, -999999, 999999)}
              <div class="adminField">
                <label for="loadingIllustrationReplaceAnnouncementCategory">種別</label>
                <select id="loadingIllustrationReplaceAnnouncementCategory" name="loadingIllustrationReplaceAnnouncementCategory">
                  ${renderAnnouncementCategoryOption("normal", "通常", "update")}
                  ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", "update")}
                  ${renderAnnouncementCategoryOption("bug", "不具合", "update")}
                  ${renderAnnouncementCategoryOption("update", "アップデート", "update")}
                  ${renderAnnouncementCategoryOption("important", "重要", "update")}
                </select>
              </div>
              ${renderDateTimeField("loadingIllustrationReplaceAnnouncementStartsAt", "表示開始日時", null)}
              ${renderDateTimeField("loadingIllustrationReplaceAnnouncementEndsAt", "表示終了日時", null)}
              ${renderTextareaField("loadingIllustrationReplaceAnnouncementSummary", "概要", `${item.name}のロードイラスト画像を差し替えます。`)}
              ${renderTextareaField("loadingIllustrationReplaceAnnouncementBody", "本文", `${item.name}のロードイラスト画像を差し替えます。閲覧済み履歴や出現設定はそのまま維持されます。`)}
            </div>
            <div class="adminActions">
              ${renderCheckField("loadingIllustrationReplaceAnnouncementIsActive", "公開", true)}
            </div>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>一時保存する</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderLoadingIllustrationTab() {
  const detailPanel = editingLoadingIllustration ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>ロードイラスト詳細・出現設定</h2>
          <button type="button" class="adminIconBtn" aria-label="ロードイラスト詳細を閉じる" data-close-loading-illustration-detail>×</button>
        </div>
        ${renderLoadingIllustrationForm(editingLoadingIllustration)}
      </div>` : "";

  return `
    <section class="adminGrid${editingLoadingIllustration ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>ロードイラスト一覧</h2>
          <span class="adminMuted">素材追加は画像素材管理から行います。</span>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>プレビュー</th><th>ロードイラスト</th><th>紐づけ称号</th><th>出現設定</th><th>状態</th><th>操作</th></tr></thead>
            <tbody>${assetLoadingIllustrations.map(renderLoadingIllustrationRow).join("") || `<tr><td colspan="6">ロードイラストがありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${detailPanel}
    </section>
  `;
}

function renderLoadingIllustrationRow(item: LoadingIllustrationAssetItem) {
  const title = titles.find((entry) => entry.id === item.requiredTitleId);
  const modeLabel = item.appearanceMode === "manual" ? "手動" : "自動";
  return `
    <tr>
      <td><img class="adminAssetPreview" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}"></td>
      <td>
        <strong>${escapeHtml(item.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(item.code)}</span><br>
        <span class="adminMuted">${escapeHtml(item.id)}</span>
      </td>
      <td>
        ${title ? `<strong>${escapeHtml(title.name)}</strong><br><span class="adminMuted">${escapeHtml(title.code)}</span>` : `<span class="adminBadge">未設定</span>`}
      </td>
      <td>
        <span class="adminBadge${item.appearanceMode === "manual" ? " is-owner" : " is-on"}">${modeLabel}</span><br>
        ${item.appearanceMode === "manual" ? `<span class="adminMuted">未閲覧 ${formatRate(item.manualUnviewedRate)} / 閲覧済み ${formatRate(item.manualViewedRate)}</span>` : `<span class="adminMuted">未閲覧70% / 閲覧済み30%</span>`}
      </td>
      <td><span class="adminBadge${item.isActive ? " is-on" : ""}">${item.isActive ? "公開" : "非公開"}</span>${renderLoadingIllustrationPendingBadge(item.id)}</td>
      <td><button type="button" class="adminBtn" data-edit-loading-illustration="${escapeAttribute(item.id)}">設定</button></td>
    </tr>
  `;
}


function renderLoadingIllustrationPendingBadge(illustrationId: string) {
  if (hasPendingLoadingIllustrationDelete(illustrationId)) return `<br><span class="adminBadge is-danger">削除予定</span>`;
  if (hasPendingLoadingIllustrationReplace(illustrationId)) return `<br><span class="adminBadge is-owner">差し替え予定</span>`;
  return "";
}

function renderLoadingIllustrationForm(item: LoadingIllustrationAssetItem) {
  return `
    <form id="loadingIllustrationForm" class="adminForm">
      <input type="hidden" name="illustrationId" value="${escapeAttribute(item.id)}">
      <div class="adminLoadingPreview">
        <img class="adminLoadingPreviewImage" src="${escapeAttribute(item.previewPath)}" alt="${escapeAttribute(item.name)}">
        <div>
          <strong>${escapeHtml(item.name)}</strong><br>
          <span class="adminMuted">${escapeHtml(item.code)}</span><br>
          <span class="adminMuted">${escapeHtml(item.id)}</span>
        </div>
      </div>
      <div class="adminFormGrid">
        <div class="adminField adminFull">
          <label for="requiredTitleId">紐づける称号</label>
          <select id="requiredTitleId" name="requiredTitleId" required>
            <option value="">称号を選択</option>
            ${titles.map((title) => renderRequiredTitleOption(title, item.requiredTitleId)).join("")}
          </select>
        </div>
        <div class="adminField">
          <label for="appearanceMode">出現設定</label>
          <select id="appearanceMode" name="appearanceMode" data-appearance-mode>
            <option value="auto" ${item.appearanceMode === "auto" ? "selected" : ""}>自動</option>
            <option value="manual" ${item.appearanceMode === "manual" ? "selected" : ""}>手動</option>
          </select>
        </div>
        ${renderRateField("manualUnviewedRate", "未閲覧時出現率", item.manualUnviewedRate)}
        ${renderRateField("manualViewedRate", "閲覧済み時出現率", item.manualViewedRate)}
      </div>
      <p class="adminMuted">自動は未閲覧70% / 閲覧済み30%。手動は同じ閲覧状態内での出現率として扱い、0.0000は抽選対象外です。</p>
      <div class="adminActions">
        ${renderCheckField("isActive", "公開", item.isActive)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        <button type="button" class="adminBtn" data-cancel-loading-illustration>詳細を閉じる</button>
      </div>
    </form>
  `;
}

function renderRequiredTitleOption(title: TitleMaster, selectedTitleId: string | null) {
  return `<option value="${escapeAttribute(title.id)}" ${title.id === selectedTitleId ? "selected" : ""}>${escapeHtml(title.name)} / ${escapeHtml(title.code)}</option>`;
}

function renderRateField(name: string, label: string, value: number) {
  return `
    <div class="adminField" data-rate-field>
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="number" min="0" max="100" step="0.0001" value="${formatRateValue(value)}">
    </div>
  `;
}


function renderAnnouncementTab() {
  const detailPanel = editingAnnouncement ? `
      <div class="adminCard adminDetailCard">
        <div class="adminCardHeader">
          <h2>お知らせ詳細・編集</h2>
          <button type="button" class="adminIconBtn" aria-label="お知らせ詳細を閉じる" data-close-announcement-detail>×</button>
        </div>
        ${renderAnnouncementForm(editingAnnouncement)}
      </div>` : "";

  return `
    <section class="adminGrid${editingAnnouncement ? "" : " is-list-only"}">
      <div class="adminCard">
        <div class="adminCardHeader">
          <h2>お知らせ一覧</h2>
          <button type="button" class="adminBtn primary" data-open-announcement-create>お知らせ追加</button>
        </div>
        <p class="adminMuted">公開中かつ表示期間内のお知らせだけがホームに表示されます。お知らせが0件の場合、ホームには「お知らせはありません」と表示されます。</p>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>状態</th><th>お知らせ</th><th>種別</th><th>表示期間</th><th>優先度</th><th>操作</th></tr></thead>
            <tbody>${announcements.map(renderAnnouncementRow).join("") || `<tr><td colspan="6">お知らせがありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${detailPanel}
    </section>
    ${isAnnouncementCreateModalOpen ? renderAnnouncementCreateModal() : ""}
  `;
}

function renderAnnouncementRow(announcement: AnnouncementItem) {
  return `
    <tr>
      <td><span class="adminBadge${announcement.isActive ? " is-on" : ""}">${announcement.isActive ? "公開" : "非公開"}</span></td>
      <td>
        <strong>${escapeHtml(announcement.title)}</strong><br>
        <span class="adminMuted">${escapeHtml(announcement.summary || "概要なし")}</span><br>
        <span class="adminMuted">${escapeHtml(announcement.id)}</span>
      </td>
      <td><span class="adminBadge${announcement.category === "important" ? " is-owner" : ""}">${escapeHtml(announcement.categoryLabel)}</span></td>
      <td>
        <span class="adminMuted">開始：${escapeHtml(formatDateTime(announcement.startsAt))}</span><br>
        <span class="adminMuted">終了：${escapeHtml(formatDateTime(announcement.endsAt))}</span>
      </td>
      <td>${announcement.priority}</td>
      <td>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-edit-announcement="${escapeAttribute(announcement.id)}">編集</button>
          <button type="button" class="adminBtn danger" data-delete-announcement="${escapeAttribute(announcement.id)}">削除</button>
        </div>
      </td>
    </tr>
  `;
}

function renderAnnouncementForm(announcement: AnnouncementItem | null) {
  return `
    <form id="announcementForm" class="adminForm">
      ${announcement ? `<input type="hidden" name="announcementId" value="${escapeAttribute(announcement.id)}">` : ""}
      <div class="adminFormGrid">
        ${renderTextField("announcementTitle", "タイトル", announcement?.title ?? "")}
        ${renderNumberField("announcementPriority", "優先度", announcement?.priority ?? 0, -999999, 999999)}
        <div class="adminField">
          <label for="announcementCategory">種別</label>
          <select id="announcementCategory" name="announcementCategory">
            ${renderAnnouncementCategoryOption("normal", "通常", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("maintenance", "メンテナンス", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("bug", "不具合", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("update", "アップデート", announcement?.category ?? "normal")}
            ${renderAnnouncementCategoryOption("important", "重要", announcement?.category ?? "normal")}
          </select>
        </div>
        ${renderDateTimeField("announcementStartsAt", "表示開始日時", announcement?.startsAt ?? null)}
        ${renderDateTimeField("announcementEndsAt", "表示終了日時", announcement?.endsAt ?? null)}
        ${renderTextareaField("announcementSummary", "概要", announcement?.summary ?? "")}
        ${renderTextareaField("announcementBody", "本文", announcement?.body ?? "")}
      </div>
      <p class="adminMuted">本文はプレーンテキストのみです。概要が空の場合は本文の先頭から自動補完します。</p>
      <div class="adminActions">
        ${renderCheckField("announcementIsActive", "公開", announcement?.isActive ?? false)}
      </div>
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>保存</button>
        ${announcement ? `<button type="button" class="adminBtn" data-cancel-announcement>詳細を閉じる</button>` : ""}
      </div>
    </form>
  `;
}

function renderAnnouncementCategoryOption(value: AnnouncementCategory, label: string, selected: AnnouncementCategory) {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderDateTimeField(name: string, label: string, value: string | null) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="datetime-local" value="${escapeAttribute(toDateTimeLocalValue(value))}">
    </div>
  `;
}

function renderAnnouncementCreateModal() {
  return `
    <div class="adminModalBackdrop" data-announcement-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="announcementCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="announcementCreateModalTitle">お知らせ追加</h2>
          <button type="button" class="adminIconBtn" aria-label="お知らせ追加を閉じる" data-close-announcement-create>×</button>
        </div>
        ${renderAnnouncementForm(null)}
      </section>
    </div>
  `;
}


function renderChangeBatchTab() {
  const modal = changeBatchActionTarget ? renderChangeBatchModal(changeBatchActionTarget) : "";
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>反映設定</h2>
            <p class="adminMuted">一時保存された変更をまとめて確認してから反映します。未反映の変更は基本1つの反映予定にまとまります。</p>
          </div>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>状態</th><th>反映内容</th><th>作成者</th><th>反映/キャンセル</th><th>操作</th></tr></thead>
            <tbody>${changeBatches.map(renderChangeBatchRow).join("") || `<tr><td colspan="5">反映待ちの変更はありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </section>
    ${modal}
  `;
}

function isActiveChangeBatchItem(item: ChangeBatchItem) {
  return item.status !== "cancelled";
}

function isMainChangeBatchItem(item: ChangeBatchItem) {
  return item.changeType !== "announcement_create";
}

function getChangeBatchMainItemCount(batch: ChangeBatch) {
  if (typeof batch.changeItemCount === "number") return batch.changeItemCount;
  return batch.items.filter((item) => isActiveChangeBatchItem(item) && isMainChangeBatchItem(item)).length;
}

function renderChangeBatchRow(batch: ChangeBatch) {
  return `
    <tr>
      <td><span class="adminBadge ${changeBatchStatusClass(batch.status)}">${escapeHtml(changeBatchStatusLabel(batch.status))}</span></td>
      <td>
        <strong>${escapeHtml(batch.name)}</strong><br>
        <span class="adminMuted">${escapeHtml(batch.id)}</span><br>
        <span class="adminMuted">作成：${escapeHtml(formatDateTime(batch.createdAt))} / 最終更新：${escapeHtml(formatDateTime(batch.updatedAt))} / 変更 ${getChangeBatchMainItemCount(batch)}件</span>
      </td>
      <td>${renderChangeBatchActor(batch.createdBy)}</td>
      <td>${renderChangeBatchStatusMeta(batch)}</td>
      <td>
        <div class="adminActions">
          <button type="button" class="adminBtn" data-open-change-batch-detail="${escapeAttribute(batch.id)}">詳細</button>
          ${batch.status === "draft" ? `<button type="button" class="adminBtn primary" data-open-change-batch-apply="${escapeAttribute(batch.id)}">反映設定</button><button type="button" class="adminBtn danger" data-open-change-batch-cancel="${escapeAttribute(batch.id)}">キャンセル</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function renderChangeBatchStatusMeta(batch: ChangeBatch) {
  if (batch.status === "applied") {
    return `<span class="adminMuted">反映：${escapeHtml(formatDateTime(batch.appliedAt))}</span><br>${batch.appliedBy ? renderChangeBatchActor(batch.appliedBy) : ""}`;
  }
  if (batch.status === "cancelled") {
    return `<span class="adminMuted">キャンセル：${escapeHtml(formatDateTime(batch.cancelledAt))}</span><br>${batch.cancelledBy ? renderChangeBatchActor(batch.cancelledBy) : ""}<br><span class="adminMuted">理由：${escapeHtml(batch.cancelReason ?? "-")}</span>`;
  }
  if (batch.status === "failed") {
    return `<span class="adminMuted">失敗：${escapeHtml(batch.errorMessage ?? "-")}</span>`;
  }
  return `<span class="adminMuted">未反映</span>`;
}

function renderChangeBatchActor(actor: ChangeBatchActor) {
  return `<strong>${escapeHtml(actor.displayName || actor.id)}</strong>${actor.email ? `<br><span class="adminMuted">${escapeHtml(actor.email)}</span>` : ""}`;
}

function renderChangeBatchModal(target: { batchId: string; mode: ChangeBatchActionMode; itemId?: string }) {
  const batch = changeBatches.find((item) => item.id === target.batchId);
  if (!batch) return "";
  const title = target.mode === "apply" ? "反映設定" : target.mode === "cancel" ? "反映キャンセル" : target.mode === "itemCancel" ? "変更キャンセル" : "反映詳細";
  return `
    <div class="adminModalBackdrop" data-change-batch-modal-backdrop>
      <section class="adminModal adminWideModal" role="dialog" aria-modal="true" aria-labelledby="changeBatchModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="changeBatchModalTitle">${escapeHtml(title)}</h2>
            <p class="adminMuted">${escapeHtml(batch.name)} / ${escapeHtml(changeBatchStatusLabel(batch.status))}</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="反映設定を閉じる" data-close-change-batch-modal>×</button>
        </div>
        ${renderChangeBatchModalBody(batch, target.mode)}
      </section>
    </div>
  `;
}

function renderChangeBatchModalBody(batch: ChangeBatch, mode: ChangeBatchActionMode) {
  if (mode === "cancel") return renderChangeBatchCancelForm(batch);
  if (mode === "itemCancel" && changeBatchActionTarget?.itemId) {
    const item = batch.items.find((entry) => entry.id === changeBatchActionTarget?.itemId);
    return item ? renderChangeItemCancelForm(batch, item) : `<p class="adminError">変更が見つかりません。</p>`;
  }
  return `
    ${renderChangeBatchDetail(batch)}
    ${mode === "apply" ? renderChangeBatchApplyForm(batch) : ""}
  `;
}

function renderChangeBatchDetail(batch: ChangeBatch) {
  return `
    <div class="adminChangeDetail">
      <section class="adminSubCard">
        <h3>概要</h3>
        <dl class="adminDefinitionList">
          ${renderDefinitionItem("反映ID", batch.id)}
          ${renderDefinitionItem("状態", changeBatchStatusLabel(batch.status))}
          ${renderDefinitionItem("作成日時", formatDateTime(batch.createdAt))}
          ${renderDefinitionItem("最終更新", formatDateTime(batch.updatedAt))}
          ${renderDefinitionItem("変更件数", `${getChangeBatchMainItemCount(batch)}件`)}
          ${renderDefinitionItem("作成者", `${batch.createdBy.displayName}${batch.createdBy.email ? ` / ${batch.createdBy.email}` : ""}`)}
        </dl>
      </section>
      ${batch.items.map((item) => renderChangeBatchItemDetail(item, batch.status)).join("")}
    </div>
  `;
}

function renderChangeBatchItemDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  if (item.changeType === "icon_delete") return renderIconDeleteChangeDetail(item, batchStatus);
  if (item.changeType === "icon_replace") return renderIconReplaceChangeDetail(item, batchStatus);
  if (item.changeType === "loading_illustration_delete") return renderLoadingIllustrationDeleteChangeDetail(item, batchStatus);
  if (item.changeType === "loading_illustration_replace") return renderLoadingIllustrationReplaceChangeDetail(item, batchStatus);
  if (item.changeType === "title_icon_rewards_update") return renderTitleIconRewardsChangeDetail(item, batchStatus);
  if (item.changeType === "announcement_create") return renderAnnouncementCreateChangeDetail(item, batchStatus);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader(changeTypeLabel(item.changeType), item, batchStatus)}
      <p class="adminMuted">対象：${escapeHtml(item.targetId)}</p>
      <p>理由：${escapeHtml(item.reason)}</p>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderIconDeleteChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const effect = item.effect ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("アイコン削除", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象アイコン", `${readUnknownString(before.icon_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("削除理由", item.reason)}
        ${renderDefinitionItem("所持ユーザー", `${readUnknownNumber(effect.ownedUserCount)}人`)}
        ${renderDefinitionItem("現在設定中", `${readUnknownNumber(effect.selectedUserCount)}人`)}
        ${renderDefinitionItem("称号報酬紐づけ", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("戻し先アイコン", readUnknownString(effect.fallbackIconId))}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderIconReplaceChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const beforePreviewPath = buildIconReplacementPreviewPath(item, "before")
    ?? readUnknownNullableString(before.previewPath)
    ?? readUnknownNullableString(before.image_path);
  const afterPreviewPath = buildIconReplacementPreviewPath(item, "after")
    ?? readUnknownNullableString(after.previewPath);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("アイコン差し替え", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象アイコン", `${readUnknownString(before.icon_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("差し替え理由", item.reason)}
        ${renderDefinitionItem("所持ユーザー", `${readUnknownNumber(effect.ownedUserCount)}人`)}
        ${renderDefinitionItem("現在設定中", `${readUnknownNumber(effect.selectedUserCount)}人`)}
        ${renderDefinitionItem("称号報酬紐づけ", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("差し替え後ファイル", `${formatBytes(readUnknownNumber(after.fileSize))} / ${readUnknownString(after.mimeType) || "-"}`)}
      </dl>
      <div class="adminCompareImages">
        <div>
          <strong>差し替え前</strong>
          ${beforePreviewPath ? `<img class="adminAssetPreview is-icon" src="${escapeAttribute(beforePreviewPath)}" alt="差し替え前">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
        <div>
          <strong>差し替え後</strong>
          ${afterPreviewPath ? `<img class="adminAssetPreview is-icon" src="${escapeAttribute(afterPreviewPath)}" alt="差し替え後">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
      </div>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderLoadingIllustrationDeleteChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const effect = item.effect ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("ロードイラスト削除", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象ロードイラスト", `${readUnknownString(before.illustration_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("削除理由", item.reason)}
        ${renderDefinitionItem("閲覧済みユーザー", `${readUnknownNumber(effect.viewedUserCount)}人`)}
        ${renderDefinitionItem("報酬紐づき", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderLoadingIllustrationReplaceChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const beforePreviewPath = buildLoadingIllustrationReplacementPreviewPath(item, "before")
    ?? readUnknownNullableString(before.previewPath)
    ?? readUnknownNullableString(before.image_path);
  const afterPreviewPath = buildLoadingIllustrationReplacementPreviewPath(item, "after")
    ?? readUnknownNullableString(after.previewPath);
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("ロードイラスト差し替え", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象ロードイラスト", `${readUnknownString(before.illustration_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("差し替え理由", item.reason)}
        ${renderDefinitionItem("閲覧済みユーザー", `${readUnknownNumber(effect.viewedUserCount)}人`)}
        ${renderDefinitionItem("報酬紐づき", `${readUnknownNumber(effect.rewardLinkCount)}件`)}
        ${renderDefinitionItem("差し替え後ファイル", `${formatBytes(readUnknownNumber(after.fileSize))} / ${readUnknownString(after.mimeType) || "-"}`)}
      </dl>
      <div class="adminCompareImages">
        <div>
          <strong>差し替え前</strong>
          ${beforePreviewPath ? `<img class="adminAssetPreview" src="${escapeAttribute(beforePreviewPath)}" alt="差し替え前">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
        <div>
          <strong>差し替え後</strong>
          ${afterPreviewPath ? `<img class="adminAssetPreview" src="${escapeAttribute(afterPreviewPath)}" alt="差し替え後">` : `<span class="adminMuted">プレビューなし</span>`}
        </div>
      </div>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function buildIconReplacementPreviewPath(item: ChangeBatchItem, variant: "before" | "after") {
  if (!item.batchId || !item.targetId) return null;
  const params = new URLSearchParams({ replacementBatchId: item.batchId, variant });
  return `/api/admin/assets/icons/${encodeURIComponent(item.targetId)}?${params.toString()}`;
}

function buildLoadingIllustrationReplacementPreviewPath(item: ChangeBatchItem, variant: "before" | "after") {
  if (!item.batchId || !item.targetId) return null;
  const params = new URLSearchParams({ replacementBatchId: item.batchId, variant });
  return `/api/admin/assets/loading-illustrations/${encodeURIComponent(item.targetId)}?${params.toString()}`;
}

function renderTitleIconRewardsChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const before = item.before ?? {};
  const after = item.after ?? {};
  const effect = item.effect ?? {};
  const title = isRecord(before.title) ? before.title : {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("称号アイコン報酬変更", item, batchStatus)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("対象称号", `${readUnknownString(title.title_name)} / ${item.targetId}`)}
        ${renderDefinitionItem("変更理由", item.reason)}
        ${renderDefinitionItem("変更前", renderIconRewardSummary(before.iconRewards))}
        ${renderDefinitionItem("変更後", renderIconRewardSummary(after.iconRewards))}
        ${renderDefinitionItem("追加", renderIdList(effect.addedIconIds))}
        ${renderDefinitionItem("解除", renderIdList(effect.removedIconIds))}
        ${renderDefinitionItem("称号所持ユーザー", `${readUnknownNumber(effect.titleHolderCount)}人`)}
        ${renderDefinitionItem("反映時付与見込み", `${readUnknownNumber(effect.retroactiveGrantCount)}件`)}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}

function renderAnnouncementCreateChangeDetail(item: ChangeBatchItem, batchStatus: ChangeBatchStatus) {
  const after = item.after ?? {};
  return `
    <section class="adminSubCard adminFullWidthCard">
      ${renderChangeItemHeader("お知らせ作成", item, batchStatus, false)}
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("タイトル", readUnknownString(after.title))}
        ${renderDefinitionItem("種別", announcementCategoryLabel(readUnknownString(after.category)))}
        ${renderDefinitionItem("公開", readUnknownBoolean(after.isActive) ? "公開" : "非公開")}
        ${renderDefinitionItem("表示開始", formatDateTime(readUnknownNullableString(after.startsAt)))}
        ${renderDefinitionItem("表示終了", formatDateTime(readUnknownNullableString(after.endsAt)))}
        ${renderDefinitionItem("概要", readUnknownString(after.summary))}
        ${renderDefinitionItem("本文", readUnknownString(after.body))}
      </dl>
      ${renderChangeItemCancelMeta(item)}
    </section>
  `;
}


function renderChangeItemHeader(title: string, item: ChangeBatchItem, batchStatus: ChangeBatchStatus, canCancel = true) {
  const statusBadge = item.status === "cancelled" ? `<span class="adminBadge is-danger">個別キャンセル済み</span>` : `<span class="adminBadge is-info">有効</span>`;
  const cancelButton = canCancel && batchStatus === "draft" && item.status === "draft" && isMainChangeBatchItem(item)
    ? `<button type="button" class="adminBtn danger" data-open-change-item-cancel="${escapeAttribute(item.id)}">この変更をキャンセル</button>`
    : "";
  return `
    <div class="adminCardHeader adminSubCardHeader">
      <div>
        <h3>${escapeHtml(title)}</h3>
        ${statusBadge}
      </div>
      <div class="adminActions">${cancelButton}</div>
    </div>
  `;
}

function renderChangeItemCancelMeta(item: ChangeBatchItem) {
  if (item.status !== "cancelled") return "";
  const cancelledBy = item.cancelledBy ? `${item.cancelledBy.displayName}${item.cancelledBy.email ? ` / ${item.cancelledBy.email}` : ""}` : "-";
  return `
    <div class="adminNotice is-warning">
      <strong>個別キャンセル済み</strong><br>
      <span>キャンセル日時：${escapeHtml(formatDateTime(item.cancelledAt))}</span><br>
      <span>キャンセル者：${escapeHtml(cancelledBy)}</span><br>
      <span>理由：${escapeHtml(item.cancelReason ?? "-")}</span>
    </div>
  `;
}

function renderChangeItemCancelForm(batch: ChangeBatch, item: ChangeBatchItem) {
  if (batch.status !== "draft" || item.status !== "draft" || !isMainChangeBatchItem(item)) {
    return `<p class="adminError">この変更はキャンセルできる状態ではありません。</p>`;
  }
  return `
    <form id="changeItemCancelForm" class="adminForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <input type="hidden" name="itemId" value="${escapeAttribute(item.id)}">
      <section class="adminSubCard">
        <h3>キャンセル対象</h3>
        <p><strong>${escapeHtml(changeTypeLabel(item.changeType))}</strong></p>
        <p class="adminMuted">対象：${escapeHtml(item.targetId)}</p>
        <p class="adminMuted">元の理由：${escapeHtml(item.reason)}</p>
      </section>
      <p class="adminMuted">この変更だけを個別キャンセルします。付随するお知らせ作成がある場合は一緒にキャンセルされます。</p>
      ${renderTextareaField("changeItemCancelReason", "個別キャンセル理由", "")}
      <div class="adminActions">
        <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>この変更をキャンセルする</button>
      </div>
    </form>
  `;
}

function renderChangeBatchApplyForm(batch: ChangeBatch) {
  return `
    <form id="changeBatchApplyForm" class="adminForm adminChangeConfirmForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <p class="adminMuted">すべて確認すると、この反映予定に含まれる変更をまとめて反映できます。Phase15Fでは日時予約は行わず、この場で反映します。</p>
      ${renderCheckField("confirmChangeTargets", "変更内容を確認しました", false)}
      ${renderCheckField("confirmUserEffects", "ユーザー影響を確認しました", false)}
      ${renderCheckField("confirmIrreversible", "反映後はゲーム内表示へ影響することを確認しました", false)}
      <div class="adminActions">
        <button type="submit" class="adminBtn primary" data-apply-change-batch-submit disabled ${isLoading ? "disabled" : ""}>反映する</button>
      </div>
    </form>
  `;
}

function renderChangeBatchCancelForm(batch: ChangeBatch) {
  return `
    <form id="changeBatchCancelForm" class="adminForm">
      <input type="hidden" name="batchId" value="${escapeAttribute(batch.id)}">
      <p class="adminMuted">キャンセルすると、この反映予定に含まれる変更はすべてキャンセルされ、履歴として残ります。個別キャンセルは詳細内の各変更から実行できます。</p>
      ${renderTextareaField("changeBatchCancelReason", "キャンセル理由", "")}
      <div class="adminActions">
        <button type="submit" class="adminBtn danger" ${isLoading ? "disabled" : ""}>キャンセルする</button>
      </div>
    </form>
  `;
}

function renderPlayerUserTab() {
  if (selectedPlayerUserDetail) return renderPlayerUserDetailPage(selectedPlayerUserDetail);

  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>ユーザー管理</h2>
            <p class="adminMuted">100GAME⁺にアカウント登録しているユーザーの一覧です。管理者管理とは別管理です。</p>
          </div>
        </div>
        <form class="adminSearchForm" id="playerUserSearchForm">
          <div class="adminSearchField">
            <label for="playerUserSearch">検索</label>
            <input id="playerUserSearch" name="playerUserSearch" type="search" value="${escapeAttribute(playerUserSearchInput)}" placeholder="メール / 表示名 / user_id">
          </div>
          <div class="adminActions adminSearchActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>検索</button>
            <button type="button" class="adminBtn" data-clear-player-user-search ${playerUserQuery ? "" : "disabled"}>クリア</button>
          </div>
        </form>
        <div class="adminListMeta">
          <span>全 ${playerUserPagination.total} 件</span>
          <span>${playerUserPagination.page} / ${playerUserPagination.totalPages} ページ</span>
          ${playerUserQuery ? `<span>検索条件: ${escapeHtml(playerUserQuery)}</span>` : ""}
        </div>
        <div class="adminTableWrap">
          <table class="adminTable adminUserTable">
            <thead>
              <tr>
                <th>ユーザー</th>
                <th>状態</th>
                <th>認証</th>
                <th>role</th>
                <th>所持</th>
                <th>戦績</th>
                <th>登録/ログイン</th>
                <th class="adminActionColumn">操作</th>
              </tr>
            </thead>
            <tbody>${playerUsers.map(renderPlayerUserRow).join("") || `<tr><td colspan="8">ユーザーがありません。</td></tr>`}</tbody>
          </table>
        </div>
        <div class="adminPagination">
          <button type="button" class="adminBtn" data-player-users-page="previous" ${playerUserPagination.hasPrevious ? "" : "disabled"}>前へ</button>
          <span class="adminMuted">${playerUserPagination.page} / ${playerUserPagination.totalPages}</span>
          <button type="button" class="adminBtn" data-player-users-page="next" ${playerUserPagination.hasNext ? "" : "disabled"}>次へ</button>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerUserRow(user: PlayerUser) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(user.displayName || "未設定")}</strong><br>
        <span class="adminMuted">${escapeHtml(user.email)}</span><br>
        <span class="adminMuted">${escapeHtml(user.userId)}</span>
      </td>
      <td><span class="adminBadge${user.status === "active" ? " is-on" : ""}">${escapeHtml(user.status)}</span></td>
      <td><span class="adminBadge${user.emailVerified ? " is-on" : ""}">${user.emailVerified ? "認証済" : "未認証"}</span></td>
      <td><span class="adminBadge">${escapeHtml(user.roleLabel)}</span></td>
      <td>
        <span class="adminMuted">称号: ${user.titleCount}</span><br>
        <span class="adminMuted">アイコン: ${user.iconCount}</span>
      </td>
      <td>
        <span class="adminMuted">試合: ${user.stats.matchCount}</span><br>
        <span class="adminMuted">勝利: ${user.stats.winCount} / 敗北: ${user.stats.loseCount}</span><br>
        <span class="adminMuted">勝率: ${user.stats.winRate.toFixed(1)}%</span>
      </td>
      <td>
        <span class="adminMuted">登録: ${escapeHtml(formatDateTime(user.createdAt))}</span><br>
        <span class="adminMuted">最終: ${escapeHtml(formatDateTime(user.lastLoginAt))}</span>
      </td>
      <td class="adminActionCell"><button type="button" class="adminBtn" data-open-player-user-detail="${escapeAttribute(user.userId)}" ${isLoading ? "disabled" : ""}>詳細</button></td>
    </tr>
  `;
}

function renderPlayerUserDetailPage(detail: PlayerUserDetail) {
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard adminPlayerDetailCard">
        <div class="adminCardHeader">
          <div>
            <button type="button" class="adminBackBtn" data-back-player-users>←</button>
            <h2>ユーザー詳細</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / ${escapeHtml(detail.user.email)}</p>
          </div>
          <button type="button" class="adminBtn" data-open-player-user-history>直近の試合履歴</button>
        </div>
        <div class="adminPlayerDetailGrid">
          ${renderPlayerUserBasicDetail(detail)}
          ${renderPlayerUserAccountStatus(detail)}
          ${renderPlayerUserCurrentDetail(detail)}
          ${renderPlayerUserCollectionSummary(detail)}
          ${renderPlayerUserStatsSummary(detail)}
        </div>
        ${renderPlayerUserTitles(detail)}
        ${renderPlayerUserIcons(detail)}
      </div>
    </section>
    ${isPlayerUserHistoryModalOpen ? renderPlayerUserHistoryModal(detail) : ""}
    ${playerUserStatusAction ? renderPlayerUserStatusModal(detail, playerUserStatusAction) : ""}
  `;
}

function renderPlayerUserBasicDetail(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>基本情報</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("ユーザーID", detail.user.userId)}
        ${renderDefinitionItem("表示名", detail.user.displayName || "未設定")}
        ${renderDefinitionItem("メール", detail.user.email)}
        ${renderDefinitionItem("status", detail.user.status)}
        ${renderDefinitionItem("role", detail.user.roleLabel)}
        ${renderDefinitionItem("メール認証", detail.user.emailVerified ? "認証済" : "未認証")}
        ${renderDefinitionItem("認証日時", formatDateTime(detail.user.emailVerifiedAt))}
        ${renderDefinitionItem("登録日時", formatDateTime(detail.user.createdAt))}
        ${renderDefinitionItem("最終ログイン", formatDateTime(detail.user.lastLoginAt))}
        ${renderDefinitionItem("ユーザー更新日時", formatDateTime(detail.user.updatedAt))}
      </dl>
    </section>
  `;
}

function renderPlayerUserAccountStatus(detail: PlayerUserDetail) {
  const action = detail.user.status === "active" ? "suspend" : detail.user.status === "suspended" ? "unsuspend" : null;
  return `
    <section class="adminSubCard">
      <h3>アカウント状態</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("現在の状態", detail.user.status)}
        ${renderDefinitionItem("有効セッション", `${detail.collectionSummary.activeSessionCount}`)}
      </dl>
      <p class="adminMuted">停止すると対象ユーザーはログインできなくなり、既存セッションも失効します。</p>
      <div class="adminActions">
        ${action ? `<button type="button" class="adminBtn${action === "suspend" ? " danger" : " primary"}" data-open-player-user-status-action="${action}">${action === "suspend" ? "停止する" : "停止解除"}</button>` : `<button type="button" class="adminBtn" disabled>操作対象外</button>`}
      </div>
      <div class="adminStatusLogPreview">
        <strong>状態操作履歴</strong>
        ${renderPlayerUserStatusLogs(detail)}
      </div>
    </section>
  `;
}

function renderPlayerUserStatusLogs(detail: PlayerUserDetail) {
  const logs = detail.statusLogs.slice(0, 5);
  if (logs.length === 0) return `<p class="adminMuted">停止/解除履歴はありません。</p>`;
  return logs.map((log) => `
    <div class="adminStatusLogItem">
      <p>${escapeHtml(formatStatusActionLabel(log.actionType))}：${escapeHtml(formatDateTime(log.createdAt))}</p>
      <p class="adminMuted">実行者：${escapeHtml(formatStatusLogAdmin(log))}</p>
      <p class="adminMuted">理由：${escapeHtml(log.reason)}</p>
    </div>
  `).join("");
}

function renderPlayerUserCurrentDetail(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>現在の設定</h3>
      <div class="adminCurrentSettingList">
        <div>
          <span class="adminMuted">現在設定中の称号</span><br>
          ${detail.current.title ? `<strong>${escapeHtml(detail.current.title.name)}</strong><br><span class="adminMuted">★${detail.current.title.rarity} / ${escapeHtml(detail.current.title.id)}</span>` : `<span class="adminMuted">未設定</span>`}
        </div>
        <div class="adminCurrentIconRow">
          ${detail.current.icon?.imagePath ? `<img class="adminOwnedIconImage" src="${escapeAttribute(detail.current.icon.imagePath)}" alt="${escapeAttribute(detail.current.icon.name)}">` : `<div class="adminIconPlaceholder">未設定</div>`}
          <div>
            <span class="adminMuted">現在設定中のアイコン</span><br>
            ${detail.current.icon ? `<strong>${escapeHtml(detail.current.icon.name)}</strong><br><span class="adminMuted">★${detail.current.icon.rarity} / ${escapeHtml(detail.current.icon.id)}</span>` : `<span class="adminMuted">未設定</span>`}
          </div>
        </div>
        <div>
          <span class="adminMuted">設定更新日時</span><br>
          <strong>${escapeHtml(formatDateTime(detail.user.settingsUpdatedAt))}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderPlayerUserCollectionSummary(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>コレクション概要</h3>
      <dl class="adminDefinitionList">
        ${renderDefinitionItem("所持称号", `${detail.collectionSummary.titleCount}`)}
        ${renderDefinitionItem("所持アイコン", `${detail.collectionSummary.iconCount}`)}
        ${renderDefinitionItem("ロードイラスト所持", `${detail.collectionSummary.illustrationCount}`)}
        ${renderDefinitionItem("ロードイラスト閲覧済み", `${detail.collectionSummary.viewedIllustrationCount}`)}
        ${renderDefinitionItem("未読通知", `${detail.collectionSummary.unreadNotificationCount}`)}
        ${renderDefinitionItem("有効ログインセッション", `${detail.collectionSummary.activeSessionCount}`)}
      </dl>
    </section>
  `;
}

function renderPlayerUserStatsSummary(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard">
      <h3>戦績サマリー</h3>
      <div class="adminStatsGrid">
        ${renderStatsBox("総合", detail.stats.total)}
        ${renderStatsBox("ソロ", detail.stats.solo)}
        ${renderStatsBox("マルチ", detail.stats.multi)}
      </div>
      <dl class="adminDefinitionList adminStreakList">
        ${renderDefinitionItem("現在連勝", `${detail.stats.currentWinStreak}`)}
        ${renderDefinitionItem("最大連勝", `${detail.stats.maxWinStreak}`)}
        ${renderDefinitionItem("現在連敗", `${detail.stats.currentLoseStreak}`)}
        ${renderDefinitionItem("最大連敗", `${detail.stats.maxLoseStreak}`)}
      </dl>
    </section>
  `;
}

function renderStatsBox(label: string, stats: PlayerStatsSummary) {
  return `
    <div class="adminStatsBox">
      <strong>${escapeHtml(label)}</strong><br>
      <span class="adminMuted">試合: ${stats.matchCount}</span><br>
      <span class="adminMuted">勝利: ${stats.winCount} / 敗北: ${stats.loseCount}</span><br>
      <span class="adminMuted">勝率: ${stats.winRate.toFixed(1)}%</span>
    </div>
  `;
}

function renderPlayerUserTitles(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard adminFullWidthCard">
      <h3>所持称号一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>称号</th><th>レアリティ</th><th>取得日時</th></tr></thead>
          <tbody>${detail.titles.map(renderPlayerUserTitleRow).join("") || `<tr><td colspan="3">所持称号がありません。</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPlayerUserTitleRow(title: PlayerUserDetail["titles"][number]) {
  return `
    <tr>
      <td><strong>${escapeHtml(title.name)}</strong><br><span class="adminMuted">${escapeHtml(title.description)}</span><br><span class="adminMuted">${escapeHtml(title.id)}</span></td>
      <td><span class="adminBadge">★${title.rarity}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(title.acquiredAt))}</span></td>
    </tr>
  `;
}

function renderPlayerUserIcons(detail: PlayerUserDetail) {
  return `
    <section class="adminSubCard adminFullWidthCard">
      <h3>所持アイコン一覧</h3>
      <div class="adminTableWrap">
        <table class="adminTable">
          <thead><tr><th>画像</th><th>アイコン</th><th>レアリティ</th><th>取得日時</th></tr></thead>
          <tbody>${detail.icons.map(renderPlayerUserIconRow).join("") || `<tr><td colspan="4">所持アイコンがありません。</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPlayerUserIconRow(icon: PlayerUserDetail["icons"][number]) {
  return `
    <tr>
      <td><img class="adminOwnedIconImage" src="${escapeAttribute(icon.imagePath)}" alt="${escapeAttribute(icon.name)}"></td>
      <td><strong>${escapeHtml(icon.name)}</strong><br><span class="adminMuted">${escapeHtml(icon.description)}</span><br><span class="adminMuted">${escapeHtml(icon.id)}</span></td>
      <td><span class="adminBadge">★${icon.rarity}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(icon.acquiredAt))}</span></td>
    </tr>
  `;
}

function renderPlayerUserHistoryModal(detail: PlayerUserDetail) {
  return `
    <div class="adminModalBackdrop" data-player-user-history-modal-backdrop>
      <section class="adminModal" role="dialog" aria-modal="true" aria-labelledby="playerUserHistoryModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="playerUserHistoryModalTitle">直近の試合履歴</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / 最大10件</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="直近の試合履歴を閉じる" data-close-player-user-history>×</button>
        </div>
        <div class="adminTableWrap">
          <table class="adminTable">
            <thead><tr><th>日時</th><th>モード</th><th>難易度</th><th>タイプ</th><th>勝敗</th></tr></thead>
            <tbody>${detail.matchHistory.map(renderPlayerUserHistoryRow).join("") || `<tr><td colspan="5">試合履歴がありません。</td></tr>`}</tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderPlayerUserStatusModal(detail: PlayerUserDetail, action: PlayerUserStatusAction) {
  const isSuspend = action === "suspend";
  return `
    <div class="adminModalBackdrop" data-player-user-status-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="playerUserStatusModalTitle">
        <div class="adminCardHeader">
          <div>
            <h2 id="playerUserStatusModalTitle">${isSuspend ? "ユーザー停止" : "停止解除"}</h2>
            <p class="adminMuted">${escapeHtml(detail.user.displayName || "未設定")} / ${escapeHtml(detail.user.email)}</p>
          </div>
          <button type="button" class="adminIconBtn" aria-label="状態変更を閉じる" data-close-player-user-status-modal>×</button>
        </div>
        <p class="adminMuted">だれが、なぜ、いつ実行したかを残すため、理由は必須です。</p>
        ${isSuspend ? `<p class="adminMessage is-error">停止すると対象ユーザーの既存セッションも失効します。</p>` : ""}
        <form id="playerUserStatusForm" class="adminForm">
          <input type="hidden" name="playerUserStatusAction" value="${action}">
          <div class="adminField adminFull">
            <label for="playerUserStatusReason">理由</label>
            <textarea id="playerUserStatusReason" name="playerUserStatusReason" maxlength="500" required></textarea>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn${isSuspend ? " danger" : " primary"}" ${isLoading ? "disabled" : ""}>${isSuspend ? "停止する" : "停止解除する"}</button>
            <button type="button" class="adminBtn" data-close-player-user-status-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderPlayerUserHistoryRow(match: PlayerUserDetail["matchHistory"][number]) {
  return `
    <tr>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(match.endedAt))}</span></td>
      <td>${escapeHtml(formatMatchMode(match.mode))}</td>
      <td>${escapeHtml(match.difficulty)}</td>
      <td>${escapeHtml(match.gameType)}</td>
      <td><span class="adminBadge${match.result === "win" ? " is-on" : ""}">${escapeHtml(formatMatchResult(match.result))}</span></td>
    </tr>
  `;
}

function formatStatusActionLabel(action: PlayerUserStatusAction) {
  return action === "suspend" ? "停止" : "停止解除";
}

function formatStatusLogAdmin(log: PlayerUserDetail["statusLogs"][number]) {
  const displayName = log.admin.displayName.trim();
  const email = log.admin.email.trim();
  if (displayName && email) return `${displayName} / ${email}`;
  if (displayName) return displayName;
  if (email) return email;
  return log.admin.id;
}

function renderDefinitionItem(label: string, value: string) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function renderUserTab() {
  const canManageAdmins = currentUser?.role === "owner";
  return `
    <section class="adminGrid is-list-only">
      <div class="adminCard">
        <div class="adminCardHeader">
          <div>
            <h2>管理者管理</h2>
            <p class="adminMuted">管理画面にログインできる管理者の一覧です。管理者名・権限・状態・パスワードを管理します。</p>
          </div>
          ${canManageAdmins ? `<button type="button" class="adminBtn primary" data-open-admin-create>管理者追加</button>` : ""}
        </div>
        <div class="adminTableWrap">
          <table class="adminTable adminManagerTable">
            <thead><tr><th>管理者</th><th>状態</th><th>権限</th><th>初期PW</th><th>最終ログイン</th><th class="adminActionColumn">操作</th></tr></thead>
            <tbody>${users.map(renderUserRow).join("") || `<tr><td colspan="6">管理者がありません。</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </section>
    ${isAdminCreateModalOpen ? renderAdminCreateModal() : ""}
    ${renderAdminNameModal()}
    ${renderAdminRoleModal()}
    ${renderAdminPasswordModal()}
  `;
}

function renderUserRow(user: AdminUser) {
  const isSelf = Boolean(user.isSelf || currentUser?.userId === user.userId);
  const isOwner = user.role === "owner";
  const currentIsOwner = currentUser?.role === "owner";
  const canEditName = currentIsOwner || isSelf;
  const canChangePassword = currentIsOwner || isSelf;
  const canManageRow = Boolean(currentIsOwner && !isSelf);
  const nextStatus = user.status === "active" ? "disabled" : "active";
  const nextStatusLabel = user.status === "active" ? "無効化" : "有効化";
  const actionButtons = [
    canEditName ? `<button type="button" class="adminBtn" data-edit-admin-name="${escapeAttribute(user.userId)}">名前変更</button>` : "",
    canChangePassword ? `<button type="button" class="adminBtn" data-change-admin-password="${escapeAttribute(user.userId)}">パスワード変更</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn" data-edit-admin-role="${escapeAttribute(user.userId)}">権限変更</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn${user.status === "active" ? " danger" : ""}" data-toggle-admin-status="${escapeAttribute(user.userId)}" data-next-admin-status="${nextStatus}">${nextStatusLabel}</button>` : "",
    canManageRow ? `<button type="button" class="adminBtn danger" data-delete-admin="${escapeAttribute(user.userId)}">削除</button>` : "",
  ].filter(Boolean);
  const displayName = getAdminDisplayName(user);
  return `
    <tr>
      <td>
        <strong>${escapeHtml(displayName || user.email)}</strong>${isSelf ? ` <span class="adminBadge">自分</span>` : ""}
        ${displayName ? `<br><span class="adminMuted">${escapeHtml(user.email)}</span>` : ""}
      </td>
      <td><span class="adminBadge${user.status === "active" ? " is-on" : ""}">${user.status === "active" ? "active" : "disabled"}</span></td>
      <td><span class="adminBadge${isOwner ? " is-owner" : " is-on"}">${escapeHtml(user.roleLabel)}</span></td>
      <td><span class="adminBadge${user.mustChangePassword ? "" : " is-on"}">${user.mustChangePassword ? "未変更" : "変更済"}</span></td>
      <td><span class="adminMuted">${escapeHtml(formatDateTime(user.lastLoginAt))}</span></td>
      <td class="adminActionCell">
        ${actionButtons.length > 0 ? `<div class="adminActionStack">${actionButtons.join("")}</div>` : `<span class="adminActionPlaceholder" aria-hidden="true"></span>`}
      </td>
    </tr>
  `;
}

function renderAdminCreateModal() {
  return `
    <div class="adminModalBackdrop" data-admin-create-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminCreateModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminCreateModalTitle">管理者追加</h2>
          <button type="button" class="adminIconBtn" aria-label="管理者追加を閉じる" data-close-admin-create-modal>×</button>
        </div>
        <p class="adminMuted">初期パスワードはメールアドレスと同じ値になります。</p>
        <form id="adminCreateForm" class="adminForm">
          ${renderTextField("adminCreateDisplayName", "管理者名", "")}
          ${renderTextField("adminCreateEmail", "メールアドレス", "")}
          <div class="adminField">
            <label for="adminCreateRole">権限</label>
            <select id="adminCreateRole" name="adminCreateRole">
              <option value="admin">管理者</option>
              <option value="owner">管理責任者</option>
            </select>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>追加する</button>
            <button type="button" class="adminBtn" data-close-admin-create-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminNameModal() {
  if (!adminNameTargetAdminId) return "";
  const target = users.find((user) => user.userId === adminNameTargetAdminId);
  if (!target) return "";
  return `
    <div class="adminModalBackdrop" data-admin-name-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminNameModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminNameModalTitle">管理者名変更</h2>
          <button type="button" class="adminIconBtn" aria-label="管理者名変更を閉じる" data-close-admin-name-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <form id="adminNameForm" class="adminForm">
          <input type="hidden" name="adminId" value="${escapeAttribute(target.userId)}">
          ${renderTextField("adminDisplayName", "管理者名", target.displayName || "")}
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-name-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminRoleModal() {
  if (!adminRoleTargetAdminId) return "";
  const target = users.find((user) => user.userId === adminRoleTargetAdminId);
  if (!target) return "";
  return `
    <div class="adminModalBackdrop" data-admin-role-modal-backdrop>
      <section class="adminModal adminSmallModal" role="dialog" aria-modal="true" aria-labelledby="adminRoleModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminRoleModalTitle">権限変更</h2>
          <button type="button" class="adminIconBtn" aria-label="権限変更を閉じる" data-close-admin-role-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <form id="adminRoleForm" class="adminForm">
          <input type="hidden" name="adminId" value="${escapeAttribute(target.userId)}">
          <div class="adminField">
            <label for="adminRole">権限</label>
            <select id="adminRole" name="adminRole">
              <option value="admin" ${target.role === "admin" ? "selected" : ""}>管理者</option>
              <option value="owner" ${target.role === "owner" ? "selected" : ""}>管理責任者</option>
            </select>
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-role-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderAdminPasswordModal() {
  if (!passwordTargetAdminId) return "";
  const target = users.find((user) => user.userId === passwordTargetAdminId);
  if (!target) return "";
  const isSelf = Boolean(target.isSelf || currentUser?.userId === target.userId);
  return `
    <div class="adminModalBackdrop" data-admin-password-modal-backdrop>
      <section class="adminModal adminPasswordModal" role="dialog" aria-modal="true" aria-labelledby="adminPasswordModalTitle">
        <div class="adminCardHeader">
          <h2 id="adminPasswordModalTitle">パスワード変更</h2>
          <button type="button" class="adminIconBtn" aria-label="パスワード変更を閉じる" data-close-admin-password-modal>×</button>
        </div>
        <p class="adminMuted">対象：${renderAdminIdentity(target)}</p>
        <p class="adminMuted">新しいパスワードは英字・数字・記号を含む7文字以上です。</p>
        <form id="adminPasswordForm" class="adminForm">
          <input type="hidden" name="targetAdminId" value="${escapeAttribute(target.userId)}">
          ${isSelf ? `
          <div class="adminField">
            <label for="currentPassword">現在のパスワード</label>
            <input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password">
          </div>` : ""}
          <div class="adminField">
            <label for="newPassword">新しいパスワード</label>
            <input id="newPassword" name="newPassword" type="password" autocomplete="new-password">
          </div>
          <div class="adminField">
            <label for="confirmPassword">新しいパスワード確認</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password">
          </div>
          <div class="adminActions">
            <button type="submit" class="adminBtn primary" ${isLoading ? "disabled" : ""}>変更する</button>
            <button type="button" class="adminBtn" data-close-admin-password-modal>キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function renderTextField(name: string, label: string, value: string) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="text" value="${escapeAttribute(value)}">
    </div>
  `;
}

function renderNumberField(name: string, label: string, value: number, min: number, max: number) {
  return `
    <div class="adminField">
      <label for="${name}">${label}</label>
      <input id="${name}" name="${name}" type="number" min="${min}" max="${max}" value="${value}">
    </div>
  `;
}

function renderTextareaField(name: string, label: string, value: string) {
  return `
    <div class="adminField adminFull">
      <label for="${name}">${label}</label>
      <textarea id="${name}" name="${name}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function renderCheckField(name: string, label: string, checked: boolean) {
  return `
    <div class="adminCheck">
      <input id="${name}" name="${name}" type="checkbox" ${checked ? "checked" : ""}>
      <label for="${name}">${label}</label>
    </div>
  `;
}

function renderTitleIconRewardField(title: TitleMaster | null) {
  const selectedIds = title?.iconRewardIds ?? [];
  const pendingBatch = title ? findPendingTitleIconRewardsBatch(title.id) : null;
  if (pendingBatch) {
    return `
      <div class="adminRewardBox adminFull">
        <div>
          <span class="adminBadge is-owner">状態：変更あり</span>
        </div>
        <p class="adminMuted">この称号には未反映のアイコン報酬変更があります。具体的な変更内容は「反映設定」タブの詳細で確認してください。</p>
        <p class="adminMuted">アイコン報酬を変更するには、先に反映設定タブで反映またはキャンセルしてください。</p>
        ${selectedIds.map((iconId) => `<input type="hidden" name="iconRewardIds" value="${escapeAttribute(iconId)}">`).join("")}
      </div>
    `;
  }
  return `
    <div class="adminRewardBox adminFull">
      <div class="adminCheck">
        <input id="enableIconRewards" name="enableIconRewards" type="checkbox" data-enable-icon-rewards ${selectedIds.length > 0 ? "checked" : ""}>
        <label for="enableIconRewards">アイコンも開放する</label>
      </div>
      <div class="adminRewardBody${selectedIds.length > 0 ? "" : " is-disabled"}" data-icon-reward-body>
        <div class="adminRewardPicker">
          <select data-icon-reward-select aria-label="紐づけるアイコンを選択">
            <option value="">アイコンを選択</option>
            ${icons.filter((icon) => !hasPendingIconDelete(icon.id)).map((icon) => renderIconRewardOption(icon, selectedIds)).join("")}
          </select>
          <button type="button" class="adminBtn" data-add-icon-reward ${selectedIds.length >= 3 ? "disabled" : ""}>紐づけるアイコンを追加</button>
        </div>
        <p class="adminMuted">1称号につき最大3つまで。同じアイコンは重複して紐づけできません。</p>
        <ol class="adminRewardList" data-icon-reward-list>
          ${selectedIds.map(renderTitleIconRewardItem).join("")}
        </ol>
      </div>
    </div>
    ${renderTextareaField("titleIconRewardChangeReason", "アイコン報酬変更理由（報酬を変更する場合は必須）", "")}
  `;
}


function findPendingTitleIconRewardsBatch(titleId: string) {
  return changeBatches.find((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "title_icon_rewards_update" && item.targetType === "title" && item.targetId === titleId);
  }) ?? null;
}

function hasPendingIconDelete(iconId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "icon_delete" && item.targetType === "icon" && item.targetId === iconId);
  });
}

function hasPendingIconReplace(iconId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "icon_replace" && item.targetType === "icon" && item.targetId === iconId);
  });
}


function hasPendingLoadingIllustrationDelete(illustrationId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "loading_illustration_delete" && item.targetType === "loading_illustration" && item.targetId === illustrationId);
  });
}

function hasPendingLoadingIllustrationReplace(illustrationId: string) {
  return changeBatches.some((batch) => {
    if (batch.status !== "draft" && batch.status !== "scheduled") return false;
    return batch.items.some((item) => isActiveChangeBatchItem(item) && item.changeType === "loading_illustration_replace" && item.targetType === "loading_illustration" && item.targetId === illustrationId);
  });
}

function renderIconRewardOption(icon: IconMaster, selectedIds: string[]) {
  const label = `${icon.name} / ${icon.code}${hasPendingIconReplace(icon.id) ? "（差し替え予定）" : ""}`;
  return `<option value="${escapeAttribute(icon.id)}" ${selectedIds.includes(icon.id) ? "disabled" : ""}>${escapeHtml(label)}</option>`;
}

function renderTitleIconRewardItem(iconId: string) {
  const icon = icons.find((item) => item.id === iconId);
  const label = icon ? `${icon.name} / ${icon.code}` : iconId;
  return `
    <li class="adminRewardItem" data-icon-reward-item="${escapeAttribute(iconId)}">
      <input type="hidden" name="iconRewardIds" value="${escapeAttribute(iconId)}">
      <span>${escapeHtml(label)}</span>
      <button type="button" class="adminBtn" data-remove-icon-reward="${escapeAttribute(iconId)}">削除</button>
    </li>
  `;
}

function bindCommonEvents() {
  app.querySelector<HTMLButtonElement>("[data-admin-logout]")?.addEventListener("click", () => {
    void logoutAdmin();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (tab === "titles" || tab === "icons" || tab === "assets" || tab === "loadingIllustrations" || tab === "announcements" || tab === "changeBatches" || tab === "playerUsers" || tab === "users") {
        activeTab = tab;
        editingTitle = null;
        editingIcon = null;
        editingLoadingIllustration = null;
        editingAnnouncement = null;
        isTitleCreateModalOpen = false;
        isIconCreateModalOpen = false;
        isAnnouncementCreateModalOpen = false;
        passwordTargetAdminId = null;
        selectedPlayerUserDetail = null;
        isPlayerUserHistoryModalOpen = false;
        playerUserStatusAction = null;
        messageText = "";
        errorText = "";
        render();
      }
    });
  });
}

function bindTitleEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-title-create]")?.addEventListener("click", () => {
    editingTitle = null;
    isTitleCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-title]").forEach((button) => {
    button.addEventListener("click", () => {
      editingTitle = titles.find((title) => title.id === button.dataset.editTitle) ?? null;
      isTitleCreateModalOpen = false;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-title-detail]")?.addEventListener("click", () => {
    editingTitle = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-title]")?.addEventListener("click", () => {
    editingTitle = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-title-create]")?.addEventListener("click", () => {
    isTitleCreateModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-title-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isTitleCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#titleForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveTitle(event.currentTarget as HTMLFormElement);
  });

  bindTitleIconRewardEvents();
}

function bindTitleIconRewardEvents() {
  const checkbox = app.querySelector<HTMLInputElement>("[data-enable-icon-rewards]");
  const select = app.querySelector<HTMLSelectElement>("[data-icon-reward-select]");
  const addButton = app.querySelector<HTMLButtonElement>("[data-add-icon-reward]");
  const list = app.querySelector<HTMLOListElement>("[data-icon-reward-list]");

  checkbox?.addEventListener("change", syncTitleIconRewardControls);
  select?.addEventListener("change", syncTitleIconRewardControls);

  addButton?.addEventListener("click", () => {
    if (!checkbox?.checked || !select?.value) return;
    const selectedIds = getSelectedIconRewardIds();
    if (selectedIds.length >= 3 || selectedIds.includes(select.value)) return;

    list?.insertAdjacentHTML("beforeend", renderTitleIconRewardItem(select.value));
    select.value = "";
    syncTitleIconRewardControls();
  });

  list?.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    const button = target?.closest<HTMLButtonElement>("[data-remove-icon-reward]");
    if (!button) return;
    button.closest("[data-icon-reward-item]")?.remove();
    syncTitleIconRewardControls();
  });

  syncTitleIconRewardControls();
}

function syncTitleIconRewardControls() {
  const checkbox = app.querySelector<HTMLInputElement>("[data-enable-icon-rewards]");
  const body = app.querySelector<HTMLElement>("[data-icon-reward-body]");
  const select = app.querySelector<HTMLSelectElement>("[data-icon-reward-select]");
  const addButton = app.querySelector<HTMLButtonElement>("[data-add-icon-reward]");
  const selectedIds = getSelectedIconRewardIds();
  const enabled = Boolean(checkbox?.checked);

  body?.classList.toggle("is-disabled", !enabled);
  if (select) {
    select.disabled = !enabled || selectedIds.length >= 3;
    Array.from(select.options).forEach((option) => {
      if (!option.value) return;
      option.disabled = selectedIds.includes(option.value);
    });
  }
  if (addButton) addButton.disabled = !enabled || !select?.value || selectedIds.length >= 3 || selectedIds.includes(select?.value ?? "");

  app.querySelectorAll<HTMLButtonElement>("[data-remove-icon-reward]").forEach((button) => {
    button.disabled = !enabled;
  });
}

function getSelectedIconRewardIds() {
  return Array.from(app.querySelectorAll<HTMLInputElement>('input[name="iconRewardIds"]'))
    .map((input) => input.value)
    .filter(Boolean);
}

function bindIconEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-icon-create]")?.addEventListener("click", () => {
    editingIcon = null;
    isIconCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-icon]").forEach((button) => {
    button.addEventListener("click", () => {
      editingIcon = icons.find((icon) => icon.id === button.dataset.editIcon) ?? null;
      isIconCreateModalOpen = false;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-detail]")?.addEventListener("click", () => {
    editingIcon = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-icon]")?.addEventListener("click", () => {
    editingIcon = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-create]")?.addEventListener("click", () => {
    isIconCreateModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isIconCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveIcon(event.currentTarget as HTMLFormElement);
  });

  bindIconDeleteEvents();
}

function bindAssetEvents() {
  app.querySelector<HTMLFormElement>("#assetIconForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void uploadAsset(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#assetLoadingIllustrationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void uploadAsset(event.currentTarget as HTMLFormElement);
  });

  bindIconDeleteEvents();
  bindIconReplaceEvents();
  bindLoadingIllustrationDeleteEvents();
  bindLoadingIllustrationReplaceEvents();
}

function bindIconDeleteEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-icon-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      iconDeleteTargetId = button.dataset.openIconDelete ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-delete]")?.addEventListener("click", () => {
    iconDeleteTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-delete-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      iconDeleteTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconDeleteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createIconDeleteChangeBatch(event.currentTarget as HTMLFormElement);
  });
}


function bindIconReplaceEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-icon-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      iconReplaceTargetId = button.dataset.openIconReplace ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-icon-replace]")?.addEventListener("click", () => {
    iconReplaceTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-icon-replace-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      iconReplaceTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#iconReplaceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createIconReplaceChangeBatch(event.currentTarget as HTMLFormElement);
  });
}


function bindLoadingIllustrationDeleteEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-loading-illustration-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      loadingIllustrationDeleteTargetId = button.dataset.openLoadingIllustrationDelete ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-delete]")?.addEventListener("click", () => {
    loadingIllustrationDeleteTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-loading-illustration-delete-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      loadingIllustrationDeleteTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#loadingIllustrationDeleteForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createLoadingIllustrationDeleteChangeBatch(event.currentTarget as HTMLFormElement);
  });
}

function bindLoadingIllustrationReplaceEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-loading-illustration-replace]").forEach((button) => {
    button.addEventListener("click", () => {
      loadingIllustrationReplaceTargetId = button.dataset.openLoadingIllustrationReplace ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-replace]")?.addEventListener("click", () => {
    loadingIllustrationReplaceTargetId = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-loading-illustration-replace-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      loadingIllustrationReplaceTargetId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#loadingIllustrationReplaceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createLoadingIllustrationReplaceChangeBatch(event.currentTarget as HTMLFormElement);
  });
}

function bindLoadingIllustrationEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-edit-loading-illustration]").forEach((button) => {
    button.addEventListener("click", () => {
      editingLoadingIllustration = assetLoadingIllustrations.find((item) => item.id === button.dataset.editLoadingIllustration) ?? null;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-loading-illustration-detail]")?.addEventListener("click", () => {
    editingLoadingIllustration = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-loading-illustration]")?.addEventListener("click", () => {
    editingLoadingIllustration = null;
    render();
  });

  app.querySelector<HTMLSelectElement>("[data-appearance-mode]")?.addEventListener("change", syncAppearanceModeControls);

  app.querySelector<HTMLFormElement>("#loadingIllustrationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveLoadingIllustrationSettings(event.currentTarget as HTMLFormElement);
  });

  syncAppearanceModeControls();
}

function syncAppearanceModeControls() {
  const mode = app.querySelector<HTMLSelectElement>("[data-appearance-mode]")?.value;
  const isManual = mode === "manual";
  app.querySelectorAll<HTMLInputElement>("[data-rate-field] input").forEach((input) => {
    input.disabled = !isManual;
  });
}


function bindAnnouncementEvents() {
  app.querySelector<HTMLButtonElement>("[data-open-announcement-create]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    isAnnouncementCreateModalOpen = true;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-edit-announcement]").forEach((button) => {
    button.addEventListener("click", () => {
      editingAnnouncement = announcements.find((announcement) => announcement.id === button.dataset.editAnnouncement) ?? null;
      isAnnouncementCreateModalOpen = false;
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-delete-announcement]").forEach((button) => {
    button.addEventListener("click", () => {
      const announcementId = button.dataset.deleteAnnouncement ?? "";
      const announcement = announcements.find((item) => item.id === announcementId);
      const confirmed = window.confirm(`${announcement?.title ?? "このお知らせ"} を削除しますか？`);
      if (confirmed) void deleteAnnouncement(announcementId);
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-announcement-detail]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-cancel-announcement]")?.addEventListener("click", () => {
    editingAnnouncement = null;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-announcement-create]")?.addEventListener("click", () => {
    isAnnouncementCreateModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-announcement-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isAnnouncementCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#announcementForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveAnnouncement(event.currentTarget as HTMLFormElement);
  });
}


function bindChangeBatchEvents() {
  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      changeBatchActionTarget = { batchId: button.dataset.openChangeBatchDetail ?? "", mode: "detail" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      changeBatchActionTarget = { batchId: button.dataset.openChangeBatchApply ?? "", mode: "apply" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-batch-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      changeBatchActionTarget = { batchId: button.dataset.openChangeBatchCancel ?? "", mode: "cancel" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-change-item-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!changeBatchActionTarget?.batchId) return;
      changeBatchActionTarget = { batchId: changeBatchActionTarget.batchId, mode: "itemCancel", itemId: button.dataset.openChangeItemCancel ?? "" };
      messageText = "";
      errorText = "";
      render();
    });
  });

  app.querySelector<HTMLButtonElement>("[data-close-change-batch-modal]")?.addEventListener("click", () => {
    changeBatchActionTarget = null;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-change-batch-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      changeBatchActionTarget = null;
      render();
    }
  });

  app.querySelectorAll<HTMLInputElement>("#changeBatchApplyForm input[type='checkbox']").forEach((checkbox) => {
    checkbox.addEventListener("change", syncChangeBatchApplyButton);
  });

  app.querySelector<HTMLFormElement>("#changeBatchApplyForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void applyChangeBatch(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#changeBatchCancelForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void cancelChangeBatch(event.currentTarget as HTMLFormElement);
  });

  app.querySelector<HTMLFormElement>("#changeItemCancelForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void cancelChangeItem(event.currentTarget as HTMLFormElement);
  });

  syncChangeBatchApplyButton();
}

function syncChangeBatchApplyButton() {
  const form = app.querySelector<HTMLFormElement>("#changeBatchApplyForm");
  const button = app.querySelector<HTMLButtonElement>("[data-apply-change-batch-submit]");
  if (!form || !button) return;
  const checks = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='checkbox']"));
  button.disabled = isLoading || checks.length === 0 || checks.some((checkbox) => !checkbox.checked);
}

function bindPlayerUserEvents() {
  app.querySelector<HTMLFormElement>("#playerUserSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    playerUserQuery = readFormString(data, "playerUserSearch");
    playerUserSearchInput = playerUserQuery;
    playerUserPagination = { ...playerUserPagination, page: 1 };
    void refreshPlayerUsers();
  });

  app.querySelector<HTMLButtonElement>("[data-clear-player-user-search]")?.addEventListener("click", () => {
    playerUserQuery = "";
    playerUserSearchInput = "";
    playerUserPagination = { ...playerUserPagination, page: 1 };
    void refreshPlayerUsers();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-player-users-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.playerUsersPage;
      const nextPage = direction === "previous" ? playerUserPagination.page - 1 : playerUserPagination.page + 1;
      playerUserPagination = { ...playerUserPagination, page: nextPage };
      void refreshPlayerUsers();
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-player-user-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      const userId = button.dataset.openPlayerUserDetail ?? "";
      void openPlayerUserDetail(userId);
    });
  });

  app.querySelector<HTMLButtonElement>("[data-back-player-users]")?.addEventListener("click", () => {
    selectedPlayerUserDetail = null;
    isPlayerUserHistoryModalOpen = false;
    playerUserStatusAction = null;
    messageText = "";
    errorText = "";
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-open-player-user-history]")?.addEventListener("click", () => {
    isPlayerUserHistoryModalOpen = true;
    render();
  });

  app.querySelector<HTMLButtonElement>("[data-close-player-user-history]")?.addEventListener("click", () => {
    isPlayerUserHistoryModalOpen = false;
    render();
  });

  app.querySelector<HTMLDivElement>("[data-player-user-history-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      isPlayerUserHistoryModalOpen = false;
      render();
    }
  });

  app.querySelectorAll<HTMLButtonElement>("[data-open-player-user-status-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.openPlayerUserStatusAction;
      if (action === "suspend" || action === "unsuspend") {
        playerUserStatusAction = action;
        messageText = "";
        errorText = "";
        render();
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-close-player-user-status-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      playerUserStatusAction = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>("[data-player-user-status-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      playerUserStatusAction = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#playerUserStatusForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updatePlayerUserStatus(event.currentTarget as HTMLFormElement);
  });
}

function bindAdminLoginEvents() {
  app.querySelector<HTMLFormElement>("#adminLoginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void loginAdmin(event.currentTarget as HTMLFormElement);
  });
}

function bindUserEvents() {
  app.querySelector<HTMLButtonElement>('[data-open-admin-create]')?.addEventListener('click', () => {
    isAdminCreateModalOpen = true;
    messageText = '';
    errorText = '';
    render();
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-create-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      isAdminCreateModalOpen = false;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-create-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      isAdminCreateModalOpen = false;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminCreateForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void createAdminUser(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-edit-admin-name]').forEach((button) => {
    button.addEventListener('click', () => {
      adminNameTargetAdminId = button.dataset.editAdminName ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-name-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      adminNameTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-name-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      adminNameTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminNameForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void updateAdminName(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-edit-admin-role]').forEach((button) => {
    button.addEventListener('click', () => {
      adminRoleTargetAdminId = button.dataset.editAdminRole ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-role-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      adminRoleTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-role-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      adminRoleTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminRoleForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void updateAdminRole(event.currentTarget as HTMLFormElement);
  });

  app.querySelectorAll<HTMLButtonElement>('[data-toggle-admin-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const adminId = button.dataset.toggleAdminStatus ?? '';
      const status = button.dataset.nextAdminStatus ?? '';
      void updateAdminStatus(adminId, status);
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-delete-admin]').forEach((button) => {
    button.addEventListener('click', () => {
      const adminId = button.dataset.deleteAdmin ?? '';
      void deleteAdminUser(adminId);
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-change-admin-password]').forEach((button) => {
    button.addEventListener('click', () => {
      passwordTargetAdminId = button.dataset.changeAdminPassword ?? null;
      messageText = '';
      errorText = '';
      render();
    });
  });

  app.querySelectorAll<HTMLButtonElement>('[data-close-admin-password-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      passwordTargetAdminId = null;
      render();
    });
  });

  app.querySelector<HTMLDivElement>('[data-admin-password-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      passwordTargetAdminId = null;
      render();
    }
  });

  app.querySelector<HTMLFormElement>('#adminPasswordForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    void changeAdminPassword(event.currentTarget as HTMLFormElement);
  });
}

async function saveTitle(form: HTMLFormElement) {
  const data = new FormData(form);
  const payload = readTitlePayload(data);
  const isEdit = Boolean(payload.titleId);
  const originalIconRewardIds = isEdit ? editingTitle?.iconRewardIds ?? [] : [];
  const nextIconRewardIds = Array.isArray(payload.iconRewardIds) ? payload.iconRewardIds.filter((value): value is string => typeof value === "string") : [];
  const iconRewardsChanged = !isSameStringList(originalIconRewardIds, nextIconRewardIds);
  const iconRewardChangeReason = readFormString(data, "titleIconRewardChangeReason");

  if (iconRewardsChanged && !iconRewardChangeReason) {
    errorText = "アイコン報酬を変更する場合は、変更理由を入力してください。";
    render();
    return;
  }

  const saved = await saveMaster("title", isEdit, payload);
  if (!saved.ok) {
    render();
    return;
  }

  if (iconRewardsChanged && saved.batchId) {
    activeTab = "changeBatches";
    changeBatchActionTarget = { batchId: saved.batchId, mode: "detail" };
  }

  editingTitle = null;
  isTitleCreateModalOpen = false;
  await Promise.all([loadMasters(), loadChangeBatches()]);
  render();
}

async function saveIcon(form: HTMLFormElement) {
  const data = new FormData(form);
  const payload = readIconPayload(data);
  const isEdit = Boolean(payload.iconId);
  const saved = await saveMaster("icon", isEdit, payload);
  if (!saved.ok) {
    render();
    return;
  }

  editingIcon = null;
  isIconCreateModalOpen = false;
  await loadMasters();
  render();
}

async function saveMaster(targetType: MasterTargetType, isEdit: boolean, payload: SavePayload) {
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/masters", {
    method: isEdit ? "PATCH" : "POST",
    body: JSON.stringify({ targetType, ...payload }),
  });

  isLoading = false;
  return result;
}

async function uploadAsset(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  await Promise.all([loadAssets(), loadMasters()]);
  render();
}


async function createIconDeleteChangeBatch(form: HTMLFormElement) {
  const payload = readIconDeletePayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  iconDeleteTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}


async function createIconReplaceChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  iconReplaceTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}


async function createLoadingIllustrationDeleteChangeBatch(form: HTMLFormElement) {
  const payload = readLoadingIllustrationDeletePayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  loadingIllustrationDeleteTargetId = null;
  await loadChangeBatches();
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function createLoadingIllustrationReplaceChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminFormJson("/api/admin/assets", data);

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  loadingIllustrationReplaceTargetId = null;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  activeTab = "changeBatches";
  changeBatchActionTarget = result.batchId ? { batchId: result.batchId, mode: "detail" } : null;
  render();
}

async function applyChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  if (!batchId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "apply", batchId }),
  });

  isLoading = false;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters(), loadAnnouncements()]);
  if (!result.ok) {
    render();
    return;
  }

  changeBatchActionTarget = null;
  render();
}


async function cancelChangeItem(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  const itemId = readFormString(data, "itemId");
  const cancelReason = readFormString(data, "changeItemCancelReason");
  if (!batchId || !itemId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "cancelItem", batchId, itemId, cancelReason }),
  });

  isLoading = false;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  if (!result.ok) {
    render();
    return;
  }

  const refreshedBatch = changeBatches.find((batch) => batch.id === batchId);
  changeBatchActionTarget = refreshedBatch ? { batchId, mode: "detail" } : null;
  render();
}

async function cancelChangeBatch(form: HTMLFormElement) {
  const data = new FormData(form);
  const batchId = readFormString(data, "batchId");
  const cancelReason = readFormString(data, "changeBatchCancelReason");
  if (!batchId) return;
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/change-batches", {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel", batchId, cancelReason }),
  });

  isLoading = false;
  await Promise.all([loadChangeBatches(), loadAssets(), loadMasters()]);
  if (!result.ok) {
    render();
    return;
  }

  changeBatchActionTarget = null;
  render();
}

async function saveLoadingIllustrationSettings(form: HTMLFormElement) {
  const payload = readLoadingIllustrationPayload(new FormData(form));
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/loading-illustrations", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadAssets();
  editingLoadingIllustration = assetLoadingIllustrations.find((item) => item.id === payload.illustrationId) ?? null;
  render();
}


async function saveAnnouncement(form: HTMLFormElement) {
  const payload = readAnnouncementPayload(new FormData(form));
  const isEdit = Boolean(payload.announcementId);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/announcements", {
    method: isEdit ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  isAnnouncementCreateModalOpen = false;
  await loadAnnouncements();
  editingAnnouncement = isEdit ? announcements.find((item) => item.id === payload.announcementId) ?? null : null;
  render();
}

async function deleteAnnouncement(announcementId: string) {
  if (!announcementId) return;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/announcements", {
    method: "DELETE",
    body: JSON.stringify({ announcementId }),
  });
  if (!result.ok) {
    render();
    return;
  }

  if (editingAnnouncement?.id === announcementId) editingAnnouncement = null;
  await loadAnnouncements();
  render();
}

async function refreshPlayerUsers() {
  messageText = "";
  errorText = "";
  selectedPlayerUserDetail = null;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  await loadPlayerUsers();
  render();
}

async function openPlayerUserDetail(userId: string) {
  if (!userId) return;
  isLoading = true;
  messageText = "";
  errorText = "";
  render();

  const result = await fetchAdminJson(`/api/admin/player-users/${encodeURIComponent(userId)}`);

  isLoading = false;
  if (!result.ok || !result.playerUserDetail) {
    render();
    return;
  }

  currentUser = result.currentUser ?? currentUser;
  selectedPlayerUserDetail = result.playerUserDetail;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  render();
}

async function updatePlayerUserStatus(form: HTMLFormElement) {
  if (!selectedPlayerUserDetail) return;
  const data = new FormData(form);
  const action = readFormString(data, "playerUserStatusAction");
  const reason = readFormString(data, "playerUserStatusReason");
  if (action !== "suspend" && action !== "unsuspend") return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson(`/api/admin/player-users/${encodeURIComponent(selectedPlayerUserDetail.user.userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason }),
  });

  isLoading = false;
  if (!result.ok || !result.playerUserDetail) {
    render();
    return;
  }

  currentUser = result.currentUser ?? currentUser;
  selectedPlayerUserDetail = result.playerUserDetail;
  playerUserStatusAction = null;
  await loadPlayerUsers();
  render();
}

async function loginAdmin(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: readFormString(data, "adminLoginEmail"),
      password: readFormString(data, "adminLoginPassword"),
    }),
  });

  isLoading = false;
  if (!result.ok || !result.currentUser) {
    render();
    return;
  }

  currentUser = result.currentUser;
  await loadAdminData();
  render();
}

async function logoutAdmin() {
  messageText = "";
  errorText = "";
  await fetchAdminJson("/api/admin/auth/logout", { method: "POST" }, { suppressError: true });
  currentUser = null;
  titles = [];
  icons = [];
  users = [];
  isAdminCreateModalOpen = false;
  adminNameTargetAdminId = null;
  adminRoleTargetAdminId = null;
  passwordTargetAdminId = null;
  playerUsers = [];
  playerUserPagination = { page: 1, pageSize: 50, total: 0, totalPages: 1, hasPrevious: false, hasNext: false };
  playerUserQuery = "";
  playerUserSearchInput = "";
  selectedPlayerUserDetail = null;
  isPlayerUserHistoryModalOpen = false;
  playerUserStatusAction = null;
  announcements = [];
  assetIcons = [];
  assetLoadingIllustrations = [];
  changeBatches = [];
  iconDeleteTargetId = null;
  changeBatchActionTarget = null;
  render();
}

async function createAdminUser(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({
      displayName: readFormString(data, "adminCreateDisplayName"),
      email: readFormString(data, "adminCreateEmail"),
      role: readFormString(data, "adminCreateRole"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  isAdminCreateModalOpen = false;
  await loadUsers();
  render();
}

async function updateAdminName(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_display_name",
      adminId: readFormString(data, "adminId"),
      displayName: readFormString(data, "adminDisplayName"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  adminNameTargetAdminId = null;
  await Promise.all([loadAdminMe(), loadUsers()]);
  render();
}

async function updateAdminRole(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_role",
      adminId: readFormString(data, "adminId"),
      role: readFormString(data, "adminRole"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  adminRoleTargetAdminId = null;
  await loadUsers();
  render();
}

async function updateAdminStatus(adminId: string, status: string) {
  if (!adminId || (status !== "active" && status !== "disabled")) return;
  const label = status === "active" ? "有効化" : "無効化";
  if (!window.confirm(`この管理者を${label}しますか？`)) return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "update_status",
      adminId,
      status,
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadUsers();
  render();
}

async function deleteAdminUser(adminId: string) {
  if (!adminId) return;
  const target = users.find((user) => user.userId === adminId);
  const targetName = target ? formatAdminIdentity(target) : "この管理者";
  if (!window.confirm(`${targetName}を削除します。削除後は一覧に表示されず、ログインできなくなります。よろしいですか？`)) return;

  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify({
      action: "delete_admin",
      adminId,
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  await loadUsers();
  render();
}

async function changeAdminPassword(form: HTMLFormElement) {
  const data = new FormData(form);
  isLoading = true;
  messageText = "";
  errorText = "";

  const result = await fetchAdminJson("/api/admin/auth/password", {
    method: "PATCH",
    body: JSON.stringify({
      targetAdminId: readFormString(data, "targetAdminId"),
      currentPassword: readFormString(data, "currentPassword"),
      newPassword: readFormString(data, "newPassword"),
      confirmPassword: readFormString(data, "confirmPassword"),
    }),
  });

  isLoading = false;
  if (!result.ok) {
    render();
    return;
  }

  form.reset();
  passwordTargetAdminId = null;
  await Promise.all([loadAdminMe(), loadUsers()]);
  render();
}

function readTitlePayload(data: FormData): SavePayload {
  const iconRewardIds = data.has("enableIconRewards")
    ? data.getAll("iconRewardIds").map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean).slice(0, 3)
    : [];
  return {
    titleId: readFormString(data, "titleId") || null,
    titleCode: readFormString(data, "titleCode"),
    titleName: readFormString(data, "titleName"),
    description: readFormString(data, "description"),
    unlockConditionText: readFormString(data, "unlockConditionText"),
    rarity: readFormNumber(data, "rarity", 1),
    conditionType: readFormString(data, "conditionType"),
    conditionParamsJson: readFormString(data, "conditionParamsJson") || null,
    isInitial: data.has("isInitial"),
    isActive: data.has("isActive"),
    sortOrder: readFormNumber(data, "sortOrder", 0),
    iconRewardIds,
    titleIconRewardChangeReason: readFormString(data, "titleIconRewardChangeReason"),
  };
}

function readIconPayload(data: FormData): SavePayload {
  return {
    iconId: readFormString(data, "iconId") || null,
    iconCode: readFormString(data, "iconCode"),
    iconName: readFormString(data, "iconName"),
    description: readFormString(data, "description"),
    unlockConditionText: readFormString(data, "unlockConditionText"),
    imagePath: readFormString(data, "imagePath"),
    rarity: readFormNumber(data, "rarity", 1),
    conditionType: readFormString(data, "conditionType"),
    conditionParamsJson: readFormString(data, "conditionParamsJson") || null,
    isInitial: data.has("isInitial"),
    isGuestAvailable: data.has("isGuestAvailable"),
    isActive: data.has("isActive"),
    sortOrder: readFormNumber(data, "sortOrder", 0),
  };
}

function readLoadingIllustrationPayload(data: FormData): SavePayload {
  return {
    illustrationId: readFormString(data, "illustrationId"),
    requiredTitleId: readFormString(data, "requiredTitleId"),
    appearanceMode: readFormString(data, "appearanceMode") === "manual" ? "manual" : "auto",
    manualUnviewedRate: readFormRate(data, "manualUnviewedRate", 70),
    manualViewedRate: readFormRate(data, "manualViewedRate", 30),
    isActive: data.has("isActive"),
  };
}



function readIconDeletePayload(data: FormData): SavePayload {
  const createAnnouncement = data.has("iconDeleteCreateAnnouncement");
  return {
    changeType: "icon_delete",
    iconId: readFormString(data, "iconId"),
    reason: readFormString(data, "iconDeleteReason"),
    announcement: createAnnouncement ? {
      enabled: true,
      title: readFormString(data, "iconDeleteAnnouncementTitle"),
      summary: readFormString(data, "iconDeleteAnnouncementSummary"),
      body: readFormString(data, "iconDeleteAnnouncementBody"),
      category: readAnnouncementCategory(readFormString(data, "iconDeleteAnnouncementCategory")),
      priority: readFormNumber(data, "iconDeleteAnnouncementPriority", 0),
      isActive: data.has("iconDeleteAnnouncementIsActive"),
      startsAt: readFormDateTimeIso(data, "iconDeleteAnnouncementStartsAt"),
      endsAt: readFormDateTimeIso(data, "iconDeleteAnnouncementEndsAt"),
    } : null,
  };
}


function readLoadingIllustrationDeletePayload(data: FormData): SavePayload {
  const createAnnouncement = data.has("loadingIllustrationDeleteCreateAnnouncement");
  return {
    changeType: "loading_illustration_delete",
    illustrationId: readFormString(data, "illustrationId"),
    reason: readFormString(data, "loadingIllustrationDeleteReason"),
    announcement: createAnnouncement ? {
      enabled: true,
      title: readFormString(data, "loadingIllustrationDeleteAnnouncementTitle"),
      summary: readFormString(data, "loadingIllustrationDeleteAnnouncementSummary"),
      body: readFormString(data, "loadingIllustrationDeleteAnnouncementBody"),
      category: readAnnouncementCategory(readFormString(data, "loadingIllustrationDeleteAnnouncementCategory")),
      priority: readFormNumber(data, "loadingIllustrationDeleteAnnouncementPriority", 0),
      isActive: data.has("loadingIllustrationDeleteAnnouncementIsActive"),
      startsAt: readFormDateTimeIso(data, "loadingIllustrationDeleteAnnouncementStartsAt"),
      endsAt: readFormDateTimeIso(data, "loadingIllustrationDeleteAnnouncementEndsAt"),
    } : null,
  };
}

function readAnnouncementPayload(data: FormData): SavePayload {
  return {
    announcementId: readFormString(data, "announcementId") || null,
    title: readFormString(data, "announcementTitle"),
    summary: readFormString(data, "announcementSummary"),
    body: readFormString(data, "announcementBody"),
    category: readAnnouncementCategory(readFormString(data, "announcementCategory")),
    priority: readFormNumber(data, "announcementPriority", 0),
    isActive: data.has("announcementIsActive"),
    startsAt: readFormDateTimeIso(data, "announcementStartsAt"),
    endsAt: readFormDateTimeIso(data, "announcementEndsAt"),
  };
}

function readAnnouncementCategory(value: string): AnnouncementCategory {
  if (value === "maintenance" || value === "bug" || value === "update" || value === "important") return value;
  return "normal";
}

function readFormDateTimeIso(data: FormData, key: string) {
  const value = readFormString(data, key);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readFormString(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readFormNumber(data: FormData, key: string, fallback: number) {
  const value = Number(readFormString(data, key));
  return Number.isFinite(value) ? value : fallback;
}

function readFormRate(data: FormData, key: string, fallback: number) {
  const value = Number(readFormString(data, key));
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10000) / 10000;
}

function nextSortOrder(items: Array<{ sortOrder: number }>) {
  return items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;
}

function isSameStringList(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}


function changeBatchStatusLabel(status: ChangeBatchStatus) {
  if (status === "draft") return "未反映";
  if (status === "scheduled") return "反映予約済み";
  if (status === "applied") return "反映済み";
  if (status === "cancelled") return "キャンセル済み";
  if (status === "failed") return "反映失敗";
  return status;
}

function changeBatchStatusClass(status: ChangeBatchStatus) {
  if (status === "applied") return "is-on";
  if (status === "scheduled" || status === "draft") return "is-owner";
  if (status === "failed" || status === "cancelled") return "is-danger";
  return "";
}

function changeTypeLabel(value: string) {
  if (value === "icon_delete") return "アイコン削除";
  if (value === "icon_replace") return "アイコン差し替え";
  if (value === "loading_illustration_delete") return "ロードイラスト削除";
  if (value === "loading_illustration_replace") return "ロードイラスト差し替え";
  if (value === "title_icon_rewards_update") return "称号アイコン報酬変更";
  if (value === "announcement_create") return "お知らせ作成";
  return value;
}

function announcementCategoryLabel(value: string) {
  if (value === "maintenance") return "メンテナンス";
  if (value === "bug") return "不具合";
  if (value === "update") return "アップデート";
  if (value === "important") return "重要";
  return "通常";
}

function renderIconRewardSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "なし";
  return value.map((item) => {
    if (!isRecord(item)) return "-";
    const name = readUnknownString(item.icon_name);
    const code = readUnknownString(item.icon_code);
    const id = readUnknownString(item.icon_id);
    return `${name} / ${code} / ${id}`;
  }).join("、");
}

function renderIdList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "なし";
  return value.map((item) => typeof item === "string" ? item : "-").join("、");
}

function readUnknownString(value: unknown) {
  return typeof value === "string" ? value : "-";
}

function readUnknownNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readUnknownNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readUnknownBoolean(value: unknown) {
  return value === true;
}

function roleLabel(role: AdminRole) {
  if (role === "owner") return "管理責任者";
  if (role === "admin") return "管理者";
  return "通常ユーザー";
}

function formatMatchMode(value: string) {
  if (value === "solo") return "ソロ";
  if (value === "multi") return "マルチ";
  return value;
}

function formatMatchResult(value: string) {
  if (value === "win") return "勝利";
  if (value === "lose") return "敗北";
  return "-";
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP");
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  return `${(value / 1024 / 1024).toFixed(2)}MB`;
}

function formatRate(value: number) {
  return `${formatRateValue(value)}`;
}

function formatRateValue(value: number) {
  return (Number.isFinite(value) ? value : 0).toFixed(4);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string | number) {
  return escapeHtml(value);
}
