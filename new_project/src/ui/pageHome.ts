import { renderGamePage } from "./pageGame";

export function renderHomePage(root: HTMLElement): void {
  root.innerHTML = `
    <main class="home-page">
      <section class="home-card">
        <h1>View Switch 2.5D</h1>
        <p>
          Qで視点を90度切り替えます。視点切替中はゲームロジックを止め、カメラ回転だけ進めます。<br>
          UIページはcore/engineの関数を呼び出すだけの最小プロトです。
        </p>
        <button type="button" data-start>ゲーム開始</button>
      </section>
    </main>
  `;

  root.querySelector<HTMLButtonElement>("[data-start]")?.addEventListener("click", () => {
    renderGamePage(root);
  });
}
