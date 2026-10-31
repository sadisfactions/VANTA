/* POST /api/admin/media/<avatar|banner|background> — загрузка изображения (сырое тело запроса).
   DELETE — удаление. Допустимы только PNG, JPEG, WebP до 1,5 МБ; тип проверяется по сигнатуре файла (SVG запрещён). */
import { json, requireAdmin, SLOTS } from "../../../_lib/util.js";

const MAX = 1.5 * 1024 * 1024;

function detect(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export async function onRequestPost({ request, env, params }) {
  const auth = await requireAdmin(request, env, true);
  if (auth.error) return auth.error;
  if (!env.VANTA_KV) return json({ error: "storage_unavailable" }, 503);
  const slot = String(params.slot);
  if (!SLOTS.includes(slot)) return json({ error: "bad_slot" }, 400);

  const len = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (len > MAX) return json({ error: "too_large" }, 413);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length) return json({ error: "empty" }, 400);
  if (buf.length > MAX) return json({ error: "too_large" }, 413);
  const type = detect(buf);
  if (!type) return json({ error: "unsupported_type" }, 415);

  try {
    await env.VANTA_KV.put("media:" + slot, buf, { metadata: { type } });
  } catch (e) {
    return json({ error: "storage_unavailable" }, 503);
  }
  return json({ ok: true, url: "/api/media/" + slot + "?v=" + Date.now() });
}

export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAdmin(request, env, true);
  if (auth.error) return auth.error;
  if (!env.VANTA_KV) return json({ error: "storage_unavailable" }, 503);
  const slot = String(params.slot);
  if (!SLOTS.includes(slot)) return json({ error: "bad_slot" }, 400);
  try { await env.VANTA_KV.delete("media:" + slot); } catch (e) { return json({ error: "storage_unavailable" }, 503); }
  return json({ ok: true });
}
