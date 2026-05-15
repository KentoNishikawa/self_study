import { getStageSelectItems } from "../core/game";
import { renderGamePage } from "./pageGame";
import { renderTitlePage } from "./pageTitle";

export function renderStageSelectPage(root: HTMLElement): void {
  const stages = getStageSelectItems();
  root.innerHTML = `
    <main class="home-page">
      <section class="home-card stage-select-card">
        <h1>ステージ選択</h1>
        <p>クリア済みステージの次のステージが順番に解放されます。</p>
        <div class="stage-list">
          ${stages.map((stage) => `
            <button
              type="button"
              class="stage-button"
              data-stage-id="${escapeHtml(stage.id)}"
              data-checkpoint-available="${stage.checkpointAvailable ? "true" : "false"}"
              ${stage.unlocked ? "" : "disabled"}
            >
              <span>${escapeHtml(stage.name)}</span>
              <small>${stage.cleared ? "CLEAR" : stage.unlocked ? "PLAY" : "LOCKED"}</small>
            </button>
          `).join("")}
        </div>
        <button type="button" class="secondary-button" data-back-title>タイトルへ戻る</button>
      </section>
      <div class="stage-start-choice-modal" data-start-choice hidden>
        <section class="stage-start-choice-card">
          <h2>開始地点を選択</h2>
          <p data-start-choice-text>このステージはチェックポイントから再開できます。</p>
          <div class="stage-start-choice-actions">
            <button type="button" class="game-button" data-start-from-beginning>スタート地点からスタートする</button>
            <button type="button" class="game-button" data-start-from-checkpoint>チェックポイントからスタートする</button>
            <button type="button" class="secondary-button" data-start-choice-cancel>キャンセル</button>
          </div>
        </section>
      </div>
    </main>
  `;

  root.querySelector<HTMLButtonElement>("[data-back-title]")?.addEventListener("click", () => {
    renderTitlePage(root);
  });

  const choiceModal = root.querySelector<HTMLElement>("[data-start-choice]");
  const choiceText = root.querySelector<HTMLElement>("[data-start-choice-text]");
  let selectedStageId: string | null = null;

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-stage-id]")) {
    button.addEventListener("click", () => {
      const stageId = button.dataset.stageId;
      if (!stageId || button.disabled) {
        return;
      }

      if (button.dataset.checkpointAvailable === "true" && choiceModal) {
        selectedStageId = stageId;
        if (choiceText) {
          choiceText.textContent = `このステージはチェックポイントから再開できます。`;
        }
        choiceModal.hidden = false;
        return;
      }

      renderGamePage(root, stageId);
    });
  }

  root.querySelector<HTMLButtonElement>("[data-start-from-beginning]")?.addEventListener("click", () => {
    if (!selectedStageId) {
      return;
    }
    renderGamePage(root, selectedStageId, false);
  });

  root.querySelector<HTMLButtonElement>("[data-start-from-checkpoint]")?.addEventListener("click", () => {
    if (!selectedStageId) {
      return;
    }
    renderGamePage(root, selectedStageId, true);
  });

  root.querySelector<HTMLButtonElement>("[data-start-choice-cancel]")?.addEventListener("click", () => {
    selectedStageId = null;
    if (choiceModal) {
      choiceModal.hidden = true;
    }
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
