/* POST /api/admin/login { password } — проверка пароля на сервере и выдача сессии (HttpOnly Secure SameSite=Strict). */
import { json, isConfigured, checkPassword, createSession, sessionCookie, SESSION_MAX_AGE, csrfFor,
         clientIp, failCount, addFail, clearFails, LIMIT } from "../../_lib/util.js";

export async function onRequestPost({ request, env }) {
  if (!isConfigured(env)) return json({ error: "not_configured" }, 503);
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "bad_origin" }, 403);

  const ip = clientIp(request);
  if ((await failCount(env, ip)) >= LIMIT.MAX_FAILS) {
    return json({ error: "too_many_attempts" }, 429, { "Retry-After": String(LIMIT.WINDOW) });
  }

  let body;
  try {
    const text = await request.text();
    if (text.length > 2000) return json({ error: "bad_request" }, 413);
    body = JSON.parse(text);
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }

  if (!(await checkPassword(env, body && body.password))) {
    await addFail(env, ip);
    return json({ error: "invalid_credentials" }, 401);
  }

  await clearFails(env, ip);
  const s = await createSession(env);
  return json({ ok: true, csrf: await csrfFor(env, s.sid) }, 200, { "Set-Cookie": sessionCookie(s.value, SESSION_MAX_AGE) });
}
