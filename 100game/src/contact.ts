import "./contact.css";

type ContactStep = "INPUT" | "CONFIRM" | "COMPLETE";
type ContactCategory = "bug" | "request" | "other";

type ContactValues = {
  category: ContactCategory | "";
  subject: string;
  name: string;
  email: string;
  message: string;
  imageFile: File | null;
};

type ContactErrors = Partial<Record<keyof ContactValues, string>>;

type ContactApiResponse = {
  ok: boolean;
  message?: string;
  errors?: ContactErrors;
};

type ContactFieldKey = keyof ContactValues;

const MAX_SUBJECT_LENGTH = 80;
const MAX_NAME_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  bug: "不具合の報告",
  request: "改善要望",
  other: "その他お問い合わせ",
};

const appElement = document.querySelector<HTMLDivElement>("#contactApp");
if (!appElement) throw new Error("#contactApp not found");
const app: HTMLDivElement = appElement;

let step: ContactStep = "INPUT";
let values: ContactValues = {
  category: "",
  subject: "",
  name: "",
  email: "",
  message: "",
  imageFile: null,
};
let errors: ContactErrors = {};
let isSending = false;
let submitError = "";

function getGameUrl() {
  return new URL("./index.html", window.location.href).toString();
}

function getCategoryLabel(category: ContactValues["category"]) {
  if (!category) return "";
  return CATEGORY_LABELS[category];
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(valuesToValidate: ContactValues): ContactErrors {
  const nextErrors: ContactErrors = {};

  if (!valuesToValidate.category) {
    nextErrors.category = "お問い合わせ種別を選択してください。";
  }

  if (!valuesToValidate.subject.trim()) {
    nextErrors.subject = "件名を入力してください。";
  } else if (valuesToValidate.subject.trim().length > MAX_SUBJECT_LENGTH) {
    nextErrors.subject = `件名は${MAX_SUBJECT_LENGTH}文字以内で入力してください。`;
  }

  if (valuesToValidate.name.trim().length > MAX_NAME_LENGTH) {
    nextErrors.name = `お名前・プレイヤー名は${MAX_NAME_LENGTH}文字以内で入力してください。`;
  }

  if (!valuesToValidate.email.trim()) {
    nextErrors.email = "メールアドレスを入力してください。";
  } else if (!isValidEmail(valuesToValidate.email.trim())) {
    nextErrors.email = "メールアドレスの形式が正しくありません。";
  }

  if (!valuesToValidate.message.trim()) {
    nextErrors.message = "お問い合わせ内容を入力してください。";
  } else if (valuesToValidate.message.trim().length > MAX_MESSAGE_LENGTH) {
    nextErrors.message = `お問い合わせ内容は${MAX_MESSAGE_LENGTH}文字以内で入力してください。`;
  }

  if (valuesToValidate.imageFile) {
    if (!ALLOWED_IMAGE_TYPES.includes(valuesToValidate.imageFile.type)) {
      nextErrors.imageFile = "添付できる画像形式は jpg / png / webp のみです。";
    } else if (valuesToValidate.imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      nextErrors.imageFile = "添付画像は3MB以内にしてください。";
    }
  }

  return nextErrors;
}

function readInputValues() {
  const categoryInput = app.querySelector<HTMLSelectElement>("#contactCategory");
  const subjectInput = app.querySelector<HTMLInputElement>("#contactSubject");
  const nameInput = app.querySelector<HTMLInputElement>("#contactName");
  const emailInput = app.querySelector<HTMLInputElement>("#contactEmail");
  const messageInput = app.querySelector<HTMLTextAreaElement>("#contactMessage");
  const imageInput = app.querySelector<HTMLInputElement>("#contactImage");

  values = {
    category: (categoryInput?.value ?? "") as ContactValues["category"],
    subject: subjectInput?.value ?? "",
    name: nameInput?.value ?? "",
    email: emailInput?.value ?? "",
    message: messageInput?.value ?? "",
    imageFile: imageInput?.files?.[0] ?? values.imageFile,
  };
}

function renderError(key: ContactFieldKey) {
  const message = errors[key];
  if (!message) return "";
  return `<div class="contactError" data-error-for="${key}">${message}</div>`;
}

function renderBugHint() {
  const isVisible = values.category === "bug";
  return `
    <div class="contactHint is-bug${isVisible ? " is-visible" : ""}" aria-hidden="${isVisible ? "false" : "true"}">
      不具合の報告の場合は、発生した画面・操作手順・使用端末・ブラウザも記載してください。<br>
      スクリーンショットがある場合は画像添付をご利用ください。
    </div>
  `;
}

function renderInput() {
  app.innerHTML = `
    <main class="contactPage">
      <section class="contactCard" aria-labelledby="contactTitle">
        <div class="contactHeader">
          <div class="contactBrand">100GAME⁺</div>
          <h1 id="contactTitle">お問い合わせ</h1>
          <p>100GAME⁺に関する不具合報告、ご意見・ご要望などはこちらからお送りください。</p>
        </div>

        <form id="contactForm" class="contactForm" novalidate>
          <div class="contactField" data-field="category">
            <label for="contactCategory">お問い合わせ種別 <span class="contactRequired">必須</span></label>
            <select id="contactCategory" name="category">
              <option value="">選択してください</option>
              <option value="bug" ${values.category === "bug" ? "selected" : ""}>不具合の報告</option>
              <option value="request" ${values.category === "request" ? "selected" : ""}>改善要望</option>
              <option value="other" ${values.category === "other" ? "selected" : ""}>その他お問い合わせ</option>
            </select>
            ${renderError("category")}
            ${renderBugHint()}
          </div>

          <div class="contactField" data-field="subject">
            <label for="contactSubject">件名 <span class="contactRequired">必須</span></label>
            <input id="contactSubject" name="subject" type="text" value="${escapeHtml(values.subject)}" maxlength="${MAX_SUBJECT_LENGTH}" placeholder="例：マルチプレイで部屋に入れない" />
            ${renderError("subject")}
          </div>

          <div class="contactField" data-field="name">
            <label for="contactName">お名前 <span class="contactOptional">任意</span></label>
            <input id="contactName" name="name" type="text" value="${escapeHtml(values.name)}" maxlength="${MAX_NAME_LENGTH}" placeholder="例：山田　太郎" />
            ${renderError("name")}
          </div>

          <div class="contactField" data-field="email">
            <label for="contactEmail">メールアドレス <span class="contactRequired">必須</span></label>
            <input id="contactEmail" name="email" type="email" value="${escapeHtml(values.email)}" placeholder="返信が必要な場合に使用します" />
            ${renderError("email")}
          </div>

          <div class="contactField" data-field="message">
            <label for="contactMessage">お問い合わせ内容 <span class="contactRequired">必須</span></label>
            <textarea id="contactMessage" name="message" rows="8" maxlength="${MAX_MESSAGE_LENGTH}" placeholder="お問い合わせ内容を入力してください。">${escapeHtml(values.message)}</textarea>
            <div class="contactSubText">${values.message.length} / ${MAX_MESSAGE_LENGTH}文字</div>
            ${renderError("message")}
          </div>

          <div class="contactField" data-field="imageFile">
            <label for="contactImage">画像添付 <span class="contactOptional">任意</span></label>
            <input id="contactImage" class="contactFileInput" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            <div class="contactFileControls">
              <button id="contactImageSelectBtn" class="contactFileBtn" type="button">ファイルを選択</button>
              <button id="contactImageClearBtn" class="contactFileBtn" type="button" ${values.imageFile ? "" : "disabled"}>添付を解除</button>
            </div>
            <div class="contactSubText">不具合報告のスクリーンショットを1枚まで添付できます。jpg / png / webp、最大3MBまで。</div>
            <div class="contactSelectedFile">選択中：${values.imageFile ? escapeHtml(values.imageFile.name) : "なし"}</div>
            ${renderError("imageFile")}
          </div>

          <div class="contactActions">
            <button id="contactBackBtn" class="contactBtn is-secondary" type="button">戻る</button>
            <button id="contactNextBtn" class="contactBtn is-primary" type="submit">次へ</button>
          </div>
        </form>
      </section>
    </main>
  `;

  bindInputEvents();
}

function bindInputEvents() {
  const form = app.querySelector<HTMLFormElement>("#contactForm");
  const backBtn = app.querySelector<HTMLButtonElement>("#contactBackBtn");
  const categoryInput = app.querySelector<HTMLSelectElement>("#contactCategory");
  const messageInput = app.querySelector<HTMLTextAreaElement>("#contactMessage");
  const imageInput = app.querySelector<HTMLInputElement>("#contactImage");
  const imageSelectBtn = app.querySelector<HTMLButtonElement>("#contactImageSelectBtn");
  const imageClearBtn = app.querySelector<HTMLButtonElement>("#contactImageClearBtn");

  backBtn?.addEventListener("click", () => {
    window.location.href = getGameUrl();
  });

  categoryInput?.addEventListener("change", () => {
    readInputValues();
    errors.category = undefined;
    renderInput();
  });

  messageInput?.addEventListener("input", () => {
    const subText = app.querySelector<HTMLDivElement>(".contactField[data-field='message'] .contactSubText");
    if (!subText) return;
    subText.textContent = `${messageInput.value.length} / ${MAX_MESSAGE_LENGTH}文字`;
  });

  imageSelectBtn?.addEventListener("click", () => {
    imageInput?.click();
  });

  imageClearBtn?.addEventListener("click", () => {
    values.imageFile = null;
    errors.imageFile = undefined;
    if (imageInput) imageInput.value = "";
    renderInput();
  });

  imageInput?.addEventListener("change", () => {
    readInputValues();
    errors.imageFile = undefined;
    renderInput();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    readInputValues();
    errors = validate(values);

    const firstErrorKey = Object.keys(errors)[0] as ContactFieldKey | undefined;
    if (firstErrorKey) {
      renderInput();
      scrollToField(firstErrorKey);
      return;
    }

    submitError = "";
    step = "CONFIRM";
    render();
  });
}

function scrollToField(key: ContactFieldKey) {
  window.requestAnimationFrame(() => {
    const field = app.querySelector<HTMLElement>(`.contactField[data-field='${key}']`);
    field?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function buildContactFormData() {
  const formData = new FormData();

  formData.set("category", values.category);
  formData.set("subject", values.subject);
  formData.set("name", values.name);
  formData.set("email", values.email);
  formData.set("message", values.message);

  if (values.imageFile) {
    formData.set("image", values.imageFile);
  }

  return formData;
}

async function submitContact() {
  if (isSending) return;

  submitError = "";
  errors = validate(values);

  const firstErrorKey = Object.keys(errors)[0] as ContactFieldKey | undefined;
  if (firstErrorKey) {
    step = "INPUT";
    render();
    scrollToField(firstErrorKey);
    return;
  }

  isSending = true;
  renderConfirm();

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      body: buildContactFormData(),
    });

    let result: ContactApiResponse;
    try {
      result = await response.json();
    } catch {
      result = {
        ok: false,
        message: "送信結果を読み取れませんでした。",
      };
    }

    if (!response.ok || !result.ok) {
      if (result.errors) {
        errors = result.errors;
        const apiFirstErrorKey = Object.keys(errors)[0] as ContactFieldKey | undefined;
        step = "INPUT";
        isSending = false;
        render();
        if (apiFirstErrorKey) scrollToField(apiFirstErrorKey);
        return;
      }

      submitError = result.message ?? "メール送信に失敗しました。時間をおいて再度お試しください。";
      isSending = false;
      renderConfirm();
      return;
    }

    isSending = false;
    step = "COMPLETE";
    render();
  } catch {
    submitError = "通信に失敗しました。ネットワーク状況を確認して再度お試しください。";
    isSending = false;
    renderConfirm();
  }
}

function renderConfirm() {
  app.innerHTML = `
    <main class="contactPage">
      <section class="contactCard" aria-labelledby="contactConfirmTitle">
        <div class="contactHeader">
          <div class="contactBrand">100GAME⁺</div>
          <h1 id="contactConfirmTitle">入力内容の確認</h1>
          <p>下記のお問い合わせ内容で間違いないかご確認ください。</p>
        </div>

        <dl id="contactConfirmList" class="contactConfirmList"></dl>

        ${submitError ? `<div class="contactError" role="alert">${escapeHtml(submitError)}</div>` : ""}

        <div class="contactActions">
          <button id="contactEditBtn" class="contactBtn is-secondary" type="button" ${isSending ? "disabled" : ""}>修正する</button>
          <button id="contactSendBtn" class="contactBtn is-primary" type="button" ${isSending ? "disabled" : ""}>${isSending ? "送信中..." : "送信する"}</button>
        </div>
      </section>
    </main>
  `;

  const list = app.querySelector<HTMLDListElement>("#contactConfirmList");
  if (!list) throw new Error("#contactConfirmList not found");

  appendConfirmRow(list, "お問い合わせ種別", getCategoryLabel(values.category));
  appendConfirmRow(list, "件名", values.subject.trim());
  appendConfirmRow(list, "お名前・プレイヤー名", values.name.trim() || "未入力");
  appendConfirmRow(list, "メールアドレス", values.email.trim());
  appendConfirmRow(list, "お問い合わせ内容", values.message.trim(), true);
  appendConfirmRow(list, "画像添付", values.imageFile?.name ?? "なし");

  app.querySelector<HTMLButtonElement>("#contactEditBtn")?.addEventListener("click", () => {
    step = "INPUT";
    render();
  });

  app.querySelector<HTMLButtonElement>("#contactSendBtn")?.addEventListener("click", () => {
    submitContact();
  });
}

function appendConfirmRow(list: HTMLDListElement, label: string, value: string, multiline = false) {
  const row = document.createElement("div");
  row.className = multiline ? "contactConfirmRow is-multiline" : "contactConfirmRow";

  const dt = document.createElement("dt");
  dt.textContent = label;

  const dd = document.createElement("dd");
  dd.textContent = value;

  row.append(dt, dd);
  list.append(row);
}

function renderComplete() {
  app.innerHTML = `
    <main class="contactPage">
      <section class="contactCard is-complete" aria-labelledby="contactCompleteTitle">
        <div class="contactCompleteIcon" aria-hidden="true">✓</div>
        <div class="contactHeader">
          <div class="contactBrand">100GAME⁺</div>
          <h1 id="contactCompleteTitle">お問い合わせを送信しました</h1>
          <p>いただいた内容を確認のうえ、必要に応じてご連絡いたします。</p>
        </div>
        <div class="contactCompleteNote">返信が必要な場合は、入力いただいたメールアドレス宛にご連絡いたします。</div>
        <div class="contactActions is-center">
          <button id="contactReturnGameBtn" class="contactBtn is-primary" type="button">ゲームに戻る</button>
        </div>
      </section>
    </main>
  `;

  app.querySelector<HTMLButtonElement>("#contactReturnGameBtn")?.addEventListener("click", () => {
    window.location.href = getGameUrl();
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render() {
  if (step === "INPUT") {
    renderInput();
    return;
  }
  if (step === "CONFIRM") {
    renderConfirm();
    return;
  }
  renderComplete();
}

render();
