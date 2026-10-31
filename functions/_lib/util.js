/* Общие функции серверной части: сессии, CSRF, ограничение попыток, чтение настроек.
   Файл не экспортирует onRequest*, поэтому маршрутом Pages Functions не становится. */

const enc = new TextEncoder();
const COOKIE = "__Host-vanta_admin";
const SESSION_TTL = 12 * 3600; // секунд
export const SLOTS = ["avatar", "banner", "background"];

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

function b64uEnc(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDec(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

/* Для работы входа нужны оба секрета; слабые значения отклоняются. */
export function isConfigured(env) {
  return !!(env.ADMIN_PASSWORD && String(env.ADMIN_PASSWORD).length >= 8 &&
            env.ADMIN_SESSION_SECRET && String(env.ADMIN_SESSION_SECRET).length >= 32);
}

/* Сравнение паролей за постоянное время: сравниваем HMAC обоих значений. */
export async function checkPassword(env, input) {
  const a = await hmac(env.ADMIN_SESSION_SECRET, "pw:" + String(input || ""));
  const b = await hmac(env.ADMIN_SESSION_SECRET, "pw:" + String(env.ADMIN_PASSWORD));
  return safeEqual(a, b);
}

export async function createSession(env) {
  const sid = b64uEnc(crypto.getRandomValues(new Uint8Array(16)));
  const payload = b64uEnc(enc.encode(JSON.stringify({ sid, exp: Date.now() + SESSION_TTL * 1000 })));
  const sig = b64uEnc(await hmac(env.ADMIN_SESSION_SECRET, payload));
  return { value: payload + "." + sig, sid };
}

export function sessionCookie(value, maxAge) {
  return COOKIE + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}
export const SESSION_MAX_AGE = SESSION_TTL;

export async function csrfFor(env, sid) {
  return b64uEnc(await hmac(env.ADMIN_SESSION_SECRET, "csrf:" + sid));
}

/* Возвращает { sid } для действующей сессии или null. */
export async function readSession(request, env) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.split(/;\s*/).find(c => c.startsWith(COOKIE + "="));
  if (!m) return null;
  const token = m.slice(COOKIE.length + 1);
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = await hmac(env.ADMIN_SESSION_SECRET, payload);
    if (!safeEqual(expected, b64uDec(sig))) return null;
    const data = JSON.parse(new TextDecoder().decode(b64uDec(payload)));
    if (!data.sid || !data.exp || data.exp < Date.now()) return null;
    return { sid: data.sid };
  } catch (e) {
    return null;
  }
}

function sameOrigin(request) {
  const o = request.headers.get("Origin");
  return !o || o === new URL(request.url).origin;
}

/* Проверка прав: { error: Response } либо { session, csrf }. write = запрос изменяет данные (нужен CSRF-токен). */
export async function requireAdmin(request, env, write) {
  if (!isConfigured(env)) return { error: json({ error: "not_configured" }, 503) };
  const session = await readSession(request, env);
  if (!session) return { error: json({ error: "unauthorized" }, 401) };
  const csrf = await csrfFor(env, session.sid);
  if (write) {
    if (!sameOrigin(request)) return { error: json({ error: "bad_origin" }, 403) };
    const got = request.headers.get("X-CSRF-Token") || "";
    if (!safeEqual(enc.encode(got), enc.encode(csrf))) return { error: json({ error: "bad_csrf" }, 403) };
  }
  return { session, csrf };
}

/* ---------- ограничение перебора пароля (по IP, 5 неудач / 15 минут) ---------- */
const MAX_FAILS = 5, WINDOW = 900;
const memFails = new Map();

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}
export async function failCount(env, ip) {
  if (env.VANTA_KV) {
    try { return parseInt(await env.VANTA_KV.get("rl:" + ip), 10) || 0; } catch (e) { /* ниже — память */ }
  }
  const e = memFails.get(ip);
  return e && e.exp > Date.now() ? e.n : 0;
}
export async function addFail(env, ip) {
  const n = (await failCount(env, ip)) + 1;
  if (env.VANTA_KV) {
    try { await env.VANTA_KV.put("rl:" + ip, String(n), { expirationTtl: WINDOW }); return n; } catch (e) { /* ниже */ }
  }
  memFails.set(ip, { n, exp: Date.now() + WINDOW * 1000 });
  return n;
}
export async function clearFails(env, ip) {
  memFails.delete(ip);
  if (env.VANTA_KV) { try { await env.VANTA_KV.delete("rl:" + ip); } catch (e) { /* ignore */ } }
}
export const LIMIT = { MAX_FAILS, WINDOW };

/* ---------- настройки ---------- */
export async function readSettings(env) {
  if (!env.VANTA_KV) return { ok: false, value: null };
  try {
    const value = await env.VANTA_KV.get("settings", "json");
    return { ok: true, value: value || null };
  } catch (e) {
    return { ok: false, value: null };
  }
}
export async function writeSettings(env, value) {
  if (!env.VANTA_KV) return false;
  try { await env.VANTA_KV.put("settings", JSON.stringify(value)); return true; } catch (e) { return false; }
}
