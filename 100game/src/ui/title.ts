import { playButtonSe, startButtonSe } from "../core/sound";

type TitleCardSpec = {
  rank: string;
  suit: "S" | "H" | "D" | "C";
  left: number;
  top: number;
  rotate: number;
  scale: number;
  faceDown?: boolean;
  blur?: number;
  opacity?: number;
  zIndex?: number;
};

const TITLE_CARD_SPECS: TitleCardSpec[] = [
  { rank: "A", suit: "S", left: 8, top: 66, rotate: -18, scale: 1.05, blur: 0.2, opacity: 0.92, zIndex: 1 },
  { rank: "K", suit: "H", left: 18, top: 58, rotate: -8, scale: 0.98, blur: 0.35, opacity: 0.9, zIndex: 2 },
  { rank: "10", suit: "D", left: 34, top: 74, rotate: 10, scale: 1.08, blur: 0.1, opacity: 0.94, zIndex: 3 },
  { rank: "7", suit: "C", left: 47, top: 60, rotate: -12, scale: 1.02, blur: 0.15, opacity: 0.9, zIndex: 4 },
  { rank: "Q", suit: "D", left: 58, top: 69, rotate: 14, scale: 0.96, blur: 0.3, opacity: 0.86, zIndex: 2 },
  { rank: "J", suit: "S", left: 70, top: 56, rotate: -10, scale: 1.04, blur: 0.2, opacity: 0.92, zIndex: 4 },
  { rank: "4", suit: "H", left: 79, top: 72, rotate: 18, scale: 0.95, blur: 0.45, opacity: 0.82, zIndex: 1 },
  { rank: "9", suit: "C", left: 88, top: 61, rotate: -16, scale: 1.0, blur: 0.25, opacity: 0.88, zIndex: 3 },
  { rank: "", suit: "S", left: 27, top: 51, rotate: 12, scale: 1.06, faceDown: true, blur: 0.55, opacity: 0.76, zIndex: 0 },
  { rank: "", suit: "S", left: 83, top: 52, rotate: 8, scale: 1.02, faceDown: true, blur: 0.65, opacity: 0.72, zIndex: 0 },
];

type TitleModalKey = "privacy" | "terms" | "credits" | "contact";

type TitleModalContent = {
  title: string;
  bodyHtml: string;
  actionLabel?: string;
  actionNote?: string;
  actionDisabled?: boolean;
};


function titleSuitSymbol(suit: TitleCardSpec["suit"]) {
  switch (suit) {
    case "S":
      return "♠";
    case "H":
      return "♥";
    case "D":
      return "♦";
    case "C":
      return "♣";
  }
}

function titleSuitColor(suit: TitleCardSpec["suit"]) {
  return suit === "H" || suit === "D" ? "#c53d52" : "#1c2230";
}

function renderTitleCardSvg(card: TitleCardSpec) {
  if (card.faceDown) {
    return `
      <svg viewBox="0 0 140 200" class="titleBgCardSvg" aria-hidden="true">
        <rect x="4" y="4" width="132" height="192" rx="14" fill="#f6f7fb" stroke="rgba(18,22,30,0.35)" stroke-width="2" />
        <rect x="15" y="15" width="110" height="170" rx="10" fill="#9d202a" />
        <rect x="20" y="20" width="100" height="160" rx="8" fill="#c73945" opacity="0.92" />
        <path d="M20 40h100M20 80h100M20 120h100M20 160h100M40 20v160M80 20v160" stroke="rgba(255,255,255,0.22)" stroke-width="3" />
        <rect x="32" y="32" width="76" height="136" rx="8" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2.5" />
        <path d="M70 58l18 18-18 18-18-18 18-18zm0 48l18 18-18 18-18-18 18-18z" fill="rgba(255,255,255,0.28)" />
      </svg>
    `;
  }

  const suit = titleSuitSymbol(card.suit);
  const color = titleSuitColor(card.suit);
  const rank = card.rank;
  const rankFontSize = rank.length >= 2 ? 19 : 22;
  const suitFontSize = rank.length >= 2 ? 18 : 20;

  return `
    <svg viewBox="0 0 140 200" class="titleBgCardSvg" aria-hidden="true">
      <rect x="4" y="4" width="132" height="192" rx="14" fill="#f7f7fa" stroke="rgba(18,22,30,0.35)" stroke-width="2" />
      <rect x="10" y="10" width="120" height="180" rx="12" fill="#fffdfb" opacity="0.94" />
      <g fill="${color}" style="paint-order:stroke;stroke:rgba(255,255,255,0.16);stroke-width:0.35;">
        <text x="18" y="32" font-size="${rankFontSize}" font-weight="900" font-family="Georgia, serif">${rank}</text>
        <text x="18" y="52" font-size="${suitFontSize}" font-family="Georgia, serif">${suit}</text>
        <g transform="rotate(180 112 168)">
          <text x="112" y="168" text-anchor="end" font-size="${rankFontSize}" font-weight="900" font-family="Georgia, serif">${rank}</text>
          <text x="112" y="188" text-anchor="end" font-size="${suitFontSize}" font-family="Georgia, serif">${suit}</text>
        </g>
        <text x="70" y="116" text-anchor="middle" font-size="54" font-family="Georgia, serif">${suit}</text>
      </g>
    </svg>
  `;
}

function renderTitleBackdropCards() {
  return TITLE_CARD_SPECS.map((card, index) => {
    const style = [
      `left:${card.left}%`,
      `top:${card.top}%`,
      `transform:translate(-50%, -50%) rotate(${card.rotate}deg) scale(${card.scale})`,
      `filter:blur(${card.blur ?? 0}px)`,
      `opacity:${card.opacity ?? 1}`,
      `z-index:${card.zIndex ?? index}`,
    ].join(";");

    return `<div class="titleBgCard" style="${style}">${renderTitleCardSvg(card)}</div>`;
  }).join("");
}

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
      <p><strong>企画・開発</strong><br>100GAME Project</p>
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
      <div class="titleBackdrop" aria-hidden="true">
        <div class="titleBackdropAmbient"></div>
        <div class="titleBackdropTable"></div>
        <div class="titleBackdropCards">${renderTitleBackdropCards()}</div>
        <div class="titleBackdropShade"></div>
      </div>

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
