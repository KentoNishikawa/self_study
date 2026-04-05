// src/ui/render.ts
import type { Card, Difficulty, GameState, SystemLog } from "../core/types";
import { iconContentHtml } from "../icons/iconPresets";
import { playButtonSe, playCardDealSe, playCardPlaySe, playResultSe, startButtonSe } from "../core/sound";

let prevHistoryLen = -1;
let gameStartOverlayTimer: number | null = null;
let prevHideHandUntilTurnLimitStarts = false;
let prevLatestReshuffleLogId: number | null | undefined = undefined;
let lastPlayedResultSeKey: string | null = null;

type HandVisualSlot =
  | { kind: "card"; card: Card }
  | { kind: "placeholder"; key: string };

let handVisualSlots: HandVisualSlot[] = [];
let handPlaceholderSeq = 0;

function nextHandPlaceholderKey() {
  handPlaceholderSeq += 1;
  return `hand-ph-${handPlaceholderSeq}`;
}

function syncHandVisualSlots(cards: Card[], reset: boolean) {
  if (reset || handVisualSlots.length === 0) {
    handVisualSlots = cards.map((card) => ({ kind: "card", card }));
    return handVisualSlots;
  }

  const prevCardIds = new Set(
    handVisualSlots
      .filter((slot): slot is Extract<HandVisualSlot, { kind: "card" }> => slot.kind === "card")
      .map((slot) => slot.card.id)
  );
  const prevCardCount = handVisualSlots.filter((slot) => slot.kind === "card").length;
  const matchedCount = cards.filter((card) => prevCardIds.has(card.id)).length;

  if (cards.length > prevCardCount || (cards.length === 4 && matchedCount === 0)) {
    handVisualSlots = cards.map((card) => ({ kind: "card", card }));
    return handVisualSlots;
  }

  const nextSlots: HandVisualSlot[] = [];
  let cardIndex = 0;

  for (const slot of handVisualSlots) {
    const currentCard = cards[cardIndex];

    if (!currentCard) {
      nextSlots.push(slot.kind === "placeholder" ? slot : { kind: "placeholder", key: nextHandPlaceholderKey() });
      continue;
    }

    if (slot.kind === "placeholder") {
      nextSlots.push(slot);
      continue;
    }

    if (slot.card.id === currentCard.id) {
      nextSlots.push({ kind: "card", card: currentCard });
      cardIndex += 1;
      continue;
    }

    nextSlots.push({ kind: "placeholder", key: nextHandPlaceholderKey() });
  }

  while (cardIndex < cards.length) {
    nextSlots.push({ kind: "card", card: cards[cardIndex] });
    cardIndex += 1;
  }

  handVisualSlots = nextSlots;
  return handVisualSlots;
}

export const GAME_START_OVERLAY_HOLD_MS = 2500;
export const GAME_START_OVERLAY_FADE_MS = 220;

function showGameStartOverlay(modeLabel: string, turnText: string) {
  const existing = document.getElementById("gameStartOverlay");
  existing?.remove();

  if (gameStartOverlayTimer != null) {
    window.clearTimeout(gameStartOverlayTimer);
    gameStartOverlayTimer = null;
  }

  const overlay = document.createElement("div");
  overlay.id = "gameStartOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.padding = "24px";
  overlay.style.background = "rgba(7, 10, 18, 0.30)";
  overlay.style.backdropFilter = "blur(2px)";
  overlay.style.zIndex = "10020";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transition = `opacity ${GAME_START_OVERLAY_FADE_MS}ms ease`;

  const box = document.createElement("div");
  box.style.minWidth = "min(92vw, 440px)";
  box.style.maxWidth = "520px";
  box.style.padding = "24px 20px";
  box.style.borderRadius = "24px";
  box.style.border = "1px solid rgba(255,255,255,0.18)";
  box.style.background = "linear-gradient(180deg, rgba(18,24,38,0.94), rgba(10,14,24,0.90))";
  box.style.boxShadow = "0 18px 60px rgba(0,0,0,0.45)";
  box.style.textAlign = "center";
  box.style.color = "#ffffff";
  box.style.transform = "translateY(8px) scale(0.98)";
  box.style.transition = `transform ${GAME_START_OVERLAY_FADE_MS}ms ease`;

  const title = document.createElement("div");
  title.textContent = "ゲーム開始";
  title.style.fontSize = "clamp(30px, 7vw, 42px)";
  title.style.fontWeight = "950";
  title.style.letterSpacing = "0.08em";
  title.style.lineHeight = "1.1";

  const mode = document.createElement("div");
  mode.textContent = modeLabel;
  mode.style.marginTop = "10px";
  mode.style.fontSize = "clamp(18px, 4.6vw, 24px)";
  mode.style.fontWeight = "800";
  mode.style.lineHeight = "1.25";

  const turn = document.createElement("div");
  turn.textContent = turnText;
  turn.style.marginTop = "6px";
  turn.style.fontSize = "clamp(18px, 4.6vw, 24px)";
  turn.style.fontWeight = "800";
  turn.style.lineHeight = "1.25";

  box.appendChild(title);
  box.appendChild(mode);
  box.appendChild(turn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "0.75";
    box.style.transform = "translateY(0) scale(1)";
  });

  gameStartOverlayTimer = window.setTimeout(() => {
    overlay.style.opacity = "0";
    box.style.transform = "translateY(6px) scale(0.98)";

    window.setTimeout(() => {
      if (overlay.parentElement) overlay.remove();
    }, GAME_START_OVERLAY_FADE_MS);

    gameStartOverlayTimer = null;
  }, GAME_START_OVERLAY_HOLD_MS);
}

// 退出ログ（サーバ未対応でも表示できるよう、HUMAN→NPC を検知して補完）
let extraSystemLogs: SystemLog[] = [];
let extraSystemLogId = 1_000_000;
let prevSeatSnap: Array<{ kind: GameState["seats"][number]["kind"]; name: string }> | null = null;
let leftLogged: boolean[] = [false, false, false, false];

