/* PUT /api/admin/settings — сохранение настроек. Авторизация, CSRF, серверная валидация. */
import { json, requireAdmin, writeSettings } from "../../_lib/util.js";
import { sanitize } from "../../_lib/schema.js";

export async function onRequestPut({ request, env }) {
  const auth = await requireAdmin(request, env, true);
  if (auth.error) return auth.error;

  let body;
  try {
    const text = await request.text();
    if (text.length > 200000) return json({ error: "too_large" }, 413);
    body = JSON.parse(text);
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  const { value, errors } = sanitize(body && body.settings);
  if (errors.length) return json({ error: "validation", errors }, 400);

  if (!(await writeSettings(env, value))) return json({ error: "storage_unavailable" }, 503);
  return json({ ok: true, settings: value });
}
