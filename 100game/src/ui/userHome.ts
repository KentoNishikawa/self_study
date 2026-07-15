import { isSoundEnabled, playButtonSe, toggleSound } from "../core/sound";
import { validatePlayerName } from "../core/nameValidation";
import { countPlayerNameChars, getPreviousUserPlayerName, getSoundVolumeLevel, getUserIconId, getUserPlayerName, getUserTitleId, hasChangedUserPlayerName, MAX_PLAYER_NAME_LENGTH, setSoundVolumeLevel, setUserIconId, setUserTitleId, updateUserSettingsOnApi } from "../core/userSettings";
import { DEFAULT_USER_TITLE_ID, LOADING_ILLUSTRATION_DEFINITIONS, USER_ICON_DEFINITIONS, USER_TITLE_DEFINITIONS, type LoadingIllustrationDefinition, type UserIconDefinition, type UserTitleDefinition } from "../core/userCollections";
import { NPC_ICON_ID, iconContentHtml, resolveIconId } from "../icons/iconPresets";
import { loadUserRecordsFromApi, type UserRecordMatch, type UserRecordModeStats, type UserRecordsSnapshot } from "../core/userRecords";
import { getFirstSelectableUserIconId } from "../icons/userIconContent";

type HomeModalKey = "privacy" | "terms" | "credits" | "contact";

type HomeModalContent = {
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionNote?: string;
};

type HomeAnnouncement = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  categoryLabel: string;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TitleAwardNotificationItem = {
  notificationId?: string;
  id: string;
  name: string;
  rarity: string;
};

export type TitleAwardNotification = {
  items: TitleAwardNotificationItem[];
};

export type IconAwardNotificationItem = {
  notificationId?: string;
  id: string;
  name: string;
  imagePath?: string;
};

export type IconAwardNotification = {
  items: IconAwardNotificationItem[];
};

const FALLBACK_DISPLAY_ICON: UserIconDefinition = {
  id: NPC_ICON_ID,
  name: "NPCアイコン",
  comment: "利用可能なアイコンがないため、表示用のNPCアイコンを使用しています。",
  imagePath: NPC_ICON_ID,
  owned: false,
  sortOrder: 0,
};

type TitleLibraryItem =
  | { kind: "title"; title: UserTitleDefinition }
  | { kind: "locked" };

type IconLibraryItem =
  | { kind: "icon"; icon: UserIconDefinition }
  | { kind: "locked" };

type LoadingIllustrationLibraryItem =
  | { kind: "illustration"; illustration: LoadingIllustrationDefinition }
  | { kind: "locked" };

type TitleLibraryFilter = "all" | "owned" | "locked" | "new" | "rarity1" | "rarity2" | "rarity3" | "rarity4" | "rarity5";
type TitleLibrarySort = "noAsc" | "acquiredDesc" | "acquiredAsc" | "rarityDesc" | "rarityAsc";
type LibraryPage = "index" | "titles" | "icons" | "loadingIllustrations";
type UserHomeSubView = "home" | "library" | "settings" | "records";

const DEFAULT_TITLE_ID = DEFAULT_USER_TITLE_ID;

// 詳細を開いたNEW解除は同一表示中だけ保持し、リロード時はNEWを復活させる。
const demoCheckedTitleIds = new Set<string>();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function rarityLevel(rarity: string): number {
  const count = Array.from(rarity).filter((char) => char === "☆").length;
  return Math.min(5, Math.max(1, count || 1));
}

function titleNameLengthClass(name: string): string {
  if (name.length >= 10) return "playerTitleLenLong";
  if (name.length >= 7) return "playerTitleLenMedium";
  return "playerTitleLenShort";
}

function loadCheckedTitleIds(): Set<string> {
  return new Set(demoCheckedTitleIds);
}

function markTitleChecked(titleId: string) {
  demoCheckedTitleIds.add(titleId);
}

function isTitleChecked(titleId: string): boolean {
  return demoCheckedTitleIds.has(titleId);
}

function titleNo(titleId: string): number {
  const index = USER_TITLE_DEFINITIONS.findIndex((title) => title.id === titleId);
  return index >= 0 ? index + 1 : 9999;
}

function acquiredTime(title: UserTitleDefinition): number {
  if (!title.owned) return -1;
  if (typeof title.acquiredAtOrder === "number" && Number.isFinite(title.acquiredAtOrder)) return title.acquiredAtOrder;
  if (!title.acquiredAt) return -1;

  const match = title.acquiredAt.match(/(\d{4})年(\d{2})月(\d{2})日/);
  if (!match) return -1;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}


function formatAnnouncementDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function announcementBodyHtml(announcement: HomeAnnouncement): string {
  const body = announcement.body.trim();
  if (!body) return "<p>本文はありません。</p>";

  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

async function loadHomeAnnouncements(): Promise<HomeAnnouncement[]> {
  try {
    const response = await fetch("/api/announcements", { credentials: "include" });
    if (!response.ok) return [];

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object" || !("announcements" in payload)) return [];

    const announcements = (payload as { announcements?: unknown }).announcements;
    if (!Array.isArray(announcements)) return [];

    return announcements.filter(isHomeAnnouncement);
  } catch {
    return [];
  }
}

function isHomeAnnouncement(value: unknown): value is HomeAnnouncement {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.summary === "string" &&
    typeof record.body === "string" &&
    typeof record.category === "string" &&
    typeof record.categoryLabel === "string" &&
    typeof record.priority === "number" &&
    (typeof record.startsAt === "string" || record.startsAt === null) &&
    (typeof record.endsAt === "string" || record.endsAt === null) &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

function findTitle(titleId: string | null | undefined): UserTitleDefinition | undefined {
  if (!titleId) return undefined;
  return USER_TITLE_DEFINITIONS.find((title) => title.id === titleId);
}

function getSelectedTitle(): UserTitleDefinition {
  const selectedId = getUserTitleId();
  const selected = findTitle(selectedId);
  if (selected?.owned) return selected;

  return USER_TITLE_DEFINITIONS.find((title) => title.id === DEFAULT_TITLE_ID && title.owned) ?? USER_TITLE_DEFINITIONS[0];
}

function setSelectedTitleId(titleId: string) {
  const title = findTitle(titleId);
  if (!title?.owned) return;

  setUserTitleId(titleId);
}

function findIcon(iconId: string | null | undefined): UserIconDefinition | undefined {
  const rawIconId = typeof iconId === "string" ? iconId : "";
  const directMatch = USER_ICON_DEFINITIONS.find((icon) => icon.id === rawIconId);
  if (directMatch) return directMatch;

  const resolvedIconId = resolveIconId(rawIconId, NPC_ICON_ID);
  return USER_ICON_DEFINITIONS.find((icon) => icon.id === resolvedIconId);
}

function isDirectIconImagePath(imagePath: string): boolean {
  return /^(?:https?:|data:|blob:)/.test(imagePath) || imagePath.startsWith("/") || imagePath.startsWith("./") || imagePath.startsWith("../");
}

function iconDefinitionContentHtml(icon: Pick<UserIconDefinition, "id" | "name"> & Partial<Pick<UserIconDefinition, "imagePath">>, sizePx: number): string {
  const imagePath = typeof icon.imagePath === "string" ? icon.imagePath.trim() : "";

  if (imagePath && isDirectIconImagePath(imagePath)) {
    return `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(icon.name)}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;" />`;
  }

  return iconContentHtml(imagePath || icon.id, sizePx, icon.id);
}

function formatRecordNumber(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.trunc(Number(value) || 0)));
}

function formatRecordDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "日時不明";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatWinRate(stats: UserRecordModeStats): string {
  if (stats.matchCount <= 0) return "0.0%";
  return `${((stats.winCount / stats.matchCount) * 100).toFixed(1)}%`;
}

function formatRecordMode(mode: UserRecordMatch["mode"]): string {
  return mode === "multi" ? "マルチ" : "ソロ";
}

function formatRecordDifficulty(difficulty: string): string {
  if (difficulty === "SMART") return "SMART";
  if (difficulty === "CASUAL") return "CASUAL";
  return difficulty || "-";
}

function formatRecordResult(match: UserRecordMatch): string {
  if (match.self.isLoser) return "敗北";
  if (match.self.isWinner) return "勝利";
  return "終了";
}

function formatRecordReason(reason: string): string {
  if (reason === "bust") return "バースト";
  if (reason === "deck_end") return "山札終了";
  if (reason === "host_disband") return "部屋解散";
  if (reason === "player_left") return "途中離脱";
  if (reason === "void") return "無効試合";
  return reason || "-";
}

function getSelectedUserIcon(): UserIconDefinition {
  const selectedIconId = getUserIconId();
  const selectedIcon = findIcon(selectedIconId);
  if (selectedIcon?.owned) return selectedIcon;

  const firstIcon = findIcon(getFirstSelectableUserIconId());
  if (firstIcon?.owned) return firstIcon;

  return USER_ICON_DEFINITIONS.find((icon) => icon.owned) ?? FALLBACK_DISPLAY_ICON;
}

export function getSelectedUserIconId(): string {
  return getSelectedUserIcon().id;
}

export function getSelectedUserTitleName(): string {
  return getSelectedTitle().name;
}

let HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [];

const HOME_MODAL_CONTENT: Record<HomeModalKey, HomeModalContent> = {
  privacy: {
    title: "プライバシーポリシー",
    bodyHtml: `
      <p>本ゲームでは、サービスの提供や品質向上のため、プレイ状況やご利用環境に関する情報を取得する場合があります。</p>
      <p>取得した情報は、ゲーム運営、障害対応、不具合調査、利用状況の分析などの目的で利用します。</p>
      <p>法令に基づく場合を除き、取得した情報を第三者へ不当に提供することはありません。</p>
      <p>プライバシーポリシーの内容は、必要に応じて見直し・更新することがあります。</p>
    `,
  },
  terms: {
    title: "利用規約",
    bodyHtml: `
      <p>本ゲームをご利用の際は、法令や公序良俗に反する行為、サービス運営を妨げる行為を行わないでください。</p>
      <p>ゲーム内容、提供方法、公開情報は、予告なく変更または終了する場合があります。</p>
      <p>本ゲームの利用に関連して発生した損害について、運営側は故意または重過失がある場合を除き責任を負いません。</p>
      <p>詳細な利用条件は、正式公開時に必要に応じて更新します。</p>
    `,
  },
  credits: {
    title: "クレジット",
    bodyHtml: `
      <p><strong>タイトル</strong><br>100GAME⁺(100ゲームプラス)</p>
      <p><strong>制作</strong><br>Acceble</p>
      <p><strong>企画</strong><br>西川 拳人</p>
      <p><strong>開発</strong><br>西川 拳人<br>車田 恭輔</p>
      <p><strong>イラスト提供</strong><br>Shake</p>
      <p><strong>サービス運用設計</strong><br>野上 玲旺</p>
      <p><strong>使用技術</strong><br>TypeScript / Vite / Cloudflare</p>
      <p><strong>お問い合わせ</strong><br>support@acceble.com</p>
      <p>© 2026 Acceble. All Rights Reserved.</p>
      <p><small>Version 1.0.0</small></p>
    `,
  },
  contact: {
    title: "お問い合わせ",
    bodyHtml: `
      <p>100GAME⁺に関する不具合報告、ご意見・ご要望、その他のお問い合わせは専用ページからお送りください。</p>
      <p>いただいた内容を確認のうえ、必要に応じて運営より返信する場合があります。</p>
      <p><a href="./contact.html">お問い合わせページはこちら</a></p>
      <p>※現在のタブでお問い合わせページへ移動します。</p>
    `,
  },
};

