import { json, type PagesContext } from "../../auth/_shared";
import { createClearAdminSessionCookie, revokeCurrentAdminSession } from "../_admin";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  await revokeCurrentAdminSession(context.env, context.request);
  return json(
    { ok: true, message: "ログアウトしました。" },
    { headers: { "Set-Cookie": createClearAdminSessionCookie() } },
  );
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}
