import { grantAutomaticAcquisitions } from "./_auto-acquisition";
import { recordNgNameDecisionForStreak } from "./_ng-name-streak";
import { findActiveSession, getString, json, nowIso, readJsonRecord, type PagesContext } from "./auth/_shared";

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const session = await findActiveSession(env, request);
  if (!session) {
    return json({ ok: false, message: "ログインが必要です。" }, { status: 401 });
  }

  const body = await readJsonRecord(request);
  if (!body) {
    return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });
  }

  const displayName = getString(body.displayName);
  const now = nowIso();
  const { result, ngName } = await recordNgNameDecisionForStreak(env, session.user_id, displayName, now);

  if (result === "tracked_ng") {
    await grantAutomaticAcquisitions(env, session.user_id, { acquiredAt: now });
    return json({ ok: true, result, ngName, message: "このプレイヤーネームは使用できません。" });
  }

  return json({ ok: true, result, ngName });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPOST送信のみ対応しています。" }, { status: 405 });
}