export function resetRenderTransientState() {
  prevHistoryLen = -1;

  if (gameStartOverlayTimer != null) {
    window.clearTimeout(gameStartOverlayTimer);
    gameStartOverlayTimer = null;
  }

  extraSystemLogs = [];
  extraSystemLogId = 1_000_000;
  prevSeatSnap = null;
  leftLogged = [false, false, false, false];

  handVisualSlots = [];
  handPlaceholderSeq = 0;
  prevHideHandUntilTurnLimitStarts = false;
  prevLatestReshuffleLogId = undefined;
  lastPlayedResultSeKey = null;

  document.getElementById("gameStartOverlay")?.remove();
}

// =====================
// small helpers
// =====================
function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function suitToSymbol(suit: Card["suit"]): string {
  switch (suit) {
    case "S":
      return "♠";
    case "H":
      return "♥";
    case "D":
      return "♦";
    case "C":
      return "♣";
    case "JOKER":
      return "🃏";
  }
}

function isRedSuit(card: Card): boolean {
  return card.suit === "H" || card.suit === "D";
}

function cardLabel(card: Card): string {
  if (card.rank === "JOKER") return "🃏JOKER";
  return `${suitToSymbol(card.suit)}${card.rank}`;
}

// targetLabel を外から受け取る（EXTRA進行中は???）
function modeText(mode: GameState["mode"], targetLabel: string): string {
  return mode === "UP" ? `加算（${targetLabel}以上で負け）` : "減算（0以下で負け）";
}

function modeShort(m: "UP" | "DOWN") {
  return m === "UP" ? "加算" : "減算";
}

function cardLogLabel(card: Card, value: number) {
  if (card.rank === "JOKER") return `🃏(${value})`;
  if (card.suit === "S" && card.rank === "3" && value === 0) return "♠3(0)";
  return cardLabel(card);
}

function cardClass(card: Card): string {
  if (card.rank === "JOKER") return "joker";
  return isRedSuit(card) ? "red" : "black";
}

function cardInnerHtml(card: Card, valueForJoker?: number) {
  const corner =
    card.rank === "JOKER"
      ? `🃏<br>${valueForJoker != null ? valueForJoker : ""}`
      : `${suitToSymbol(card.suit)}${card.rank}`;

  const center =
    card.rank === "JOKER"
      ? `<div class="rank">🃏</div><div class="suit">${valueForJoker != null ? `(${valueForJoker})` : "JOKER"
      }</div>`
      : `<div class="rank">${card.rank}</div><div class="suit">${suitToSymbol(card.suit)}</div>`;

  return `
    <div class="corner">${corner}</div>
    <div class="center">${center}</div>
    <div class="corner br">${corner}</div>
  `;
}

function cardBackInnerHtml(baseUrl: string) {
  return `<img src="${baseUrl}icons/back.png" alt="" draggable="false" style="width:100%;height:100%;display:block;object-fit:cover;border-radius:inherit;pointer-events:none;user-select:none;" />`;
}

// =====================
// Tooltip (single instance, body appended)
// =====================
let tip = document.querySelector<HTMLDivElement>("#cardTip");
if (!tip) {
  tip = document.createElement("div");
  tip.id = "cardTip";
  tip.className = "cardTip";
  tip.style.position = "fixed";
  tip.style.zIndex = "9999";
  tip.style.display = "none";
  tip.style.pointerEvents = "none";
  document.body.appendChild(tip);
}

function cardTipTitle(card: Card) {
  return card.rank === "JOKER" ? "🃏 JOKER" : `${suitToSymbol(card.suit)} ${card.rank}`;
}

function baseValue(card: Card, jokerValue?: number): number | null {
  if (card.rank === "JOKER") return jokerValue ?? null;
  if (card.suit === "S" && card.rank === "3") return 0;
  if (card.rank === "A") return 1;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
  const n = Number(card.rank);
  return Number.isFinite(n) ? n : null;
}

function cardCountText(card: Card, jokerValue?: number): string {
  if (card.rank === "JOKER") return jokerValue != null ? String(jokerValue) : "1〜49（選択）";
  const v = baseValue(card, jokerValue);
  return v == null ? "—" : String(v);
}

function cardEffectText(card: Card): string {
  if (card.rank === "JOKER") return "値を宣言（1〜49）";
  if (card.rank === "J") return "モード反転（加算↔減算）";
  if (card.suit === "S" && card.rank === "3") return "相殺（合計変化なし）";
  return "特殊効果なし";
}

function currentDeltaHint(card: Card, mode: GameState["mode"], jokerValue?: number): string {
  const v = baseValue(card, jokerValue);
  if (v == null) return "";

  if (card.suit === "S" && card.rank === "3") return "（今出すと ±0）";

  const delta = mode === "UP" ? v : -v;

  if (card.rank === "J") {
    const arrow = mode === "UP" ? "（加算→減算）" : "（減算→加算）";
    return `（今出すと ${delta >= 0 ? "+" : ""}${delta}）${arrow}`;
  }
  return `（今出すと ${delta >= 0 ? "+" : ""}${delta}）`;
}

function showTip(e: MouseEvent, card: Card, mode: GameState["mode"], jokerValue?: number) {
  if (!tip) return;

  const count = cardCountText(card, jokerValue);
  const effect = cardEffectText(card);
  const hint = currentDeltaHint(card, mode, jokerValue);

  tip.innerHTML = `
    <div class="tTitle">${escapeHtml(cardTipTitle(card))}</div>
    <div class="tRow">
      <div class="tKey">■カウント数</div>
      <div class="tVal mono">${escapeHtml(count)} ${escapeHtml(hint)}</div>
    </div>
    <div style="height:6px;"></div>
    <div class="tRow">
      <div class="tKey">■特殊効果</div>
      <div class="tVal">${escapeHtml(effect)}</div>
    </div>
  `;

  tip.style.display = "block";
  moveTip(e);
}

