import { createClearSessionCookie, findSession, isFutureIso, json, type PagesContext } from "./_shared";

const ACCOUNT_UNAVAILABLE_MESSAGE = "このアカウントは現在利用できません。心当たりがない場合はお問い合わせください。";

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  const session = await findSession(env, request);

  if (!session) {
    return json({ ok: true, authenticated: false });
  }

  if (session.status === "suspended") {
    return json(
      { ok: false, authenticated: false, accountUnavailable: true, message: ACCOUNT_UNAVAILABLE_MESSAGE },
      { status: 403, headers: { "Set-Cookie": createClearSessionCookie() } },
    );
  }

  if (session.revoked_at || session.status !== "active" || !isFutureIso(session.expires_at)) {
    return json(
      { ok: true, authenticated: false },
      { headers: { "Set-Cookie": createClearSessionCookie() } },
    );
  }

  return json({
    ok: true,
    authenticated: true,
    user: {
      userId: session.user_id,
      email: session.email,
    },
    expiresAt: session.expires_at,
  });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはGET送信のみ対応しています。" }, { status: 405 });
}
