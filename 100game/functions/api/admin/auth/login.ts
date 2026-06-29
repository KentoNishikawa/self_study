import {
  getString,
  isValidEmail,
  json,
  normalizeEmail,
  nowIso,
  readJsonRecord,
  verifyPassword,
  type PagesContext,
} from "../../auth/_shared";
import { createAdminLoginSession, createAdminSessionCookie, roleLabel, type AdminRole } from "../_admin";

type AdminUserRow = {
  admin_id: string;
  display_name: string;
  email: string;
  email_normalized: string;
  password_hash: string;
  role: AdminRole;
  status: "active" | "disabled" | "deleted";
  must_change_password: number;
};

type LoginErrors = Partial<Record<"email" | "password", string>>;

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const body = await readJsonRecord(request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const email = getString(body.email).trim();
  const password = getString(body.password);
  const errors = validateLogin({ email, password });
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, message: "入力内容を確認してください。", errors }, { status: 400 });
  }

  const admin = await env.DB.prepare("SELECT * FROM admin_users WHERE email_normalized = ? AND deleted_at IS NULL LIMIT 1")
    .bind(normalizeEmail(email))
    .first<AdminUserRow>();

  if (!admin || admin.status !== "active" || !(await verifyPassword(password, admin.password_hash))) {
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
  const { rawToken, expiresAt } = await createAdminLoginSession(env, admin.admin_id);
  await env.DB.prepare("UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE admin_id = ?")
    .bind(now, now, admin.admin_id)
    .run();

  return json(
    {
      ok: true,
      currentUser: {
        userId: admin.admin_id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        roleLabel: roleLabel(admin.role),
        mustChangePassword: Boolean(admin.must_change_password),
      },
      expiresAt,
    },
    { headers: { "Set-Cookie": createAdminSessionCookie(rawToken) } },
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