function moveTip(e: MouseEvent) {
  if (!tip || tip.style.display === "none") return;

  const pad = 14;
  let x = e.clientX + 14;
  let y = e.clientY + 14;

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;

  const r = tip.getBoundingClientRect();
  if (r.right > window.innerWidth - pad) x = window.innerWidth - pad - r.width;
  if (r.bottom > window.innerHeight - pad) y = window.innerHeight - pad - r.height;

  tip.style.left = `${Math.max(pad, x)}px`;
  tip.style.top = `${Math.max(pad, y)}px`;
}

function hideTip() {
  if (!tip) return;
  tip.style.display = "none";
}

// =====================
// Mobile: 2-tap hand play + info panel
// =====================
let selectedHandIndex: number | null = null;
let selectedHandCardId: string | null = null;
let lastHandDiv: HTMLDivElement | null = null;
let lastTopPanelsDiv: HTMLDivElement | null = null;

const small = window.matchMedia?.("(max-width: 820px)")?.matches ?? false;

const isTouchEnvironment = () => {
  try {
    const noHover = window.matchMedia?.("(hover: none)")?.matches ?? false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const touch = (navigator.maxTouchPoints ?? 0) > 0;
    return noHover || coarse || (touch && small);
  } catch {
    return false;
  }
};

let cachedIsTouchUI = false;
try {
  cachedIsTouchUI = isTouchEnvironment();
  const refresh = () => (cachedIsTouchUI = isTouchEnvironment());
  window.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", refresh as any);
} catch {
  cachedIsTouchUI = false;
}

let handInfoOverlay = document.querySelector<HTMLDivElement>("#handInfoOverlay");
if (!handInfoOverlay) {
  handInfoOverlay = document.createElement("div");
  handInfoOverlay.id = "handInfoOverlay";
  // ここは「場の最新カード枠 + プレイヤー状況枠」を包む領域に差し替えて使う
  // なので position/size はアンカー側（#topPanels）に対して absolute で全面に。
  handInfoOverlay.style.position = "absolute";
  handInfoOverlay.style.inset = "0";
  handInfoOverlay.style.display = "none";
  handInfoOverlay.style.alignItems = "center";
  handInfoOverlay.style.justifyContent = "center";
  handInfoOverlay.style.padding = "10px";
  handInfoOverlay.style.boxSizing = "border-box";
  handInfoOverlay.style.zIndex = "9998";
  // 従来の見た目を維持するため、背景は透明（クリック受け取り用の面だけ確保）
  handInfoOverlay.style.background = "transparent";
  document.body.appendChild(handInfoOverlay);
}

let handInfo = document.querySelector<HTMLDivElement>("#handInfoPanel");
if (!handInfo) {
  handInfo = document.createElement("div");
  handInfo.id = "handInfoPanel";
  // ★従来のカード詳細UIの見た目は維持（位置だけアンカーに追従させる）
  handInfo.style.position = "relative";
  handInfo.style.width = "min(520px, calc(100% - 24px))";
  handInfo.style.maxHeight = "calc(100% - 20px)";
  handInfo.style.overflow = "auto";
  handInfo.style.background = "rgba(15,18,26,0.96)";
  handInfo.style.border = "1px solid rgba(255,255,255,0.12)";
  handInfo.style.borderRadius = "16px";
  handInfo.style.padding = "12px";
  handInfo.style.color = "white";
  handInfo.style.boxShadow = "0 18px 60px rgba(0,0,0,.55)";
  handInfo.style.display = "none";
}

// handInfo は overlay の中に格納して扱う
if (handInfoOverlay && handInfo.parentElement !== handInfoOverlay) {
  handInfoOverlay.appendChild(handInfo);
}

