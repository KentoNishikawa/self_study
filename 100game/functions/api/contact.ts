type Env = {
  RESEND_API_KEY?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

type ContactCategory = "bug" | "request" | "other";

type ContactFieldKey =
  | "category"
  | "subject"
  | "name"
  | "email"
  | "message"
  | "imageFile";

type ContactErrors = Partial<Record<ContactFieldKey, string>>;

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

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.RESEND_API_KEY) {
    return json(
      {
        ok: false,
        message: "メール送信用の設定が不足しています。",
      },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(
      {
        ok: false,
        message: "送信内容を読み取れませんでした。",
      },
      { status: 400 }
    );
  }

  const category = getFormString(formData, "category");
  const subject = getFormString(formData, "subject");
  const name = getFormString(formData, "name");
  const email = getFormString(formData, "email");
  const message = getFormString(formData, "message");
  const imageEntry = formData.get("image");
  const imageFile = imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

  const errors = validateContact({
    category,
    subject,
    name,
    email,
    message,
    imageFile,
  });

  if (Object.keys(errors).length > 0) {
    return json(
      {
        ok: false,
        message: "入力内容を確認してください。",
        errors,
      },
      { status: 400 }
    );
  }

  const trimmedCategory = category as ContactCategory;
  const trimmedSubject = subject.trim();
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  const userAgent = request.headers.get("user-agent") ?? "不明";
  const sentAt = formatJstDate(new Date());

  const attachments: Array<{ filename: string; content: string }> = [];
  if (imageFile) {
    attachments.push({
      filename: imageFile.name,
      content: await fileToBase64(imageFile),
    });
  }

  const payload: Record<string, unknown> = {
    from: "100GAMEサポート <support@acceble.com>",
    to: ["support@acceble.com"],
    reply_to: trimmedEmail,
    subject: `【100GAMEお問い合わせ】${trimmedSubject}`,
    text: buildTextEmail({
      categoryLabel: CATEGORY_LABELS[trimmedCategory],
      subject: trimmedSubject,
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      imageFileName: imageFile?.name ?? "なし",
      sentAt,
      userAgent,
    }),
    html: buildHtmlEmail({
      categoryLabel: CATEGORY_LABELS[trimmedCategory],
      subject: trimmedSubject,
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      imageFileName: imageFile?.name ?? "なし",
      sentAt,
      userAgent,
    }),
  };

  if (attachments.length > 0) {
    payload.attachments = attachments;
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resendResponse.ok) {
    const responseText = await resendResponse.text();
    console.error("Resend send failed:", resendResponse.status, responseText);

    return json(
      {
        ok: false,
        message: "メール送信に失敗しました。時間をおいて再度お試しください。",
      },
      { status: 502 }
    );
  }

  return json({
    ok: true,
    message: "お問い合わせを送信しました。",
  });
}

export function onRequestGet(): Response {
  return json(
    {
      ok: false,
      message: "このAPIはPOST送信のみ対応しています。",
    },
    { status: 405 }
  );
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validateContact(values: {
  category: string;
  subject: string;
  name: string;
  email: string;
  message: string;
  imageFile: File | null;
}) {
  const errors: ContactErrors = {};

  if (!isAllowedCategory(values.category)) {
    errors.category = "お問い合わせ種別を選択してください。";
  }

  if (!values.subject.trim()) {
    errors.subject = "件名を入力してください。";
  } else if (values.subject.trim().length > MAX_SUBJECT_LENGTH) {
    errors.subject = `件名は${MAX_SUBJECT_LENGTH}文字以内で入力してください。`;
  }

  if (values.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `お名前・プレイヤー名は${MAX_NAME_LENGTH}文字以内で入力してください。`;
  }

  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = "メールアドレスの形式が正しくありません。";
  }

  if (!values.message.trim()) {
    errors.message = "お問い合わせ内容を入力してください。";
  } else if (values.message.trim().length > MAX_MESSAGE_LENGTH) {
    errors.message = `お問い合わせ内容は${MAX_MESSAGE_LENGTH}文字以内で入力してください。`;
  }

  if (values.imageFile) {
    if (!ALLOWED_IMAGE_TYPES.includes(values.imageFile.type)) {
      errors.imageFile = "添付できる画像形式は jpg / png / webp のみです。";
    } else if (values.imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      errors.imageFile = "添付画像は3MB以内にしてください。";
    }
  }

  return errors;
}

function isAllowedCategory(value: string): value is ContactCategory {
  return value === "bug" || value === "request" || value === "other";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

function buildTextEmail(values: {
  categoryLabel: string;
  subject: string;
  name: string;
  email: string;
  message: string;
  imageFileName: string;
  sentAt: string;
  userAgent: string;
}) {
  return [
    "100GAMEのお問い合わせフォームから送信がありました。",
    "",
    `お問い合わせ種別：${values.categoryLabel}`,
    `件名：${values.subject}`,
    `お名前・プレイヤー名：${values.name || "未入力"}`,
    `メールアドレス：${values.email}`,
    `画像添付：${values.imageFileName}`,
    `送信日時：${values.sentAt}`,
    `User-Agent：${values.userAgent}`,
    "",
    "お問い合わせ内容：",
    values.message,
  ].join("\n");
}

function buildHtmlEmail(values: {
  categoryLabel: string;
  subject: string;
  name: string;
  email: string;
  message: string;
  imageFileName: string;
  sentAt: string;
  userAgent: string;
}) {
  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; line-height: 1.7;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">100GAME お問い合わせ</h1>
      <p style="margin: 0 0 18px;">100GAMEのお問い合わせフォームから送信がありました。</p>

      <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${buildHtmlRow("お問い合わせ種別", values.categoryLabel)}
        ${buildHtmlRow("件名", values.subject)}
        ${buildHtmlRow("お名前・プレイヤー名", values.name || "未入力")}
        ${buildHtmlRow("メールアドレス", values.email)}
        ${buildHtmlRow("画像添付", values.imageFileName)}
        ${buildHtmlRow("送信日時", values.sentAt)}
        ${buildHtmlRow("User-Agent", values.userAgent)}
      </table>

      <h2 style="font-size: 16px; margin: 24px 0 8px;">お問い合わせ内容</h2>
      <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #f9fafb;">${escapeHtml(values.message)}</div>
    </div>
  `;
}

function buildHtmlRow(label: string, value: string) {
  return `
    <tr>
      <th style="width: 180px; text-align: left; vertical-align: top; padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb;">${escapeHtml(label)}</th>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatJstDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=UTF-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}