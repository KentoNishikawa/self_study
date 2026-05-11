import { renderStageSelectPage } from "./pageStageSelect";

export function renderTitlePage(root: HTMLElement): void {
  root.innerHTML = `
    <main class="home-page">
      <section class="home-card">
        <h1>View Switch 2.5D</h1>
        <p>
          横視点と正面視点を切り替えて、トリックアートのようなステージを攻略します。<br>
          Q長押しで正面視点、Qを離すと横視点へ戻ります。
        </p>
        <button type="button" data-start>ステージ選択へ</button>
      </section>
    </main>
  `;

  root.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener("click", () => {
    renderStageSelectPage(root);
  });
}