const buildCardInfoHtml = (card: Card, mode: GameState["mode"]) => {
  const count = cardCountText(card);
  const effect = cardEffectText(card);
  const hint = currentDeltaHint(card, mode);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
      <div style="font-weight:950;">${escapeHtml(cardTipTitle(card))}</div>
      <button id="hiClose"
        style="
          border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.06);
          color:white;
          font-weight:900;
          border-radius:12px;
          padding:6px 10px;
          cursor:pointer;
        "
      >×</button>
    </div>

    <div class="tRow">
      <div class="tKey">■カウント数</div>
      <div class="tVal mono">${escapeHtml(count)} ${escapeHtml(hint)}</div>
    </div>
    <div style="height:6px;"></div>
    <div class="tRow">
      <div class="tKey">■特殊効果</div>
      <div class="tVal">${escapeHtml(effect)}</div>
    </div>

    <div style="margin-top:10px;color:rgba(255,255,255,0.75);font-weight:800;">
      ※もう一度タップで出す
    </div>
  `;
};

const openHandInfo = (card: Card, mode: GameState["mode"]) => {
  if (!handInfo) return;
  if (handInfoOverlay && lastTopPanelsDiv) {
    // 念のため、毎回アンカー内に移動（renderで再生成されても追従）
    if (handInfoOverlay.parentElement !== lastTopPanelsDiv) {
      lastTopPanelsDiv.appendChild(handInfoOverlay);
    }
    // TopPanels が完全に画面外なら、見える位置に寄せる（固定表示→アンカー表示に変わったため）
    const r = lastTopPanelsDiv.getBoundingClientRect();
    const outOfView = r.bottom < 0 || r.top > window.innerHeight;
    if (outOfView) {
      try {
        lastTopPanelsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        // ignore
      }
    }
    handInfoOverlay.style.display = "flex";
  }
  handInfo.innerHTML = buildCardInfoHtml(card, mode);
  handInfo.style.display = "block";

  const closeBtn = handInfo.querySelector<HTMLButtonElement>("#hiClose");
  closeBtn?.addEventListener("click", () => {
    selectedHandIndex = null;
    selectedHandCardId = null;
    closeHandInfo();
  });
};

const closeHandInfo = () => {
  if (!handInfo) return;
  if (handInfoOverlay) handInfoOverlay.style.display = "none";
  handInfo.style.display = "none";
  handInfo.innerHTML = "";
  applyHandSelectionStyles();
};

const applyHandSelectionStyles = () => {
  if (!lastHandDiv) return;
  const btns = lastHandDiv.querySelectorAll<HTMLButtonElement>("button[data-hand-index]");
  btns.forEach((b) => {
    const idx = Number(b.dataset.handIndex);
    const selected = selectedHandIndex === idx;

    if (selected) {
      b.style.transform = "translateY(-6px) scale(1.03)";
      b.style.outline = "3px solid rgba(255,255,255,0.28)";
      b.style.outlineOffset = "2px";
      b.style.boxShadow = "0 14px 28px rgba(0,0,0,0.45)";
    } else {
      b.style.transform = "";
      b.style.outline = "";
      b.style.outlineOffset = "";
      b.style.boxShadow = "";
    }
  });
};

let handInfoDocHooked = false;
const ensureHandInfoDocListener = () => {
  if (handInfoDocHooked) return;
  handInfoDocHooked = true;

  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (!handInfo || handInfo.style.display === "none") return;

      const t = ev.target as HTMLElement | null;
      if (!t) return;

      if (t.closest("#handInfoPanel")) return;
      if (t.closest("[data-hand-index]")) return;

      selectedHandIndex = null;
      selectedHandCardId = null;
      closeHandInfo();
    },
    { capture: true }
  );
};

// =====================
// Result Modal
// =====================
let dismissedResultKey: string | null = null;

let resultRoot = document.querySelector<HTMLDivElement>("#resultModalRoot");
if (!resultRoot) {
  resultRoot = document.createElement("div");
  resultRoot.id = "resultModalRoot";
  document.body.appendChild(resultRoot);
}

function makeResultKey(state: GameState): string | null {
  if (state.result.status === "PLAYING") return null;
  return [
    state.result.status,
    state.result.status === "LOSE" ? String(state.result.loserSeat) : "x",
    String(state.history.length),
    String(state.total),
    state.mode,
    state.result.reason ?? "",
  ].join("|");
}

function originText(origin: GameState["history"][number]["origin"]): string {
  return origin === "HAND" ? "手札" : origin === "DECK" ? "山札" : "—";
}

function renderResultModal(show: boolean, key: string, title: string, bodyHtml: string) {
  if (!resultRoot) return;

  if (!show) {
    resultRoot.innerHTML = "";
    return;
  }

  resultRoot.innerHTML = `
    <div id="rmOverlay"
      style="
        position:fixed; inset:0;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,.55);
        z-index:10000;
        padding:16px;
      ">
      <div
        style="
          width:min(560px, 100%);
          border-radius:16px;
          background:rgba(15,18,26,.92);
          border:1px solid rgba(255,255,255,.14);
          box-shadow:0 18px 60px rgba(0,0,0,.55);
          padding:18px 18px 14px 18px;
          color:#fff;
        "
        role="dialog" aria-modal="true"
      >
        <div style="font-weight:950;font-size:16px;margin-bottom:10px; text-align:center;">
          ${escapeHtml(title)}
        </div>

        <div style="color:rgba(255,255,255,.88);line-height:1.6;margin-bottom:14px; text-align:center">
          ${bodyHtml}
        </div>

        <div style="display:flex;justify-content:center;gap:8px;">
          <button id="rmClose" class="btn">閉じる</button>
        </div>
      </div>
    </div>
  `;

  const overlay = document.querySelector<HTMLDivElement>("#rmOverlay");
  const closeBtn = document.querySelector<HTMLButtonElement>("#rmClose");

  const close = () => {
    dismissedResultKey = key;
    if (resultRoot) resultRoot.innerHTML = "";
  };

  closeBtn?.addEventListener("click", () => {
    playButtonSe();
    close();
  });
  overlay?.addEventListener("click", (ev: MouseEvent) => {
    if (ev.target === overlay) close();
  });
}

// =====================
// render main
// =====================
export function render(
  app: HTMLDivElement,
  state: GameState,
  difficulty: Difficulty,
  uiLocked: boolean,
  handlers: {
    onPlayHand: (handIndex: number) => void;
    onDrawPlay: () => void;
    onRestart: () => void;
    onGoHome: () => void;
  }
) {
  try {
    hideTip();

    const resultKey = makeResultKey(state);
    if (state.result.status === "PLAYING") dismissedResultKey = null;

    const lastPlay = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    const currentLen = state.history.length;

    if (prevHistoryLen > currentLen) {
      prevHideHandUntilTurnLimitStarts = false;
      prevLatestReshuffleLogId = undefined;
      lastPlayedResultSeKey = null;
    }

    let modalTitle = "";
    let modalBodyHtml = "";

    const popupShortName = (name: string) => {
      const chars = Array.from(name);
      if (chars.length <= 6) return name;
      return chars.slice(0, 6).join("") + "…";
    };

    if (state.result.status === "LOSE") {
      const loserName = popupShortName(state.seats[state.result.loserSeat].name);
      modalTitle = `LOSER：${loserName}`;

      if (lastPlay) {
        const who = popupShortName(state.seats[lastPlay.seat].name);
        const o = originText(lastPlay.origin);
        const cardTxt = cardLogLabel(lastPlay.card, lastPlay.value);
        const after = lastPlay.afterTotal ?? state.total;

        modalBodyHtml =
          `${escapeHtml(who)}が${escapeHtml(o)}から ` +
          `<span class="mono">${escapeHtml(cardTxt)}</span> を出し、` +
          `場の数が<br><span class="mono">${escapeHtml(String(after))}</span> になった！`;
      } else {
        modalBodyHtml = "決着しました。";
      }
    } else if (state.result.status !== "PLAYING") {
      modalTitle = "無効試合";
      modalBodyHtml = escapeHtml(state.result.reason ?? "無効試合になりました。");
    }

    const showResultModal =
      !!resultKey && dismissedResultKey !== resultKey && state.result.status !== "PLAYING";

    if (showResultModal && resultKey && lastPlayedResultSeKey !== resultKey) {
      playResultSe();
      lastPlayedResultSeKey = resultKey;
    }

    if (resultKey) renderResultModal(showResultModal, resultKey, modalTitle, modalBodyHtml);
    else renderResultModal(false, "", "", "");

    const baseUrl = import.meta.env.BASE_URL;

    const me = state.seats[0];
    const turnSeat = state.seats[state.turn];

    const mpSeatOffsetRaw = Number((state as any).__mpSeatOffset);
    const hasMpOrder = Number.isFinite(mpSeatOffsetRaw) && mpSeatOffsetRaw >= 0 && mpSeatOffsetRaw <= 3;
    const mpSeatOffset = hasMpOrder ? mpSeatOffsetRaw : 0;

    const unrotateIndex = (i: number) => (i - mpSeatOffset + 4) % 4;
    const listSeats = hasMpOrder
      ? ([0, 1, 2, 3].map((i) => state.seats[unrotateIndex(i)]) as any)
      : state.seats;
    const listTurn = hasMpOrder ? (state.turn + mpSeatOffset) % 4 : state.turn;

    const shortName = (name: string) => {
      const chars = Array.from(name);
      if (chars.length <= 6) return name;
      return chars.slice(0, 6).join("") + "…";
    };

    if ((state as any).__showStartOverlay) {
      (state as any).__showStartOverlay = false;
      showGameStartOverlay(`${state.gameType}モード`, `${shortName(turnSeat.name)}のターンです`);
    }

    const formatLeaveInfo = (msg: string) => {
      const suffix = "が退出しました。以降はNPCが操作します。";
      const idx = msg.indexOf(suffix);
      if (idx > 0) {
        const nm = msg.slice(0, idx);
        return shortName(nm) + suffix;
      }
      return msg;
    };

    const diffText = difficulty === "SMART" ? "SMART" : "CASUAL";
    const isPlaying = state.result.status === "PLAYING";
    if (isPlaying) lastPlayedResultSeKey = null;
    const canOperate = isPlaying && state.turn === 0 && !uiLocked;
    const shouldHideHandUntilTurnLimitStarts = Boolean((state as any).__hideHandUntilTurnLimitStarts);

    if (prevHideHandUntilTurnLimitStarts && !shouldHideHandUntilTurnLimitStarts && me.hand.length > 0) {
      playCardDealSe();
    }
    prevHideHandUntilTurnLimitStarts = shouldHideHandUntilTurnLimitStarts;

    const latestReshuffleLog = [...(state.systemLogs ?? [])].reverse().find((log) => log.kind !== "INFO") ?? null;
    const latestReshuffleLogId = latestReshuffleLog?.id ?? null;
    if (prevLatestReshuffleLogId === undefined) {
      prevLatestReshuffleLogId = latestReshuffleLogId;
    } else {
      if (latestReshuffleLogId != null && latestReshuffleLogId !== prevLatestReshuffleLogId) {
        playCardDealSe();
      }
      prevLatestReshuffleLogId = latestReshuffleLogId;
    }

    const last = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    const lastName = last ? shortName(state.seats[last.seat].name) : "—";
    const lastCard = last ? last.card : null;
    const lastValue = last ? last.value : undefined;
    const lastNote = last?.note ?? "";

    const targetLabel =
      state.gameType === "EXTRA" && state.result.status === "PLAYING" ? "???" : String(state.target);

    const formatResultReason = (reason: string) => {
      let text = reason.trim();

      text = text.replace(/\s+$/g, "");
      text = text.replace(/（+/g, "（");
      text = text.replace(/）+/g, "）");
      text = text.replace(/（EXTRA上限値=[^）]*）/g, "");

      const openCount = (text.match(/（/g) ?? []).length;
      const closeCount = (text.match(/）/g) ?? []).length;
      if (openCount > closeCount) {
        text += "）".repeat(openCount - closeCount);
      }

      return text;
    };

    const resultHtml =
      state.result.status === "PLAYING"
        ? `<span style="color:#22c55e;font-weight:900;">進行中</span>`
        : state.result.status === "LOSE"
          ? `<span style="color:#ff4d6d;font-weight:950;">【敗北】${escapeHtml(shortName(state.seats[state.result.loserSeat].name))}：${escapeHtml(formatResultReason(state.result.reason ?? ""))}</span>`
          : `<span style="color:#ff4d6d;font-weight:950;">無効試合:${escapeHtml(
            formatResultReason(state.result.reason ?? "")
          )}</span>`;

    app.innerHTML = `
      <header class="appHeader">
        <h1 class="appTitle">100GAME⁺</h1>
        <div class="appTag">BATTLE</div>
      </header>

      <div class="panel">
        <div class="row kpiRow">
          <span class="badge ${state.mode === "UP" ? "up" : "down"}">
            ${modeText(state.mode, escapeHtml(targetLabel))}
          </span>

          <div class="kpi">
            <span class="label">合計</span>
            <span class="value">${state.total}</span>
          </div>

          <div class="kpi">
            <span class="label">山札</span>
            <span class="value small">${state.deck.length}</span>
          </div>

          <div class="kpi">
            <span class="label">手番</span>
            <span class="value small" style="white-space:nowrap;">${escapeHtml(shortName(turnSeat.name))}</span>
          </div>

          <div class="kpi">
            <span class="label">難易度</span>
            <span class="value small">${diffText}</span>
          </div>

          <div class="spacer"></div>

          <div class="status">
            ${state.result.status === "PLAYING"
        ? `<span class="statusText playing">進行中</span>`
        : `<span class="statusText ended">決着</span>`
      }
          </div>
        </div>

        <!-- ★LIMIT：角丸HPバー -->
        <div id="limitRow"
          style="height:24px;display:flex;align-items:center;gap:10px;margin-top:6px;user-select:none;"
        >
          <div style="font-weight:950;opacity:.85;letter-spacing:.5px;">LIMIT</div>
          <div
            style="
              flex:1;
              position:relative;
              height:12px;
              border-radius:999px;
              background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,255,255,0.12);
              overflow:hidden;
            "
            aria-label="turn time limit"
          >
            <div id="limitFill"
              style="height:100%;width:100%;border-radius:999px;background:rgba(34,197,94,0.65);"
            ></div>
          </div>
          <div id="limitSec"
            style="min-width:46px;text-align:right;font-weight:950;font-variant-numeric:tabular-nums;color:#22c55e;font-size:13px;"
          >60s</div>
        </div>

        <!-- ★結果表示の高さは常に確保 -->
        <div class="kpiResult"
          style="height:24px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;margin-top:6px;">
          ${state.result.status === "PLAYING" ? "" : resultHtml}
        </div>
      </div>

      <div class="grid2" id="topPanels" style="position:relative;">
        <div class="panel">
          <div class="row" style="align-items:flex-start;">
            <div class="cardArea">
              <div class="playCard ${lastCard ? cardClass(lastCard) : "black"} ${lastCard?.rank === "JOKER" ? "joker" : ""
      }">
                ${lastCard
        ? cardInnerHtml(lastCard, lastCard.rank === "JOKER" ? lastValue : undefined)
        : `<div class="center emptyPlayCard"><div class="rank">—</div><div class="suit"><span>場にカード</span><span>なし</span></div></div>`
      }
              </div>

              <div class="playMeta">
                <div class="title"><span class="titlePc">場の最新カード</span><span class="titleMobile">場の最新カード</span></div>
                <div class="sub">${last
        ? `${escapeHtml(lastName)} <br> ${escapeHtml(cardLogLabel(last.card, last.value))}`
        : "—"
      }</div>
                ${lastNote
        ? `<div class="sub">${lastNote.includes("反転") ? "※反転" : `※${escapeHtml(lastNote)}`}</div>`
        : `<div class="sub" style="opacity:.7;">&nbsp;</div>`
      }
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div style="font-weight:950;margin-bottom:10px;">プレイヤー状況</div>
          <div class="playerList">
            ${listSeats
        .map((s: any, idx: number) => {
          const isTurn = idx === listTurn;
          return `
                  <div class=\"playerRow\">
                    <div>
                      <div class=\"name\" style=\"display:flex;align-items:center;gap:6px;\"><span style=\"width:18px;display:inline-flex;justify-content:center;\">${iconContentHtml((s as any).iconId, 30)}</span><span>${escapeHtml(shortName(s.name))}</span></div>
                      <div class=\"muted\">手札 ${s.hand.length}枚</div>
                    </div>
                    <div class=\"turn\" style=\"opacity:${isTurn ? 1 : 0};\">▶</div>
                  </div>
                `;
        })
        .join("")}
          </div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <div class="panel handPanel${canOperate ? " isMyTurn" : ""}">
        <div class="handPanelTitle">あなたの手札（${escapeHtml(shortName(me.name))}）</div>
        <div id="hand" class="handGrid"></div>

        <div style="height:10px;"></div>

        <div class="row">
          <button id="drawBtn" class="btn">山札から引いて即出し</button>
          <button id="restartBtn" class="btn">もう一度プレイする</button>
          <button id="homeBtn" class="btn">ホーム画面に戻る</button>

          <span style="color:rgba(255,255,255,0.65);font-weight:700;">
            ※操作できるのはあなたの手番だけ
          </span>
        </div>
      </div>

      <div style="height:12px;"></div>

      <div class="panel">
        <div id="log" class="logBox"></div>
      </div>
    `;

    const handDiv = app.querySelector<HTMLDivElement>("#hand")!;
    const drawBtn = app.querySelector<HTMLButtonElement>("#drawBtn")!;
    const restartBtn = app.querySelector<HTMLButtonElement>("#restartBtn")!;
    const homeBtn = app.querySelector<HTMLButtonElement>("#homeBtn")!;
    const logDiv = app.querySelector<HTMLDivElement>("#log")!;

    // スマホ手札タップ時のカード詳細モーダルは「場の最新カード枠 + プレイヤー状況枠」に固定表示
    lastTopPanelsDiv = app.querySelector<HTMLDivElement>("#topPanels");
    if (handInfoOverlay && lastTopPanelsDiv && handInfoOverlay.parentElement !== lastTopPanelsDiv) {
      lastTopPanelsDiv.appendChild(handInfoOverlay);
    }

    // ===== 場札アニメ =====
    const playCardEl = app.querySelector<HTMLDivElement>(".playCard");

    if (playCardEl) {
      if (prevHistoryLen === -1) prevHistoryLen = currentLen;

      if (currentLen > prevHistoryLen) {
        playCardPlaySe();
        playCardEl.getAnimations().forEach((a) => a.cancel());

        requestAnimationFrame(() => {
          const isUp = state.mode === "UP";
          const outlineColor = isUp ? "rgba(255, 77, 109, 0.45)" : "rgba(59, 130, 246, 0.45)";

          playCardEl.style.outline = `4px solid ${outlineColor}`;
          playCardEl.style.outlineOffset = "4px";

          setTimeout(() => {
            try {
              playCardEl.style.outline = "";
              playCardEl.style.outlineOffset = "";
            } catch { }
          }, 220);

          playCardEl.animate(
            [
              { transform: "translateY(8px) scale(0.92) rotate(-2deg)", filter: "brightness(0.98)" },
              { transform: "translateY(-4px) scale(1.03) rotate(1deg)", filter: "brightness(1.05)" },
              { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
            ],
            { duration: 620, easing: "cubic-bezier(.2,1.2,.2,1)" }
          );
        });
      }

      prevHistoryLen = currentLen;

    }
    // ===== /場札アニメ =====

    // =====================
    // 手札（スマホ：2タップ / PC：即出し）
    // =====================
    const isTouchUI = cachedIsTouchUI;
    ensureHandInfoDocListener();
    lastHandDiv = handDiv;

    if (!isTouchUI) {
      selectedHandIndex = null;
      selectedHandCardId = null;
      closeHandInfo();
    }

    // ★スマホUIでも手番以外は誤操作防止のため選択/詳細表示を解除
    if (isTouchUI && !canOperate) {
      selectedHandIndex = null;
      selectedHandCardId = null;
      closeHandInfo();
    }

    handDiv.innerHTML = "";
    const visualSlots = syncHandVisualSlots(me.hand, state.history.length === 0);
    let actualHandIndex = 0;

    visualSlots.forEach((slot) => {
      if (slot.kind === "placeholder") {
        const ph = document.createElement("div");
        ph.className = "cardBtn";
        ph.setAttribute("aria-hidden", "true");
        ph.style.cursor = "default";
        ph.style.pointerEvents = "none";
        ph.style.boxShadow = "none";
        ph.style.background = "linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))";
        ph.style.border = "2px dashed rgba(255,255,255,0.28)";
        ph.style.opacity = "0.82";
        handDiv.appendChild(ph);
        return;
      }

      const card = slot.card;
      const idx = actualHandIndex;
      actualHandIndex += 1;

      const b = document.createElement("button");
      const isFaceDown = shouldHideHandUntilTurnLimitStarts;
      b.className = isFaceDown ? "cardBtn" : `cardBtn ${cardClass(card)} ${card.rank === "JOKER" ? "joker" : ""}`;
      b.type = "button";
      b.innerHTML = isFaceDown ? cardBackInnerHtml(baseUrl) : cardInnerHtml(card);
      if (isFaceDown) {
        b.setAttribute("aria-label", "裏向きカード");
      }

      b.disabled = !canOperate;

      b.dataset.handIndex = String(idx);
      b.setAttribute("data-hand-index", String(idx));

      if (!isTouchUI) {
        b.onclick = () => handlers.onPlayHand(idx);

        if (!isFaceDown) {
          b.onmouseenter = (ev) => showTip(ev as unknown as MouseEvent, card, state.mode);
          b.onmousemove = (ev) => moveTip(ev as unknown as MouseEvent);
          b.onmouseleave = () => hideTip();
        }

        handDiv.appendChild(b);
        return;
      }

      b.onclick = () => {
        if (isFaceDown) return;

        if (selectedHandIndex !== idx || selectedHandCardId !== card.id) {
          selectedHandIndex = idx;
          selectedHandCardId = card.id;
          openHandInfo(card, state.mode);
          applyHandSelectionStyles();
          return;
        }

        if (!canOperate) return;

        selectedHandIndex = null;
        selectedHandCardId = null;
        closeHandInfo();
        handlers.onPlayHand(idx);
      };

      handDiv.appendChild(b);
    });

    applyHandSelectionStyles();

    if (selectedHandIndex != null && selectedHandIndex >= me.hand.length) {
      selectedHandIndex = null;
      selectedHandCardId = null;
      closeHandInfo();
    } else if (
      isTouchUI &&
      selectedHandIndex != null &&
      selectedHandCardId != null &&
      me.hand[selectedHandIndex] &&
      me.hand[selectedHandIndex].id !== selectedHandCardId
    ) {
      selectedHandIndex = null;
      selectedHandCardId = null;
      closeHandInfo();
    } else if (isTouchUI && selectedHandIndex != null) {
      const c = me.hand[selectedHandIndex];
      if (c) openHandInfo(c, state.mode);
    }

    // ボタン類
    drawBtn.disabled = !canOperate || state.deck.length === 0;
    drawBtn.onclick = () => handlers.onDrawPlay();

    const mpIsHost = (state as any).__mpIsHost;
    const restartDisabled = isPlaying || (mpIsHost === false);

    restartBtn.disabled = restartDisabled;
    restartBtn.onclick = () => {
      if (restartBtn.disabled) return;
      startButtonSe();
      handlers.onRestart();
    };

    homeBtn.disabled = false;
    homeBtn.onclick = () => {
      playButtonSe();
      if (isPlaying) {
        const ok = confirm("対戦中です。ホーム画面に戻りますか？");
        if (!ok) return;
      }
      handlers.onGoHome();
    };

    // =====================
    // ログ（PLAY + SYSTEM）
    // =====================

    // 既存ボタンがあれば削除（再描画対策）
    document.getElementById("logToggleBtn")?.remove();
    document.getElementById("logModalOverlay")?.remove();

    // スマホ時のみボタン生成
    logDiv.style.display = "block";
    const pcHeader = document.createElement("div");
    pcHeader.id = "pcLogHeader";
    pcHeader.innerHTML = `
        <div style="font-weight:950;margin-bottom:10px;">ログ（最新が上）</div>
        `;

    if (small) {
      // モーダル生成
      const overlay: HTMLDivElement = document.createElement("div");
      overlay.id = "logModalOverlay";

      const modal: HTMLDivElement = document.createElement("div");
      modal.className = "logModal";

      const closeBtn: HTMLButtonElement = document.createElement("button");
      closeBtn.className = "logModalClose";
      closeBtn.textContent = "×";

      // ×ボタンで閉じる
      closeBtn.onclick = (): void => {
        overlay.classList.remove("open");
      };

      // 背景タップで閉じる
      overlay.addEventListener("click", (e: MouseEvent) => {
        if (e.target === overlay) {
          overlay.classList.remove("open");
        }
      });

      // 「ログを表示」ボタン生成
      const toggleBtn: HTMLButtonElement = document.createElement("button");
      toggleBtn.id = "logToggleBtn";
      toggleBtn.textContent = "ログを表示";
      toggleBtn.className = "btn";

      toggleBtn.onclick = (): void => {
        overlay.classList.add("open");
      };

      const parent: HTMLElement | null = logDiv.parentElement;
      parent?.insertBefore(toggleBtn, logDiv);

      modal.appendChild(closeBtn);
      modal.appendChild(logDiv);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

    }
    logDiv.parentElement?.insertBefore(pcHeader, logDiv);

    // 退出ログ（クライアント補完）：HUMAN→NPC を検知して systemLogs に混ぜる
    if (prevHistoryLen > state.history.length) {
      // リスタート等で手数が巻き戻ったらリセット
      extraSystemLogs = [];
      extraSystemLogId = 1_000_000;
      prevSeatSnap = null;
      leftLogged = [false, false, false, false];
    }

    const serverInfoMsgs = new Set((state.systemLogs ?? []).filter((l) => l.kind === "INFO").map((l) => l.message));
    const serverHasLeaveInfoAt = (afterPlayIndex: number) =>
      (state.systemLogs ?? []).some((l) =>
        l.kind === "INFO" &&
        l.afterPlayIndex === afterPlayIndex &&
        (l.message ?? "").includes("が退出しました。以降はNPCが操作します。")
      );
    // サーバ側で退出ログが付与されている場合はクライアント補完を抑止（重複防止）
    extraSystemLogs = extraSystemLogs.filter((l) => {
      if (serverInfoMsgs.has(l.message)) return false;
      if (l.kind === "INFO" && (l.message ?? "").includes("が退出しました。以降はNPCが操作します。") && serverHasLeaveInfoAt(l.afterPlayIndex)) return false;
      return true;
    });

    const curSnap = state.seats.map((s) => ({ kind: s.kind, name: s.name }));
    if (prevSeatSnap) {
      for (let i = 1; i <= 3; i++) {
        const prev = prevSeatSnap[i];
        const now = curSnap[i];
        if (now.kind === "HUMAN") leftLogged[i] = false;
        if (!leftLogged[i] && prev.kind === "HUMAN" && now.kind === "NPC") {
          const msg = `${prev.name}が退出しました。以降はNPCが操作します。`;
          const afterPlayIndex = Math.max(1, state.history.length);

          if (!serverInfoMsgs.has(msg) && !serverHasLeaveInfoAt(afterPlayIndex)) {
            extraSystemLogs.push({
              id: extraSystemLogId++,
              kind: "INFO",
              afterPlayIndex,
              message: msg,
            });
          }
          leftLogged[i] = true;
        }
      }
    }
    prevSeatSnap = curSnap;
    logDiv.innerHTML = "";

    type PlayEntry = { type: "PLAY"; playNo: number; p: GameState["history"][number] };
    type SysEntry = { type: "SYSTEM"; playNo: number; s: GameState["systemLogs"][number] };
    type Entry = PlayEntry | SysEntry;

    const sysByAfter = new Map<number, GameState["systemLogs"][number][]>();
    for (const s of [...(state.systemLogs ?? []), ...extraSystemLogs]) {
      const key = s.afterPlayIndex;
      const arr = sysByAfter.get(key) ?? [];
      arr.push(s);
      sysByAfter.set(key, arr);
    }

    const entries: Entry[] = [];

    const sysAtZero = sysByAfter.get(0);
    if (sysAtZero) {
      for (const s of sysAtZero) entries.push({ type: "SYSTEM", playNo: 0, s });
    }

    for (let i = 0; i < state.history.length; i++) {
      const playNo = i + 1;
      entries.push({ type: "PLAY", playNo, p: state.history[i] });
      const sys = sysByAfter.get(playNo);
      if (sys) for (const s of sys) entries.push({ type: "SYSTEM", playNo, s });
    }

    const reversed = entries.slice().reverse();

    reversed.forEach((e, idx) => {
      const row = document.createElement("div");
      row.className = "logRow";

      if (e.type === "SYSTEM") {
        row.classList.add("system");

        const left = document.createElement("div");
        left.className = "no";
        left.textContent = "  ";

        const main = document.createElement("div");
        main.className = "main";
        main.textContent =
          e.s.kind === "INFO" ? `🚪 ${formatLeaveInfo(e.s.message ?? "")}` : `🔄 再配布：${e.s.message}`;

        row.appendChild(left);
        row.appendChild(main);
        logDiv.appendChild(row);
        return;
      }

      const p = e.p;
      const originalNo = e.playNo;
      const name = shortName(state.seats[p.seat].name);
      const lbl = cardLogLabel(p.card, p.value);
      const d = p.delta >= 0 ? `+${p.delta}` : `${p.delta}`;

      const modeChange =
        p.beforeMode !== p.afterMode
          ? `（${modeShort(p.beforeMode)}→${modeShort(p.afterMode)}）`
          : `（${modeShort(p.afterMode)}）`;

      const isJ = p.card.rank === "J";
      const isCancel =
        (p.card.suit === "S" && p.card.rank === "3" && p.value === 0) ||
        (p.note?.includes("相殺") ?? false);

      const isLosingPlay =
        idx === 0 && state.result.status === "LOSE" && state.result.loserSeat === p.seat;

      let prefix = "•";
      if (isCancel) {
        prefix = "🛡️";
        row.classList.add("cancel");
      }
      if (isJ) {
        prefix = "🔁";
        row.classList.add("j");
      }
      if (isLosingPlay) {
        prefix = "💥";
        row.classList.add("lose");
      }

      const left = document.createElement("div");
      left.className = "no";
      left.textContent = String(originalNo).padStart(2, "0") + ".";

      const main = document.createElement("div");
      main.className = "main";
      main.style.display = "flex";
      main.style.gap = "8px";
      main.style.alignItems = "baseline";

      const originImg = document.createElement("img");
      originImg.className = "logIcon";

      if (p.origin === "HAND") {
        originImg.alt = "HAND";
        originImg.src = baseUrl + "icons/hand.png";
      } else {
        originImg.alt = "DECK";
        originImg.src = baseUrl + "icons/deck.png";
      }

      const text = document.createElement("span");
      text.textContent = `${prefix} ${name}が${lbl}を出す（${d}）→ 合計:${p.afterTotal} ${modeChange}`;

      main.appendChild(originImg);
      main.appendChild(text);

      row.appendChild(left);
      row.appendChild(main);

      if (p.note) {
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = `※${p.note}`;
        row.appendChild(note);
      }

      logDiv.appendChild(row);
    });

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.style.color = "rgba(255,255,255,0.65)";
      empty.textContent = "まだログはありません";
      logDiv.appendChild(empty);

      if (small) {
        const modal = document.querySelector(".logModal");
        modal?.classList.add("empty");
      }
    }
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e);
    app.innerHTML = `
      <div style="padding:16px;color:#fff;">
        <h2 style="margin:0 0 8px 0;color:#ff4d6d;">描画エラー</h2>
        <pre style="white-space:pre-wrap;background:#0b0d12;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.12);">${escapeHtml(
      msg
    )}</pre>
        <div style="color:rgba(255,255,255,0.7);font-weight:700;">DevTools(Console) も見てね</div>
      </div>
    `;
  }
}