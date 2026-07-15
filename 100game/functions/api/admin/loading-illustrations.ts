import { getString, json, nowIso, readJsonRecord, type Env, type PagesContext } from "../auth/_shared";
import { isResponse, requireAdminSession } from "./_admin";

type AppearanceMode = "auto" | "manual";

type LoadingIllustrationInput = {
  illustrationId: string;
  requiredTitleId: string;
  appearanceMode: AppearanceMode;
  manualUnviewedRate: number;
  manualViewedRate: number;
  isActive: 0 | 1;
};

type ValidationResult =
  | { ok: true; value: LoadingIllustrationInput }
  | { ok: false; message: string };

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPATCHのみ対応しています。" }, { status: 405 });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const input = readLoadingIllustrationInput(body);
  if (!input.ok) return json({ ok: false, message: input.message }, { status: 400 });

  const illustrationExists = await existsById(context.env, "title_illustrations", "illustration_id", input.value.illustrationId);
  if (!illustrationExists) return json({ ok: false, message: "ロードイラストが見つかりません。" }, { status: 404 });

  const titleExists = await existsById(context.env, "titles", "title_id", input.value.requiredTitleId);
  if (!titleExists) return json({ ok: false, message: "紐づける称号が見つかりません。" }, { status: 400 });

  const titleName = await readTitleName(context.env, input.value.requiredTitleId);
  await updateLoadingIllustration(context.env, input.value, titleName ?? "称号");

  return json({ ok: true, message: "ロードイラスト設定を保存しました。" });
}

export function onRequestPost(): Response {
  return json({ ok: false, message: "このAPIはPATCHのみ対応しています。" }, { status: 405 });
}

function readLoadingIllustrationInput(body: Record<string, unknown>): ValidationResult {
  const illustrationId = getString(body.illustrationId).trim();
  const requiredTitleId = getString(body.requiredTitleId).trim();
  const appearanceMode = readAppearanceMode(body.appearanceMode);
  const manualUnviewedRate = readRate(body.manualUnviewedRate);
  const manualViewedRate = readRate(body.manualViewedRate);
  const isActive = readFlag(body.isActive);

  if (!illustrationId) return { ok: false, message: "ロードイラストIDがありません。" };
  if (!requiredTitleId) return { ok: false, message: "紐づける称号を選択してください。" };
  if (!appearanceMode) return { ok: false, message: "出現設定が不正です。" };
  if (manualUnviewedRate === null || manualViewedRate === null) {
    return { ok: false, message: "出現率は0.0000〜100.0000の範囲で入力してください。" };
  }

  return {
    ok: true,
    value: {
      illustrationId,
      requiredTitleId,
      appearanceMode,
      manualUnviewedRate,
      manualViewedRate,
      isActive,
    },
  };
}

function readAppearanceMode(value: unknown): AppearanceMode | null {
  if (value === "auto" || value === "manual") return value;
  return null;
}

function readRate(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < 0 || numberValue > 100) return null;
  return Math.round(numberValue * 10000) / 10000;
}

function readFlag(value: unknown): 0 | 1 {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

async function existsById(env: Env, tableName: "title_illustrations" | "titles", columnName: "illustration_id" | "title_id", id: string) {
  const deletedFilter = tableName === "title_illustrations" ? " AND deleted_at IS NULL" : "";
  const row = await env.DB.prepare(`SELECT 1 AS exists_flag FROM ${tableName} WHERE ${columnName} = ?${deletedFilter} LIMIT 1`).bind(id).first<{ exists_flag: number }>();
  return Number(row?.exists_flag ?? 0) === 1;
}

async function readTitleName(env: Env, titleId: string) {
  const row = await env.DB.prepare("SELECT title_name FROM titles WHERE title_id = ? AND deleted_at IS NULL LIMIT 1").bind(titleId).first<{ title_name: string }>();
  return row?.title_name ?? null;
}

async function updateLoadingIllustration(env: Env, input: LoadingIllustrationInput, titleName: string) {
  const now = nowIso();
  await env.DB.prepare(
    `
    UPDATE title_illustrations
    SET
      required_title_id = ?,
      appearance_mode = ?,
      manual_unviewed_rate = ?,
      manual_viewed_rate = ?,
      condition_type = 'title_owned',
      condition_params_json = ?,
      unlock_condition_text = ?,
      is_active = ?,
      updated_at = ?
    WHERE illustration_id = ?
    `,
  )
    .bind(
      input.requiredTitleId,
      input.appearanceMode,
      input.manualUnviewedRate,
      input.manualViewedRate,
      JSON.stringify({ titleId: input.requiredTitleId }),
      `${titleName}を所持しているとロード画面に出現`,
      input.isActive,
      now,
      input.illustrationId,
    )
    .run();
}
