import { escapeHtml, hashToken, isFutureIso, nowIso, type PagesContext } from "./_shared";

type EmailVerificationTokenRow = {
  token_id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
  status: "pending" | "active" | "suspended" | "deleted";
};

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return html("メール認証リンクが無効です。", 400);
  }

  const tokenHash = await hashToken(token);
  const verificationToken = await env.DB.prepare(
    `
    SELECT
      email_verification_tokens.token_id,
      email_verification_tokens.user_id,
      email_verification_tokens.expires_at,
      email_verification_tokens.used_at,
      users.status
    FROM email_verification_tokens
    INNER JOIN users ON users.user_id = email_verification_tokens.user_id
    WHERE email_verification_tokens.token_hash = ?
    LIMIT 1
    `,
  )
    .bind(tokenHash)
    .first<EmailVerificationTokenRow>();

  if (
    !verificationToken ||
    verificationToken.used_at ||
    verificationToken.status !== "pending" ||
    !isFutureIso(verificationToken.expires_at)
  ) {
    return html("メール認証リンクが無効、または有効期限切れです。", 400);
  }

  const now = nowIso();

  await env.DB.prepare(
    `
    UPDATE users
    SET status = 'active', email_verified_at = ?, updated_at = ?
    WHERE user_id = ?
    `,
  )
    .bind(now, now, verificationToken.user_id)
    .run();

  await env.DB.prepare("UPDATE email_verification_tokens SET used_at = ? WHERE token_id = ?")
    .bind(now, verificationToken.token_id)
    .run();

  const redirectUrl = new URL("/index.html", url.origin);
  redirectUrl.searchParams.set("auth", "login");
  redirectUrl.searchParams.set("verified", "1");
  return Response.redirect(redirectUrl.toString(), 302);
}

export function onRequestPost(): Response {
  return html("このAPIはGET送信のみ対応しています。", 405);
}

function html(message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>100GAME⁺ メール認証</title></head><body><main style="font-family:sans-serif;padding:24px;"><h1>100GAME⁺</h1><p>${escapeHtml(message)}</p><p><a href="/index.html">タイトルへ戻る</a></p></main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
