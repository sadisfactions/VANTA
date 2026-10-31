/* POST /api/admin/logout — завершает сессию (cookie сбрасывается). Требует CSRF-токен. */
import { json, requireAdmin, sessionCookie } from "../../_lib/util.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env, true);
  if (auth.error) return auth.error;
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}
