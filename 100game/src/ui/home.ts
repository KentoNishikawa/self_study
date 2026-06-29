// src/ui/home.ts
import type { Difficulty, GameType, GameState } from "../core/types";
import { DEFAULT_PLAYER_ICON_ID } from "../icons/iconPresets";
import { getSelectableUserIconDefinitions, resolveUserIconId, userIconContentHtml } from "../icons/userIconContent";
import { isSoundEnabled, playButtonSe, startButtonSe, toggleSound } from "../core/sound";
import { validatePlayerName } from "../core/nameValidation";
import { HOME_HOST_DISBANDED_NOTICE, getInviteExpiredNotice, getJoinFailedNotice, getLockedRoomNotice, getPreflightStatusNotice, getPreflightUnexpectedStatusNotice, getRoomFullNotice, renderMpNoticeModalHtml, setupMpNoticeModal, stashMpNotice, type MpNotice } from "./mpNotice";
import { getSelectedUserTitleName } from "./userHome";
import { getUserIconId, MAX_PLAYER_NAME_LENGTH } from "../core/userSettings";

export type HomeConfig = {
  playerName: string;
  difficulty: Difficulty;
  gameType: GameType;
  isGuest?: boolean;
};

type LobbySeat = {
  kind: "HOST" | "PLAYER" | "NPC";
  name: string;
  iconId: string;
  isGuest?: boolean;
  titleName?: string;
};

type LobbyState = {
  roomId: string;
  expiresAt: number;
  locked: boolean;
  npcDifficulty: Difficulty;
  gameType: string;
  seats: [LobbySeat, LobbySeat, LobbySeat, LobbySeat];
  playOrder: [number, number, number, number];
};

type WelcomeMsg = { type: "WELCOME"; seatIndex: number; state: LobbyState };
type RoomStateMsg = { type: "ROOM_STATE"; state: LobbyState };

const SOUND_NOTICE_SHOWN_KEY = "100game.soundNoticeShown";

type GameSettingsMenuKey = "privacy" | "terms" | "credits" | "contact";

type GameSettingsMenuContent = {
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionNote?: string;
};

