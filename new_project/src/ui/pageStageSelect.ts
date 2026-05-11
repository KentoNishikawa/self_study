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
              ${stage.unlocked ? "" : "disabled"}
            >
              <span>${escapeHtml(stage.name)}</span>
              <small>${stage.cleared ? "CLEAR" : stage.unlocked ? "PLAY" : "LOCKED"}</small>
            </button>
          `).join("")}
        </div>
        <button type="button" class="secondary-button" data-back-title>タイトルへ戻る</button>
      </section>
    </main>
  `;

  root.querySelector<HTMLButtonElement>("[data-back-title]")?.addEventListener("click", () => {
    renderTitlePage(root);
  });

  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-stage-id]")) {
    button.addEventListener("click", () => {
      const stageId = button.dataset.stageId;
      if (!stageId || button.disabled) {
        return;
      }
      renderGamePage(root, stageId);
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
