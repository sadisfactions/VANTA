/* GET /api/settings — публичные настройки сайта (в них нет секретов).
   Если хранилище пусто или недоступно, возвращается {} и сайт работает на js/config.js. */
import { json, readSettings } from "../_lib/util.js";

export async function onRequestGet({ env }) {
  const r = await readSettings(env);
  return json(r.value || {}, 200, { "X-Storage": r.ok ? "ok" : "unavailable" });
}
