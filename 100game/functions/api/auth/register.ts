import {
  addHoursIso,
  buildVerificationMail,
  createId,
  createTokenPair,
  getOrigin,
  getString,
  hashPassword,
  isValidEmail,
  isValidRegisterPassword,
  json,
  normalizeEmail,
  nowIso,
  readJsonRecord,
  sendAuthMail,
  type PagesContext,
  type UserRow,
} from "./_shared";

type RegisterErrors = Partial<Record<"email" | "password" | "displayName", string>>;

const MAX_DISPLAY_NAME_LENGTH = 15;

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const email = getString(body.email).trim();
  const password = getString(body.password);
  const displayName = getString(body.displayName).trim();
  const errors = validateRegister({ email, password, displayName });

  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const emailNormalized = normalizeEmail(email);
  const existingUser = await env.DB.prepare("SELECT user_id FROM users WHERE email_normalized = ? LIMIT 1")
    .bind(emailNormalized)
    .first<Pick<UserRow, "user_id">>();

  if (existingUser) {
    return json(
      {
        ok: false,
        message: "入力内容を確認してください。",
        errors: { email: "このメールアドレスは既に登録されています。" },
      },
      { status: 409 },
    );
  }

  const now = nowIso();
  const userId = createId("usr");
  const tokenId = createId("evt");
  const passwordHash = await hashPassword(password);
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = addHoursIso(24);

  await env.DB.prepare(
    `
    INSERT INTO users (
      user_id,
      email,
      email_normalized,
      password_hash,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `,
  )
    .bind(userId, email, emailNormalized, passwordHash, now, now)
    .run();

  await env.DB.prepare(
    `
    INSERT INTO email_verification_tokens (
      token_id,
      user_id,
      token_hash,
      expires_at,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
    `,
  )
    .bind(tokenId, userId, tokenHash, expiresAt, now)
    .run();

  await env.DB.prepare(
    `
    INSERT INTO user_settings (
      user_id,
      display_name,
      sound_volume_level,
      created_at,
      updated_at
    )
    VALUES (?, ?, 3, ?, ?)
    `,
  )
    .bind(userId, displayName, now, now)
    .run();

  const verificationUrl = new URL("/api/auth/verify-email", getOrigin(request));
  verificationUrl.searchParams.set("token", rawToken);
  const mailSent = await sendAuthMail(env, buildVerificationMail(email, verificationUrl.toString()));

  return json({
    ok: true,
    status: "pending",
    mailSent,
    message: "新規登録を受け付けました。メール認証を完了してください。",
  });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

function validateRegister(values: { email: string; password: string; displayName: string }) {
  const errors: RegisterErrors = {};

  if (!values.email) errors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(values.email)) errors.email = "メールアドレスの形式が正しくありません。";

  if (!values.password) errors.password = "パスワードを入力してください。";
  else if (!isValidRegisterPassword(values.password)) errors.password = "パスワードは英字・数字・記号を含む7文字以上で入力してください。";

  if (!values.displayName) errors.displayName = "表示名を入力してください。";
  else if (values.displayName.length > MAX_DISPLAY_NAME_LENGTH) errors.displayName = `表示名は${MAX_DISPLAY_NAME_LENGTH}文字以内で入力してください。`;

  return errors;
}
