import { playButtonSe, startButtonSe } from "../core/sound";

type TitleModalKey = "privacy" | "terms" | "credits" | "contact";

type TitleModalContent = {
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionNote?: string;
  actionDisabled?: boolean;
};

const TITLE_MODAL_CONTENT: Record<TitleModalKey, TitleModalContent> = {
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
      <p><strong>タイトル</strong><br>100GAME⁺</p>
      <p><strong>企画・開発</strong><br>考え中</p>
      <p><strong>使用技術</strong><br>TypeScript / Vite / Cloudflare</p>
      <p>クレジット表記は、今後の追加要素に応じて更新する予定です。</p>
    `,
  },
  contact: {
    title: "お問い合わせ",
    bodyHtml: `
      <p>本ゲームで不明なことや不具合の報告等の各種お問い合わせは、専用のお問い合わせページよりご連絡ください。</p>
      <p>お問い合わせ内容を確認のうえ、必要に応じて対応いたします。</p>
    `,
    actionLabel: "お問い合わせ",
    actionNote: "※お問い合わせページは現在準備中です。",
    actionDisabled: true,
  },
};

export function renderTitle(app: HTMLDivElement, handlers: { onStart: () => void }) {
  app.innerHTML = `
    <div class="titleScreen">
      <div class="titleTopLinks" aria-label="タイトルメニュー">
        <button class="titleTopLink" type="button" data-modal-key="privacy">プライバシーポリシー</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="terms">利用規約</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="credits">クレジット</button>
        <span class="titleTopLinkDivider" aria-hidden="true">｜</span>
        <button class="titleTopLink" type="button" data-modal-key="contact">お問い合わせ</button>
      </div>

      <div class="titleMenuAnchor">
        <button id="titleMenuBtn" class="titleMenuBtn" type="button" aria-label="メニュー" aria-expanded="false">≡</button>
      </div>

      <div id="titleMenuOverlay" class="titleMenuOverlay" aria-hidden="true">
        <div id="titleMenuPanel" class="titleMenuPanel" role="menu" aria-label="タイトルメニュー">
          <div class="titleMenuPanelHead">
            <div class="titleMenuPanelTitle">MENU</div>
            <button id="titleMenuClose" class="titleMenuClose" type="button" aria-label="メニューを閉じる">×</button>
          </div>
          <button class="titleMenuItem" type="button" data-modal-key="privacy">プライバシーポリシー</button>
          <button class="titleMenuItem" type="button" data-modal-key="terms">利用規約</button>
          <button class="titleMenuItem" type="button" data-modal-key="credits">クレジット</button>
          <button class="titleMenuItem" type="button" data-modal-key="contact">お問い合わせ</button>
        </div>
      </div>

      <div class="titleHero">
        <h1 class="appTitle titleHeroLogo">100GAME⁺</h1>
        <div class="titleHeroKana">100ゲームプラス</div>
        <button id="titleStartBtn" class="btn titleStartBtn" type="button">ゲームスタート</button>
      </div>

      <div id="titleInfoModal" class="titleInfoModal" aria-hidden="true">
        <div id="titleInfoDialog" class="titleInfoDialog" role="dialog" aria-modal="true" aria-labelledby="titleInfoHeading">
          <div class="titleInfoHeader">
            <div id="titleInfoHeading" class="titleInfoHeading"></div>
          </div>
          <div id="titleInfoBody" class="titleInfoBody"></div>
          <div id="titleInfoAction" class="titleInfoAction" style="display:none;">
            <button id="titleInfoActionBtn" class="btn titleInfoActionBtn" type="button"></button>
            <div id="titleInfoActionNote" class="titleInfoActionNote"></div>
          </div>
          <div class="titleInfoFooter">
            <button id="titleInfoClose" class="btn" type="button">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const startBtn = app.querySelector<HTMLButtonElement>("#titleStartBtn");
  const menuBtn = app.querySelector<HTMLButtonElement>("#titleMenuBtn");
  const menuOverlay = app.querySelector<HTMLDivElement>("#titleMenuOverlay");
  const menuPanel = app.querySelector<HTMLDivElement>("#titleMenuPanel");
  const menuClose = app.querySelector<HTMLButtonElement>("#titleMenuClose");
  const modal = app.querySelector<HTMLDivElement>("#titleInfoModal");
  const modalDialog = app.querySelector<HTMLDivElement>("#titleInfoDialog");
  const modalHeading = app.querySelector<HTMLDivElement>("#titleInfoHeading");
  const modalBody = app.querySelector<HTMLDivElement>("#titleInfoBody");
  const modalAction = app.querySelector<HTMLDivElement>("#titleInfoAction");
  const modalActionBtn = app.querySelector<HTMLButtonElement>("#titleInfoActionBtn");
  const modalActionNote = app.querySelector<HTMLDivElement>("#titleInfoActionNote");
  const modalClose = app.querySelector<HTMLButtonElement>("#titleInfoClose");
  const menuItems = Array.from(app.querySelectorAll<HTMLButtonElement>("[data-modal-key]"));

  if (
    !startBtn ||
    !menuBtn ||
    !menuOverlay ||
    !menuPanel ||
    !menuClose ||
    !modal ||
    !modalDialog ||
    !modalHeading ||
    !modalBody ||
    !modalAction ||
    !modalActionBtn ||
    !modalActionNote ||
    !modalClose
  ) {
    throw new Error("title screen elements not found");
  }

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

  const openModal = (key: TitleModalKey) => {
    const content = TITLE_MODAL_CONTENT[key];
    modalHeading.textContent = content.title;
    modalBody.innerHTML = content.bodyHtml;

    if (content.actionLabel) {
      modalAction.style.display = "grid";
      modalActionBtn.textContent = content.actionLabel;
      modalActionBtn.disabled = !!content.actionDisabled;
      modalActionNote.textContent = content.actionNote ?? "";
      modalActionNote.style.display = content.actionNote ? "block" : "none";
    } else {
      modalAction.style.display = "none";
      modalActionBtn.textContent = "";
      modalActionBtn.disabled = false;
      modalActionNote.textContent = "";
      modalActionNote.style.display = "none";
    }

    setModalOpen(true);
  };

  startBtn.addEventListener("click", () => {
    startButtonSe();
    handlers.onStart();
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

  for (const item of menuItems) {
    item.addEventListener("click", () => {
      const key = item.dataset.modalKey as TitleModalKey | undefined;
      if (!key) return;
      playButtonSe();
      closeMenu();
      openModal(key);
    });
  }

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
