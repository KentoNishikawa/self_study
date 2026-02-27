// src/ui/render.ts
import type { Card, Difficulty, GameState } from "../core/types";

let prevHistoryLen = -1;



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

// ★変更：target表示を外から受け取る（EXTRAは???表示）
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
let lastHandDiv: HTMLDivElement | null = null;

const isTouchEnvironment = () => {
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  const small = window.matchMedia?.("(max-width: 820px)")?.matches ?? false;

  // 既存判定も補助で使う（なくてもOK）
  const noHover = window.matchMedia?.("(hover: none)")?.matches ?? false;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  // 「タッチ可能」かつ「画面が小さい」ならスマホUI扱い（安定）
  return touch && (small || noHover || coarse);
};

let cachedIsTouchUI = false;

try {
  cachedIsTouchUI = isTouchEnvironment();
  window.addEventListener("resize", () => {
    cachedIsTouchUI = isTouchEnvironment();
  });
} catch {
  cachedIsTouchUI = false;
}

// 1個だけ作って使い回す「説明パネル」（スマホ用）
let handInfo = document.querySelector<HTMLDivElement>("#handInfoPanel");
if (!handInfo) {
  handInfo = document.createElement("div");
  handInfo.id = "handInfoPanel";
  handInfo.style.position = "fixed";
  handInfo.style.left = "50%";
  handInfo.style.top = "74px"; // ★手札を塞がないよう上側に固定
  handInfo.style.transform = "translateX(-50%)";
  handInfo.style.width = "min(520px, calc(100% - 24px))";
  handInfo.style.maxHeight = "calc(100vh - 120px)";
  handInfo.style.overflow = "auto";
  handInfo.style.background = "rgba(15,18,26,0.96)";
  handInfo.style.border = "1px solid rgba(255,255,255,0.12)";
  handInfo.style.borderRadius = "16px";
  handInfo.style.padding = "12px";
  handInfo.style.color = "white";
  handInfo.style.boxShadow = "0 18px 60px rgba(0,0,0,.55)";
  handInfo.style.zIndex = "9998";
  handInfo.style.display = "none";
  document.body.appendChild(handInfo);
}

