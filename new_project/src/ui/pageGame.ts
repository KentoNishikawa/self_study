import { createGame, getRenderState, onKeyDown, onKeyUp, resumeGame, tick } from "../core/game";
import { createThreeEngine } from "../engine/threeEngine";
import { renderStageSelectPage } from "./pageStageSelect";

export function renderGamePage(root: HTMLElement, stageId = "stage001", startFromCheckpoint = false): void {
  root.innerHTML = `
    <main class="game-page">
      <div class="game-canvas-root" data-canvas-root></div>
      <div class="game-hud" data-hud></div>
      <div class="checkpoint-toast" data-checkpoint-toast></div>
      <div class="tutorial-overlay" data-tutorial-overlay hidden>
        <div class="tutorial-spotlight" data-tutorial-spotlight></div>
        <section class="tutorial-card">
          <p data-tutorial-text></p>
          <div class="tutorial-footer">
            <span data-tutorial-page></span>
            <span>Enter: 次へ</span>
          </div>
        </section>
      </div>
      <div class="game-help">
        SIDE: ←→ / A・D　FRONT: ↑↓ / W・S　Space: 短押し小ジャンプ / 長押し通常ジャンプ　Shift: しゃがみ<br>
        Q長押し: 正面視点 / 離す: 横視点　E: 扉　Enter: メニュー
      </div>
      <div class="pause-modal" data-pause-menu hidden>
        <section class="pause-card">
          <h2>一時停止</h2>
          <p>ゲーム中の時間・移動・敵・視点切り替えを停止しています。</p>
          <div class="pause-actions">
            <button type="button" class="game-button" data-pause-stage-select>ステージ選択画面に戻る</button>
            <button type="button" class="game-button" data-pause-restart>さいしょからやりなおす</button>
            <button type="button" class="game-button" data-pause-resume>ゲーム再開</button>
          </div>
        </section>
      </div>
      <div class="stage-clear-modal" data-stage-clear hidden>
        <section class="stage-clear-card">
          <h2>ステージクリア！</h2>
          <p class="clear-time" data-clear-time>クリアタイム: 0.0秒</p>
          <p class="ranking-note" data-ranking-note hidden>チェックポイントから開始したため、今後実装予定のクリアタイムランキングには反映されません。</p>
          <p>次のステージがある場合は、ステージ選択画面で解放されます。</p>
          <div class="stage-clear-actions">
            <button type="button" class="game-button" data-replay>もう一度遊ぶ</button>
            <button type="button" class="game-button" data-stage-select>ステージ選択へ戻る</button>
          </div>
        </section>
      </div>
    </main>
  `;

  const canvasRoot = root.querySelector<HTMLElement>("[data-canvas-root]");
  const hud = root.querySelector<HTMLElement>("[data-hud]");
  const clearModal = root.querySelector<HTMLElement>("[data-stage-clear]");
  const pauseMenu = root.querySelector<HTMLElement>("[data-pause-menu]");
  const checkpointToast = root.querySelector<HTMLElement>("[data-checkpoint-toast]");
  const tutorialOverlay = root.querySelector<HTMLElement>("[data-tutorial-overlay]");
  if (!canvasRoot || !hud || !clearModal || !pauseMenu || !checkpointToast || !tutorialOverlay) {
    throw new Error("ゲーム画面の初期化に失敗しました。");
  }

  const game = createGame({ initialStageId: stageId, startFromCheckpoint });
  const engine = createThreeEngine(canvasRoot);
  let lastTime = performance.now();
  let rafId = 0;
  let disposed = false;

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    engine.dispose();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isGameKey(event.code)) {
      event.preventDefault();
    }
    onKeyDown(game, event.code, performance.now());
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (isGameKey(event.code)) {
      event.preventDefault();
    }
    onKeyUp(game, event.code, performance.now());
  };

  const frame = (now: number) => {
    if (disposed) {
      return;
    }
    const dtMs = now - lastTime;
    lastTime = now;
    const state = tick(game, dtMs);
    engine.render(state);
    renderHud(hud, state);
    renderTutorialOverlay(tutorialOverlay, state, engine);
    renderPauseMenu(pauseMenu, state);
    renderCheckpointToast(checkpointToast, state);
    renderStageClearModal(clearModal, state);
    rafId = requestAnimationFrame(frame);
  };

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-stage-select]")?.addEventListener("click", () => {
    dispose();
    renderStageSelectPage(root);
  });

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-restart]")?.addEventListener("click", () => {
    dispose();
    renderGamePage(root, stageId, false);
  });

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-resume]")?.addEventListener("click", () => {
    resumeGame(game);
    renderPauseMenu(pauseMenu, getRenderState(game));
  });

  clearModal.querySelector<HTMLButtonElement>("[data-replay]")?.addEventListener("click", () => {
    dispose();
    renderGamePage(root, stageId, startFromCheckpoint);
  });

  clearModal.querySelector<HTMLButtonElement>("[data-stage-select]")?.addEventListener("click", () => {
    dispose();
    renderStageSelectPage(root);
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  rafId = requestAnimationFrame(frame);

  root.addEventListener("view-switch-dispose", dispose, { once: true });

  engine.render(getRenderState(game));
}

type HudState = ReturnType<typeof getRenderState>;

function renderHud(hud: HTMLElement, state: HudState): void {
  const trapped = state.player.trapped ? " / trapped" : "";
  const crouch = state.player.crouching ? "しゃがみ中" : "通常";
  const seconds = (state.elapsedMs / 1000).toFixed(1);
  hud.innerHTML = `
    <div>Stage: ${escapeHtml(state.stageId)}</div>
    <div>Mode: ${escapeHtml(state.mode)}</div>
    <div>View: ${escapeHtml(state.view)}${trapped}</div>
    <div>Player: ${crouch}</div>
    <div>Timer: ${seconds}s</div>
    <div class="status-message">${escapeHtml(state.statusMessage)}</div>
  `;
}

function renderPauseMenu(modal: HTMLElement, state: HudState): void {
  modal.hidden = state.mode !== "PAUSED";
}

function renderCheckpointToast(toast: HTMLElement, state: HudState): void {
  toast.textContent = state.checkpointToastMessage;
  toast.classList.toggle("is-visible", state.checkpointToastMessage !== "");
}

function renderStageClearModal(modal: HTMLElement, state: HudState): void {
  modal.hidden = state.mode !== "STAGE_CLEAR";
  if (state.mode !== "STAGE_CLEAR") {
    return;
  }

  const clearTime = modal.querySelector<HTMLElement>("[data-clear-time]");
  if (clearTime) {
    clearTime.hidden = !state.clearTimeVisible;
    clearTime.textContent = `クリアタイム: ${formatTime(state.elapsedMs)}`;
  }

  const rankingNote = modal.querySelector<HTMLElement>("[data-ranking-note]");
  if (rankingNote) {
    rankingNote.hidden = state.clearTimeRankingEligible || !state.clearTimeVisible;
  }
}

function renderTutorialOverlay(modal: HTMLElement, state: HudState, engine: ReturnType<typeof createThreeEngine>): void {
  const tutorial = state.tutorial;
  modal.hidden = tutorial === null;
  if (!tutorial) {
    return;
  }

  const text = modal.querySelector<HTMLElement>("[data-tutorial-text]");
  const page = modal.querySelector<HTMLElement>("[data-tutorial-page]");
  const spotlight = modal.querySelector<HTMLElement>("[data-tutorial-spotlight]");

  if (text) {
    text.textContent = tutorial.text;
  }
  if (page) {
    page.textContent = `${tutorial.pageIndex + 1} / ${tutorial.pageCount}`;
  }
  if (spotlight) {
    const focus = engine.projectAabbToScreen(tutorial.focusAabb);
    if (focus) {
      spotlight.style.setProperty("--tutorial-focus-x", `${focus.x}px`);
      spotlight.style.setProperty("--tutorial-focus-y", `${focus.y}px`);
      spotlight.style.setProperty("--tutorial-focus-width", `${Math.max(focus.width + 160, 220)}px`);
      spotlight.style.setProperty("--tutorial-focus-height", `${Math.max(focus.height + 140, 180)}px`);
    }
  }
}

function formatTime(elapsedMs: number): string {
  const totalSeconds = elapsedMs / 1000;
  return `${totalSeconds.toFixed(1)}秒`;
}

function isGameKey(code: string): boolean {
  return code === "ArrowLeft" ||
    code === "ArrowRight" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "KeyA" ||
    code === "KeyD" ||
    code === "KeyW" ||
    code === "Space" ||
    code === "ShiftLeft" ||
    code === "ShiftRight" ||
    code === "KeyS" ||
    code === "KeyQ" ||
    code === "KeyE" ||
    code === "Enter";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
