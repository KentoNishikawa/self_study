import { json, type PagesContext } from "../../auth/_shared";
import { isResponse, requireAdminSession, roleLabel } from "../_admin";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireAdminSession(context);
  if (isResponse(session)) return session;

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
  });
}
