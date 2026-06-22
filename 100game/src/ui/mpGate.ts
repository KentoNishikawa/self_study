import { isSoundEnabled, playButtonSe, startButtonSe, toggleSound } from "../core/sound";

const SOUND_NOTICE_SHOWN_KEY = "100game.soundNoticeShown";

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

export function renderMpGate(
  app: HTMLDivElement,
  handlers: {
    onLoginJoin: () => void;
    onGuestJoin: () => void;
    onCancel: () => void;
  }
) {
  app.innerHTML = `
    <div class="titleScreen mpGateScreen">
      <div class="titleBackdrop" aria-hidden="true">
        <img class="titleMainVisual" src="/assets/title-illustrations/00_title_load.png" alt="" />
        <div class="titleBackdropAmbient"></div>
        <div class="titleBackdropShade"></div>
      </div>

      <div class="mpGateModal" role="dialog" aria-modal="true" aria-labelledby="mpGateHeading">
        <button id="mpGateSoundBtn" class="soundBtn mpGateSoundBtn" type="button" aria-label="音の切り替え">🔊</button>

        <div class="mpGateHeader">
          <div class="mpGateEyebrow">MULTI PLAY</div>
          <h1 id="mpGateHeading" class="mpGateHeading">マルチプレイに参加</h1>
          <p class="mpGateLead">招待された部屋に参加します。ログインして参加するか、ゲストとして参加するかを選択してください。</p>
        </div>

        <div class="mpGateFormArea">
          <label class="mpGateField">
            <span>メールアドレス</span>
            <input id="mpGateEmail" class="mpGateInput" type="email" autocomplete="email" placeholder="mail@example.com" />
          </label>
          <label class="mpGateField">
            <span>パスワード</span>
            <input id="mpGatePassword" class="mpGateInput" type="password" autocomplete="current-password" placeholder="password" />
          </label>

          <div class="mpGateSubLinks" aria-label="アカウントメニュー">
            <button id="mpGateSignup" class="mpGateTextBtn" type="button">新規登録</button>
            <span class="mpGateSubDivider" aria-hidden="true">｜</span>
            <button id="mpGateReset" class="mpGateTextBtn" type="button">パスワード再設定</button>
          </div>
          <div id="mpGateMessage" class="mpGateMessage" aria-live="polite"></div>
        </div>

        <div class="mpGateActions">
          <button id="mpGateLoginJoin" class="btn mpGatePrimaryBtn" type="button">ログインして参加</button>
          <button id="mpGateGuestJoin" class="btn secondary mpGateSecondaryBtn" type="button">ログインせず参加</button>
          <button id="mpGateCancel" class="btn secondary mpGateCancelBtn" type="button">キャンセル</button>
        </div>

        <div class="mpGateGuestNote">
          ゲスト参加の場合、戦績・称号・アイコン等の取得状況は保存されません。
        </div>
      </div>

      <div id="mpGateSoundNoticeModal" class="noticeModalOverlay" aria-hidden="true">
        <div id="mpGateSoundNoticeDialog" class="noticeModalDialog is-compact" role="dialog" aria-modal="true" aria-labelledby="mpGateSoundNoticeHeading">
          <div class="noticeModalHeader">
            <div id="mpGateSoundNoticeHeading" class="noticeModalHeading">ご案内</div>
          </div>
          <div class="noticeModalBody is-center">
            <p>このゲームでは音が発生します</p>
            <p>参加前に、ログイン選択モーダル右上の音ON/OFFボタンで調整できます</p>
          </div>
          <div class="noticeModalFooter">
            <button id="mpGateSoundNoticeClose" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginJoinBtn = app.querySelector<HTMLButtonElement>("#mpGateLoginJoin");
  const guestJoinBtn = app.querySelector<HTMLButtonElement>("#mpGateGuestJoin");
  const cancelBtn = app.querySelector<HTMLButtonElement>("#mpGateCancel");
  const signupBtn = app.querySelector<HTMLButtonElement>("#mpGateSignup");
  const resetBtn = app.querySelector<HTMLButtonElement>("#mpGateReset");
  const soundBtn = app.querySelector<HTMLButtonElement>("#mpGateSoundBtn");
  const messageEl = app.querySelector<HTMLDivElement>("#mpGateMessage");
  const soundNoticeModal = app.querySelector<HTMLDivElement>("#mpGateSoundNoticeModal");
  const soundNoticeDialog = app.querySelector<HTMLDivElement>("#mpGateSoundNoticeDialog");
  const soundNoticeClose = app.querySelector<HTMLButtonElement>("#mpGateSoundNoticeClose");

  if (
    !loginJoinBtn ||
    !guestJoinBtn ||
    !cancelBtn ||
    !signupBtn ||
    !resetBtn ||
    !soundBtn ||
    !messageEl ||
    !soundNoticeModal ||
    !soundNoticeDialog ||
    !soundNoticeClose
  ) {
    throw new Error("mp gate elements not found");
  }

  const updateSoundButton = () => {
    soundBtn.textContent = isSoundEnabled() ? "🔊" : "🔇";
  };

  updateSoundButton();

  const showTempMessage = (message: string) => {
    messageEl.textContent = message;
  };

  const setSoundNoticeOpen = (open: boolean) => {
    soundNoticeModal.classList.toggle("is-open", open);
    soundNoticeModal.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeSoundNotice = () => {
    playButtonSe();
    markSoundNoticeShown();
    setSoundNoticeOpen(false);
  };

  soundNoticeClose.addEventListener("click", () => {
    closeSoundNotice();
  });

  soundNoticeModal.addEventListener("click", (event) => {
    if (event.target !== soundNoticeModal) return;
    closeSoundNotice();
  });

  soundNoticeDialog.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  if (!hasShownSoundNotice()) {
    setSoundNoticeOpen(true);
  }

  loginJoinBtn.addEventListener("click", () => {
    startButtonSe();
    handlers.onLoginJoin();
  });

  guestJoinBtn.addEventListener("click", () => {
    startButtonSe();
    handlers.onGuestJoin();
  });

  cancelBtn.addEventListener("click", () => {
    playButtonSe();
    handlers.onCancel();
  });

  soundBtn.addEventListener("click", () => {
    const next = toggleSound();
    updateSoundButton();
    if (next) {
      playButtonSe();
    }
  });

  signupBtn.addEventListener("click", () => {
    playButtonSe();
    showTempMessage("新規登録画面は後続フェーズで実装予定です。");
  });

  resetBtn.addEventListener("click", () => {
    playButtonSe();
    showTempMessage("パスワード再設定画面は後続フェーズで実装予定です。");
  });
}
