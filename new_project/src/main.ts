import "./style.css";
import { renderTitlePage } from "./ui/pageTitle";

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("#app が見つかりません。index.html を確認してください。");
}

renderTitlePage(root);