const GAME_SETTINGS_MENU_CONTENT: Record<GameSettingsMenuKey, GameSettingsMenuContent> = {
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

function hasShownSoundNotice() {
  try {
    return sessionStorage.getItem(SOUND_NOTICE_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSoundNoticeShown() {
  try {
    sessionStorage.setItem(SOUND_NOTICE_SHOWN_KEY, "1");
  } catch { }
}

function isLobbyState(v: any): v is LobbyState {
  return (
    v &&
    typeof v.roomId === "string" &&
    typeof v.expiresAt === "number" &&
    typeof v.locked === "boolean" &&
    typeof v.npcDifficulty === "string" &&
    typeof v.gameType === "string" &&
    Array.isArray(v.seats) &&
    v.seats.length === 4 &&
    Array.isArray(v.playOrder) &&
    v.playOrder.length === 4 &&
    v.playOrder.every((n: any) => Number.isInteger(n))
  );
}


function isWelcomeMsg(v: any): v is WelcomeMsg {
  return v && v.type === "WELCOME" && typeof v.seatIndex === "number" && isLobbyState(v.state);
}

function isRoomStateMsg(v: any): v is RoomStateMsg {
  return v && v.type === "ROOM_STATE" && isLobbyState(v.state);
}

function toWsBase(httpBase: string) {
  return httpBase.replace(/^http/i, "ws");
}

function seatLabel(i: number) {
  if (i === 0) return "HOST";
  return `P${i}`;
}

function shortName(name: string) {
  const chars = Array.from(name);
  if (chars.length <= 6) return name;
  return chars.slice(0, 6).join("") + "…";
}

function truncateText(text: string, maxChars: number) {
  const chars = Array.from(text.trim());
  if (chars.length <= maxChars) return text.trim();
  return chars.slice(0, Math.max(0, maxChars - 1)).join("") + "…";
}

function lobbyTitleName(seat: LobbySeat) {
  if (seat.kind === "NPC" || seat.isGuest) return "";
  return (seat.titleName ?? getSelectedUserTitleName()).trim();
}

function defaultPlayerName(seatIndex: number | null, isConnected: boolean) {
  if (!isConnected) return "プレイヤー";
  if (seatIndex === 0) return "HOST";
  if (seatIndex != null && seatIndex >= 1 && seatIndex <= 3) return `プレイヤー${seatIndex}`;
  return "プレイヤー";
}

export function renderHome(
  app: HTMLDivElement,
  config: HomeConfig,
  handlers: {
    onStart: (cfg: HomeConfig) => void;
    onChange: (cfg: HomeConfig) => void;
    onGoUserHome: () => void;
    onGoTitle: () => void;
    onEnterMpGame: (
      p: { ws: WebSocket; roomId: string; seatIndex: number; isHost: boolean; npcDifficulty: Difficulty },
      initial: GameState
    ) => void;
  }
) {
  const apiBase = (import.meta as any).env?.VITE_MP_API_BASE || "http://127.0.0.1:8787";
  const wsBase = toWsBase(String(apiBase));

  let roomId: string | null = new URLSearchParams(location.search).get("room");
  let mySeatIndex: number | null = null;
  let lobby: LobbyState | null = null;
  let ws: WebSocket | null = null;

  let reorderMode = false;
  let draftOrder: number[] = [];

  let pendingRedirect = false;
  let pendingLeaveDestination: "TITLE" | "USER_HOME" | null = null;
  let committedName = config.playerName;
  const FORCE_HOME_SCREEN_KEY = "100game.forceHomeScreen";
  let localIconId = config.isGuest ? DEFAULT_PLAYER_ICON_ID : getUserIconId();


  const redirectToHome = (forceHomeScreen = false) => {
    // ルーム情報を消して、ソロHOMEへ（再生成を必ず押させる方針）
    if (roomId) {
      sessionStorage.removeItem(`hostToken:${roomId}`);
    }
    if (forceHomeScreen) {
      try {
        sessionStorage.setItem(FORCE_HOME_SCREEN_KEY, "1");
      } catch { }
    }
    const next = location.origin + location.pathname + (location.hash ?? "");
    // ここで確実に“戻った後”の表示を走らせたいので、replaceで遷移
    location.replace(next);
  };

  const flashAndRedirectHome = (notice: MpNotice, forceHomeScreen = false) => {
    stashMpNotice(notice);
    redirectToHome(forceHomeScreen);
  };

  const resetLobbyConnectionState = () => {
    pendingRedirect = false;
    reorderMode = false;
    draftOrder = [];
    lobby = null;
    mySeatIndex = null;

    if (roomId) {
      try {
        sessionStorage.removeItem(`hostToken:${roomId}`);
      } catch { }
    }
    roomId = null;

    if (ws) {
      try {
        ws.onmessage = null;
        ws.onclose = null;
      } catch { }
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch { }
    }
    ws = null;

    inviteUrlEl.value = "";
    renderParticipants(null);
    applyRole();
    setStatus("disconnected");

    try {
      const next = new URL(location.href);
      next.searchParams.delete("room");
      history.replaceState(null, "", next.toString());
    } catch { }
  };

  const handleHostDisbandedAtHome = () => {
    resetLobbyConnectionState();
    mpNoticeModal.show(HOME_HOST_DISBANDED_NOTICE, { hideTitle: true });
  };

  const getLeaveRoomButtonText = (isHost: boolean) => {
    if (isHost) return "部屋を解散する";

    const destinationText = config.isGuest ? "タイトル" : "ホーム";
    return `部屋から抜けて${destinationText}へ`;
  };

  const navigateAfterLeaveRoom = () => {
    const destination = pendingLeaveDestination ?? (config.isGuest ? "TITLE" : "USER_HOME");
    pendingLeaveDestination = null;

    if (destination === "TITLE") {
      handlers.onGoTitle();
      return;
    }

    handlers.onGoUserHome();
  };

  const leaveOrDisbandAndNavigate = () => {
    pendingLeaveDestination = config.isGuest ? "TITLE" : "USER_HOME";

    if (!ws || ws.readyState !== WebSocket.OPEN || mySeatIndex == null) {
      resetLobbyConnectionState();
      navigateAfterLeaveRoom();
      return;
    }

    pendingRedirect = true;

    ws.send(JSON.stringify({ type: mySeatIndex === 0 ? "HOST_DISBAND" : "LEAVE" }));

    setTimeout(() => {
      if (!pendingRedirect && !pendingLeaveDestination) return;
      pendingRedirect = false;
      resetLobbyConnectionState();
      navigateAfterLeaveRoom();
    }, 3000);
  };

  const showHomeReturnInMenu = !config.isGuest;

  app.innerHTML = `

    <div class="gameSettingsTopActions">
      <button id="soundToggleBtn" class="soundBtn gameSettingsSoundBtn" type="button" aria-label="音の切り替え">🔊</button>
      <button id="gameSettingsMenuBtn" class="titleMenuBtn gameSettingsMenuBtn" type="button" aria-label="メニュー" aria-expanded="false">≡</button>
    </div>

    <div id="gameSettingsMenuOverlay" class="titleMenuOverlay" aria-hidden="true">
      <div id="gameSettingsMenuPanel" class="titleMenuPanel" role="menu" aria-label="ゲーム設定メニュー">
        <div class="titleMenuPanelHead">
          <div class="titleMenuPanelTitle">MENU</div>
          <button id="gameSettingsMenuClose" class="titleMenuClose" type="button" aria-label="メニューを閉じる">×</button>
        </div>
        ${showHomeReturnInMenu ? `<button id="gameSettingsBackHomeBtn" class="titleMenuItem" type="button">ホームに戻る</button>` : ""}
        <button class="titleMenuItem" type="button" data-game-settings-modal-key="privacy">プライバシーポリシー</button>
        <button class="titleMenuItem" type="button" data-game-settings-modal-key="terms">利用規約</button>
        <button class="titleMenuItem" type="button" data-game-settings-modal-key="credits">クレジット</button>
        <button class="titleMenuItem" type="button" data-game-settings-modal-key="contact">お問い合わせ</button>
        <button id="gameSettingsBackTitleBtn" class="titleMenuItem" type="button">タイトルへ戻る</button>
      </div>
    </div>

    <div id="gameSettingsInfoModal" class="titleInfoModal" aria-hidden="true">
      <div id="gameSettingsInfoDialog" class="titleInfoDialog" role="dialog" aria-modal="true" aria-labelledby="gameSettingsInfoHeading">
        <div class="titleInfoHeader">
          <div id="gameSettingsInfoHeading" class="titleInfoHeading"></div>
        </div>
        <div id="gameSettingsInfoBody" class="titleInfoBody"></div>
        <div id="gameSettingsInfoAction" class="titleInfoAction" style="display:none;">
          <button id="gameSettingsInfoActionBtn" class="btn titleInfoActionBtn" type="button"></button>
          <div id="gameSettingsInfoActionNote" class="titleInfoActionNote"></div>
        </div>
        <div class="titleInfoFooter">
          <button id="gameSettingsInfoClose" class="btn" type="button">閉じる</button>
        </div>
      </div>
    </div>

    <!-- 通知モーダル（満員など） -->
    ${renderMpNoticeModalHtml()}

    <div id="homeSoundNoticeModal" class="noticeModalOverlay" aria-hidden="true">
      <div id="homeSoundNoticeDialog" class="noticeModalDialog is-compact" role="dialog" aria-modal="true" aria-labelledby="homeSoundNoticeHeading">
        <div class="noticeModalHeader">
          <div id="homeSoundNoticeHeading" class="noticeModalHeading">ご案内</div>
        </div>
        <div class="noticeModalBody is-center">
          <p>このゲームでは音が発生します</p>
          <p>ゲーム設定右上の音ON/OFFボタンやブラウザのタブごとのミュート機能などで調整できます</p>
        </div>
        <div class="noticeModalFooter">
          <button id="homeSoundNoticeClose" class="btn" type="button">閉じる</button>
        </div>
      </div>
    </div>

    <div id="ruleModalOverlay" style="position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.62);z-index:10040;">
      <div style="width:min(720px, calc(100vw - 40px));max-height:min(78vh, 760px);border-radius:20px;border:1px solid rgba(255,255,255,0.14);background:rgba(12, 16, 24, 0.98);box-shadow:0 24px 56px rgba(0, 0, 0, 0.45);display:grid;grid-template-rows:auto minmax(0, 1fr) auto;overflow:hidden;">
        <div style="padding:18px 18px 12px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:clamp(18px, 3vw, 24px);font-weight:950;letter-spacing:0.04em;">ルール要点</div>
        </div>
        <div style="min-height:0;overflow-y:auto;padding:18px;color:rgba(255,255,255,0.88);line-height:1.8;">
          <div>・順番にカードを出し、合計が上限値を超えたら負け（加算時）</div>
          <div>・J/Q/Kは10、Aは1</div>
          <div>・ジョーカーは1〜49（宣言）</div>
          <div>・ジョーカー直後に♠3でジョーカーを0化、♠3も0</div>
          <div>・Jは +10 → 負けてなければ加算/減算を反転</div>
          <div>・<b>ゲームタイプ：100以外</b> の場合、山札が尽きた瞬間に「再配布」</div>
          <div>・再配布できるカードが無い場合は無効試合</div>
        </div>
        <div style="padding:0 18px 18px;">
          <button id="ruleModalCloseBtn" class="btn" type="button" style="width:100%;">閉じる</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;margin-bottom:10px;">
        <div style="font-weight:950;min-width:0;">ゲーム設定</div>
        ${config.isGuest ? `<span class="guestModeBadge">ゲスト</span>` : ""}
      </div>

      <div style="display:grid;gap:12px;">
        <div style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">プレイヤー</span>

          <div id="profileRow" style="display:flex;gap:10px;align-items:center;position:relative;">
            <button id="iconBtn" type="button" data-icon-id="${escapeHtml(localIconId)}"
              style="width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);
                     background:rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;
                     font-size:18px;cursor:pointer;">
              ${userIconContentHtml(localIconId, 50)}
            </button>

            <div id="iconPicker"
              style="display:none;position:absolute;left:0;top:52px;z-index:50;
                     padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.16);
                     background:rgba(10,10,10,0.98);box-shadow:0 8px 30px rgba(0,0,0,0.45);
                     max-height:116px;overflow-y:auto;overflow-x:hidden;">
              <div style="display:grid;grid-template-columns:repeat(6, 44px);gap:8px;">
                ${getSelectableUserIconDefinitions().map((p) => `
                  <button type="button" class="iconOpt" data-icon="${escapeHtml(p.id)}"
                    title="${escapeHtml(p.name)}"
                    style="width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,0.16);
                           background:rgba(255,255,255,0.06);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">
                    ${userIconContentHtml(p.id, 44)}
                  </button>
                `).join("")}
              </div>
            </div>

            <div style="display:flex;gap:8px;align-items:center;flex:1;">
              <input id="playerName" class="input" style="flex:1;" value="${escapeHtml(config.playerName)}" maxlength="${MAX_PLAYER_NAME_LENGTH}" />
              <button id="nameCommitBtn" class="btn" type="button" style="white-space:nowrap;">決定</button>
            </div>
          </div>

          <div id="nameError" style="min-height:18px;margin-left:54px;width:calc(100% - 54px);text-align:left;font-size:12px;color:#ff8080;visibility:hidden;"></div>
        </div>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">NPC難易度</span>
          <select id="difficulty" class="select">
            <option value="CASUAL">CASUAL</option>
            <option value="SMART">SMART</option>
          </select>
        </label>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">ゲームタイプ（上限値）</span>
          <select id="gameType" class="select">
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="EXTRA">EXTRA</option>
          </select>
        </label>

        <div style="display:flex;gap:8px;align-items:stretch;">
          <button id="ruleBtn" class="btn" type="button" style="flex:1;">
            ルール確認
          </button>
          <button id="startBtn" class="btn" type="button" style="flex:1;font-weight:950;">
            ゲーム開始
          </button>
        </div>

        <!-- 高さ固定：接続状態の文言が変わっても折り返して高さが変動しないようにする -->
        <div id="roleHint" style="font-size:12px;opacity:0.8;min-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
      </div>
    </div>

    <div class="panel">
      <div style="font-weight:950;margin-bottom:10px;">マルチプレイ</div>

      <div style="display:grid;gap:10px;">
        <button id="createRoomBtn" class="btn" type="button" style="width:100%;">
          招待用URL生成（HOST）
        </button>

        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">招待URL</span>
          <div id="inviteUrlRow" style="display:flex;gap:8px;">
            <input id="inviteUrl" class="input" readonly value="" />
            <button id="copyInviteBtn" class="btn" type="button" style="white-space:nowrap;">コピー</button>
          </div>
        </label>

        <div id="connStatus" style="display:none;"></div>

        <!-- 高さ固定：招待URL生成前後でDOMが増減して下の参加者一覧がズレないようにする -->
        <button id="leaveRoomBtn" class="btn" type="button"
          style="width:100%; display:block; min-height:40px; visibility:hidden; pointer-events:none;">
          部屋から抜けて${config.isGuest ? "タイトル" : "ホーム"}へ
        </button>
      </div>
    </div>

    <div class="panel">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;min-height:40px;">
        <div style="font-weight:950;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">参加者一覧</div>
        <!-- ボタン分の空間を最初から確保（ボタン自体は必要な時だけ描画） -->
        <div id="reorderSlot" style="width:clamp(130px, 40vw, 190px);min-height:40px;display:flex;align-items:center;justify-content:flex-end;"></div>
      </div>
      <div id="reorderHint" style="display:none;text-align:center;font-weight:950;opacity:0.88;margin:-2px 0 10px 0;line-height:1.25;"></div>
      <div id="participants" style="display:grid;gap:8px;"></div>
    </div>

  `;

  // --- notice modal ---
  const mpNoticeModal = setupMpNoticeModal(app);
  mpNoticeModal.showStashed();

  // --- elements ---
  const profileRow = app.querySelector<HTMLDivElement>("#profileRow")!;
  const iconBtn = app.querySelector<HTMLButtonElement>("#iconBtn")!;
  iconBtn.dataset.iconId = localIconId;
  const iconPicker = app.querySelector<HTMLDivElement>("#iconPicker")!;
  const iconOptButtons = Array.from(app.querySelectorAll<HTMLButtonElement>(".iconOpt"));

  const soundBtn = app.querySelector<HTMLButtonElement>("#soundToggleBtn")!;
  const gameSettingsMenuBtn = app.querySelector<HTMLButtonElement>("#gameSettingsMenuBtn")!;
  const gameSettingsMenuOverlay = app.querySelector<HTMLDivElement>("#gameSettingsMenuOverlay")!;
  const gameSettingsMenuPanel = app.querySelector<HTMLDivElement>("#gameSettingsMenuPanel")!;
  const gameSettingsMenuClose = app.querySelector<HTMLButtonElement>("#gameSettingsMenuClose")!;
  const gameSettingsBackHomeBtn = app.querySelector<HTMLButtonElement>("#gameSettingsBackHomeBtn");
  const gameSettingsBackTitleBtn = app.querySelector<HTMLButtonElement>("#gameSettingsBackTitleBtn")!;
  const gameSettingsInfoModal = app.querySelector<HTMLDivElement>("#gameSettingsInfoModal")!;
  const gameSettingsInfoDialog = app.querySelector<HTMLDivElement>("#gameSettingsInfoDialog")!;
  const gameSettingsInfoHeading = app.querySelector<HTMLDivElement>("#gameSettingsInfoHeading")!;
  const gameSettingsInfoBody = app.querySelector<HTMLDivElement>("#gameSettingsInfoBody")!;
  const gameSettingsInfoAction = app.querySelector<HTMLDivElement>("#gameSettingsInfoAction")!;
  const gameSettingsInfoActionBtn = app.querySelector<HTMLButtonElement>("#gameSettingsInfoActionBtn")!;
  const gameSettingsInfoActionNote = app.querySelector<HTMLDivElement>("#gameSettingsInfoActionNote")!;
  const gameSettingsInfoClose = app.querySelector<HTMLButtonElement>("#gameSettingsInfoClose")!;
  const gameSettingsMenuItems = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-game-settings-modal-key]"));
  const homeSoundNoticeModal = app.querySelector<HTMLDivElement>("#homeSoundNoticeModal")!;
  const homeSoundNoticeDialog = app.querySelector<HTMLDivElement>("#homeSoundNoticeDialog")!;
  const homeSoundNoticeClose = app.querySelector<HTMLButtonElement>("#homeSoundNoticeClose")!;
  const ruleBtn = app.querySelector<HTMLButtonElement>("#ruleBtn")!;
  const ruleModalOverlay = app.querySelector<HTMLDivElement>("#ruleModalOverlay")!;
  const ruleModalCloseBtn = app.querySelector<HTMLButtonElement>("#ruleModalCloseBtn")!;
  const nameEl = app.querySelector<HTMLInputElement>("#playerName")!;
  const nameCommitBtn = app.querySelector<HTMLButtonElement>("#nameCommitBtn")!;
  const nameErrorEl = app.querySelector<HTMLDivElement>("#nameError")!;
  const diffEl = app.querySelector<HTMLSelectElement>("#difficulty")!;
  const gameTypeEl = app.querySelector<HTMLSelectElement>("#gameType")!;
  const startBtn = app.querySelector<HTMLButtonElement>("#startBtn")!;
  const roleHintEl = app.querySelector<HTMLDivElement>("#roleHint")!;

  const createRoomBtn = app.querySelector<HTMLButtonElement>("#createRoomBtn")!;
  const inviteUrlEl = app.querySelector<HTMLInputElement>("#inviteUrl")!;
  const copyInviteBtn = app.querySelector<HTMLButtonElement>("#copyInviteBtn")!;
  const participantsEl = app.querySelector<HTMLDivElement>("#participants")!;
  const reorderSlotEl = app.querySelector<HTMLDivElement>("#reorderSlot")!;
  const reorderHintEl = app.querySelector<HTMLDivElement>("#reorderHint")!;

  let reorderBtn: HTMLButtonElement | null = null;
  const connStatusEl = app.querySelector<HTMLDivElement>("#connStatus")!;
  const leaveRoomBtn = app.querySelector<HTMLButtonElement>("#leaveRoomBtn")!;

  const updateSoundButton = () => {
    soundBtn.textContent = isSoundEnabled() ? "🔊" : "🔇";
  };

  updateSoundButton();

  const setGameSettingsMenuOpen = (open: boolean) => {
    gameSettingsMenuOverlay.classList.toggle("is-open", open);
    gameSettingsMenuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
    gameSettingsMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");

    if (!open) return;

    const isMobileMenu = window.matchMedia?.("(orientation: portrait) and (max-width: 820px)")?.matches ?? false;
    if (isMobileMenu) {
      gameSettingsMenuPanel.style.top = "";
      gameSettingsMenuPanel.style.left = "";
      gameSettingsMenuPanel.style.right = "";
      return;
    }

    const rect = gameSettingsMenuBtn.getBoundingClientRect();
    const panelWidth = gameSettingsMenuPanel.offsetWidth;
    gameSettingsMenuPanel.style.top = `${Math.max(12, rect.top)}px`;
    gameSettingsMenuPanel.style.left = `${Math.max(12, rect.right - panelWidth)}px`;
    gameSettingsMenuPanel.style.right = "auto";
  };

  const closeGameSettingsMenu = () => setGameSettingsMenuOpen(false);

  const setGameSettingsInfoOpen = (open: boolean) => {
    gameSettingsInfoModal.classList.toggle("is-open", open);
    gameSettingsInfoModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const openGameSettingsInfo = (key: GameSettingsMenuKey) => {
    const content = GAME_SETTINGS_MENU_CONTENT[key];
    gameSettingsInfoHeading.textContent = content.title;
    gameSettingsInfoBody.innerHTML = content.bodyHtml;

    if (content.actionLabel) {
      gameSettingsInfoAction.style.display = "grid";
      gameSettingsInfoActionBtn.textContent = content.actionLabel;
      gameSettingsInfoActionNote.textContent = content.actionNote ?? "";
      gameSettingsInfoActionNote.style.display = content.actionNote ? "block" : "none";
    } else {
      gameSettingsInfoAction.style.display = "none";
      gameSettingsInfoActionBtn.textContent = "";
      gameSettingsInfoActionNote.textContent = "";
      gameSettingsInfoActionNote.style.display = "none";
    }

    setGameSettingsInfoOpen(true);
  };

  const leaveCurrentLobbyForNavigation = () => {
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
      try {
        ws.send(JSON.stringify({ type: mySeatIndex === 0 ? "HOST_DISBAND" : "LEAVE" }));
      } catch { }
    }
    resetLobbyConnectionState();
  };

  soundBtn.onclick = () => {
    const next = toggleSound();
    updateSoundButton();
    if (next) {
      playButtonSe();
    }
  };

  gameSettingsMenuBtn.onclick = () => {
    playButtonSe();
    setGameSettingsMenuOpen(!gameSettingsMenuOverlay.classList.contains("is-open"));
  };

  gameSettingsMenuClose.onclick = () => {
    playButtonSe();
    closeGameSettingsMenu();
  };

  gameSettingsMenuOverlay.onclick = (ev) => {
    if (ev.target !== gameSettingsMenuOverlay) return;
    closeGameSettingsMenu();
  };

  gameSettingsMenuPanel.onclick = (ev) => {
    ev.stopPropagation();
  };

  gameSettingsBackHomeBtn?.addEventListener("click", () => {
    playButtonSe();
    closeGameSettingsMenu();
    leaveCurrentLobbyForNavigation();
    handlers.onGoUserHome();
  });

  gameSettingsBackTitleBtn.onclick = () => {
    playButtonSe();
    closeGameSettingsMenu();
    leaveCurrentLobbyForNavigation();
    handlers.onGoTitle();
  };

  for (const item of gameSettingsMenuItems) {
    item.addEventListener("click", () => {
      const key = item.dataset.gameSettingsModalKey as GameSettingsMenuKey | undefined;
      if (!key) return;
      playButtonSe();
      closeGameSettingsMenu();
      openGameSettingsInfo(key);
    });
  }

  gameSettingsInfoActionBtn.onclick = () => {
    playButtonSe();
    window.location.href = new URL("./contact.html", window.location.href).toString();
  };

  gameSettingsInfoClose.onclick = () => {
    playButtonSe();
    setGameSettingsInfoOpen(false);
  };

  gameSettingsInfoModal.onclick = (ev) => {
    if (ev.target !== gameSettingsInfoModal) return;
    setGameSettingsInfoOpen(false);
  };

  gameSettingsInfoDialog.onclick = (ev) => {
    ev.stopPropagation();
  };

  const setHomeSoundNoticeOpen = (open: boolean) => {
    homeSoundNoticeModal.classList.toggle("is-open", open);
    homeSoundNoticeModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeHomeSoundNotice = () => {
    markSoundNoticeShown();
    setHomeSoundNoticeOpen(false);
  };

  homeSoundNoticeClose.onclick = () => {
    closeHomeSoundNotice();
  };

  homeSoundNoticeModal.onclick = (ev) => {
    if (ev.target !== homeSoundNoticeModal) return;
    closeHomeSoundNotice();
  };

  homeSoundNoticeDialog.onclick = (ev) => {
    ev.stopPropagation();
  };

  if (!hasShownSoundNotice()) {
    setHomeSoundNoticeOpen(true);
  }

  const openRuleModal = () => {
    ruleModalOverlay.style.display = "flex";
  };

  const closeRuleModal = () => {
    ruleModalOverlay.style.display = "none";
  };

  ruleBtn.onclick = () => {
    playButtonSe();
    openRuleModal();
  };

  ruleModalCloseBtn.onclick = () => {
    playButtonSe();
    closeRuleModal();
  };

  ruleModalOverlay.onclick = (ev) => {
    if (ev.target !== ruleModalOverlay) return;
    closeRuleModal();
  };

  diffEl.value = config.difficulty;
  gameTypeEl.value = String(config.gameType);

  const showJoinFailAndReturnHome = (notice: MpNotice, forceHomeScreen = false) => {
    mpNoticeModal.show(notice, {
      hideTitle: true,
      closeOnOverlay: false,
      onClose: () => {
        redirectToHome(forceHomeScreen);
      },
    });
  };

  const parseGameType = (v: string): GameType => {
    if (v === "EXTRA") return "EXTRA";
    const n = Number(v);
    if (n === 100 || n === 200 || n === 300 || n === 400 || n === 500) return n;
    return 100;
  };

  // 非表示だけどログ用
  const setStatus = (s: string) => {
    connStatusEl.textContent = s;
  };


  const CIRCLED = ["①", "②", "③", "④"] as const;

  const normalizePlayOrder = (st: LobbyState) => {
    const po = (st as any).playOrder;
    if (!Array.isArray(po) || po.length !== 4) return [0, 1, 2, 3];
    const nums = po.map((n: any) => Number(n));
    const ok = nums.every((n) => Number.isInteger(n) && n >= 0 && n <= 3);
    if (!ok) return [0, 1, 2, 3];
    const uniq = new Set(nums);
    if (uniq.size !== 4) return [0, 1, 2, 3];
    return nums as [number, number, number, number];
  };

  const renderParticipants = (st: LobbyState | null) => {
    if (!st) {
      participantsEl.innerHTML = `<div style="opacity:0.75;">未接続</div>`;
      return;
    }

    const order = normalizePlayOrder(st);
    const isHost = mySeatIndex === 0;
    const canPick = reorderMode && isHost && !st.locked;

    participantsEl.innerHTML = order
      .map((seatIndex) => {
        const seat = st.seats[seatIndex];
        const isMe = mySeatIndex === seatIndex;
        const border = isMe ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(255,255,255,0.16)";
        const bg = isMe ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        const cursor = canPick ? "pointer" : "default";

        const pickedAt = draftOrder.indexOf(seatIndex);
        const orderBadge = canPick && pickedAt >= 0
          ? `<span style="margin-left:6px;font-weight:950;">${CIRCLED[pickedAt] ?? ""}</span>`
          : "";

        const titleName = lobbyTitleName(seat);
        const guestBadge = seat.isGuest
          ? `<span class="lobbyGuestBadge">ゲスト</span>`
          : "";

        return `
          <div data-seat-index="${seatIndex}" style="display:flex;align-items:center;gap:10px;padding:10px;border:${border};border-radius:12px;background:${bg};cursor:${cursor};">
            <div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                        background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.12);font-size:16px;">
              ${userIconContentHtml(seat.iconId, 45)}
            </div>
            <div style="flex:1;min-width:0;display:grid;gap:2px;">
              <div style="font-weight:850;display:flex;align-items:center;gap:6px;min-width:0;">
                <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(shortName(seat.name))}</span>
                ${guestBadge}
                ${orderBadge}
              </div>
              ${titleName ? `<div class="lobbyTitleName">称号：${escapeHtml(truncateText(titleName, 12))}</div>` : ""}
            </div>
            <div style="font-size:12px;opacity:0.75;">${escapeHtml(seatLabel(seatIndex))}</div>
          </div>
        `;
      })
      .join("");

    if (!canPick) return;

    const rows = Array.from(participantsEl.querySelectorAll<HTMLDivElement>("[data-seat-index]"));
    rows.forEach((row) => {
      row.onclick = () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!lobby) return;
        if (mySeatIndex !== 0) return;
        if (lobby.locked) return;

        const seatIndex = Number((row as any).dataset.seatIndex);
        if (!Number.isInteger(seatIndex) || seatIndex < 0 || seatIndex > 3) return;
        if (draftOrder.includes(seatIndex)) return; // 2回押しは無視

        draftOrder = [...draftOrder, seatIndex];

        if (draftOrder.length >= 4) {
          const po = draftOrder.slice(0, 4) as [number, number, number, number];

          // 4人目で即確定：先にローカル反映してから同期
          (lobby as any).playOrder = po;
          try {
            ws.send(JSON.stringify({ type: "HOST_SET_PLAY_ORDER", playOrder: po }));
          } catch { }

          reorderMode = false;
          draftOrder = [];
        }

        renderParticipants(lobby);
        applyRole();
      };
    });
  };


  const applyRole = () => {
    const isConnected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = isConnected && mySeatIndex === 0;

    // 接続中：名前/アイコンは全員OK、難易度/タイプ/開始はHOSTのみ
    diffEl.disabled = isConnected ? !isHost : false;
    gameTypeEl.disabled = isConnected ? !isHost : false;
    startBtn.disabled = isConnected ? !isHost : false;

    createRoomBtn.disabled = !!roomId;
    // 入れ替えボタン（HOSTのみ・開始前のみ）
    const canReorder = isConnected && isHost && !lobby?.locked;
    // ボタン分の空間は常に確保（ボタン自体は必要な時だけ描画）
    ensureReorderButton(!!canReorder);

    if (!canReorder) {
      reorderMode = false;
      draftOrder = [];
    }

    // 退出/解散ボタン（接続中のみ表示：高さ固定）
    if (isConnected) {
      leaveRoomBtn.style.visibility = "visible";
      leaveRoomBtn.style.pointerEvents = "auto";
      leaveRoomBtn.textContent = getLeaveRoomButtonText(isHost);
    } else {
      leaveRoomBtn.style.visibility = "hidden";
      leaveRoomBtn.style.pointerEvents = "none";
      leaveRoomBtn.textContent = getLeaveRoomButtonText(false);
    }

    updateReorderHint();

    roleHintEl.textContent = !isConnected
      ? "ローカルプレイ（マルチ未接続）"
      : isHost
        ? "HOSTとして接続中（難易度/タイプ/開始が操作可能）"
        : "参加者として接続中（名前/アイコンのみ変更可能）";
  };

  const updateConfigLocal = (playerName = committedName) => {
    handlers.onChange({
      playerName,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    });
  };

  const setNameError = (message: string | null) => {
    if (message) {
      nameErrorEl.textContent = message;
      nameErrorEl.style.visibility = "visible";
      return;
    }

    nameErrorEl.textContent = "";
    nameErrorEl.style.visibility = "hidden";
  };

  const updateNameControls = () => {
    const result = validatePlayerName(nameEl.value);
    const hasDraft = nameEl.value !== committedName;

    if (result === "tooLong") setNameError(`名前は${MAX_PLAYER_NAME_LENGTH}文字以内で入力してください`);
    else if (result === "ng") setNameError("この名前は使用できません");
    else setNameError(null);

    nameCommitBtn.disabled = result !== "ok" || !hasDraft;
  };

  const syncCommittedName = (nextName: string) => {
    const hadDraft = nameEl.value !== committedName;
    committedName = nextName;

    if (!hadDraft || document.activeElement !== nameEl) {
      nameEl.value = nextName;
    }

    updateConfigLocal(committedName);
    updateNameControls();
  };

  const commitName = () => {
    const result = validatePlayerName(nameEl.value);
    if (result === "empty") {
      setNameError("名前を入力してください");
      return;
    }
    if (result === "tooLong") {
      setNameError(`名前は${MAX_PLAYER_NAME_LENGTH}文字以内で入力してください`);
      return;
    }
    if (result === "ng") {
      setNameError("この名前は使用できません");
      return;
    }

    const nextName = nameEl.value.trim();
    committedName = nextName;
    nameEl.value = nextName;
    setNameError(null);
    updateConfigLocal(committedName);

    if (lobby && mySeatIndex != null && lobby.seats[mySeatIndex]) {
      lobby.seats[mySeatIndex].name = committedName;
      renderParticipants(lobby);
    }

    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
      ws.send(JSON.stringify({ type: "COMMIT_NAME", name: committedName }));
    }

    updateNameControls();
  };

  // ---- icon picker ----
  let pickerOpen = false;
  const openPicker = () => {
    pickerOpen = true;
    iconPicker.style.display = "block";
  };
  const closePicker = () => {
    pickerOpen = false;
    iconPicker.style.display = "none";
  };

  iconBtn.addEventListener("click", (e) => {
    playButtonSe();
    e.stopPropagation();
    pickerOpen ? closePicker() : openPicker();
  });

  iconOptButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      playButtonSe();
      e.stopPropagation();
      const iconId = resolveUserIconId(btn.dataset.icon || DEFAULT_PLAYER_ICON_ID);

      localIconId = iconId;
      iconBtn.dataset.iconId = iconId;
      iconBtn.innerHTML = userIconContentHtml(iconId, 44);
      closePicker();

      if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex != null) {
        ws.send(JSON.stringify({ type: "UPDATE_ICON", iconId }));
      }
    });
  });

  app.addEventListener("click", () => closePicker());
  profileRow.addEventListener("click", (e) => e.stopPropagation());

  const connectWs = (rid: string) => {
    try {
      ws?.close();
    } catch { }

    const token = sessionStorage.getItem(`hostToken:${rid}`) ?? "";
    const wsUrl = token
      ? `${wsBase}/api/rooms/${rid}/ws?token=${encodeURIComponent(token)}`
      : `${wsBase}/api/rooms/${rid}/ws`;

    setStatus("connecting");
    ws = new WebSocket(wsUrl);

    const syncGuestFlagToLobby = () => {
      if (!ws || ws.readyState !== WebSocket.OPEN || mySeatIndex == null) return;
      ws.send(JSON.stringify({ type: "UPDATE_GUEST", isGuest: !!config.isGuest }));
      if (lobby?.seats?.[mySeatIndex]) {
        lobby.seats[mySeatIndex].isGuest = !!config.isGuest;
        if (config.isGuest) lobby.seats[mySeatIndex].titleName = "";
        else lobby.seats[mySeatIndex].titleName = getSelectedUserTitleName();
      }
    };

    ws.onmessage = (ev) => {
      let raw: any;
      try {
        raw = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      if (raw && raw.type === "ROOM_DISBANDED") {
        if (pendingRedirect || pendingLeaveDestination) {
          pendingRedirect = false;
          resetLobbyConnectionState();
          navigateAfterLeaveRoom();
          return;
        }

        handleHostDisbandedAtHome();
        return;
      }

      // GAME_STATE / GAME_STATES が来たら main.ts に引き渡して遷移
      if ((raw?.type === "GAME_STATE" && raw.state) || (raw?.type === "GAME_STATES" && Array.isArray(raw.states))) {
        if (!ws || mySeatIndex == null || !roomId) return;

        const initial: GameState =
          raw.type === "GAME_STATE" ? (raw.state as GameState) : (raw.states[0] as GameState);

        handlers.onEnterMpGame(
          {
            ws,
            roomId,
            seatIndex: (() => {
              const po = lobby ? normalizePlayOrder(lobby) : ([0, 1, 2, 3] as [number, number, number, number]);
              const idx = po.indexOf(mySeatIndex);
              return idx >= 0 ? idx : mySeatIndex;
            })(),
            isHost: mySeatIndex === 0,
            npcDifficulty: (lobby?.npcDifficulty ?? diffEl.value) as Difficulty,
          },
          initial
        );
        return;
      }

      if (isWelcomeMsg(raw)) {
        mySeatIndex = raw.seatIndex;
        lobby = raw.state;

        const me = lobby.seats[mySeatIndex];
        if (me) {
          localIconId = resolveUserIconId(me.iconId);
          iconBtn.dataset.iconId = localIconId;
          iconBtn.innerHTML = userIconContentHtml(localIconId, 44);
          syncCommittedName(me.name);
        }

        diffEl.value = lobby.npcDifficulty;
        gameTypeEl.value = lobby.gameType;

        inviteUrlEl.value = `${location.origin}?room=${lobby.roomId}`;

        syncGuestFlagToLobby();
        renderParticipants(lobby);
        applyRole();
        return;
      }

      if (isRoomStateMsg(raw)) {
        lobby = raw.state;

        diffEl.value = lobby.npcDifficulty;
        gameTypeEl.value = lobby.gameType;

        if (mySeatIndex != null) {
          const me = lobby.seats[mySeatIndex];
          if (me) {
            localIconId = resolveUserIconId(me.iconId);
            iconBtn.dataset.iconId = localIconId;
            iconBtn.innerHTML = userIconContentHtml(localIconId, 44);
            syncCommittedName(me.name);
          }
        }

        inviteUrlEl.value = `${location.origin}?room=${lobby.roomId}`;
        renderParticipants(lobby);
        applyRole();
        return;
      }
    };

    ws.onclose = (ev) => {
      if (ev.reason === "disband" && !pendingRedirect && !pendingLeaveDestination) {
        handleHostDisbandedAtHome();
        return;
      }

      lobby = null;
      mySeatIndex = null;
      reorderMode = false;
      draftOrder = [];
      renderParticipants(null);
      applyRole();

      if (pendingRedirect || pendingLeaveDestination) {
        pendingRedirect = false;
        resetLobbyConnectionState();
        navigateAfterLeaveRoom();
      }
    };

    ws.onerror = () => setStatus("ws error");
  };

  async function preflightAndJoin(rid: string) {
    const hasHostToken = !!sessionStorage.getItem(`hostToken:${rid}`);

    try {
      const res = await fetch(`${apiBase}/api/rooms/${rid}/state`, { method: "GET" });

      const statusNotice = getPreflightStatusNotice(res.status, hasHostToken);
      if (statusNotice) {
        showJoinFailAndReturnHome(statusNotice, hasHostToken);
        return;
      }

      if (!res.ok) {
        showJoinFailAndReturnHome(getPreflightUnexpectedStatusNotice(hasHostToken), hasHostToken);
        return;
      }

      const st = (await res.json()) as LobbyState;

      if (Date.now() > st.expiresAt) {
        showJoinFailAndReturnHome(getInviteExpiredNotice());
        return;
      }

      if (st.locked) {
        showJoinFailAndReturnHome(getLockedRoomNotice());
        return;
      }

      const full = st.seats.slice(1).every((s) => s.kind !== "NPC");
      if (full) {
        showJoinFailAndReturnHome(getRoomFullNotice());
        return;
      }

      inviteUrlEl.value = `${location.origin}?room=${rid}`;
      connectWs(rid);
    } catch {
      flashAndRedirectHome(getJoinFailedNotice(), hasHostToken);
      return;
    }
  }

  // ---- events ----
  nameEl.oninput = () => {
    updateNameControls();
  };

  nameEl.onkeydown = (ev) => {
    if (ev.key !== "Enter") return;
    if (nameCommitBtn.disabled) return;

    ev.preventDefault();
    commitName();
  };

  nameCommitBtn.onclick = () => {
    playButtonSe();
    commitName();
  };

  diffEl.onchange = () => {
    updateConfigLocal();
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex === 0) {
      ws.send(
        JSON.stringify({
          type: "HOST_SET_CONFIG",
          npcDifficulty: diffEl.value,
          gameType: gameTypeEl.value,
        })
      );
    }
  };

  gameTypeEl.onchange = () => {
    updateConfigLocal();
    if (ws && ws.readyState === WebSocket.OPEN && mySeatIndex === 0) {
      ws.send(
        JSON.stringify({
          type: "HOST_SET_CONFIG",
          npcDifficulty: diffEl.value,
          gameType: gameTypeEl.value,
        })
      );
    }
  };

  startBtn.onclick = () => {
    const validation = validatePlayerName(nameEl.value);
    if (validation === "empty") {
      setNameError("名前を入力してください");
      return;
    }
    if (validation === "tooLong") {
      setNameError(`名前は${MAX_PLAYER_NAME_LENGTH}文字以内で入力してください`);
      return;
    }
    if (validation === "ng") {
      setNameError("この名前は使用できません");
      return;
    }

    startButtonSe();

    const isConnected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = isConnected && mySeatIndex === 0;
    const hasDraft = nameEl.value !== committedName;
    const playerName = hasDraft ? defaultPlayerName(mySeatIndex, isConnected) : committedName;

    const cfg: HomeConfig = {
      playerName,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    };

    if (!isConnected) {
      handlers.onStart(cfg);
      return;
    }
    if (isHost) {
      ws!.send(JSON.stringify({ type: "HOST_START" }));
    }
  };

  createRoomBtn.onclick = async () => {
    playButtonSe();
    try {
      const res = await fetch(`${apiBase}/api/rooms`, { method: "POST" });
      const data = await res.json();

      const rid = String(data.roomId);
      roomId = rid;
      sessionStorage.setItem(`hostToken:${rid}`, String(data.hostToken));

      const next = new URL(location.href);
      next.searchParams.set("room", rid);
      history.replaceState(null, "", next.toString());

      inviteUrlEl.value = `${location.origin}?room=${rid}`;
      connectWs(rid);
    } catch (e) {
      setStatus(String(e));
    }
  };

  copyInviteBtn.onclick = async () => {
    playButtonSe();
    const text = inviteUrlEl.value.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 失敗してもUIは変えない
    }
  };

  leaveRoomBtn.onclick = () => {
    playButtonSe();
    leaveOrDisbandAndNavigate();
  };

  const isMobile = () => window.matchMedia("(max-width: 520px)").matches;

  const updateReorderHint = () => {
    const connected = !!ws && ws.readyState === WebSocket.OPEN && !!lobby;
    const isHost = connected && mySeatIndex === 0;

    // 高さ固定：入れ替えモードの開始/終了で参加者一覧の位置がズレないように、
    // 「表示する可能性がある状況」では常にヒント枠の空間を確保する。
    const shouldReserve = connected && isHost && !lobby?.locked;
    const canShow = shouldReserve && reorderMode;

    if (!shouldReserve) {
      reorderHintEl.style.display = "none";
      reorderHintEl.style.visibility = "hidden";
      reorderHintEl.textContent = "";
      reorderHintEl.innerHTML = "";
      return;
    }

    // まず空間を確保（スマホは2行分）
    reorderHintEl.style.display = "flex";
    reorderHintEl.style.flexDirection = "column";
    reorderHintEl.style.alignItems = "center";
    reorderHintEl.style.justifyContent = "center";
    reorderHintEl.style.minHeight = isMobile() ? "44px" : "24px";
    reorderHintEl.style.visibility = canShow ? "visible" : "hidden";

    if (!canShow) {
      // 空枠（高さだけ確保）
      reorderHintEl.innerHTML = isMobile() ? `<div>&nbsp;</div><div>&nbsp;</div>` : `&nbsp;`;
      return;
    }

    const nextNum = Math.min(4, draftOrder.length + 1);
    if (isMobile()) {
      reorderHintEl.innerHTML = `<div>${nextNum}番目を</div><div>選択してください</div>`;
    } else {
      reorderHintEl.textContent = `${nextNum}番目を選択してください`;
    }
  };

  const ensureReorderButton = (canReorder: boolean) => {
    if (!canReorder) {
      if (reorderBtn?.parentElement) reorderBtn.parentElement.removeChild(reorderBtn);
      reorderBtn = null;
      return;
    }

    if (!reorderBtn) {
      const btn = document.createElement("button");
      btn.id = "reorderBtn";
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "順番を入れ替える";
      btn.style.width = "auto";
      btn.style.padding = "8px 10px";
      btn.style.fontWeight = "900";
      btn.style.whiteSpace = "nowrap";
      btn.onclick = () => {
        playButtonSe();
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        if (!lobby) return;
        if (mySeatIndex !== 0) return;
        if (lobby.locked) return;

        // 押すたびにやり直し（仕様）
        reorderMode = true;
        draftOrder = [];
        renderParticipants(lobby);
        applyRole();
      };
      reorderBtn = btn;
    }

    if (reorderBtn.parentElement !== reorderSlotEl) {
      reorderSlotEl.innerHTML = "";
      reorderSlotEl.appendChild(reorderBtn);
    }

    reorderBtn.disabled = false;
  };

  committedName = config.playerName;
  updateConfigLocal(committedName);
  updateNameControls();

  if (roomId) {
    preflightAndJoin(roomId);
  } else {
    renderParticipants(null);
    applyRole();
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
