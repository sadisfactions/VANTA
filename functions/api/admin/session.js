/* GET /api/admin/session — проверка сессии. Без входа отвечает 200 {authenticated:false} (чтобы страницы не засоряли консоль 401);
   для вошедшего возвращает CSRF-токен и сохранённые настройки. */
import { json, requireAdmin, readSettings } from "../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env, false);
  if (auth.error) return auth.error.status === 401 ? json({ authenticated: false }) : auth.error;
  const r = await readSettings(env);
  return json({ authenticated: true, csrf: auth.csrf, storage: r.ok, settings: r.value });
}

