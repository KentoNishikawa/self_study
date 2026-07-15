import { json, readJsonRecord, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";
import { readTitleAchievementEffect } from "./_title-effects";
import { normalizeTitleConditionDefinition } from "./_condition-graph";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const normalized = normalizeTitleConditionDefinition(body.conditionType, body.conditionParamsJson, body.conditionBuilderJson);
  if (normalized.ok === false) return json({ ok: false, message: normalized.message }, { status: 400 });

  try {
    const effect = await readTitleAchievementEffect(context.env, normalized.value.conditionType, normalized.value.conditionParamsJson);
    return json({ ok: true, effect });
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : "達成ユーザー数を集計できませんでした。" }, { status: 500 });
  }
}
