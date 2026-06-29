import {
  createId,
  getString,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  nowIso,
  readJsonRecord,
  type Env,
  type PagesContext,
} from "../auth/_shared";
import { countOwners, isResponse, normalizeRole, requireAdminSession, roleLabel, type AdminRole } from "./_admin";

type AdminStatus = "active" | "disabled" | "deleted";

type AdminUserRow = {
  admin_id: string;
  display_name: string;
  email: string;
  email_normalized: string;
  role: AdminRole;
  status: AdminStatus;
  must_change_password: number;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

type AdminTargetRow = {
  admin_id: string;
  display_name: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const users = await readAdminUsers(context.env);
  return json({
    ok: true,
    currentUser: {
      userId: session.admin_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      roleLabel: roleLabel(session.role),
      mustChangePassword: Boolean(session.must_change_password),
    },
    users: users.map((user) => toUserResponse(user, session.admin_id)),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;
  if (session.role !== "owner") {
    return json({ ok: false, message: "管理者を追加できるのは管理責任者のみです。" }, { status: 403 });
  }

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const displayName = getString(body.displayName).trim();
  const email = getString(body.email).trim();
  const emailNormalized = normalizeEmail(email);
  const role = normalizeRole(getString(body.role)) ?? "admin";

  if (!displayName) return json({ ok: false, message: "管理者名を入力してください。" }, { status: 400 });
  if (displayName.length > 30) return json({ ok: false, message: "管理者名は30文字以内にしてください。" }, { status: 400 });
  if (!isValidEmail(email)) return json({ ok: false, message: "メールアドレスの形式が正しくありません。" }, { status: 400 });

  const existing = await context.env.DB.prepare("SELECT admin_id, deleted_at FROM admin_users WHERE email_normalized = ? LIMIT 1")
    .bind(emailNormalized)
    .first<{ admin_id: string; deleted_at: string | null }>();

  const now = nowIso();
  const passwordHash = await hashPassword(email);

  if (existing && !existing.deleted_at) {
    return json({ ok: false, message: "このメールアドレスの管理者は既に登録されています。" }, { status: 409 });
  }

  if (existing?.deleted_at) {
    await context.env.DB.prepare(
      `
      UPDATE admin_users
      SET
        display_name = ?,
        email = ?,
        email_normalized = ?,
        password_hash = ?,
        role = ?,
        status = 'active',
        must_change_password = 1,
        password_changed_at = NULL,
        updated_at = ?,
        deleted_at = NULL
      WHERE admin_id = ?
      `,
    )
      .bind(displayName, email, emailNormalized, passwordHash, role, now, existing.admin_id)
      .run();

    return json({ ok: true, message: "削除済み管理者を復元しました。初期パスワードはメールアドレスと同じです。" });
  }

  const adminId = createId("adm");
  await context.env.DB.prepare(
    `
    INSERT INTO admin_users (
      admin_id,
      display_name,
      email,
      email_normalized,
      password_hash,
      role,
      status,
      must_change_password,
      last_login_at,
      password_changed_at,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NULL, NULL, ?, ?, NULL)
    `,
  )
    .bind(adminId, displayName, email, emailNormalized, passwordHash, role, now, now)
    .run();

  return json({ ok: true, message: "管理者を追加しました。初期パスワードはメールアドレスと同じです。" });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

  const body = await readJsonRecord(context.request);
  if (!body) return json({ ok: false, message: "送信内容を読み取れませんでした。" }, { status: 400 });

  const action = getString(body.action);
  if (action === "update_display_name") return updateDisplayName(context, session.admin_id, session.role, body);
  if (action === "update_role") return updateRole(context, session.admin_id, session.role, body);
  if (action === "update_status") return updateStatus(context, session.admin_id, session.role, body);
  if (action === "delete_admin") return deleteAdmin(context, session.admin_id, session.role, body);

  return json({ ok: false, message: "未対応の操作です。" }, { status: 400 });
}

async function updateDisplayName(context: PagesContext, currentAdminId: string, currentRole: AdminRole, body: Record<string, unknown>) {
  const targetAdminId = getString(body.adminId).trim();
  const displayName = getString(body.displayName).trim();
  if (!targetAdminId) return json({ ok: false, message: "対象の管理者を指定してください。" }, { status: 400 });
  if (!displayName) return json({ ok: false, message: "管理者名を入力してください。" }, { status: 400 });
  if (displayName.length > 30) return json({ ok: false, message: "管理者名は30文字以内にしてください。" }, { status: 400 });
  if (currentRole !== "owner" && targetAdminId !== currentAdminId) {
    return json({ ok: false, message: "他の管理者名を変更できるのは管理責任者のみです。" }, { status: 403 });
  }

  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "対象の管理者が見つかりません。" }, { status: 404 });

  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET display_name = ?, updated_at = ? WHERE admin_id = ?")
    .bind(displayName, now, target.admin_id)
    .run();

  return json({ ok: true, message: "管理者名を変更しました。" });
}

async function updateRole(context: PagesContext, currentAdminId: string, currentRole: AdminRole, body: Record<string, unknown>) {
  if (currentRole !== "owner") return json({ ok: false, message: "権限を変更できるのは管理責任者のみです。" }, { status: 403 });

  const targetAdminId = getString(body.adminId).trim();
  const nextRole = normalizeRole(getString(body.role));
  if (!targetAdminId) return json({ ok: false, message: "対象の管理者を指定してください。" }, { status: 400 });
  if (!nextRole) return json({ ok: false, message: "権限の指定が正しくありません。" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "自分自身の権限は変更できません。" }, { status: 400 });

  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "対象の管理者が見つかりません。" }, { status: 404 });
  if (target.role === "owner" && nextRole !== "owner" && (await countOwners(context.env)) <= 1) {
    return json({ ok: false, message: "管理責任者が0人になるため変更できません。" }, { status: 400 });
  }

  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET role = ?, updated_at = ? WHERE admin_id = ?")
    .bind(nextRole, now, target.admin_id)
    .run();

  return json({ ok: true, message: "管理者の権限を変更しました。" });
}

