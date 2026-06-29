import {
  createClearSessionCookie,
  getSessionTokenFromCookie,
  hashToken,
  json,
  nowIso,
  type PagesContext,
} from "./_shared";

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const rawToken = getSessionTokenFromCookie(request);

  if (rawToken) {
    const now = nowIso();
    await env.DB.prepare(
      `
      UPDATE user_sessions
      SET revoked_at = ?, updated_at = ?
      WHERE session_token_hash = ?
        AND revoked_at IS NULL
      `,
    )
      .bind(now, now, await hashToken(rawToken))
      .run();
  }

  return json(
    { ok: true, message: "ログアウトしました。" },
    {
      headers: {
        "Set-Cookie": createClearSessionCookie(),
      },
    },
  );
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}
