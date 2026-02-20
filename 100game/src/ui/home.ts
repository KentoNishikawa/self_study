// src/ui/home.ts
import type { Difficulty, GameType } from "../core/types";

export type HomeConfig = {
  playerName: string;
  difficulty: Difficulty;
  gameType: GameType;
};

export function renderHome(
  app: HTMLDivElement,
  config: HomeConfig,
  handlers: {
    onStart: (cfg: HomeConfig) => void;
    onChange: (cfg: HomeConfig) => void;
  }
) {
  const targetLabel = config.gameType === "EXTRA" ? "???" : String(config.gameType);

  app.innerHTML = `
    <header class="appHeader">
        <h1 class="appTitle">100ゲーム</h1>
        <div class="appTag">HOME</div>
    </header>

    <div class="panel">
      <div style="font-weight:950;margin-bottom:10px;">ホーム画面</div>

      <div style="display:grid;gap:12px;">
        <label style="display:grid;gap:6px;">
          <span style="color:rgba(255,255,255,0.75);font-weight:800;">プレイヤーネーム</span>
          <input id="playerName" class="input" value="${escapeHtml(config.playerName)}" />
        </label>

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

        <details class="details">
          <summary>ルール要点</summary>
          <div style="margin-top:8px;color:rgba(255,255,255,0.8);line-height:1.7;">
            <div>・順番にカードを出し、合計が <b>${escapeHtml(targetLabel)}以上</b> で負け（加算時）</div>
            <div>・J/Q/Kは10、Aは1</div>
            <div>・ジョーカーは1〜49（宣言）</div>
            <div>・ジョーカー直後に♠3でジョーカーを0化、♠3も0</div>
            <div>・Jは +10 → 負けてなければ加算/減算を反転</div>
            <div>・<b>上限値が200以上</b> の場合、山札が尽きて誰かの手札が0になった瞬間に「再配布」</div>
            <div>・再配布できるカードが無い場合は無効試合</div>
          </div>
        </details>

        <button id="startBtn" class="btn" style="width:100%;font-weight:950;">
          ゲーム開始
        </button>
      </div>
    </div>
  `;

  const nameEl = app.querySelector<HTMLInputElement>("#playerName")!;
  const diffEl = app.querySelector<HTMLSelectElement>("#difficulty")!;
  const gameTypeEl = app.querySelector<HTMLSelectElement>("#gameType")!;
  const startBtn = app.querySelector<HTMLButtonElement>("#startBtn")!;

  diffEl.value = config.difficulty;
  gameTypeEl.value = String(config.gameType);

  const parseGameType = (v: string): GameType => {
    if (v === "EXTRA") return "EXTRA";
    const n = Number(v);
    if (n === 100 || n === 200 || n === 300 || n === 400 || n === 500) return n;
    return 100;
  };

  const emitChange = () => {
    handlers.onChange({
      playerName: nameEl.value,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    });
  };

  nameEl.oninput = emitChange;
  diffEl.onchange = emitChange;
  gameTypeEl.onchange = emitChange;

  startBtn.onclick = () => {
    handlers.onStart({
      playerName: nameEl.value,
      difficulty: diffEl.value as Difficulty,
      gameType: parseGameType(gameTypeEl.value),
    });
  };
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}