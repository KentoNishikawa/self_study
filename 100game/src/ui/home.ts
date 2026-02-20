// src/ui/home.ts
import type { Difficulty } from "../core/types";

export type HomeConfig = {
  playerName: string; // 入力中はそのまま保持（trimしない）
  difficulty: Difficulty;
};

export function renderHome(
  app: HTMLDivElement,
  config: HomeConfig,
  handlers: {
    onStart: (cfg: HomeConfig) => void;
    onChange: (cfg: HomeConfig) => void;
  }
) {
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

        <details class="details">
          <summary>ルール要点</summary>
          <div style="margin-top:8px;color:rgba(255,255,255,0.8);line-height:1.7;">
            <div>・順番にカードを出し、合計が <b>100以上</b> で負け（加算時）</div>
            <div>・J/Q/Kは10、Aは1</div>
            <div>・ジョーカーは1〜49（宣言）</div>
            <div>・ジョーカー直後に♠3でジョーカーを0化、♠3も0</div>
            <div>・Jは +10 → 負けてなければ加算/減算を反転</div>
            <div>・手札/山札が尽きて勝負つかずなら無効試合</div>
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
  const startBtn = app.querySelector<HTMLButtonElement>("#startBtn")!;

  diffEl.value = config.difficulty;

  const emitChange = () => {
    handlers.onChange({
      playerName: nameEl.value, // 入力中はtrimしない
      difficulty: diffEl.value as Difficulty,
    });
  };

  nameEl.oninput = emitChange;
  diffEl.onchange = emitChange;

  startBtn.onclick = () => {
    handlers.onStart({
      playerName: nameEl.value, // trimはmain側でやる
      difficulty: diffEl.value as Difficulty,
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
