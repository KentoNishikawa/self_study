import {
  addHoursIso,
  buildPasswordResetMail,
  createId,
  createTokenPair,
  getOrigin,
  getString,
  isValidEmail,
  json,
  normalizeEmail,
  nowIso,
  readJsonRecord,
  sendAuthMail,
  type PagesContext,
  type UserRow,
} from "./_shared";

type PasswordResetRequestErrors = Partial<Record<"email", string>>;

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const email = getString(body.email).trim();
  const errors = validatePasswordResetRequest({ email });

  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const user = await env.DB.prepare("SELECT user_id, email, status FROM users WHERE email_normalized = ? LIMIT 1")
    .bind(normalizeEmail(email))
    .first<Pick<UserRow, "user_id" | "email" | "status">>();

  if (user?.status === "active") {
    const now = nowIso();
    const tokenId = createId("prt");
    const { rawToken, tokenHash } = await createTokenPair();
    const expiresAt = addHoursIso(1);

    await env.DB.prepare(
      `
      INSERT INTO password_reset_tokens (
        token_id,
        user_id,
        token_hash,
        expires_at,
        created_at
      )
      VALUES (?, ?, ?, ?, ?)
      `,
    )
      .bind(tokenId, user.user_id, tokenHash, expiresAt, now)
      .run();

    const resetUrl = new URL("/password-reset.html", getOrigin(request));
    resetUrl.searchParams.set("token", rawToken);
    await sendAuthMail(env, buildPasswordResetMail(user.email, resetUrl.toString()));
  }

  return json({
    ok: true,
    message: "ご入力いただいたメールアドレスが登録済みの場合、パスワード再設定用のメールを送信しました。",
  });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

function validatePasswordResetRequest(values: { email: string }) {
  const errors: PasswordResetRequestErrors = {};

  if (!values.email) errors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(values.email)) errors.email = "メールアドレスの形式が正しくありません。";

  return errors;
}
