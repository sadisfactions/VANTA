/* Серверная валидация и нормализация настроек. Неизвестные поля отбрасываются,
   значения ограничиваются по длине и формату. Возвращает { value, errors }. */

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MEDIA_RE = /^\/api\/media\/(avatar|banner|background)\?v=\d{1,15}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// eslint-disable-next-line no-control-regex
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const str = (v, max) => (typeof v === "string" ? v.replace(CTRL, "").trim().slice(0, max) : "");
const bool = v => v === true;
const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const arr = v => (Array.isArray(v) ? v : []);

export function sanitize(input) {
  const errors = [];
  const src = obj(input);

  const url = (v, label) => {
    const s = str(v, 500);
    if (!s) return "";
    try {
      const u = new URL(s);
      if (u.protocol === "https:" || u.protocol === "http:") return u.toString();
    } catch (e) { /* ниже */ }
    errors.push("Некорректная ссылка: " + label);
    return "";
  };
  const media = (v, label) => {
    const s = str(v, 200);
    if (!s) return "";
    if (MEDIA_RE.test(s)) return s;
    errors.push("Некорректный адрес изображения: " + label);
    return "";
  };
  const hex = (v, def) => (typeof v === "string" && HEX_RE.test(v) ? v.toLowerCase() : def);

  /* профиль */
  const p = obj(src.profile);
  const profile = {
    nick: str(p.nick, 32),
    displayName: str(p.displayName, 40),
    tagline: str(p.tagline, 200),
    about: str(p.about, 1200),
    game: str(p.game, 60),
    platformName: str(p.platformName, 24),
    channelUrl: url(p.channelUrl, "канал стримера"),
    avatar: media(p.avatar, "аватар"),
    banner: media(p.banner, "баннер")
  };

  /* статус */
  const st = obj(src.status);
  const status = {
    mode: st.mode === "auto" ? "auto" : "manual",
    live: bool(st.live),
    game: str(st.game, 80),
    text: str(st.text, 160)
  };

  /* расписание */
  const sc = obj(src.schedule);
  let timezone = str(sc.timezone, 60) || "Europe/Moscow";
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }); }
  catch (e) { errors.push("Неизвестный часовой пояс: " + timezone); timezone = "Europe/Moscow"; }
  const rawDays = arr(sc.days);
  const days = DAYS.map((name, i) => {
    const d = obj(rawDays[i]);
    if (bool(d.off)) return { day: name, off: true };
    const time = str(d.time, 5);
    if (!TIME_RE.test(time)) { errors.push("Неверное время у дня «" + name + "» (нужно ЧЧ:ММ)"); return { day: name, off: true }; }
    return { day: name, time, title: str(d.title, 40) };
  });
  const schedule = { enabled: bool(sc.enabled), timezone, timezoneLabel: str(sc.timezoneLabel, 8), days };

  /* ссылки */
  const socials = arr(src.socials).slice(0, 12).map(s => {
    const o = obj(s);
    const name = str(o.name, 24);
    return { name, url: url(o.url, name || "соцсеть"), enabled: bool(o.enabled) };
  }).filter(s => s.name);

  /* поддержка */
  const dn = obj(src.donate);
  const donate = {
    label: str(dn.label, 24),
    methods: arr(dn.methods).slice(0, 8).map(m => {
      const o = obj(m);
      const name = str(o.name, 24);
      return { name, url: url(o.url, name || "способ поддержки"), enabled: bool(o.enabled) };
    }).filter(m => m.name)
  };

  /* оформление */
  const th = obj(src.theme);
  const theme = {
    electric: hex(th.electric, "#6f9bff"),
    blue: hex(th.blue, "#465dff"),
    violet: hex(th.violet, "#7954ff"),
    lilac: hex(th.lilac, "#aa7cff")
  };
  const vi = obj(src.visual);
  const visual = {
    mode: vi.mode === "none" ? "none" : "3d",
    variant: vi.variant === "spire" ? "spire" : "crystal",
    background: media(vi.background, "фоновое изображение")
  };

  /* блоки */
  const se = obj(src.sections);
  const sections = {};
  ["schedule", "socials", "about", "news", "donate", "clips", "side"].forEach(k => { sections[k] = se[k] !== false; });

  /* подписи */
  const lb = obj(src.labels);
  const labels = {
    watch: str(lb.watch, 30),
    scheduleTitle: str(lb.scheduleTitle, 40),
    socialsTitle: str(lb.socialsTitle, 40),
    aboutTitle: str(lb.aboutTitle, 40),
    newsTitle: str(lb.newsTitle, 40)
  };

  /* объявления: не больше 20, закреплено не больше одного */
  let pinnedSeen = false;
  const items = arr(obj(src.news).items).slice(0, 20).map(n => {
    const o = obj(n);
    const text = str(o.text, 280);
    if (!text) return null;
    const id = /^[A-Za-z0-9_-]{4,40}$/.test(String(o.id || "")) ? String(o.id) : crypto.randomUUID();
    const date = DATE_RE.test(String(o.date || "")) ? String(o.date) : new Date().toISOString().slice(0, 10);
    const pinned = bool(o.pinned) && !pinnedSeen;
    if (pinned) pinnedSeen = true;
    return { id, text, date, pinned };
  }).filter(Boolean);

  return {
    value: { version: 1, profile, status, schedule, socials, donate, theme, visual, sections, labels, news: { items }, updatedAt: new Date().toISOString() },
    errors
  };
}