export function renderUserHome(
  app: HTMLDivElement,
  handlers: {
    onGoGameSettings: () => void;
    onGoTitle: () => void;
    titleAwardNotification?: TitleAwardNotification | null;
    iconAwardNotification?: IconAwardNotification | null;
    onTitleAwardNotificationClose?: () => void;
    onIconAwardNotificationClose?: () => void;
  }
) {
  const selectedTitle = getSelectedTitle();
  const selectedIcon = getSelectedUserIcon();
  const currentPlayerName = getUserPlayerName();

  app.innerHTML = `
    <div id="userHomeScreenRoot" class="userHomeScreen">
      <div class="userHomeAmbient" aria-hidden="true"></div>
      <div class="userHomeTopActions">
        <button id="userHomeSoundBtn" class="soundBtn userHomeSoundBtn" type="button" aria-label="音の切り替え">🔊</button>
        <button id="userHomeMenuBtn" class="titleMenuBtn userHomeMenuBtn" type="button" aria-label="メニュー" aria-expanded="false">≡</button>
      </div>

      <div id="userHomeMenuOverlay" class="titleMenuOverlay" aria-hidden="true">
        <div id="userHomeMenuPanel" class="titleMenuPanel" role="menu" aria-label="ホームメニュー">
          <div class="titleMenuPanelHead">
            <div class="titleMenuPanelTitle">MENU</div>
            <button id="userHomeMenuClose" class="titleMenuClose" type="button" aria-label="メニューを閉じる">×</button>
          </div>
          <button id="userHomeBackHomeBtn" class="titleMenuItem" type="button" style="display: none;">ホームに戻る</button>
          <button class="titleMenuItem" type="button" data-home-modal-key="privacy">プライバシーポリシー</button>
          <button class="titleMenuItem" type="button" data-home-modal-key="terms">利用規約</button>
          <button class="titleMenuItem" type="button" data-home-modal-key="credits">クレジット</button>
          <button class="titleMenuItem" type="button" data-home-modal-key="contact">お問い合わせ</button>
          <button id="userHomeBackTitleBtn" class="titleMenuItem" type="button">タイトルへ戻る</button>
        </div>
      </div>

      <main class="userHomeLayout" aria-label="100GAME⁺ ホーム">
        <section class="userHomeProfileCard" aria-label="プレイヤー情報">
          <button id="userHomeCurrentIconBtn" class="userHomeAvatar userHomeAvatarBtn" type="button" aria-label="表示アイコンを変更する">
            <span id="userHomeCurrentIconContent" class="userHomeAvatarImage" aria-hidden="true">${iconDefinitionContentHtml(selectedIcon, 64)}</span>
          </button>
          <div class="userHomeProfileText">
            <div id="userHomeName" class="userHomeName">${escapeHtml(currentPlayerName)}</div>
            <button id="userHomeCurrentTitleBtn" class="userHomeCurrentTitleBtn" type="button" aria-label="表示称号を変更する">
              <span class="userHomeCurrentTitleCaption">現在の称号</span>
              <span id="userHomeCurrentTitleText" class="playerTitleBadge titleRarity${rarityLevel(selectedTitle.rarity)} ${titleNameLengthClass(selectedTitle.name)}">${escapeHtml(selectedTitle.name)}</span>
            </button>
          </div>
        </section>

        <section class="userHomeMainPanel" aria-label="ホームメニュー">
          <div class="userHomeEyebrow">100GAME⁺ HOME</div>
          <h1 class="userHomeTitle">ホーム</h1>
          <p class="userHomeLead">遊ぶ・集める・整える。ここから100GAME⁺を始めよう。</p>

          <button id="userHomePlayBtn" class="userHomePlayBtn" type="button">
            <span class="userHomePlayIcon">▶</span>
            <span class="userHomePlayText">ゲームプレイ</span>
            <span class="userHomePlaySub">プレイ設定画面へ進む</span>
          </button>

          <div class="userHomeSubButtons">
            <button id="userHomeLibraryBtn" class="userHomeSubBtn userHomeLibraryBtn" type="button">
              <span class="userHomeMenuIcon">◆</span>
              <span>図鑑</span>
            </button>
            <button id="userHomeRecordsBtn" class="userHomeSubBtn" type="button">
              <span class="userHomeMenuIcon">📊</span>
              <span>戦績</span>
            </button>
            <button id="userHomeSettingsBtn" class="userHomeSubBtn" type="button">
              <span class="userHomeMenuIcon">⚙</span>
              <span>設定</span>
            </button>
          </div>
        </section>

        <section class="userHomeNoticeCard" aria-label="お知らせ">
          <div class="userHomeNoticeLabel">NOTICE</div>
          <div id="userHomeNoticeTitle" class="userHomeNoticeTitle">お知らせはありません</div>
          <div id="userHomeNoticeDate" class="userHomeNoticeDate"></div>
          <div id="userHomeNoticeText" class="userHomeNoticeText">公開中のお知らせはありません。</div>
          <button id="userHomeNoticeMoreBtn" class="userHomeNoticeMoreBtn" type="button" disabled>さらに見る</button>
        </section>
      </main>

      <section id="userHomeLibraryView" class="userHomeLibraryView" aria-hidden="true" aria-label="図鑑">
        <div class="userHomeLibraryPanel">
          <div class="userHomeLibraryHeader">
            <div>
              <div class="userHomeEyebrow">COLLECTION</div>
              <h1 id="userHomeLibraryHeading" class="userHomeLibraryTitle">図鑑</h1>
            </div>
            <button id="userHomeLibraryBackBtn" class="btn userHomeLibraryBackBtn" type="button">ホームに戻る</button>
          </div>

          <div id="userHomeLibraryMenu" class="userHomeLibraryMenu" aria-label="図鑑一覧">
            <button id="userHomeTitleLibraryOpenBtn" class="userHomeLibraryMenuCard" type="button">
              <span class="userHomeLibraryMenuIcon">◆</span>
              <span class="userHomeLibraryMenuText">
                <span class="userHomeLibraryMenuTitle">称号一覧</span>
                <span class="userHomeLibraryMenuLead">取得済み称号、未確認NEW、称号詳細を確認</span>
              </span>
            </button>
            <button id="userHomeIconLibraryOpenBtn" class="userHomeLibraryMenuCard" type="button">
              <span class="userHomeLibraryMenuIcon">◎</span>
              <span class="userHomeLibraryMenuText">
                <span class="userHomeLibraryMenuTitle">アイコン一覧</span>
                <span class="userHomeLibraryMenuLead">取得済みアイコンと詳細コメントを確認</span>
              </span>
            </button>
            <button id="userHomeLoadingIllustrationLibraryOpenBtn" class="userHomeLibraryMenuCard" type="button">
              <span class="userHomeLibraryMenuIcon">▣</span>
              <span class="userHomeLibraryMenuText">
                <span class="userHomeLibraryMenuTitle">ロードイラスト一覧</span>
                <span class="userHomeLibraryMenuLead">取得済みロードイラストとコメントを確認</span>
              </span>
            </button>
          </div>

          <div id="userHomeTitleLibraryContent" class="userHomeTitleLibraryContent" aria-hidden="true">
            <div class="userHomeTitleControls" aria-label="称号一覧の絞り込みと並び順">
              <label class="userHomeTitleControlLabel">
                <span>表示</span>
                <select id="userHomeTitleFilterSelect" class="userHomeTitleSelectControl">
                  <option value="all">すべて</option>
                  <option value="owned">取得済み</option>
                  <option value="locked">未取得</option>
                  <option value="new">NEW</option>
                  <option value="rarity1">☆1</option>
                  <option value="rarity2">☆2</option>
                  <option value="rarity3">☆3</option>
                  <option value="rarity4">☆4</option>
                  <option value="rarity5">☆5</option>
                </select>
              </label>
              <label class="userHomeTitleControlLabel">
                <span>並び順</span>
                <select id="userHomeTitleSortSelect" class="userHomeTitleSelectControl">
                  <option value="noAsc">No順</option>
                  <option value="acquiredDesc">取得日が新しい順</option>
                  <option value="acquiredAsc">取得日が古い順</option>
                  <option value="rarityDesc">レア度が高い順</option>
                  <option value="rarityAsc">レア度が低い順</option>
                </select>
              </label>
            </div>

            <div class="userHomeLibrarySummary">
              <span id="userHomeTitleOwnedCount"></span>
              <span id="userHomeTitleNewCount"></span>
            </div>

            <div id="userHomeTitleList" class="userHomeTitleList"></div>
          </div>

          <div id="userHomeIconLibraryContent" class="userHomeCollectionLibraryContent" aria-hidden="true">
            <div class="userHomeLibrarySummary">
              <span id="userHomeIconOwnedCount"></span>
            </div>
            <div id="userHomeIconList" class="userHomeIconList"></div>
          </div>

          <div id="userHomeLoadingIllustrationLibraryContent" class="userHomeCollectionLibraryContent" aria-hidden="true">
            <div class="userHomeLibrarySummary">
              <span id="userHomeLoadingIllustrationOwnedCount"></span>
            </div>
            <div id="userHomeLoadingIllustrationList" class="userHomeLoadingIllustrationList"></div>
          </div>
        </div>
      </section>

      <section id="userHomeRecordsView" class="userHomeRecordsView" aria-hidden="true" aria-label="戦績・履歴">
        <div class="userHomeRecordsPanel">
          <div class="userHomeRecordsHeader">
            <div>
              <div class="userHomeEyebrow">RECORDS</div>
              <h1 class="userHomeRecordsTitle">戦績・履歴</h1>
              <p class="userHomeRecordsLead">ソロ・マルチ・総合の戦績と、最近の試合履歴を確認できます。</p>
            </div>
            <button id="userHomeRecordsReloadBtn" class="btn userHomeRecordsReloadBtn" type="button">更新</button>
          </div>

          <div id="userHomeRecordsStatus" class="userHomeRecordsStatus" aria-live="polite">戦績・履歴を読み込み中です。</div>
          <div id="userHomeRecordsContent" class="userHomeRecordsContent" aria-hidden="true"></div>
        </div>
      </section>

      <section id="userHomeSettingsView" class="userHomeSettingsView" aria-hidden="true" aria-label="設定">
        <div class="userHomeSettingsPanel">
          <div class="userHomeSettingsHeader">
            <div>
              <div class="userHomeEyebrow">SETTINGS</div>
              <h1 class="userHomeSettingsTitle">設定</h1>
              <p class="userHomeSettingsLead">プレイヤーネームやサウンドなど、ゲーム全体の設定を変更できます。</p>
            </div>
          </div>

          <div class="userHomeSettingsGrid">
            <section class="userHomeSettingsCard" aria-label="プレイヤーネーム設定">
              <div class="userHomeSettingsCardHead">
                <span class="userHomeSettingsCardIcon">📝</span>
                <span class="userHomeSettingsCardText">
                  <span class="userHomeSettingsCardTitle">プレイヤーネーム</span>
                  <span class="userHomeSettingsCardLead">ゲーム設定画面を開いた時の初期ネームになります。</span>
                </span>
              </div>

              <label class="userHomeSettingField">
                <span class="userHomeSettingLabel">プレイヤーネーム</span>
                <span class="userHomeSettingNameRow">
                  <input id="userHomeSettingNameInput" class="input userHomeSettingNameInput" value="${escapeHtml(currentPlayerName)}" maxlength="${MAX_PLAYER_NAME_LENGTH}" />
                  <button id="userHomeSettingNameSaveBtn" class="btn userHomeSettingNameSaveBtn" type="button">変更</button>
                </span>
              </label>
              <div class="userHomeSettingNameMeta">
                <span id="userHomeSettingNameError" class="userHomeSettingError" aria-live="polite"></span>
                <span id="userHomeSettingNameCount" class="userHomeSettingNameCount">0/${MAX_PLAYER_NAME_LENGTH}</span>
              </div>

              <div id="userHomeSettingPreviousNameWrap" class="userHomeSettingPreviousNameWrap" style="display:none;">
                <button id="userHomeSettingRestoreNameBtn" class="btn userHomeSettingRestoreNameBtn" type="button">前回のユーザーネームに戻す</button>
                <div id="userHomeSettingPreviousNameText" class="userHomeSettingPreviousNameText"></div>
              </div>
            </section>

            <section class="userHomeSettingsCard" aria-label="サウンド設定">
              <div class="userHomeSettingsCardHead">
                <span class="userHomeSettingsCardIcon">♪</span>
                <span class="userHomeSettingsCardText">
                  <span class="userHomeSettingsCardTitle">サウンド</span>
                  <span class="userHomeSettingsCardLead">音がONの時の効果音音量を1〜5で設定します。</span>
                </span>
              </div>

              <div class="userHomeSoundLevelRow" role="group" aria-label="サウンド音量">
                ${[1, 2, 3, 4, 5].map((level) => `
                  <button class="userHomeSoundLevelBtn" type="button" data-sound-volume-level="${level}">${level}</button>
                `).join("")}
              </div>
              <div id="userHomeSoundLevelText" class="userHomeSoundLevelText"></div>
              <div class="userHomeSettingNote">OFFにしたい場合は、各画面右上の音ON/OFFボタンを使います。</div>
            </section>

            <section class="userHomeSettingsCard" aria-label="アカウント設定">
              <div class="userHomeSettingsCardHead">
                <span class="userHomeSettingsCardIcon">🔐</span>
                <span class="userHomeSettingsCardText">
                  <span class="userHomeSettingsCardTitle">アカウント</span>
                  <span class="userHomeSettingsCardLead">正式実装時にユーザーID確認やパスワード変更を行います。</span>
                </span>
              </div>

              <div class="userHomeAccountActionList">
                <button class="userHomeAccountActionBtn" type="button">ユーザーID確認</button>
                <button class="userHomeAccountActionBtn" type="button">パスワード変更</button>
              </div>
            </section>
          </div>
        </div>
      </section>

      <div id="userHomeInfoModal" class="titleInfoModal" aria-hidden="true">
        <div id="userHomeInfoDialog" class="titleInfoDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeInfoHeading">
          <div class="titleInfoHeader">
            <div id="userHomeInfoHeading" class="titleInfoHeading"></div>
          </div>
          <div id="userHomeInfoBody" class="titleInfoBody"></div>
          <div id="userHomeInfoAction" class="titleInfoAction" style="display:none;">
            <button id="userHomeInfoActionBtn" class="btn titleInfoActionBtn" type="button"></button>
            <div id="userHomeInfoActionNote" class="titleInfoActionNote"></div>
          </div>
          <div class="titleInfoFooter">
            <button id="userHomeInfoClose" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>

      <div id="userHomeAnnouncementModal" class="noticeModalOverlay userHomeAnnouncementModal" aria-hidden="true">
        <div id="userHomeAnnouncementDialog" class="noticeModalDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeAnnouncementHeading">
          <div class="noticeModalHeader">
            <div id="userHomeAnnouncementHeading" class="noticeModalHeading">お知らせ一覧</div>
          </div>
          <div id="userHomeAnnouncementBody" class="noticeModalBody userHomeAnnouncementBody"></div>
          <div class="noticeModalFooter userHomeAnnouncementFooter">
            <button id="userHomeAnnouncementBackBtn" class="btn userHomeAnnouncementBackBtn" type="button">一覧に戻る</button>
            <button id="userHomeAnnouncementCloseBtn" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>

      <div id="userHomeTitleAwardModal" class="noticeModalOverlay userHomeTitleAwardModal" aria-hidden="true">
        <div id="userHomeTitleAwardDialog" class="noticeModalDialog userHomeTitleAwardDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeTitleAwardHeading">
          <div class="noticeModalHeader">
            <div id="userHomeTitleAwardHeading" class="noticeModalHeading">称号を獲得しました！</div>
          </div>
          <div id="userHomeTitleAwardBody" class="noticeModalBody userHomeTitleAwardBody"></div>
          <div class="noticeModalFooter userHomeTitleAwardFooter">
            <button id="userHomeTitleAwardCloseBtn" class="btn" type="button">OK</button>
          </div>
        </div>
      </div>

      <div id="userHomeIconAwardModal" class="noticeModalOverlay userHomeTitleAwardModal userHomeIconAwardModal" aria-hidden="true">
        <div id="userHomeIconAwardDialog" class="noticeModalDialog userHomeTitleAwardDialog userHomeIconAwardDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeIconAwardHeading">
          <div class="noticeModalHeader">
            <div id="userHomeIconAwardHeading" class="noticeModalHeading">アイコンを獲得しました！</div>
          </div>
          <div id="userHomeIconAwardBody" class="noticeModalBody userHomeTitleAwardBody userHomeIconAwardBody"></div>
          <div class="noticeModalFooter userHomeTitleAwardFooter userHomeIconAwardFooter">
            <button id="userHomeIconAwardCloseBtn" class="btn" type="button">OK</button>
          </div>
        </div>
      </div>

      <div id="userHomeTitleDetailModal" class="noticeModalOverlay userHomeTitleDetailModal" aria-hidden="true">
        <div id="userHomeTitleDetailDialog" class="titleDetailDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeTitleDetailName">
          <div id="userHomeTitleDetailBody" class="titleDetailBody"></div>
        </div>
      </div>

      <div id="userHomeLoadingIllustrationPreviewModal" class="loadingIllustrationPreviewModal" aria-hidden="true">
        <button id="userHomeLoadingIllustrationPreviewCloseBtn" class="loadingIllustrationPreviewCloseBtn" type="button" aria-label="拡大表示を閉じる">×</button>
        <img id="userHomeLoadingIllustrationPreviewImage" class="loadingIllustrationPreviewImage" src="" alt="" />
      </div>

      <div id="userHomeTitleSelectModal" class="noticeModalOverlay userHomeTitleSelectModal" aria-hidden="true">
        <div id="userHomeTitleSelectDialog" class="noticeModalDialog userHomeTitleSelectDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeTitleSelectHeading">
          <div class="noticeModalHeader">
            <div id="userHomeTitleSelectHeading" class="noticeModalHeading">称号を変更</div>
          </div>
          <div id="userHomeTitleSelectBody" class="noticeModalBody userHomeTitleSelectBody"></div>
          <div class="noticeModalFooter userHomeTitleSelectFooter">
            <button id="userHomeTitleSelectCloseBtn" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>

      <div id="userHomeIconSelectModal" class="noticeModalOverlay userHomeIconSelectModal" aria-hidden="true">
        <div id="userHomeIconSelectDialog" class="noticeModalDialog userHomeIconSelectDialog" role="dialog" aria-modal="true" aria-labelledby="userHomeIconSelectHeading">
          <div class="noticeModalHeader">
            <div id="userHomeIconSelectHeading" class="noticeModalHeading">アイコンを変更</div>
          </div>
          <div id="userHomeIconSelectBody" class="noticeModalBody userHomeIconSelectBody"></div>
          <div class="noticeModalFooter userHomeIconSelectFooter">
            <button id="userHomeIconSelectCloseBtn" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const root = app.querySelector<HTMLDivElement>("#userHomeScreenRoot");
  const playBtn = app.querySelector<HTMLButtonElement>("#userHomePlayBtn");
  const libraryBtn = app.querySelector<HTMLButtonElement>("#userHomeLibraryBtn");
  const recordsBtn = app.querySelector<HTMLButtonElement>("#userHomeRecordsBtn");
  const settingsBtn = app.querySelector<HTMLButtonElement>("#userHomeSettingsBtn");
  const userHomeName = app.querySelector<HTMLDivElement>("#userHomeName");
  const currentIconBtn = app.querySelector<HTMLButtonElement>("#userHomeCurrentIconBtn");
  const currentIconContent = app.querySelector<HTMLSpanElement>("#userHomeCurrentIconContent");
  const currentTitleBtn = app.querySelector<HTMLButtonElement>("#userHomeCurrentTitleBtn");
  const currentTitleText = app.querySelector<HTMLSpanElement>("#userHomeCurrentTitleText");
  const soundBtn = app.querySelector<HTMLButtonElement>("#userHomeSoundBtn");
  const menuBtn = app.querySelector<HTMLButtonElement>("#userHomeMenuBtn");
  const menuOverlay = app.querySelector<HTMLDivElement>("#userHomeMenuOverlay");
  const menuPanel = app.querySelector<HTMLDivElement>("#userHomeMenuPanel");
  const menuClose = app.querySelector<HTMLButtonElement>("#userHomeMenuClose");
  const backHomeBtn = app.querySelector<HTMLButtonElement>("#userHomeBackHomeBtn");
  const backTitleBtn = app.querySelector<HTMLButtonElement>("#userHomeBackTitleBtn");
  const modal = app.querySelector<HTMLDivElement>("#userHomeInfoModal");
  const modalDialog = app.querySelector<HTMLDivElement>("#userHomeInfoDialog");
  const modalHeading = app.querySelector<HTMLDivElement>("#userHomeInfoHeading");
  const modalBody = app.querySelector<HTMLDivElement>("#userHomeInfoBody");
  const modalAction = app.querySelector<HTMLDivElement>("#userHomeInfoAction");
  const modalActionBtn = app.querySelector<HTMLButtonElement>("#userHomeInfoActionBtn");
  const modalActionNote = app.querySelector<HTMLDivElement>("#userHomeInfoActionNote");
  const modalClose = app.querySelector<HTMLButtonElement>("#userHomeInfoClose");
  const noticeTitle = app.querySelector<HTMLDivElement>("#userHomeNoticeTitle");
  const noticeDate = app.querySelector<HTMLDivElement>("#userHomeNoticeDate");
  const noticeText = app.querySelector<HTMLDivElement>("#userHomeNoticeText");
  const noticeMoreBtn = app.querySelector<HTMLButtonElement>("#userHomeNoticeMoreBtn");
  const announcementModal = app.querySelector<HTMLDivElement>("#userHomeAnnouncementModal");
  const announcementDialog = app.querySelector<HTMLDivElement>("#userHomeAnnouncementDialog");
  const announcementHeading = app.querySelector<HTMLDivElement>("#userHomeAnnouncementHeading");
  const announcementBody = app.querySelector<HTMLDivElement>("#userHomeAnnouncementBody");
  const announcementBackBtn = app.querySelector<HTMLButtonElement>("#userHomeAnnouncementBackBtn");
  const announcementCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeAnnouncementCloseBtn");
  const titleAwardModal = app.querySelector<HTMLDivElement>("#userHomeTitleAwardModal");
  const titleAwardDialog = app.querySelector<HTMLDivElement>("#userHomeTitleAwardDialog");
  const titleAwardBody = app.querySelector<HTMLDivElement>("#userHomeTitleAwardBody");
  const titleAwardCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeTitleAwardCloseBtn");
  const iconAwardModal = app.querySelector<HTMLDivElement>("#userHomeIconAwardModal");
  const iconAwardDialog = app.querySelector<HTMLDivElement>("#userHomeIconAwardDialog");
  const iconAwardBody = app.querySelector<HTMLDivElement>("#userHomeIconAwardBody");
  const iconAwardCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeIconAwardCloseBtn");
  const libraryView = app.querySelector<HTMLElement>("#userHomeLibraryView");
  const libraryHeading = app.querySelector<HTMLHeadingElement>("#userHomeLibraryHeading");
  const libraryBackBtn = app.querySelector<HTMLButtonElement>("#userHomeLibraryBackBtn");
  const libraryMenu = app.querySelector<HTMLDivElement>("#userHomeLibraryMenu");
  const titleLibraryOpenBtn = app.querySelector<HTMLButtonElement>("#userHomeTitleLibraryOpenBtn");
  const iconLibraryOpenBtn = app.querySelector<HTMLButtonElement>("#userHomeIconLibraryOpenBtn");
  const loadingIllustrationLibraryOpenBtn = app.querySelector<HTMLButtonElement>("#userHomeLoadingIllustrationLibraryOpenBtn");
  const titleLibraryContent = app.querySelector<HTMLDivElement>("#userHomeTitleLibraryContent");
  const iconLibraryContent = app.querySelector<HTMLDivElement>("#userHomeIconLibraryContent");
  const loadingIllustrationLibraryContent = app.querySelector<HTMLDivElement>("#userHomeLoadingIllustrationLibraryContent");
  const titleFilterSelect = app.querySelector<HTMLSelectElement>("#userHomeTitleFilterSelect");
  const titleSortSelect = app.querySelector<HTMLSelectElement>("#userHomeTitleSortSelect");
  const titleList = app.querySelector<HTMLDivElement>("#userHomeTitleList");
  const titleOwnedCount = app.querySelector<HTMLSpanElement>("#userHomeTitleOwnedCount");
  const titleNewCount = app.querySelector<HTMLSpanElement>("#userHomeTitleNewCount");
  const iconList = app.querySelector<HTMLDivElement>("#userHomeIconList");
  const iconOwnedCount = app.querySelector<HTMLSpanElement>("#userHomeIconOwnedCount");
  const loadingIllustrationList = app.querySelector<HTMLDivElement>("#userHomeLoadingIllustrationList");
  const loadingIllustrationOwnedCount = app.querySelector<HTMLSpanElement>("#userHomeLoadingIllustrationOwnedCount");
  const settingsView = app.querySelector<HTMLElement>("#userHomeSettingsView");
  const recordsView = app.querySelector<HTMLElement>("#userHomeRecordsView");
  const recordsReloadBtn = app.querySelector<HTMLButtonElement>("#userHomeRecordsReloadBtn");
  const recordsStatus = app.querySelector<HTMLDivElement>("#userHomeRecordsStatus");
  const recordsContent = app.querySelector<HTMLDivElement>("#userHomeRecordsContent");
  const settingNameInput = app.querySelector<HTMLInputElement>("#userHomeSettingNameInput");
  const settingNameSaveBtn = app.querySelector<HTMLButtonElement>("#userHomeSettingNameSaveBtn");
  const settingNameError = app.querySelector<HTMLSpanElement>("#userHomeSettingNameError");
  const settingNameCount = app.querySelector<HTMLSpanElement>("#userHomeSettingNameCount");
  const settingPreviousNameWrap = app.querySelector<HTMLDivElement>("#userHomeSettingPreviousNameWrap");
  const settingRestoreNameBtn = app.querySelector<HTMLButtonElement>("#userHomeSettingRestoreNameBtn");
  const settingPreviousNameText = app.querySelector<HTMLDivElement>("#userHomeSettingPreviousNameText");
  const soundLevelText = app.querySelector<HTMLDivElement>("#userHomeSoundLevelText");
  const soundLevelButtons = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-sound-volume-level]"));
  const titleDetailModal = app.querySelector<HTMLDivElement>("#userHomeTitleDetailModal");
  const titleDetailDialog = app.querySelector<HTMLDivElement>("#userHomeTitleDetailDialog");
  const titleDetailBody = app.querySelector<HTMLDivElement>("#userHomeTitleDetailBody");
  const loadingIllustrationPreviewModal = app.querySelector<HTMLDivElement>("#userHomeLoadingIllustrationPreviewModal");
  const loadingIllustrationPreviewImage = app.querySelector<HTMLImageElement>("#userHomeLoadingIllustrationPreviewImage");
  const loadingIllustrationPreviewCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeLoadingIllustrationPreviewCloseBtn");
  const titleSelectModal = app.querySelector<HTMLDivElement>("#userHomeTitleSelectModal");
  const titleSelectDialog = app.querySelector<HTMLDivElement>("#userHomeTitleSelectDialog");
  const titleSelectBody = app.querySelector<HTMLDivElement>("#userHomeTitleSelectBody");
  const titleSelectCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeTitleSelectCloseBtn");
  const iconSelectModal = app.querySelector<HTMLDivElement>("#userHomeIconSelectModal");
  const iconSelectDialog = app.querySelector<HTMLDivElement>("#userHomeIconSelectDialog");
  const iconSelectBody = app.querySelector<HTMLDivElement>("#userHomeIconSelectBody");
  const iconSelectCloseBtn = app.querySelector<HTMLButtonElement>("#userHomeIconSelectCloseBtn");
  const menuItems = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-home-modal-key]"));

  if (
    !root ||
    !playBtn ||
    !libraryBtn ||
    !recordsBtn ||
    !settingsBtn ||
    !userHomeName ||
    !currentIconBtn ||
    !currentIconContent ||
    !currentTitleBtn ||
    !currentTitleText ||
    !soundBtn ||
    !menuBtn ||
    !menuOverlay ||
    !menuPanel ||
    !menuClose ||
    !backHomeBtn ||
    !backTitleBtn ||
    !modal ||
    !modalDialog ||
    !modalHeading ||
    !modalBody ||
    !modalAction ||
    !modalActionBtn ||
    !modalActionNote ||
    !modalClose ||
    !noticeTitle ||
    !noticeDate ||
    !noticeText ||
    !noticeMoreBtn ||
    !announcementModal ||
    !announcementDialog ||
    !announcementHeading ||
    !announcementBody ||
    !announcementBackBtn ||
    !announcementCloseBtn ||
    !titleAwardModal ||
    !titleAwardDialog ||
    !titleAwardBody ||
    !titleAwardCloseBtn ||
    !iconAwardModal ||
    !iconAwardDialog ||
    !iconAwardBody ||
    !iconAwardCloseBtn ||
    !libraryView ||
    !libraryHeading ||
    !libraryBackBtn ||
    !libraryMenu ||
    !titleLibraryOpenBtn ||
    !iconLibraryOpenBtn ||
    !loadingIllustrationLibraryOpenBtn ||
    !titleLibraryContent ||
    !iconLibraryContent ||
    !loadingIllustrationLibraryContent ||
    !titleFilterSelect ||
    !titleSortSelect ||
    !titleList ||
    !titleOwnedCount ||
    !titleNewCount ||
    !iconList ||
    !iconOwnedCount ||
    !loadingIllustrationList ||
    !loadingIllustrationOwnedCount ||
    !settingsView ||
    !recordsView ||
    !recordsReloadBtn ||
    !recordsStatus ||
    !recordsContent ||
    !settingNameInput ||
    !settingNameSaveBtn ||
    !settingNameError ||
    !settingNameCount ||
    !settingPreviousNameWrap ||
    !settingRestoreNameBtn ||
    !settingPreviousNameText ||
    !soundLevelText ||
    soundLevelButtons.length !== 5 ||
    !titleDetailModal ||
    !titleDetailDialog ||
    !titleDetailBody ||
    !loadingIllustrationPreviewModal ||
    !loadingIllustrationPreviewImage ||
    !loadingIllustrationPreviewCloseBtn ||
    !titleSelectModal ||
    !titleSelectDialog ||
    !titleSelectBody ||
    !titleSelectCloseBtn ||
    !iconSelectModal ||
    !iconSelectDialog ||
    !iconSelectBody ||
    !iconSelectCloseBtn
  ) {
    throw new Error("user home elements not found");
  }

  const updateSoundButton = () => {
    soundBtn.textContent = isSoundEnabled() ? "🔊" : "🔇";
  };

  const updateCurrentTitleView = () => {
    const title = getSelectedTitle();
    currentTitleText.textContent = title.name;
    currentTitleText.className = `playerTitleBadge titleRarity${rarityLevel(title.rarity)} ${titleNameLengthClass(title.name)}`;
  };

  const updateCurrentIconView = () => {
    const icon = getSelectedUserIcon();
    currentIconContent.innerHTML = iconDefinitionContentHtml(icon, 64);
    currentIconBtn.setAttribute("aria-label", `表示アイコンを変更する：${icon.name}`);
  };

  const setSettingNameMessage = (message: string | null) => {
    settingNameError.textContent = message ?? "";
  };

  const clearSettingNameMessage = () => {
    setSettingNameMessage(null);
  };

  const refreshSettingNameView = (resetInput = true) => {
    const currentName = getUserPlayerName();
    const previousName = getPreviousUserPlayerName();

    userHomeName.textContent = currentName;
    if (resetInput) settingNameInput.value = currentName;

    const length = countPlayerNameChars(settingNameInput.value);
    settingNameCount.textContent = `${length}/${MAX_PLAYER_NAME_LENGTH}`;
    settingNameCount.classList.toggle("is-over", length > MAX_PLAYER_NAME_LENGTH);

    const shouldShowPrevious = hasChangedUserPlayerName() && !!previousName;
    settingPreviousNameWrap.style.display = shouldShowPrevious ? "grid" : "none";
    settingPreviousNameText.textContent = shouldShowPrevious ? `前回：${previousName}` : "";
  };

  const refreshSoundVolumeView = () => {
    const currentLevel = getSoundVolumeLevel();
    soundLevelText.textContent = `現在の音量：${currentLevel}`;
    for (const button of soundLevelButtons) {
      const level = Number(button.dataset.soundVolumeLevel);
      button.classList.toggle("is-selected", level === currentLevel);
      button.setAttribute("aria-pressed", level === currentLevel ? "true" : "false");
    }
  };

  const saveSettingName = async () => {
    const validation = validatePlayerName(settingNameInput.value);
    if (validation === "empty") {
      setSettingNameMessage("プレイヤーネームを入力してください");
      return;
    }
    if (validation === "tooLong") {
      setSettingNameMessage(`プレイヤーネームは${MAX_PLAYER_NAME_LENGTH}文字以内で入力してください`);
      return;
    }
    if (validation === "ng") {
      setSettingNameMessage("このプレイヤーネームは使用できません");
      return;
    }

    const nextName = settingNameInput.value.trim();
    const currentName = getUserPlayerName();
    if (nextName === currentName) {
      setSettingNameMessage("現在のプレイヤーネームと同じです");
      refreshSettingNameView(false);
      return;
    }

    try {
      await updateUserSettingsOnApi({ displayName: nextName });
      setSettingNameMessage("プレイヤーネームを変更しました");
      refreshSettingNameView(true);
    } catch {
      setSettingNameMessage("プレイヤーネームの保存に失敗しました。時間をおいて再度お試しください");
    }
  };

  const restoreSettingName = async () => {
    const previousName = getPreviousUserPlayerName();
    if (!previousName) return;

    try {
      await updateUserSettingsOnApi({ displayName: previousName });
      setSettingNameMessage("前回のプレイヤーネームに戻しました");
      refreshSettingNameView(true);
    } catch {
      setSettingNameMessage("プレイヤーネームの保存に失敗しました。時間をおいて再度お試しください");
    }
  };

  updateSoundButton();
  updateCurrentTitleView();
  updateCurrentIconView();

  const setMenuOpen = (open: boolean) => {
    menuOverlay.classList.toggle("is-open", open);
    menuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");

    if (!open) return;

    const isMobileMenu = window.matchMedia?.("(orientation: portrait) and (max-width: 820px)")?.matches ?? false;
    if (isMobileMenu) {
      menuPanel.style.top = "";
      menuPanel.style.left = "";
      menuPanel.style.right = "";
      return;
    }

    const rect = menuBtn.getBoundingClientRect();
    const panelWidth = menuPanel.offsetWidth;
    menuPanel.style.top = `${Math.max(12, rect.top)}px`;
    menuPanel.style.left = `${Math.max(12, rect.right - panelWidth)}px`;
    menuPanel.style.right = "auto";
  };

  const closeMenu = () => setMenuOpen(false);

  const setModalOpen = (open: boolean) => {
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const openModal = (key: HomeModalKey) => {
    const content = HOME_MODAL_CONTENT[key];
    modalHeading.textContent = content.title;
    modalBody.innerHTML = content.bodyHtml;

    if (content.actionLabel) {
      modalAction.style.display = "grid";
      modalActionBtn.textContent = content.actionLabel;
      modalActionNote.textContent = content.actionNote ?? "";
      modalActionNote.style.display = content.actionNote ? "block" : "none";
    } else {
      modalAction.style.display = "none";
      modalActionBtn.textContent = "";
      modalActionNote.textContent = "";
      modalActionNote.style.display = "none";
    }

    setModalOpen(true);
  };

  const setAnnouncementOpen = (open: boolean) => {
    announcementModal.classList.toggle("is-open", open);
    announcementModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setTitleAwardOpen = (open: boolean) => {
    titleAwardModal.classList.toggle("is-open", open);
    titleAwardModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setIconAwardOpen = (open: boolean) => {
    iconAwardModal.classList.toggle("is-open", open);
    iconAwardModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  let activeSubView: UserHomeSubView = "home";
  let libraryPage: LibraryPage = "index";
  let titleLibraryFilter: TitleLibraryFilter = "all";
  let titleLibrarySort: TitleLibrarySort = "noAsc";
  let recordsSnapshot: UserRecordsSnapshot | null = null;
  let recordsLoading = false;
  let recordsLoadedOnce = false;

  const renderRecordMetric = (label: string, value: string, note = "") => `
    <div class="userHomeRecordMetric">
      <span class="userHomeRecordMetricLabel">${escapeHtml(label)}</span>
      <span class="userHomeRecordMetricValue">${escapeHtml(value)}</span>
      ${note ? `<span class="userHomeRecordMetricNote">${escapeHtml(note)}</span>` : ""}
    </div>
  `;

  const renderRecordStatsPanel = (title: string, stats: UserRecordModeStats, showStreaks = true) => `
    <section class="userHomeRecordStatsCard" aria-label="${escapeHtml(title)}">
      <h2 class="userHomeRecordSectionTitle">${escapeHtml(title)}</h2>
      <div class="userHomeRecordMetricGrid">
        ${renderRecordMetric("試合数", formatRecordNumber(stats.matchCount))}
        ${renderRecordMetric("勝利", formatRecordNumber(stats.winCount))}
        ${renderRecordMetric("敗北", formatRecordNumber(stats.loseCount))}
        ${renderRecordMetric("勝率", formatWinRate(stats))}
        ${showStreaks ? renderRecordMetric("現在連勝", `${formatRecordNumber(stats.currentWinStreak)}連勝`) : ""}
        ${showStreaks ? renderRecordMetric("最大連勝", `${formatRecordNumber(stats.maxWinStreak)}連勝`) : ""}
      </div>
    </section>
  `;

  const renderRecordsSnapshot = (snapshot: UserRecordsSnapshot) => {
    const recentMatches = snapshot.recentMatches;

    recordsContent.innerHTML = `
      <div class="userHomeRecordStatsGrid">
        ${renderRecordStatsPanel("総合戦績", snapshot.stats.total, false)}
        ${renderRecordStatsPanel("ソロ戦績", snapshot.stats.solo)}
        ${renderRecordStatsPanel("マルチ戦績", snapshot.stats.multi)}
      </div>

      <section class="userHomeRecordHistoryCard" aria-label="最近の試合履歴">
        <div class="userHomeRecordHistoryHead">
          <h2 class="userHomeRecordSectionTitle">最近の試合履歴</h2>
          <span class="userHomeRecordHistoryCount">最新${formatRecordNumber(recentMatches.length)}件</span>
        </div>
        ${recentMatches.length === 0 ? `
          <div class="userHomeRecordEmpty">保存済みの試合履歴はまだありません。</div>
        ` : `
          <div class="userHomeRecordMatchList">
            ${recentMatches.map((match) => renderRecordMatch(match)).join("")}
          </div>
        `}
      </section>
    `;
  };

  const renderRecordMatch = (match: UserRecordMatch) => {
    const resultClass = match.self.isLoser ? "is-lose" : match.self.isWinner ? "is-win" : "is-end";
    const participants = match.participants.map((participant) => `
      <span class="userHomeRecordParticipant ${participant.isWinner ? "is-win" : ""} ${participant.isLoser ? "is-lose" : ""}">
        ${participant.isHost ? "HOST " : ""}${escapeHtml(participant.displayNameSnapshot)}
      </span>
    `).join("");

    return `
      <article class="userHomeRecordMatchItem ${resultClass}">
        <div class="userHomeRecordMatchTop">
          <span class="userHomeRecordMatchResult">${escapeHtml(formatRecordResult(match))}</span>
          <span class="userHomeRecordMatchMode">${escapeHtml(formatRecordMode(match.mode))}</span>
          <span class="userHomeRecordMatchDate">${escapeHtml(formatRecordDate(match.endedAt))}</span>
        </div>
        <div class="userHomeRecordMatchMain">
          <span>難易度 ${escapeHtml(formatRecordDifficulty(match.difficulty))}</span>
          <span>タイプ ${escapeHtml(match.gameType)}</span>
          <span>終了方向 ${escapeHtml(match.finalDirection)}</span>
          <span>最終合計 ${formatRecordNumber(match.finalTotal)}</span>
          <span>理由 ${escapeHtml(formatRecordReason(match.resultReason))}</span>
        </div>
        ${participants ? `<div class="userHomeRecordParticipantList">${participants}</div>` : ""}
      </article>
    `;
  };

  const renderRecords = () => {
    if (recordsLoading) {
      recordsStatus.textContent = "戦績・履歴を読み込み中です。";
      recordsStatus.style.display = "";
      recordsContent.setAttribute("aria-hidden", "true");
      recordsContent.innerHTML = "";
      return;
    }

    if (!recordsSnapshot) {
      recordsStatus.textContent = recordsLoadedOnce ? "戦績・履歴を取得できませんでした。" : "戦績・履歴を読み込みます。";
      recordsStatus.style.display = "";
      recordsContent.setAttribute("aria-hidden", "true");
      recordsContent.innerHTML = "";
      return;
    }

    recordsStatus.style.display = "none";
    recordsContent.setAttribute("aria-hidden", "false");
    renderRecordsSnapshot(recordsSnapshot);
  };

  const loadRecords = async (force = false) => {
    if (recordsLoading) return;
    if (recordsSnapshot && !force) {
      renderRecords();
      return;
    }

    recordsLoading = true;
    renderRecords();

    try {
      recordsSnapshot = await loadUserRecordsFromApi();
    } catch {
      recordsSnapshot = null;
    } finally {
      recordsLoading = false;
      recordsLoadedOnce = true;
      renderRecords();
    }
  };

  const setLibraryPage = (page: LibraryPage) => {
    libraryPage = page;
    const isIndex = page === "index";
    const isTitles = page === "titles";
    const isIcons = page === "icons";
    const isLoadingIllustrations = page === "loadingIllustrations";

    libraryView.classList.toggle("is-title-list", isTitles);
    libraryView.classList.toggle("is-icon-list", isIcons);
    libraryView.classList.toggle("is-loading-illustration-list", isLoadingIllustrations);
    libraryMenu.setAttribute("aria-hidden", isIndex ? "false" : "true");
    titleLibraryContent.setAttribute("aria-hidden", isTitles ? "false" : "true");
    iconLibraryContent.setAttribute("aria-hidden", isIcons ? "false" : "true");
    loadingIllustrationLibraryContent.setAttribute("aria-hidden", isLoadingIllustrations ? "false" : "true");

    if (isTitles) {
      libraryHeading.textContent = "称号一覧";
    } else if (isIcons) {
      libraryHeading.textContent = "アイコン一覧";
    } else if (isLoadingIllustrations) {
      libraryHeading.textContent = "ロードイラスト一覧";
    } else {
      libraryHeading.textContent = "図鑑";
    }

    libraryBackBtn.textContent = "図鑑一覧に戻る";
    libraryBackBtn.style.display = isIndex ? "none" : "";

    if (isTitles) renderTitleLibraryList();
    if (isIcons) renderIconLibraryList();
    if (isLoadingIllustrations) renderLoadingIllustrationLibraryList();
  };

  const updateSubViewMenu = () => {
    const shouldShowBackHome = activeSubView !== "home";
    backHomeBtn.style.display = shouldShowBackHome ? "" : "none";
    backHomeBtn.setAttribute("aria-hidden", shouldShowBackHome ? "false" : "true");
  };

  const setLibraryOpen = (open: boolean) => {
    if (open) {
      activeSubView = "library";
      root.classList.add("is-library-open");
      root.classList.remove("is-settings-open");
      root.classList.remove("is-records-open");
      libraryView.setAttribute("aria-hidden", "false");
      settingsView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      clearSettingNameMessage();
      refreshSettingNameView(true);
      setLibraryPage("index");
    } else if (activeSubView === "library") {
      activeSubView = "home";
      root.classList.remove("is-library-open");
      libraryView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      setLibraryPage("index");
    } else {
      root.classList.remove("is-library-open");
      libraryView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
    }

    updateSubViewMenu();
  };

  const setSettingsOpen = (open: boolean) => {
    if (open) {
      activeSubView = "settings";
      root.classList.add("is-settings-open");
      root.classList.remove("is-library-open");
      root.classList.remove("is-records-open");
      settingsView.setAttribute("aria-hidden", "false");
      libraryView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      setLibraryPage("index");
      clearSettingNameMessage();
      refreshSettingNameView(true);
      refreshSoundVolumeView();
    } else if (activeSubView === "settings") {
      activeSubView = "home";
      root.classList.remove("is-settings-open");
      settingsView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      clearSettingNameMessage();
      refreshSettingNameView(true);
    } else {
      root.classList.remove("is-settings-open");
      settingsView.setAttribute("aria-hidden", "true");
      recordsView.setAttribute("aria-hidden", "true");
      clearSettingNameMessage();
      refreshSettingNameView(true);
    }

    updateSubViewMenu();
  };

  const setRecordsOpen = (open: boolean) => {
    if (open) {
      activeSubView = "records";
      root.classList.add("is-records-open");
      root.classList.remove("is-library-open");
      root.classList.remove("is-settings-open");
      recordsView.setAttribute("aria-hidden", "false");
      libraryView.setAttribute("aria-hidden", "true");
      settingsView.setAttribute("aria-hidden", "true");
      setLibraryPage("index");
      clearSettingNameMessage();
      refreshSettingNameView(true);
      void loadRecords(false);
    } else if (activeSubView === "records") {
      activeSubView = "home";
      root.classList.remove("is-records-open");
      recordsView.setAttribute("aria-hidden", "true");
    } else {
      root.classList.remove("is-records-open");
      recordsView.setAttribute("aria-hidden", "true");
    }

    updateSubViewMenu();
  };

  const setTitleDetailOpen = (open: boolean) => {
    titleDetailModal.classList.toggle("is-open", open);
    titleDetailModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setLoadingIllustrationPreviewOpen = (open: boolean, illustration?: LoadingIllustrationDefinition) => {
    if (open && illustration) {
      loadingIllustrationPreviewImage.src = illustration.src;
      loadingIllustrationPreviewImage.alt = illustration.name;
    } else {
      loadingIllustrationPreviewImage.src = "";
      loadingIllustrationPreviewImage.alt = "";
    }

    loadingIllustrationPreviewModal.classList.toggle("is-open", open);
    loadingIllustrationPreviewModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const setTitleSelectOpen = (open: boolean) => {
    titleSelectModal.classList.toggle("is-open", open);
    titleSelectModal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) renderTitleSelectList();
  };

  const setIconSelectOpen = (open: boolean) => {
    iconSelectModal.classList.toggle("is-open", open);
    iconSelectModal.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) renderIconSelectList();
  };

  const applySelectedTitle = (titleId: string) => {
    const title = findTitle(titleId);
    if (!title?.owned) return;

    setSelectedTitleId(titleId);
    void updateUserSettingsOnApi({ currentTitleId: titleId }).catch(() => { });
    updateCurrentTitleView();
    renderTitleLibraryList();
    renderTitleSelectList();
  };

  const applySelectedIcon = (iconId: string) => {
    const icon = findIcon(iconId);
    if (!icon?.owned) return;

    setUserIconId(icon.id);
    void updateUserSettingsOnApi({ currentIconId: icon.id }).catch(() => { });
    updateCurrentIconView();
    renderIconSelectList();
  };

  const shouldShowLockedTitlePlaceholder = () => {
    switch (titleLibraryFilter) {
      case "owned":
      case "new":
      case "rarity1":
      case "rarity2":
      case "rarity3":
      case "rarity4":
      case "rarity5":
        return false;
      case "locked":
      case "all":
      default:
        return true;
    }
  };

  const filterTitleDefinitions = (checkedIds: Set<string>): TitleLibraryItem[] => {
    const filtered = USER_TITLE_DEFINITIONS.filter((title) => title.owned).filter((title) => {
      const level = rarityLevel(title.rarity);
      const isNew = !checkedIds.has(title.id);

      switch (titleLibraryFilter) {
        case "owned":
        case "all":
          return true;
        case "locked":
          return false;
        case "new":
          return isNew;
        case "rarity1":
        case "rarity2":
        case "rarity3":
        case "rarity4":
        case "rarity5":
          return level === Number(titleLibraryFilter.replace("rarity", ""));
        default:
          return true;
      }
    });

    const sorted = filtered.sort((a, b) => {
      switch (titleLibrarySort) {
        case "acquiredDesc": {
          const diff = acquiredTime(b) - acquiredTime(a);
          return diff || titleNo(a.id) - titleNo(b.id);
        }
        case "acquiredAsc": {
          const aTime = acquiredTime(a);
          const bTime = acquiredTime(b);
          if (aTime < 0 && bTime < 0) return titleNo(a.id) - titleNo(b.id);
          if (aTime < 0) return 1;
          if (bTime < 0) return -1;
          return aTime - bTime || titleNo(a.id) - titleNo(b.id);
        }
        case "rarityDesc": {
          const diff = rarityLevel(b.rarity) - rarityLevel(a.rarity);
          return diff || titleNo(a.id) - titleNo(b.id);
        }
        case "rarityAsc": {
          const diff = rarityLevel(a.rarity) - rarityLevel(b.rarity);
          return diff || titleNo(a.id) - titleNo(b.id);
        }
        case "noAsc":
        default:
          return titleNo(a.id) - titleNo(b.id);
      }
    });

    const items: TitleLibraryItem[] = sorted.map((title) => ({ kind: "title", title }));
    if (shouldShowLockedTitlePlaceholder()) items.push({ kind: "locked" });
    return items;
  };

  const renderTitleLibraryList = () => {
    const checkedIds = loadCheckedTitleIds();
    const ownedCount = USER_TITLE_DEFINITIONS.filter((title) => title.owned).length;
    const newCount = USER_TITLE_DEFINITIONS.filter((title) => title.owned && !checkedIds.has(title.id)).length;
    const selectedId = getSelectedTitle().id;
    const visibleTitles = filterTitleDefinitions(checkedIds);

    titleOwnedCount.textContent = `取得済み ${ownedCount}`;
    titleNewCount.textContent = newCount > 0 ? `未確認 ${newCount}` : "未確認 0";

    if (visibleTitles.length === 0) {
      titleList.innerHTML = `<div class="userHomeTitleListEmpty">条件に一致する称号はありません。</div>`;
      return;
    }

    titleList.innerHTML = visibleTitles.map((item) => {
      if (item.kind === "locked") {
        return `
          <button class="userHomeTitleCard is-locked is-locked-placeholder" type="button" data-title-locked="1">
            <span class="userHomeTitleCardNo">？？？</span>
            <span class="userHomeTitleCardRarity">未開放</span>
            <span class="userHomeTitleCardMain">
              <span class="userHomeTitleCardName">未開放</span>
              <span class="userHomeTitleCardCondition">ゲームを遊ぶことで開放されることがあります</span>
            </span>
            <span class="userHomeTitleCardBadges"></span>
          </button>
        `;
      }

      const title = item.title;
      const isNew = !checkedIds.has(title.id);
      const isSelected = title.id === selectedId;
      const noText = `No.${String(titleNo(title.id)).padStart(3, "0")}`;

      return `
        <button class="userHomeTitleCard is-owned ${isSelected ? "is-selected" : ""}" type="button" data-title-id="${escapeHtml(title.id)}">
          <span class="userHomeTitleCardNo">${escapeHtml(noText)}</span>
          <span class="userHomeTitleCardRarity titleRarityText${rarityLevel(title.rarity)}">${escapeHtml(title.rarity)}</span>
          <span class="userHomeTitleCardMain">
            <span class="userHomeTitleCardName">${escapeHtml(title.name)}</span>
            <span class="userHomeTitleCardCondition">${escapeHtml(title.condition)}</span>
          </span>
          <span class="userHomeTitleCardBadges">
            ${isNew ? `<span class="userHomeTitleNewBadge">NEW</span>` : ""}
            ${isSelected ? `<span class="userHomeTitleSelectedBadge">設定中</span>` : ""}
          </span>
        </button>
      `;
    }).join("");
  };

  const getIconLibraryItems = (): IconLibraryItem[] => {
    const ownedIcons = USER_ICON_DEFINITIONS.filter((icon) => icon.owned);
    if (ownedIcons.length === 0 && USER_ICON_DEFINITIONS.length === 0) return [];
    return [
      ...ownedIcons.map((icon) => ({ kind: "icon" as const, icon })),
      { kind: "locked" },
    ];
  };

  const getLoadingIllustrationLibraryItems = (): LoadingIllustrationLibraryItem[] => [
    ...LOADING_ILLUSTRATION_DEFINITIONS.filter((illustration) => illustration.owned).map((illustration) => ({ kind: "illustration" as const, illustration })),
    { kind: "locked" },
  ];

  const renderIconLibraryList = () => {
    const icons = getIconLibraryItems();
    const ownedCount = USER_ICON_DEFINITIONS.filter((icon) => icon.owned).length;
    iconOwnedCount.textContent = `取得済み ${ownedCount}`;

    if (icons.length === 0) {
      iconList.innerHTML = `<div class="userHomeTitleListEmpty">利用可能なアイコンがありません。</div>`;
      return;
    }

    iconList.innerHTML = icons.map((item) => {
      if (item.kind === "locked") {
        return `
          <button class="userHomeCollectionTile userHomeIconTile is-locked" type="button" data-icon-locked="1">
            <span class="userHomeCollectionLock" aria-hidden="true">🔒</span>
            <span class="userHomeCollectionTileName">未開放</span>
          </button>
        `;
      }

      return `
        <button class="userHomeCollectionTile userHomeIconTile" type="button" data-icon-id="${escapeHtml(item.icon.id)}">
          <span class="userHomeIconTileImage" aria-hidden="true">${iconDefinitionContentHtml(item.icon, 58)}</span>
          <span class="userHomeCollectionTileName">${escapeHtml(item.icon.name)}</span>
        </button>
      `;
    }).join("");
  };

  const renderLoadingIllustrationLibraryList = () => {
    const illustrations = getLoadingIllustrationLibraryItems();
    const ownedCount = LOADING_ILLUSTRATION_DEFINITIONS.filter((illustration) => illustration.owned).length;
    loadingIllustrationOwnedCount.textContent = `取得済み ${ownedCount}`;

    loadingIllustrationList.innerHTML = illustrations.map((item) => {
      if (item.kind === "locked") {
        return `
          <button class="userHomeCollectionTile userHomeLoadingIllustrationTile is-locked" type="button" data-loading-illustration-locked="1">
            <span class="userHomeCollectionLock" aria-hidden="true">🔒</span>
            <span class="userHomeCollectionTileName">未開放</span>
          </button>
        `;
      }

      return `
        <button class="userHomeCollectionTile userHomeLoadingIllustrationTile" type="button" data-loading-illustration-id="${escapeHtml(item.illustration.id)}">
          <span class="userHomeLoadingIllustrationThumb" aria-hidden="true"><img src="${escapeHtml(item.illustration.src)}" alt="" /></span>
          <span class="userHomeCollectionTileName">${escapeHtml(item.illustration.name)}</span>
        </button>
      `;
    }).join("");
  };

  const renderTitleSelectList = () => {
    const selectedId = getSelectedTitle().id;
    const ownedTitles = USER_TITLE_DEFINITIONS.filter((title) => title.owned);

    titleSelectBody.innerHTML = `
      <div class="userHomeTitleSelectLead">所持中の称号を選択すると、現在の表示称号に反映されます。</div>
      <div class="userHomeTitleSelectList">
        ${ownedTitles.map((title) => `
          <button class="userHomeTitleSelectItem ${title.id === selectedId ? "is-selected" : ""}" type="button" data-select-title-id="${escapeHtml(title.id)}">
            <span class="playerTitleBadge titleRarity${rarityLevel(title.rarity)} ${titleNameLengthClass(title.name)}">${escapeHtml(title.name)}</span>
            <span class="userHomeTitleSelectMeta">${escapeHtml(title.rarity)}${title.id === selectedId ? " / 設定中" : ""}</span>
          </button>
        `).join("")}
      </div>
    `;
  };

  const renderIconSelectList = () => {
    const selectedId = getSelectedUserIcon().id;
    const ownedIcons = USER_ICON_DEFINITIONS.filter((icon) => icon.owned);

    iconSelectBody.innerHTML = `
      <div class="userHomeIconSelectLead">所持中のアイコンを選択すると、ホームの表示アイコンに反映されます。</div>
      ${ownedIcons.length === 0 ? `<div class="userHomeTitleListEmpty">利用可能なアイコンがありません。</div>` : `
        <div class="userHomeIconSelectList" aria-label="所持中アイコン一覧">
          ${ownedIcons.map((icon) => `
            <button class="userHomeIconSelectItem ${icon.id === selectedId ? "is-selected" : ""}" type="button" data-select-icon-id="${escapeHtml(icon.id)}">
              <span class="userHomeIconSelectImage" aria-hidden="true">${iconDefinitionContentHtml(icon, 58)}</span>
              <span class="userHomeIconSelectName">${escapeHtml(icon.name)}</span>
              ${icon.id === selectedId ? `<span class="userHomeIconSelectMeta">設定中</span>` : ""}
            </button>
          `).join("")}
        </div>
      `}
    `;
  };

  const renderTitleDetail = (title: UserTitleDefinition) => {
    const owned = title.owned;
    if (owned && !isTitleChecked(title.id)) {
      markTitleChecked(title.id);
      renderTitleLibraryList();
    }

    const selectedId = getSelectedTitle().id;
    const detailName = owned ? title.name : "？？？";
    const detailCondition = owned ? title.condition : "未所持";
    const detailComment = owned ? title.comment : "この称号はまだ所持していません。獲得すると詳細情報を確認できます。";
    const acquiredAt = owned ? (title.acquiredAt ?? "取得日不明") : "未取得";
    const isSelected = owned && title.id === selectedId;

    titleDetailBody.innerHTML = `
      <div class="titleDetailOuter">
        <section class="titleDetailHero titleDetailRarity${owned ? rarityLevel(title.rarity) : 0}">
          <div class="titleDetailStar">${owned ? escapeHtml(title.rarity) : "？"}</div>
          <h2 id="userHomeTitleDetailName" class="titleDetailName">${escapeHtml(detailName)}</h2>
        </section>

        <section class="titleDetailContent">
          <div class="titleDetailConditionBlock">
            <div class="titleDetailLabel">取得条件</div>
            <div class="titleDetailCondition">${escapeHtml(detailCondition)}</div>
          </div>

          <div class="titleDetailComment">${escapeHtml(detailComment)}</div>
          <div class="titleDetailDate">${escapeHtml(acquiredAt)}</div>

          <div class="titleDetailFooter">
            <button id="userHomeTitleDetailSetBtn" class="btn titleDetailSetBtn" type="button" ${owned ? "" : "disabled"}>${isSelected ? "設定中" : "称号に設定"}</button>
            <button id="userHomeTitleDetailCloseBtn" class="btn titleDetailCloseBtn" type="button">閉じる</button>
          </div>
        </section>
      </div>
    `;

    const setBtn = titleDetailBody.querySelector<HTMLButtonElement>("#userHomeTitleDetailSetBtn");
    const closeBtn = titleDetailBody.querySelector<HTMLButtonElement>("#userHomeTitleDetailCloseBtn");

    setBtn?.addEventListener("click", () => {
      if (!owned) return;
      playButtonSe();
      applySelectedTitle(title.id);
      setBtn.textContent = "設定中";
    });

    closeBtn?.addEventListener("click", () => {
      playButtonSe();
      setTitleDetailOpen(false);
    });
  };

  const renderLockedCollectionDetail = (label: string) => {
    titleDetailBody.innerHTML = `
      <div class="titleDetailOuter collectionDetailOuter">
        <section class="titleDetailHero titleDetailRarity0 collectionDetailHero">
          <div class="titleDetailStar">🔒</div>
          <h2 id="userHomeTitleDetailName" class="titleDetailName">未開放</h2>
        </section>

        <section class="titleDetailContent collectionDetailContent">
          <div class="titleDetailConditionBlock">
            <div class="titleDetailLabel">${escapeHtml(label)}</div>
            <div class="titleDetailCondition">まだ開放されていません。</div>
          </div>

          <div class="titleDetailComment">ゲームを遊ぶことで、新しい${escapeHtml(label)}が開放されることがあります。</div>
          <div class="titleDetailDate">未開放の総数は表示されません。</div>

          <div class="titleDetailFooter titleDetailFooterSingle">
            <button id="userHomeTitleDetailCloseBtn" class="btn titleDetailCloseBtn" type="button">閉じる</button>
          </div>
        </section>
      </div>
    `;

    titleDetailBody.querySelector<HTMLButtonElement>("#userHomeTitleDetailCloseBtn")?.addEventListener("click", () => {
      playButtonSe();
      setTitleDetailOpen(false);
    });
  };

  const renderIconDetail = (icon: UserIconDefinition) => {
    const selectedId = getSelectedUserIcon().id;
    const isSelected = icon.id === selectedId;

    titleDetailBody.innerHTML = `
      <div class="titleDetailOuter collectionDetailOuter">
        <section class="titleDetailHero collectionDetailHero iconDetailHero">
          <div class="collectionDetailIconPreview">${iconDefinitionContentHtml(icon, 118)}</div>
          <h2 id="userHomeTitleDetailName" class="titleDetailName">${escapeHtml(icon.name)}</h2>
        </section>

        <section class="titleDetailContent collectionDetailContent">
          <div class="titleDetailConditionBlock">
            <div class="titleDetailLabel">アイコン詳細</div>
            <div class="titleDetailCondition">${isSelected ? "設定中" : "取得済み"}</div>
          </div>

          <div class="titleDetailComment">${escapeHtml(icon.comment)}</div>
          <div class="titleDetailDate">プレイヤーアイコンとして利用できます。</div>

          <div class="titleDetailFooter">
            <button id="userHomeIconDetailSetBtn" class="btn titleDetailSetBtn" type="button" ${isSelected ? "disabled" : ""}>${isSelected ? "設定中" : "アイコンに設定"}</button>
            <button id="userHomeTitleDetailCloseBtn" class="btn titleDetailCloseBtn" type="button">閉じる</button>
          </div>
        </section>
      </div>
    `;

    titleDetailBody.querySelector<HTMLButtonElement>("#userHomeIconDetailSetBtn")?.addEventListener("click", () => {
      if (isSelected) return;
      playButtonSe();
      applySelectedIcon(icon.id);
      setTitleDetailOpen(false);
    });

    titleDetailBody.querySelector<HTMLButtonElement>("#userHomeTitleDetailCloseBtn")?.addEventListener("click", () => {
      playButtonSe();
      setTitleDetailOpen(false);
    });
  };

  const renderLoadingIllustrationDetail = (illustration: LoadingIllustrationDefinition) => {
    titleDetailBody.innerHTML = `
      <div class="titleDetailOuter collectionDetailOuter loadingIllustrationDetailOuter">
        <section class="titleDetailHero collectionDetailHero loadingIllustrationDetailHero">
          <button id="userHomeLoadingIllustrationPreviewBtn" class="loadingIllustrationDetailImageButton" type="button" aria-label="${escapeHtml(illustration.name)}を拡大表示">
            <img class="loadingIllustrationDetailImage" src="${escapeHtml(illustration.src)}" alt="${escapeHtml(illustration.name)}" />
          </button>
        </section>

        <section class="titleDetailContent collectionDetailContent loadingIllustrationDetailContent">
          <div class="loadingIllustrationTapHint">画像をタップで拡大</div>
          <h2 id="userHomeTitleDetailName" class="titleDetailName loadingIllustrationDetailTitle">${escapeHtml(illustration.name)}</h2>
          <div class="titleDetailComment loadingIllustrationDetailComment">${escapeHtml(illustration.comment)}</div>
          <div class="titleDetailDate">ロード画面で表示されることがあります。</div>

          <div class="titleDetailFooter titleDetailFooterSingle">
            <button id="userHomeTitleDetailCloseBtn" class="btn titleDetailCloseBtn" type="button">閉じる</button>
          </div>
        </section>
      </div>
    `;

    titleDetailBody.querySelector<HTMLButtonElement>("#userHomeLoadingIllustrationPreviewBtn")?.addEventListener("click", () => {
      playButtonSe();
      setLoadingIllustrationPreviewOpen(true, illustration);
    });

    titleDetailBody.querySelector<HTMLButtonElement>("#userHomeTitleDetailCloseBtn")?.addEventListener("click", () => {
      playButtonSe();
      setTitleDetailOpen(false);
    });
  };

  const renderTitleAwardNotification = (notification: TitleAwardNotification) => {
    const titles = notification.items;
    const visibleTitles = titles.slice(0, 5);
    const hiddenCount = Math.max(0, titles.length - visibleTitles.length);

    titleAwardBody.innerHTML = `
      <div class="userHomeTitleAwardLead">ホームに戻るまでに獲得した称号をまとめて通知しています。</div>
      <div class="userHomeTitleAwardList">
        ${visibleTitles
          .map(
            (title) => `
              <div class="userHomeTitleAwardItem">
                <span class="userHomeTitleAwardName">${escapeHtml(title.name)}</span>
                <span class="userHomeTitleAwardRarity">${escapeHtml(title.rarity)}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${hiddenCount > 0 ? `<div class="userHomeTitleAwardMore">他${hiddenCount}個の称号を獲得しました。<br>称号一覧から確認できます。</div>` : ""}
    `;
  };

  const renderIconAwardNotification = (notification: IconAwardNotification) => {
    const icons = notification.items;
    const representativeIcon = icons[0];
    if (!representativeIcon) return;

    const otherCount = Math.max(0, icons.length - 1);

    iconAwardBody.innerHTML = `
      <div class="userHomeTitleAwardLead userHomeIconAwardLead">ホームに戻るまでに獲得したアイコンを通知しています。</div>
      <div class="userHomeIconAwardPreview">
        <div class="userHomeIconAwardImage" aria-hidden="true">${iconDefinitionContentHtml(representativeIcon, 92)}</div>
        <div class="userHomeIconAwardDisplayName">${escapeHtml(representativeIcon.name)}</div>
      </div>
      ${otherCount > 0 ? `<div class="userHomeTitleAwardMore userHomeIconAwardMore">他${otherCount}個のアイコンを獲得しました。</div>` : ""}
    `;
  };

  let iconAwardShown = false;

  const openIconAwardNotification = () => {
    if (iconAwardShown) return;

    const pendingIconAwardNotification = handlers.iconAwardNotification;
    if (!pendingIconAwardNotification || pendingIconAwardNotification.items.length === 0) return;

    iconAwardShown = true;
    renderIconAwardNotification(pendingIconAwardNotification);
    window.setTimeout(() => {
      setIconAwardOpen(true);
    }, 0);
  };

  const closeTitleAwardNotification = () => {
    playButtonSe();
    setTitleAwardOpen(false);
    handlers.onTitleAwardNotificationClose?.();
    openIconAwardNotification();
  };

  const closeIconAwardNotification = () => {
    playButtonSe();
    setIconAwardOpen(false);
    handlers.onIconAwardNotificationClose?.();
  };

  const updateAnnouncementNotice = () => {
    const announcement = HOME_ANNOUNCEMENTS[0];
    if (!announcement) {
      noticeTitle.textContent = "お知らせはありません";
      noticeDate.textContent = "";
      noticeText.textContent = "公開中のお知らせはありません。";
      noticeMoreBtn.disabled = true;
      return;
    }

    noticeTitle.textContent = announcement.title;
    noticeDate.textContent = formatAnnouncementDate(announcement.startsAt ?? announcement.createdAt);
    noticeText.textContent = announcement.summary || announcement.body.slice(0, 80);
    noticeMoreBtn.disabled = false;
  };

  const renderAnnouncementList = () => {
    announcementHeading.textContent = "お知らせ一覧";
    announcementBackBtn.style.display = "none";
    if (HOME_ANNOUNCEMENTS.length === 0) {
      announcementBody.innerHTML = `<div class="userHomeAnnouncementEmpty">お知らせはありません。</div>`;
      return;
    }

    announcementBody.innerHTML = `
      <div class="userHomeAnnouncementList">
        ${HOME_ANNOUNCEMENTS.slice(0, 5)
          .map(
            (announcement) => `
              <button class="userHomeAnnouncementItem" type="button" data-announcement-id="${announcement.id}">
                <span class="userHomeAnnouncementItemDate">${formatAnnouncementDate(announcement.startsAt ?? announcement.createdAt)}</span>
                <span class="userHomeAnnouncementItemTitle">${escapeHtml(announcement.title)}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `;
  };

  const renderAnnouncementDetail = (announcement: HomeAnnouncement) => {
    announcementHeading.textContent = "お知らせ詳細";
    announcementBackBtn.style.display = "block";
    announcementBody.innerHTML = `
      <article class="userHomeAnnouncementDetail">
        <div class="userHomeAnnouncementDetailDate">${formatAnnouncementDate(announcement.startsAt ?? announcement.createdAt)}</div>
        <h2 class="userHomeAnnouncementDetailTitle">${escapeHtml(announcement.title)}</h2>
        <div class="userHomeAnnouncementDetailBody">${announcementBodyHtml(announcement)}</div>
      </article>
    `;
  };

  const openAnnouncementModal = () => {
    renderAnnouncementList();
    setAnnouncementOpen(true);
  };

  updateAnnouncementNotice();
  void loadHomeAnnouncements().then((announcements) => {
    HOME_ANNOUNCEMENTS = announcements;
    updateAnnouncementNotice();
  });

  settingNameInput.addEventListener("input", () => {
    setSettingNameMessage(null);
    refreshSettingNameView(false);
  });

  settingNameInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    playButtonSe();
    void saveSettingName();
  });

  settingNameSaveBtn.addEventListener("click", () => {
    playButtonSe();
    void saveSettingName();
  });

  settingRestoreNameBtn.addEventListener("click", () => {
    playButtonSe();
    void restoreSettingName();
  });

  for (const button of soundLevelButtons) {
    button.addEventListener("click", () => {
      const level = Number(button.dataset.soundVolumeLevel);
      const normalizedLevel = setSoundVolumeLevel(level);
      void updateUserSettingsOnApi({ soundVolumeLevel: normalizedLevel }).catch(() => { });
      refreshSoundVolumeView();
      playButtonSe();
    });
  }

  refreshSettingNameView(true);
  refreshSoundVolumeView();
  updateSubViewMenu();

  titleFilterSelect.addEventListener("change", () => {
    titleLibraryFilter = titleFilterSelect.value as TitleLibraryFilter;
    playButtonSe();
    renderTitleLibraryList();
  });

  titleSortSelect.addEventListener("change", () => {
    titleLibrarySort = titleSortSelect.value as TitleLibrarySort;
    playButtonSe();
    renderTitleLibraryList();
  });

  playBtn.addEventListener("click", () => {
    playButtonSe();
    handlers.onGoGameSettings();
  });

  libraryBtn.addEventListener("click", () => {
    playButtonSe();
    setLibraryOpen(true);
  });

  recordsBtn.addEventListener("click", () => {
    playButtonSe();
    setRecordsOpen(true);
  });

  recordsReloadBtn.addEventListener("click", () => {
    playButtonSe();
    void loadRecords(true);
  });

  settingsBtn.addEventListener("click", () => {
    playButtonSe();
    setSettingsOpen(true);
  });

  titleLibraryOpenBtn.addEventListener("click", () => {
    playButtonSe();
    setLibraryPage("titles");
  });

  iconLibraryOpenBtn.addEventListener("click", () => {
    playButtonSe();
    setLibraryPage("icons");
  });

  loadingIllustrationLibraryOpenBtn.addEventListener("click", () => {
    playButtonSe();
    setLibraryPage("loadingIllustrations");
  });

  libraryBackBtn.addEventListener("click", () => {
    playButtonSe();
    if (libraryPage !== "index") {
      setLibraryPage("index");
      return;
    }
    setLibraryOpen(false);
  });

  currentIconBtn.addEventListener("click", () => {
    playButtonSe();
    setIconSelectOpen(true);
  });

  currentTitleBtn.addEventListener("click", () => {
    playButtonSe();
    setTitleSelectOpen(true);
  });

  titleList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const lockedCard = target.closest<HTMLButtonElement>("[data-title-locked]");
    if (lockedCard) {
      playButtonSe();
      renderLockedCollectionDetail("称号");
      setTitleDetailOpen(true);
      return;
    }

    const card = target.closest<HTMLButtonElement>("[data-title-id]");
    if (!card) return;

    const title = findTitle(card.dataset.titleId);
    if (!title) return;

    playButtonSe();
    renderTitleDetail(title);
    setTitleDetailOpen(true);
  });

  iconList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const lockedCard = target.closest<HTMLButtonElement>("[data-icon-locked]");
    if (lockedCard) {
      playButtonSe();
      renderLockedCollectionDetail("アイコン");
      setTitleDetailOpen(true);
      return;
    }

    const card = target.closest<HTMLButtonElement>("[data-icon-id]");
    if (!card) return;

    const icon = USER_ICON_DEFINITIONS.find((value) => value.id === card.dataset.iconId);
    if (!icon) return;

    playButtonSe();
    renderIconDetail(icon);
    setTitleDetailOpen(true);
  });

  loadingIllustrationList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const lockedCard = target.closest<HTMLButtonElement>("[data-loading-illustration-locked]");
    if (lockedCard) {
      playButtonSe();
      renderLockedCollectionDetail("ロードイラスト");
      setTitleDetailOpen(true);
      return;
    }

    const card = target.closest<HTMLButtonElement>("[data-loading-illustration-id]");
    if (!card) return;

    const illustration = LOADING_ILLUSTRATION_DEFINITIONS.find((value) => value.id === card.dataset.loadingIllustrationId);
    if (!illustration) return;

    playButtonSe();
    renderLoadingIllustrationDetail(illustration);
    setTitleDetailOpen(true);
  });

  titleSelectBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest<HTMLButtonElement>("[data-select-title-id]");
    if (!item) return;

    const title = findTitle(item.dataset.selectTitleId);
    if (!title?.owned) return;

    playButtonSe();
    applySelectedTitle(title.id);
    setTitleSelectOpen(false);
  });

  titleSelectCloseBtn.addEventListener("click", () => {
    playButtonSe();
    setTitleSelectOpen(false);
  });

  titleSelectModal.addEventListener("click", (event) => {
    if (event.target !== titleSelectModal) return;
    setTitleSelectOpen(false);
  });

  titleSelectDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  iconSelectBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest<HTMLButtonElement>("[data-select-icon-id]");
    if (!item) return;

    const icon = findIcon(item.dataset.selectIconId);
    if (!icon?.owned) return;

    playButtonSe();
    applySelectedIcon(icon.id);
    setIconSelectOpen(false);
  });

  iconSelectCloseBtn.addEventListener("click", () => {
    playButtonSe();
    setIconSelectOpen(false);
  });

  iconSelectModal.addEventListener("click", (event) => {
    if (event.target !== iconSelectModal) return;
    setIconSelectOpen(false);
  });

  iconSelectDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  titleDetailModal.addEventListener("click", (event) => {
    if (event.target !== titleDetailModal) return;
    setTitleDetailOpen(false);
  });

  titleDetailDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  loadingIllustrationPreviewCloseBtn.addEventListener("click", () => {
    playButtonSe();
    setLoadingIllustrationPreviewOpen(false);
  });

  loadingIllustrationPreviewModal.addEventListener("click", (event) => {
    if (event.target !== loadingIllustrationPreviewModal) return;
    setLoadingIllustrationPreviewOpen(false);
  });

  loadingIllustrationPreviewImage.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  noticeMoreBtn.addEventListener("click", () => {
    playButtonSe();
    openAnnouncementModal();
  });

  announcementBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest<HTMLButtonElement>("[data-announcement-id]");
    if (!item) return;

    const announcement = HOME_ANNOUNCEMENTS.find((value) => value.id === item.dataset.announcementId);
    if (!announcement) return;

    playButtonSe();
    renderAnnouncementDetail(announcement);
  });

  announcementBackBtn.addEventListener("click", () => {
    playButtonSe();
    renderAnnouncementList();
  });

  announcementCloseBtn.addEventListener("click", () => {
    playButtonSe();
    setAnnouncementOpen(false);
  });

  announcementModal.addEventListener("click", (event) => {
    if (event.target !== announcementModal) return;
    setAnnouncementOpen(false);
  });

  announcementDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  titleAwardCloseBtn.addEventListener("click", () => {
    closeTitleAwardNotification();
  });

  titleAwardModal.addEventListener("click", (event) => {
    if (event.target !== titleAwardModal) return;
    closeTitleAwardNotification();
  });

  titleAwardDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  iconAwardCloseBtn.addEventListener("click", () => {
    closeIconAwardNotification();
  });

  iconAwardModal.addEventListener("click", (event) => {
    if (event.target !== iconAwardModal) return;
    closeIconAwardNotification();
  });

  iconAwardDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const pendingTitleAwardNotification = handlers.titleAwardNotification;
  if (pendingTitleAwardNotification && pendingTitleAwardNotification.items.length > 0) {
    renderTitleAwardNotification(pendingTitleAwardNotification);
    window.setTimeout(() => {
      setTitleAwardOpen(true);
    }, 0);
  } else {
    openIconAwardNotification();
  }

  soundBtn.addEventListener("click", () => {
    const next = toggleSound();
    updateSoundButton();
    if (next) playButtonSe();
  });

  menuBtn.addEventListener("click", () => {
    playButtonSe();
    setMenuOpen(!menuOverlay.classList.contains("is-open"));
  });

  menuClose.addEventListener("click", () => {
    playButtonSe();
    closeMenu();
  });

  menuOverlay.addEventListener("click", (event) => {
    if (event.target !== menuOverlay) return;
    closeMenu();
  });

  menuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  backHomeBtn.addEventListener("click", () => {
    playButtonSe();
    closeMenu();
    setLibraryOpen(false);
    setRecordsOpen(false);
    setSettingsOpen(false);
  });

  backTitleBtn.addEventListener("click", () => {
    playButtonSe();
    closeMenu();
    handlers.onGoTitle();
  });

  for (const item of menuItems) {
    item.addEventListener("click", () => {
      const key = item.dataset.homeModalKey as HomeModalKey | undefined;
      if (!key) return;
      playButtonSe();
      closeMenu();
      openModal(key);
    });
  }

  modalActionBtn.addEventListener("click", () => {
    playButtonSe();
    window.location.href = new URL("./contact.html", window.location.href).toString();
  });

  modalClose.addEventListener("click", () => {
    playButtonSe();
    setModalOpen(false);
  });

  modal.addEventListener("click", (event) => {
    if (event.target !== modal) return;
    setModalOpen(false);
  });

  modalDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}
