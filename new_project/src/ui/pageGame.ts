import { createGame, getRenderState, onKeyDown, onKeyUp, resumeGame, tick } from "../core/game";
import { createThreeEngine } from "../engine/threeEngine";
import { renderStageSelectPage } from "./pageStageSelect";

export function renderGamePage(root: HTMLElement, stageId = "stage001"): void {
  root.innerHTML = `
    <main class="game-page">
      <div class="game-canvas-root" data-canvas-root></div>
      <div class="game-hud" data-hud></div>
      <div class="game-help">
        SIDE: ←→ / A・D　FRONT: ↑↓ / W・S　Space: ジャンプ　Shift: しゃがみ<br>
        同方向2回押し: ダッシュ　Q長押し: 正面視点 / 離す: 横視点　E: 扉　Enter: メニュー
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
  if (!canvasRoot || !hud || !clearModal || !pauseMenu) {
    throw new Error("ゲーム画面の初期化に失敗しました。");
  }

  const game = createGame({ initialStageId: stageId });
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
    renderPauseMenu(pauseMenu, state);
    renderStageClearModal(clearModal, state);
    rafId = requestAnimationFrame(frame);
  };

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-stage-select]")?.addEventListener("click", () => {
    dispose();
    renderStageSelectPage(root);
  });

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-restart]")?.addEventListener("click", () => {
    dispose();
    renderGamePage(root, stageId);
  });

  pauseMenu.querySelector<HTMLButtonElement>("[data-pause-resume]")?.addEventListener("click", () => {
    resumeGame(game);
    renderPauseMenu(pauseMenu, getRenderState(game));
  });

  clearModal.querySelector<HTMLButtonElement>("[data-replay]")?.addEventListener("click", () => {
    dispose();
    renderGamePage(root, stageId);
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

function renderStageClearModal(modal: HTMLElement, state: HudState): void {
  modal.hidden = state.mode !== "STAGE_CLEAR";
  if (state.mode !== "STAGE_CLEAR") {
    return;
  }

  const clearTime = modal.querySelector<HTMLElement>("[data-clear-time]");
  if (clearTime) {
    clearTime.textContent = `クリアタイム: ${formatTime(state.elapsedMs)}`;
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
