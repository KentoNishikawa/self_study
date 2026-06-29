import {
  getString,
  hashPassword,
  isValidRegisterPassword,
  json,
  nowIso,
  readJsonRecord,
  verifyPassword,
  type PagesContext,
} from "../../auth/_shared";
import { isResponse, requireAdminSession } from "../_admin";

type AdminPasswordRow = {
  admin_id: string;
  password_hash: string;
};

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const targetAdminId = getString(body.targetAdminId) || session.admin_id;
  const currentPassword = getString(body.currentPassword);
  const newPassword = getString(body.newPassword);
  const confirmPassword = getString(body.confirmPassword);
  const isSelf = targetAdminId === session.admin_id;

  if (!isSelf && session.role !== "owner") {
    return json({ ok: false, message: "他の管理者のパスワードを変更できるのは管理責任者のみです。" }, { status: 403 });
  }
  if (isSelf && !currentPassword) return json({ ok: false, message: "現在のパスワードを入力してください。" }, { status: 400 });
  if (!isValidRegisterPassword(newPassword)) {
    return json({ ok: false, message: "新しいパスワードは英字・数字・記号を含む7文字以上にしてください。" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return json({ ok: false, message: "確認用パスワードが一致しません。" }, { status: 400 });
  }

  const row = await context.env.DB.prepare("SELECT admin_id, password_hash FROM admin_users WHERE admin_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1")
    .bind(targetAdminId)
    .first<AdminPasswordRow>();
  if (!row) {
    return json({ ok: false, message: "対象の管理者が見つかりません。" }, { status: 404 });
  }
  if (isSelf && !(await verifyPassword(currentPassword, row.password_hash))) {
    return json({ ok: false, message: "現在のパスワードが正しくありません。" }, { status: 401 });
  }

  const now = nowIso();
  const passwordHash = await hashPassword(newPassword);
  await context.env.DB.prepare("UPDATE admin_users SET password_hash = ?, must_change_password = 0, password_changed_at = ?, updated_at = ? WHERE admin_id = ?")
    .bind(passwordHash, now, now, row.admin_id)
    .run();

  return json({ ok: true, message: "パスワードを変更しました。" });
}

export function onRequestGet(): Response {
  return json({ ok: false, message: "このAPIはPATCH送信のみ対応しています。" }, { status: 405 });
}