async function updateStatus(context: PagesContext, currentAdminId: string, currentRole: AdminRole, body: Record<string, unknown>) {
  if (currentRole !== "owner") return json({ ok: false, message: "状態を変更できるのは管理責任者のみです。" }, { status: 403 });

  const targetAdminId = getString(body.adminId).trim();
  const nextStatus = getString(body.status) === "disabled" ? "disabled" : getString(body.status) === "active" ? "active" : null;
  if (!targetAdminId) return json({ ok: false, message: "対象の管理者を指定してください。" }, { status: 400 });
  if (!nextStatus) return json({ ok: false, message: "状態の指定が正しくありません。" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "自分自身の状態は変更できません。" }, { status: 400 });

  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "対象の管理者が見つかりません。" }, { status: 404 });
  if (target.role === "owner" && target.status === "active" && nextStatus !== "active" && (await countOwners(context.env)) <= 1) {
    return json({ ok: false, message: "有効な管理責任者が0人になるため変更できません。" }, { status: 400 });
  }

  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET status = ?, updated_at = ? WHERE admin_id = ?")
    .bind(nextStatus, now, target.admin_id)
    .run();

  if (nextStatus !== "active") {
    await context.env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE admin_id = ? AND revoked_at IS NULL")
      .bind(now, now, target.admin_id)
      .run();
  }

  return json({ ok: true, message: nextStatus === "active" ? "管理者を有効化しました。" : "管理者を無効化しました。" });
}

async function deleteAdmin(context: PagesContext, currentAdminId: string, currentRole: AdminRole, body: Record<string, unknown>) {
  if (currentRole !== "owner") return json({ ok: false, message: "管理者を削除できるのは管理責任者のみです。" }, { status: 403 });

  const targetAdminId = getString(body.adminId).trim();
  if (!targetAdminId) return json({ ok: false, message: "対象の管理者を指定してください。" }, { status: 400 });
  if (targetAdminId === currentAdminId) return json({ ok: false, message: "自分自身は削除できません。" }, { status: 400 });

  const target = await readAdminTarget(context.env, targetAdminId);
  if (!target) return json({ ok: false, message: "対象の管理者が見つかりません。" }, { status: 404 });

  if (target.role === "owner") {
    if (target.status === "active" && (await countOwners(context.env)) <= 1) {
      return json({ ok: false, message: "有効な管理責任者が0人になるため削除できません。" }, { status: 400 });
    }

    const remainingOwner = await context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM admin_users WHERE role = 'owner' AND deleted_at IS NULL AND admin_id != ?",
    )
      .bind(target.admin_id)
      .first<{ count: number }>();
    if (Number(remainingOwner?.count ?? 0) <= 0) {
      return json({ ok: false, message: "管理責任者が0人になるため削除できません。" }, { status: 400 });
    }
  }

  const now = nowIso();
  await context.env.DB.prepare("UPDATE admin_users SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE admin_id = ?")
    .bind(now, now, target.admin_id)
    .run();
  await context.env.DB.prepare("UPDATE admin_sessions SET revoked_at = ?, updated_at = ? WHERE admin_id = ? AND revoked_at IS NULL")
    .bind(now, now, target.admin_id)
    .run();

  return json({ ok: true, message: "管理者を削除しました。" });
}

async function readAdminUsers(env: Env) {
  const result = await env.DB.prepare(
    `
    SELECT
      admin_id,
      display_name,
      email,
      email_normalized,
      role,
      status,
      must_change_password,
      last_login_at,
      password_changed_at,
      created_at,
      updated_at
    FROM admin_users
    WHERE deleted_at IS NULL
    ORDER BY
      CASE role WHEN 'owner' THEN 0 ELSE 1 END,
      CASE status WHEN 'active' THEN 0 WHEN 'disabled' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 100
    `,
  ).all<AdminUserRow>();

  return result.results ?? [];
}

async function readAdminTarget(env: Env, adminId: string) {
  return env.DB.prepare(
    `
    SELECT admin_id, display_name, email, role, status
    FROM admin_users
    WHERE admin_id = ? AND deleted_at IS NULL
    LIMIT 1
    `,
  )
    .bind(adminId)
    .first<AdminTargetRow>();
}

function toUserResponse(row: AdminUserRow, currentAdminId: string) {
  return {
    userId: row.admin_id,
    adminId: row.admin_id,
    email: row.email,
    emailNormalized: row.email_normalized,
    status: row.status,
    role: row.role,
    roleLabel: roleLabel(row.role),
    displayName: row.display_name,
    lastLoginAt: row.last_login_at,
    passwordChangedAt: row.password_changed_at,
    mustChangePassword: Boolean(row.must_change_password),
    isSelf: row.admin_id === currentAdminId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