const buildCardInfoHtml = (card: Card, mode: GameState["mode"]) => {
  const count = cardCountText(card);
  const effect = cardEffectText(card);
  const hint = currentDeltaHint(card, mode);

  // ★PCホバーと同じ中身をそのまま流用
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
  `;
};

const openHandInfo = (card: Card, mode: GameState["mode"]) => {
  if (!handInfo) return;
  handInfo.innerHTML = buildCardInfoHtml(card, mode);
  handInfo.style.display = "block";

  const closeBtn = handInfo.querySelector<HTMLButtonElement>("#hiClose");
  closeBtn?.addEventListener("click", () => {
    selectedHandIndex = null;
    closeHandInfo();
  });
};

const closeHandInfo = () => {
  if (!handInfo) return;
  handInfo.style.display = "none";
  handInfo.innerHTML = "";
  applyHandSelectionStyles();
};

// 手札の「選択状態（浮かせ）」を更新
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

// 画面のどこかをタップしたら閉じる（カードタップは閉じない）
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

      // パネル内はOK
      if (t.closest("#handInfoPanel")) return;

      // 手札カードタップは「2タップ判定」に使うので閉じない
      if (t.closest("[data-hand-index]")) return;

      selectedHandIndex = null;
      closeHandInfo();
    },
    { capture: true }
  );
};

// =====================
// Result Modal (single root, body appended)
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

function originText(origin: unknown): string {
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

  closeBtn?.addEventListener("click", close);

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
    hideTip()

    const resultKey = makeResultKey(state);
    if (state.result.status === "PLAYING") dismissedResultKey = null;

    const lastPlay = state.history.length > 0 ? state.history[state.history.length - 1] : null;

    let modalTitle = "";
    let modalBodyHtml = "";

    if (state.result.status === "LOSE") {
      const loserName = state.seats[state.result.loserSeat].name;
      modalTitle = `LOSER：${loserName}`;

      if (lastPlay) {
        const who = state.seats[lastPlay.seat].name;
        const o = originText((lastPlay as any).origin);
        const cardTxt = cardLogLabel(lastPlay.card, lastPlay.value);
        const after = (lastPlay as any).afterTotal ?? state.total;

        modalBodyHtml =
          `${escapeHtml(who)}が${escapeHtml(o)}から ` +
          `<span class="mono">${escapeHtml(cardTxt)}</span> を出し、` +
          `場の数が <span class="mono">${escapeHtml(String(after))}</span> になった！`;
      } else {
        modalBodyHtml = "決着しました。";
      }
    } else if (state.result.status !== "PLAYING") {
      modalTitle = "無効試合";
      modalBodyHtml = escapeHtml(state.result.reason ?? "無効試合になりました。");
    }

    const showResultModal =
      !!resultKey && dismissedResultKey !== resultKey && state.result.status !== "PLAYING";

    if (resultKey) renderResultModal(showResultModal, resultKey, modalTitle, modalBodyHtml);
    else renderResultModal(false, "", "", "");

    const baseUrl = import.meta.env.BASE_URL;

    const me = state.seats[0];
    const turnSeat = state.seats[state.turn];

    const diffText = difficulty === "SMART" ? "SMART" : "CASUAL";

    const isPlaying = state.result.status === "PLAYING";
    const canOperate = isPlaying && state.turn === 0 && !uiLocked;

    const last = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    const lastName = last ? state.seats[last.seat].name : "—";
    const lastCard = last ? last.card : null;
    const lastValue = last ? last.value : undefined;
    const lastNote = last?.note ?? "";

    // ★target表示（EXTRAはPLAYING中だけ???）
    const targetLabel =
      state.gameType === "EXTRA" && state.result.status === "PLAYING" ? "???" : String(state.target);

    const resultHtml =
      state.result.status === "PLAYING"
        ? `<span style="color:#22c55e;font-weight:900;">進行中</span>`
        : state.result.status === "LOSE"
          ? `<span style="color:#ff4d6d;font-weight:950;">敗北：${state.seats[state.result.loserSeat].name
          }（${escapeHtml(state.result.reason ?? "")}）</span>`
          : `<span style="color:#ff4d6d;font-weight:950;">無効試合：${escapeHtml(
            state.result.reason ?? ""
          )}</span>`;

    app.innerHTML = `
      <header class="appHeader">
        <h1 class="appTitle">100ゲーム</h1>
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
            <span class="value small">${escapeHtml(turnSeat.name)}</span>
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

        <div class="kpiResult" style="height:24px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:6px;">
          ${state.result.status === "PLAYING" ? "" : resultHtml}
        </div>
      </div>

      <div class="grid2">
        <div class="panel">
          <div class="row" style="align-items:flex-start;">
            <div class="cardArea">
              <div class="playCard ${lastCard ? cardClass(lastCard) : "black"} ${lastCard?.rank === "JOKER" ? "joker" : ""
      }">
                ${lastCard
        ? cardInnerHtml(lastCard, lastCard.rank === "JOKER" ? lastValue : undefined)
        : `<div class="center"><div class="rank">—</div><div class="suit">まだ場にカードなし</div></div>`
      }
              </div>

              <div class="playMeta">
                <div class="title">場の最新カード</div>
                <div class="sub">${last
        ? `${escapeHtml(lastName)} / ${escapeHtml(cardLogLabel(last.card, last.value))}`
        : "—"
      }</div>
                ${lastNote
        ? `<div class="sub">※${escapeHtml(lastNote)}</div>`
        : `<div class="sub" style="opacity:.7;">&nbsp;</div>`
      }
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div style="font-weight:950;margin-bottom:10px;">プレイヤー状況</div>
          <div class="playerList">
            ${state.seats
        .map((s, idx) => {
          const isTurn = idx === state.turn;

          const iconId = (s as any).iconId as string | undefined;
          const kind = (s as any).kind as string | undefined;
          const fallback = kind === "NPC" ? "npc_default" : "player_default";

          const icon =
            ({
              host_default: "👑",
              player_default: "🙂",
              npc_default: "🤖",
              icon_01: "😀",
              icon_02: "😺",
              icon_03: "🐉",
            } as Record<string, string>)[iconId ?? fallback] ?? "🙂";

          return `
                  <div class="playerRow" style="display:grid;grid-template-columns:30px minmax(0,1fr) 54px;align-items:center;gap:8px;">
                    <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                                background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.12);font-size:15px;">
                      ${escapeHtml(icon)}
                    </div>

                    <div style="min-width:0;display:grid;gap:2px;">
                      <div class="name" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(s.name)}</div>
                      <div class="muted" style="font-size:10px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">手札${s.hand.length}枚</div>
                    </div>

                    <div class="turn" style="display:grid;justify-items:end;align-content:center;gap:1px;visibility:${isTurn ? "visible" : "hidden"};">
                      <span style="font-size:14px;line-height:1;">▶</span>
                      <span style="font-size:10px;line-height:1;opacity:0.9;">手番</span>
                    </div>
                  </div>
                `;
        })
        .join("")}
          </div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <div class="panel">
        <div style="font-weight:950;margin-bottom:10px;">あなたの手札（${escapeHtml(me.name)}）</div>
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
        <div style="font-weight:950;margin-bottom:10px;">ログ（最新が上）</div>
        <div id="log" class="logBox"></div>
      </div>
    `;

    const handDiv = app.querySelector<HTMLDivElement>("#hand");
    const drawBtn = app.querySelector<HTMLButtonElement>("#drawBtn");
    const restartBtn = app.querySelector<HTMLButtonElement>("#restartBtn");
    const homeBtn = app.querySelector<HTMLButtonElement>("#homeBtn");
    const logDiv = app.querySelector<HTMLDivElement>("#log");

    if (!handDiv || !drawBtn || !restartBtn || !homeBtn || !logDiv) {
      throw new Error("render.ts: required element not found");
    }

    // ===== 場札アニメ =====
    const playCardEl = app.querySelector<HTMLDivElement>(".playCard");
    const currentLen = state.history.length;

    if (playCardEl) {
      if (prevHistoryLen === -1) prevHistoryLen = currentLen;

      if (currentLen > prevHistoryLen) {
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

          const glowStrong = isUp ? "rgba(255, 77, 109, 0.65)" : "rgba(59, 130, 246, 0.65)";
          const glowMid = isUp ? "rgba(255, 77, 109, 0.35)" : "rgba(59, 130, 246, 0.35)";
          const glowWeak = isUp ? "rgba(255, 77, 109, 0.18)" : "rgba(59, 130, 246, 0.18)";

          playCardEl.animate(
            [
              { boxShadow: "0 0 0 rgba(0,0,0,0)" },
              { boxShadow: `0 0 55px ${glowStrong}, 0 0 0 3px ${glowMid}` },
              { boxShadow: `0 0 10px ${glowWeak}, 0 0 0 1px rgba(34, 32, 32, 0.6)` },
            ],
            { duration: 650, easing: "ease-out" }
          );
        });
      }

      prevHistoryLen = currentLen;

      if (lastCard) {
        const jokerValForLast = lastCard.rank === "JOKER" ? lastValue : undefined;
        playCardEl.onmouseenter = (ev) => showTip(ev as unknown as MouseEvent, lastCard, state.mode, jokerValForLast);
        playCardEl.onmousemove = (ev) => moveTip(ev as unknown as MouseEvent);
        playCardEl.onmouseleave = () => hideTip();
      }
    }
    // ===== /場札アニメ =====


    // 手札（カードボタン）
    const isTouchUI = cachedIsTouchUI;
    ensureHandInfoDocListener();

    lastHandDiv = handDiv;

    // スマホ以外なら説明パネルは使わない
    if (!isTouchUI) {
      selectedHandIndex = null;
      closeHandInfo();
    }

    handDiv.innerHTML = "";
    me.hand.forEach((card, idx) => {
      const b = document.createElement("button");
      b.className = `cardBtn ${cardClass(card)} ${card.rank === "JOKER" ? "joker" : ""}`;
      b.type = "button";
      b.innerHTML = cardInnerHtml(card);

      // ★重要：スマホは「説明を見る」ために disabled にはしない
      // （プレイ確定は2タップ目で canOperate を見て制御）
      b.disabled = isTouchUI ? false : !canOperate;

      // ★カード識別（外側タップで閉じる判定にも使う）
      b.dataset.handIndex = String(idx);
      b.setAttribute("data-hand-index", String(idx));

      // PC：従来通り（クリックで即プレイ）
      if (!isTouchUI) {
        b.onclick = () => handlers.onPlayHand(idx);

        // ツールチップ
        b.onmouseenter = (ev) => showTip(ev as unknown as MouseEvent, card, state.mode);
        b.onmousemove = (ev) => moveTip(ev as unknown as MouseEvent);
        b.onmouseleave = () => hideTip();

        handDiv.appendChild(b);
        return;
      }

      // スマホ：2タップ仕様
      b.onclick = () => {
        // 1回目：説明表示（選択）
        if (selectedHandIndex !== idx) {
          selectedHandIndex = idx;
          openHandInfo(card, state.mode);
          applyHandSelectionStyles();
          return;
        }

        // 2回目（同じカード）：出す（あなたの手番の時だけ）
        if (!canOperate) return;

        selectedHandIndex = null;
        closeHandInfo();
        handlers.onPlayHand(idx);
      };

      handDiv.appendChild(b);
    });

    // render直後に選択状態を反映（再描画時に浮きが戻らないように）
    applyHandSelectionStyles();

    // もし再描画で手札が減って index が範囲外になったら閉じる
    if (selectedHandIndex != null && selectedHandIndex >= me.hand.length) {
      selectedHandIndex = null;
      closeHandInfo();
    } else if (isTouchUI && selectedHandIndex != null) {
      const c = me.hand[selectedHandIndex];
      if (c) openHandInfo(c, state.mode);
    }

    drawBtn.disabled = !canOperate || state.deck.length === 0;
    drawBtn.onclick = () => handlers.onDrawPlay();

    restartBtn.disabled = isPlaying;
    restartBtn.onclick = () => {
      if (restartBtn.disabled) return;
      handlers.onRestart();
    };

    homeBtn.disabled = false;
    homeBtn.onclick = () => {
      if (isPlaying) {
        const ok = confirm("対戦中です。ホーム画面に戻りますか？");
        if (!ok) return;
      }
      handlers.onGoHome();
    };

    // =====================
    // ログ（PLAY + SYSTEMを混ぜる）
    // =====================
    logDiv.innerHTML = "";

    type PlayEntry = { type: "PLAY"; playNo: number; p: GameState["history"][number] };
    type SysEntry = { type: "SYSTEM"; playNo: number; s: GameState["systemLogs"][number] };
    type Entry = PlayEntry | SysEntry;

    const sysByAfter = new Map<number, GameState["systemLogs"][number][]>();
    for (const s of state.systemLogs ?? []) {
      const key = s.afterPlayIndex;
      const arr = sysByAfter.get(key) ?? [];
      arr.push(s);
      sysByAfter.set(key, arr);
    }

    const entries: Entry[] = [];
    for (let i = 0; i < state.history.length; i++) {
      const playNo = i + 1;
      entries.push({ type: "PLAY", playNo, p: state.history[i] });

      const sys = sysByAfter.get(playNo);
      if (sys) {
        for (const s of sys) entries.push({ type: "SYSTEM", playNo, s });
      }
    }

    const reversed = entries.slice().reverse();

    reversed.forEach((e, idx) => {
      const row = document.createElement("div");
      row.className = "logRow";

      // SYSTEM行
      if (e.type === "SYSTEM") {
        row.classList.add("system");

        const left = document.createElement("div");
        left.className = "no";
        left.textContent = "  ";

        const main = document.createElement("div");
        main.className = "main";
        main.textContent = `🔄 再配布：${e.s.message}`;

        row.appendChild(left);
        row.appendChild(main);
        logDiv.appendChild(row);
        return;
      }

      // PLAY行（既存そのまま）
      const p = e.p;

      const originalNo = e.playNo;
      const name = state.seats[p.seat].name;
      const lbl = cardLogLabel(p.card, p.value);
      const d = p.delta >= 0 ? `+${p.delta}` : `${p.delta}`;

      const modeChange =
        p.beforeMode !== p.afterMode
          ? `（${modeShort(p.beforeMode)}→${modeShort(p.afterMode)}）`
          : `（${modeShort(p.afterMode)}）`;

      const isJ = p.card.rank === "J";
      const isCancel =
        (p.card.suit === "S" && p.card.rank === "3" && p.value === 0) || (p.note?.includes("相殺") ?? false);

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

      const origin =
        (p as any).origin === "HAND" ? "HAND" : (p as any).origin === "DECK" ? "DECK" : undefined;

      const originImg = document.createElement("img");
      originImg.className = "logIcon";

      if (origin === "HAND") {
        originImg.alt = "HAND";
        originImg.src = baseUrl + "icons/hand.png";
      } else if (origin === "DECK") {
        originImg.alt = "DECK";
        originImg.src = baseUrl + "icons/deck.png";
      } else {
        originImg.alt = "UNKNOWN";
        originImg.style.display = "none";
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