import {
  getString,
  hashPassword,
  hashToken,
  isFutureIso,
  isValidRegisterPassword,
  json,
  nowIso,
  readJsonRecord,
  type PagesContext,
  type UserRow,
} from "./_shared";

type PasswordResetErrors = Partial<Record<"password" | "token", string>>;

type PasswordResetTokenRow = {
  token_id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  status: UserRow["status"];
};

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const token = getString(body.token);
  const password = getString(body.password);
  const errors = validatePasswordReset({ token, password });

  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const tokenHash = await hashToken(token);
  const resetToken = await env.DB.prepare(
    `
    SELECT
      password_reset_tokens.token_id,
      password_reset_tokens.user_id,
      password_reset_tokens.expires_at,
      password_reset_tokens.used_at,
      users.status
    FROM password_reset_tokens
    INNER JOIN users ON users.user_id = password_reset_tokens.user_id
    WHERE password_reset_tokens.token_hash = ?
    LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first<PasswordResetTokenRow>();

  if (!resetToken || resetToken.used_at || resetToken.status !== "active" || !isFutureIso(resetToken.expires_at)) {
    return json(
      {
        ok: false,
        message: "パスワード再設定リンクが無効、または有効期限切れです。",
        errors: { token: "パスワード再設定リンクが無効、または有効期限切れです。" },
      },
      { status: 400 },
    );
  }

  const now = nowIso();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE user_id = ?")
    .bind(passwordHash, now, resetToken.user_id)
    .run();

  await env.DB.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE token_id = ?")
    .bind(now, resetToken.token_id)
    .run();

  return json({ ok: true, message: "パスワードを再設定しました。" });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

function validatePasswordReset(values: { token: string; password: string }) {
  const errors: PasswordResetErrors = {};

  if (!values.token) errors.token = "パスワード再設定リンクが無効です。";

  if (!values.password) errors.password = "パスワードを入力してください。";
  else if (!isValidRegisterPassword(values.password)) errors.password = "パスワードは英字・数字・記号を含む7文字以上で入力してください。";

  return errors;
}
