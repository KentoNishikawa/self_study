import {
  addHoursIso,
  createId,
  createSessionCookie,
  createTokenPair,
  getString,
  isValidEmail,
  json,
  normalizeEmail,
  nowIso,
  readJsonRecord,
  verifyPassword,
  type PagesContext,
  type UserRow,
} from "./_shared";

type LoginErrors = Partial<Record<"email" | "password", string>>;

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const email = getString(body.email).trim();
  const password = getString(body.password);
  const errors = validateLogin({ email, password });

  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const user = await env.DB.prepare("SELECT * FROM users WHERE email_normalized = ? LIMIT 1")
    .bind(normalizeEmail(email))
    .first<UserRow>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json(
      {
        ok: false,
        message: "メールアドレスまたはパスワードが正しくありません。",
        errors: { password: "メールアドレスまたはパスワードが正しくありません。" },
      },
      { status: 401 },
    );
  }

  if (user.status === "suspended") {
    return json(
      {
        ok: false,
        message: "このアカウントは現在利用できません。心当たりがない場合はお問い合わせください。",
        errors: { password: "このアカウントは現在利用できません。心当たりがない場合はお問い合わせください。" },
      },
      { status: 403 },
    );
  }

  if (user.status !== "active") {
    return json(
      {
        ok: false,
        message: "メールアドレスまたはパスワードが正しくありません。",
        errors: { password: "メールアドレスまたはパスワードが正しくありません。" },
      },
      { status: 401 },
    );
  }

  const now = nowIso();
  const sessionId = createId("ses");
  const { rawToken, tokenHash } = await createTokenPair();
  const expiresAt = addHoursIso(24);

  await env.DB.prepare(
    `
    INSERT INTO user_sessions (
      session_id,
      user_id,
      session_token_hash,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(sessionId, user.user_id, tokenHash, expiresAt, now, now)
    .run();

  await env.DB.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE user_id = ?")
    .bind(now, now, user.user_id)
    .run();

  return json(
    {
      ok: true,
      user: {
        userId: user.user_id,
        email: user.email,
      },
      expiresAt,
    },
    {
      headers: {
        "Set-Cookie": createSessionCookie(rawToken),
      },
    },
  );
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}

function validateLogin(values: { email: string; password: string }) {
  const errors: LoginErrors = {};

  if (!values.email) errors.email = "メールアドレスを入力してください。";
  else if (!isValidEmail(values.email)) errors.email = "メールアドレスの形式が正しくありません。";

  if (!values.password) errors.password = "パスワードを入力してください。";

  return errors;
}
