/* GET /api/media/<avatar|banner|background> — публичная выдача загруженных изображений. */
import { SLOTS } from "../../_lib/util.js";

export async function onRequestGet({ env, params }) {
  const slot = String(params.slot);
  if (!SLOTS.includes(slot) || !env.VANTA_KV) return new Response("Not found", { status: 404 });
  let r;
  try { r = await env.VANTA_KV.getWithMetadata("media:" + slot, "arrayBuffer"); } catch (e) { return new Response("Unavailable", { status: 503 }); }
  if (!r || !r.value) return new Response("Not found", { status: 404 });
  const type = r.metadata && /^image\/(png|jpeg|webp)$/.test(r.metadata.type) ? r.metadata.type : "application/octet-stream";
  return new Response(r.value, {
    headers: {
      "Content-Type": type,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
