/* Связка «настройки из админки ↔ SITE_CONFIG».
   fromConfig(C)  — приводит js/config.js к схеме настроек (значения по умолчанию для админки).
   apply(C, S)    — накладывает сохранённые настройки S поверх C (публичный сайт).
   Подключается и на публичной странице (с data-boot — загружает настройки и запускает сайт), и в админке. */
(function () {
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  var DONATE_DEFAULTS = { donationalerts: "https://www.donationalerts.com/", boosty: "https://boosty.to/" };
  var hasUrl = function (u) { return /^https?:\/\//i.test(u || ""); };
  var has = function (o, k) { return o && Object.prototype.hasOwnProperty.call(o, k); };

  function fromConfig(C) {
    var sch = C.schedule || {}, st = C.status || {}, th = C.theme || {}, ab = C.about || {}, dn = C.donate || {}, pf = C.platform || {}, vi = C.visual || {}, lb = C.labels || {};
    var days = DAYS.map(function (name, i) {
      var d = (sch.days || [])[i] || {};
      return d.off || !d.time ? { day: name, off: true } : { day: name, time: d.time, title: d.title || "" };
    });
    return {
      profile: { nick: C.nick || "", displayName: "", tagline: C.description || "", about: ab.text || "", game: C.category || "",
        platformName: pf.name || "", channelUrl: pf.url || "", avatar: "", banner: "" },
      status: { mode: st.mode === "auto" ? "auto" : "manual", live: st.live === true, game: st.game || "", text: "" },
      schedule: { enabled: sch.enabled !== false, timezone: sch.timezone || "Europe/Moscow", timezoneLabel: sch.timezoneLabel || "", days: days },
      socials: (C.socials || []).map(function (s) { return { name: s.name, url: s.url || "", enabled: true }; }),
      donate: { label: dn.label || "Поддержать", methods: (dn.methods || []).map(function (m) {
        var key = String(m.name || "").toLowerCase().replace(/[^a-z]/g, "");
        return { name: m.name, url: hasUrl(m.url) ? m.url : (DONATE_DEFAULTS[key] || ""), enabled: true };
      }) },
      theme: { electric: th.electric || "#6F9BFF", blue: th.blue || "#465DFF", violet: th.violet || "#7954FF", lilac: th.lilac || "#AA7CFF" },
      visual: { mode: vi.mode === "none" ? "none" : "3d", variant: vi.variant === "spire" ? "spire" : "crystal", background: "" },
      sections: { schedule: sch.enabled !== false, socials: true, about: ab.enabled !== false, news: true,
        donate: !!(dn.methods && dn.methods.length), clips: !(C.clips && C.clips.enabled === false), side: !!(C.sideLabels && C.sideLabels.length) },
      labels: { watch: lb.watch || "", scheduleTitle: lb.scheduleTitle || "", socialsTitle: lb.socialsTitle || "", aboutTitle: ab.title || "", newsTitle: "Объявления" },
      news: { items: [] }
    };
  }

  /* Объединение по разделам: раздел из сохранённых настроек заменяет раздел по умолчанию целиком. */
  function merge(defaults, stored) {
    var out = {};
    Object.keys(defaults).forEach(function (k) { out[k] = has(stored, k) && stored[k] != null ? stored[k] : defaults[k]; });
    return out;
  }

  /* Дополнительные оттенки темы, если не заданы: синий — между основным и фиолетовым, светло-фиолетовый — осветлённый вторичный. */
  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), o = 0;
    for (var s = 16; s >= 0; s -= 8) o = o * 256 + Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
    return "#" + ("000000" + o.toString(16)).slice(-6);
  }

  function apply(C, S) {
    S = S || {};
    var P = S.profile, D;
    if (P) {
      C.nick = P.nick || C.nick;
      C.displayName = P.displayName || "";
      C.description = P.tagline || "";
      C.category = P.game || "";
      C.platform = { name: P.platformName || "", url: P.channelUrl || "" };
      C.avatar = P.avatar || "";
      C.banner = P.banner || "";
    }
    var sec = S.sections || {};
    var L = S.labels || {};
    C.labels = Object.assign({}, C.labels, L.watch ? { watch: L.watch } : {}, L.scheduleTitle ? { scheduleTitle: L.scheduleTitle } : {}, L.socialsTitle ? { socialsTitle: L.socialsTitle } : {});
    if (P || has(S, "sections") || has(S, "labels")) {
      var ab = C.about || {};
      C.about = { enabled: sec.about !== false && !!(P ? P.about : ab.text), title: L.aboutTitle || ab.title || "О канале", text: P ? P.about : ab.text };
    }
    C.newsTitle = L.newsTitle || "Объявления";
    if (S.status) C.status = Object.assign({}, C.status, { mode: S.status.mode, live: S.status.live === true, game: S.status.game || "" });
    C.statusText = S.status && S.status.text ? S.status.text : "";
    if (S.schedule) C.schedule = Object.assign({}, C.schedule, S.schedule, { enabled: S.schedule.enabled !== false && sec.schedule !== false });
    if (S.socials) C.socials = S.socials.filter(function (s) { return s.enabled && s.name && hasUrl(s.url); }).map(function (s) { return { name: s.name, url: s.url }; });
    if (S.donate) {
      D = S.donate;
      C.donate = { label: D.label || "Поддержать", methods: sec.donate === false ? [] : (D.methods || []).filter(function (m) { return m.enabled && m.name && hasUrl(m.url); }).map(function (m) { return { name: m.name, url: m.url }; }) };
    }
    if (S.theme) {
      var t = S.theme;
      C.theme = { electric: t.electric, violet: t.violet, blue: t.blue || mix(t.electric, t.violet, .35), lilac: t.lilac || mix(t.violet, "#ffffff", .3) };
    }
    if (S.visual) {
      C.visual = Object.assign({}, C.visual, { mode: S.visual.mode === "none" ? "none" : (C.visual && C.visual.mode === "image" ? "image" : "3d"), variant: S.visual.variant });
      C.background = S.visual.background || "";
    }
    C.sections = { socials: sec.socials !== false, news: sec.news !== false };
    if (sec.side === false) C.sideLabels = [];
    if (sec.clips === false) C.clips = Object.assign({}, C.clips, { enabled: false });
    C.news = sec.news === false ? [] : ((S.news && S.news.items) || []).slice().sort(function (a, b) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date).localeCompare(String(a.date));
    });
    return C;
  }

  window.VANTA_SETTINGS = { fromConfig: fromConfig, merge: merge, apply: apply, mix: mix, DAYS: DAYS };

  /* ---- загрузка для публичного сайта ---- */
  var me = document.currentScript;
  if (!me || !me.hasAttribute("data-boot")) return;

  var started = false;
  function load(srcs, done) {
    var i = 0;
    (function next() {
      if (i >= srcs.length) return done && done();
      var s = document.createElement("script");
      s.src = srcs[i++];
      s.onload = next;
      s.onerror = next;
      document.body.appendChild(s);
    })();
  }
  function start(S) {
    if (started) return;
    started = true;
    try { if (S && Object.keys(S).length) apply(window.SITE_CONFIG, S); } catch (e) { /* остаёмся на config.js */ }
    load(["js/orb.js", "js/main.js"]);
  }

  var preview = /[?&]preview=1\b/.test(location.search);
  if (preview) {
    var draft = null;
    try { draft = JSON.parse(sessionStorage.getItem("vanta_preview") || "null"); } catch (e) { /* нет черновика */ }
    start(draft);
    return;
  }
  var timer = setTimeout(function () { start(null); }, 2500);
  fetch("/api/settings", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; })
    .then(function (S) { clearTimeout(timer); start(S); });
})();

