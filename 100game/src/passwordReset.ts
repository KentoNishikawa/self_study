import "./contact.css";
import { AuthApiError, requestPasswordReset, resetPassword } from "./core/authSession";
import { playButtonSe, startButtonSe } from "./core/sound";

type PasswordResetValues = {
  email: string;
  password: string;
  passwordConfirm: string;
};

type PasswordResetErrors = Partial<Record<keyof PasswordResetValues | "token", string>>;

const appElement = document.querySelector<HTMLDivElement>("#passwordResetApp");
if (!appElement) throw new Error("#passwordResetApp not found");
const app: HTMLDivElement = appElement;
const resetToken = new URLSearchParams(window.location.search).get("token") ?? "";

let values: PasswordResetValues = { email: "", password: "", passwordConfirm: "" };
let errors: PasswordResetErrors = {};
let isSent = false;
let isResetComplete = false;

function getTitleUrl(openLogin = false) {
  const url = new URL("./index.html", window.location.href);
  if (openLogin) url.searchParams.set("auth", "login");
  return url.toString();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRegisterPassword(password: string) {
  return password.length >= 7 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validateRequest(nextValues: PasswordResetValues): PasswordResetErrors {
  const nextErrors: PasswordResetErrors = {};
  const email = nextValues.email.trim();

  if (!email) nextErrors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(email)) nextErrors.email = "メールアドレスの形式が正しくありません。";

  return nextErrors;
}

function validateReset(nextValues: PasswordResetValues): PasswordResetErrors {
  const nextErrors: PasswordResetErrors = {};

  if (!resetToken) nextErrors.token = "パスワード再設定リンクが無効です。";

  if (!nextValues.password) nextErrors.password = "新しいパスワードを入力してください。";
  else if (!isValidRegisterPassword(nextValues.password)) nextErrors.password = "パスワードは英字・数字・記号を含む7文字以上で入力してください。";

  if (!nextValues.passwordConfirm) nextErrors.passwordConfirm = "確認用パスワードを入力してください。";
  else if (nextValues.password !== nextValues.passwordConfirm) nextErrors.passwordConfirm = "パスワードが一致しません。";

  return nextErrors;
}

function readValues() {
  values = {
    email: app.querySelector<HTMLInputElement>("#passwordResetEmail")?.value ?? "",
    password: app.querySelector<HTMLInputElement>("#passwordResetPassword")?.value ?? "",
    passwordConfirm: app.querySelector<HTMLInputElement>("#passwordResetPasswordConfirm")?.value ?? "",
  };
}

function renderError(key: keyof PasswordResetErrors) {
  const message = errors[key];
  if (!message) return "";
  return `<div class="contactError" data-error-for="${key}">${escapeHtml(message)}</div>`;
}

function render() {
  if (isResetComplete) {
    app.innerHTML = `
      <main class="contactPage">
        <section class="contactCard is-complete" aria-labelledby="passwordResetTitle">
          <div class="contactHeader">
            <div class="contactBrand">100GAME⁺</div>
            <h1 id="passwordResetTitle">パスワードを再設定しました</h1>
          </div>

          <div class="contactCompleteNote">
            新しいパスワードでログインできます。
          </div>

          <div class="contactActions is-center">
            <button id="passwordResetBackLoginBtn" class="contactBtn is-secondary" type="button">ログインに戻る</button>
          </div>
        </section>
      </main>
    `;

    bindEvents();
    return;
  }

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

  if (resetToken) {
    app.innerHTML = `
      <main class="contactPage">
        <section class="contactCard" aria-labelledby="passwordResetTitle">
          <div class="contactHeader">
            <div class="contactBrand">100GAME⁺</div>
            <h1 id="passwordResetTitle">新しいパスワードを設定</h1>
            <p>新しいパスワードを入力してください。</p>
          </div>

          <form id="passwordResetForm" class="contactForm" novalidate>
            ${renderError("token")}
            <div class="contactField" data-field="password">
              <label for="passwordResetPassword">新しいパスワード <span class="contactRequired">必須</span></label>
              <input id="passwordResetPassword" name="password" type="password" value="${escapeHtml(values.password)}" autocomplete="new-password" placeholder="英字・数字・記号を含む7文字以上" />
              ${renderError("password")}
            </div>

            <div class="contactField" data-field="passwordConfirm">
              <label for="passwordResetPasswordConfirm">新しいパスワード確認 <span class="contactRequired">必須</span></label>
              <input id="passwordResetPasswordConfirm" name="passwordConfirm" type="password" value="${escapeHtml(values.passwordConfirm)}" autocomplete="new-password" placeholder="確認のため再入力" />
              ${renderError("passwordConfirm")}
            </div>

            <div class="contactActions">
              <button id="passwordResetBackLoginBtn" class="contactBtn is-secondary" type="button">ログインに戻る</button>
              <button class="contactBtn is-primary" type="submit">パスワードを再設定</button>
            </div>
          </form>
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

    if (resetToken) {
      values = { ...values, password: values.password, passwordConfirm: values.passwordConfirm };
      errors = validateReset(values);

      if (Object.keys(errors).length > 0) {
        render();
        return;
      }

      startButtonSe();
      resetPassword({ token: resetToken, password: values.password })
        .then(() => {
          isResetComplete = true;
          render();
        })
        .catch((error: unknown) => {
          const authError = error instanceof AuthApiError ? error : new AuthApiError("パスワード再設定に失敗しました。");
          errors = {
            token: authError.fieldErrors.token,
            password: authError.fieldErrors.password ?? authError.message,
          };
          render();
        });
      return;
    }

    values = { ...values, email: values.email.trim() };
    errors = validateRequest(values);

    if (Object.keys(errors).length > 0) {
      isSent = false;
      render();
      return;
    }

    startButtonSe();
    requestPasswordReset(values.email)
      .then(() => {
        isSent = true;
        render();
      })
      .catch((error: unknown) => {
        const authError = error instanceof AuthApiError ? error : new AuthApiError("再設定メールの送信に失敗しました。");
        errors = { email: authError.fieldErrors.email ?? authError.message };
        isSent = false;
        render();
      });
  });
}

render();
