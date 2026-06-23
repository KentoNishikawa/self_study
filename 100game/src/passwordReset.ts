import "./contact.css";
import { playButtonSe, startButtonSe } from "./core/sound";

type PasswordResetValues = {
  email: string;
};

type PasswordResetErrors = Partial<Record<keyof PasswordResetValues, string>>;

const appElement = document.querySelector<HTMLDivElement>("#passwordResetApp");
if (!appElement) throw new Error("#passwordResetApp not found");
const app: HTMLDivElement = appElement;

let values: PasswordResetValues = { email: "" };
let errors: PasswordResetErrors = {};
let isSent = false;

function getTitleUrl(openLogin = false) {
  const url = new URL("./index.html", window.location.href);
  if (openLogin) url.searchParams.set("auth", "login");
  return url.toString();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validate(nextValues: PasswordResetValues): PasswordResetErrors {
  const nextErrors: PasswordResetErrors = {};
  const email = nextValues.email.trim();

  if (!email) nextErrors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(email)) nextErrors.email = "メールアドレスの形式が正しくありません。";

  return nextErrors;
}

function readValues() {
  values = {
    email: app.querySelector<HTMLInputElement>("#passwordResetEmail")?.value ?? "",
  };
}

function renderError(key: keyof PasswordResetValues) {
  const message = errors[key];
  if (!message) return "";
  return `<div class="contactError" data-error-for="${key}">${escapeHtml(message)}</div>`;
}

function render() {
  if (isSent) {
    app.innerHTML = `
      <main class="contactPage">
        <section class="contactCard is-complete" aria-labelledby="passwordResetTitle">
          <div class="contactHeader">
            <div class="contactBrand">100GAME⁺</div>
            <h1 id="passwordResetTitle">パスワード再設定メールを送信しました</h1>
          </div>

          <div class="contactCompleteNote">
            ご入力いただいたメールアドレスが登録済みの場合、パスワード再設定用のメールを送信しました。<br>
            メール内のリンクから再設定を行ってください。
          </div>

          <div class="contactActions is-center">
            <button id="passwordResetBackTitleBtn" class="contactBtn is-secondary" type="button">タイトルに戻る</button>
          </div>
        </section>
      </main>
    `;

    bindEvents();
    return;
  }

  app.innerHTML = `
    <main class="contactPage">
      <section class="contactCard" aria-labelledby="passwordResetTitle">
        <div class="contactHeader">
          <div class="contactBrand">100GAME⁺</div>
          <h1 id="passwordResetTitle">パスワード再設定</h1>
          <p>登録済みのメールアドレスを入力してください。登録済みの場合、再設定用メールを送信します。</p>
        </div>

        <form id="passwordResetForm" class="contactForm" novalidate>
          <div class="contactField" data-field="email">
            <label for="passwordResetEmail">メールアドレス <span class="contactRequired">必須</span></label>
            <input id="passwordResetEmail" name="email" type="email" value="${escapeHtml(values.email)}" autocomplete="email" placeholder="example@example.com" />
            ${renderError("email")}
          </div>

          <div class="contactActions">
            <button id="passwordResetBackLoginBtn" class="contactBtn is-secondary" type="button">ログインに戻る</button>
            <button class="contactBtn is-primary" type="submit">再設定メールを送信</button>
          </div>
        </form>
      </section>
    </main>
  `;

  bindEvents();
}

function bindEvents() {
  const form = app.querySelector<HTMLFormElement>("#passwordResetForm");

  app.querySelector<HTMLButtonElement>("#passwordResetBackLoginBtn")?.addEventListener("click", () => {
    playButtonSe();
    window.location.href = getTitleUrl(true);
  });

  app.querySelector<HTMLButtonElement>("#passwordResetBackTitleBtn")?.addEventListener("click", () => {
    playButtonSe();
    window.location.href = getTitleUrl(false);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    readValues();
    values = { email: values.email.trim() };
    errors = validate(values);

    if (Object.keys(errors).length > 0) {
      isSent = false;
      render();
      return;
    }

    startButtonSe();
    isSent = true;
    render();
  });
}

render();
