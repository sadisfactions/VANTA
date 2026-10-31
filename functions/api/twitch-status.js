/* Cloudflare Pages Function: GET /api/twitch-status
   Возвращает { live: boolean, game: string } для канала из переменных окружения.
   Секрет Twitch хранится только на сервере и в браузер не попадает.

   Переменные окружения (Cloudflare Pages → Settings → Environment variables; секрет — тип Secret):
     TWITCH_CLIENT_ID      — Client ID приложения на dev.twitch.tv/console
     TWITCH_CLIENT_SECRET  — Client Secret того же приложения
     TWITCH_CHANNEL        — логин канала (например, vanta)

   Не проверено на реальном аккаунте: для запуска нужны учётные данные владельца. */

let token = null;
let tokenExpires = 0;

async function getToken(env, force) {
  if (!force && token && Date.now() < tokenExpires) return token;
  const r = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    })
  });
  if (!r.ok) throw new Error("token " + r.status);
  const d = await r.json();
  token = d.access_token;
  tokenExpires = Date.now() + Math.max(60, (d.expires_in || 3600) - 300) * 1000;
  return token;
}

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=" + (maxAge || 0)
    }
  });
}

export async function onRequestGet({ env }) {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET || !env.TWITCH_CHANNEL) {
    return json({ error: "not_configured" }, 500);
  }
  try {
    const url = "https://api.twitch.tv/helix/streams?user_login=" + encodeURIComponent(env.TWITCH_CHANNEL);
    let r = await fetch(url, { headers: { "Client-Id": env.TWITCH_CLIENT_ID, Authorization: "Bearer " + (await getToken(env)) } });
    if (r.status === 401) {
      r = await fetch(url, { headers: { "Client-Id": env.TWITCH_CLIENT_ID, Authorization: "Bearer " + (await getToken(env, true)) } });
    }
    if (!r.ok) return json({ error: "twitch_" + r.status }, 502);
    const d = await r.json();
    const s = d.data && d.data[0];
    if (!s || s.type !== "live") return json({ live: false, game: "" }, 200, 30);
    return json({ live: true, game: s.game_name || "" }, 200, 30);
  } catch (e) {
    return json({ error: "upstream" }, 502);
  }
}
