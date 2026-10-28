(function () {
  var C = window.SITE_CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var L = C.labels || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hasUrl = function (u) { return /^https?:\/\//i.test(u || ""); };

  /* ---------- иконки ---------- */
  var S = 'viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  var ICONS = {
    twitch: '<svg ' + S + '><path d="M4 3h16v11l-4 4h-4l-3 3v-3H4z"/><path d="M15 8v3M11 8v3"/></svg>',
    youtube: '<svg ' + S + '><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>',
    telegram: '<svg ' + S + '><path d="M21 4 3 11.2l5.5 2L10.5 20l3-3.6 4.5 3.4z"/><path d="M8.5 13.2 21 4"/></svg>',
    discord: '<svg ' + S + '><path d="M5.5 6.5c2-1.2 4-1.7 4-1.7l.5 1.1h4l.5-1.1s2 .5 4 1.7c1.8 3.4 2.4 6.8 2.2 10.2-1.7 1.3-3.5 2-3.5 2l-.9-1.5H8.2l-.9 1.5s-1.800-.7-3.500-2c-.2-3.400.4-6.800 1.700-10.200z"/><circle cx="9.200" cy="12.200" r="1.100" fill="currentColor"/><circle cx="14.800" cy="12.200" r="1.100" fill="currentColor"/></svg>',
    x: '<svg ' + S + '><path d="M4.500 4h3.700l11.300 16h-3.700z"/><path d="M19 4l-6.200 7M5 20l6.200-7"/></svg>',
    instagram: '<svg ' + S + '><rect x="3.500" y="3.500" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.800"/><circle cx="17" cy="7" r=".8" fill="currentColor"/></svg>',
    tiktok: '<svg ' + S + '><path d="M14 3v11.500a3.500 3.500 0 1 1-3.500-3.500"/><path d="M14 3c.4 2.600 2 4.200 5 4.500"/></svg>',
    vk: '<svg ' + S + '><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7 9c.4 4 2.200 6 5 6V9m0 3.500c1.800-.2 3-1.700 3.500-3.500M12 15c1.800 0 3.400-1.200 4.500-3"/></svg>',
    link: '<svg ' + S + '><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/></svg>',
    calendar: '<svg ' + S + '><rect x="3.500" y="5" width="17" height="15" rx="2"/><path d="M3.500 10h17M8 3v4M16 3v4"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>'
  };
  var icon = function (name) {
    var k = String(name || "").toLowerCase().replace(/[^a-z]/g, "");
    if (k === "twitter") k = "x";
    return ICONS[k] || ICONS.link;
  };

  var socials = (C.socials || []).filter(function (s) { return s && s.name && hasUrl(s.url); });

  /* ---------- тема ---------- */
  var th = C.theme || {};
  var root = document.documentElement.style;
  if (th.electric) root.setProperty("--electric", th.electric);
  if (th.blue) root.setProperty("--blue", th.blue);
  if (th.violet) root.setProperty("--violet", th.violet);
  if (th.lilac) root.setProperty("--lilac", th.lilac);

  /* ---------- бренд, ник, описание ---------- */
  var nick = C.nick || "";
  document.title = nick + " — стример";
  $("#brandName").textContent = nick;
  $("#nick").textContent = nick;
  $("#desc").innerHTML = esc(C.description || "").replace(/\n/g, "<br>");
  if (!C.description) $("#desc").hidden = true;
  $("#footLeft").textContent = nick + (C.footerLabel ? " / " + C.footerLabel : "");
  $("#footRight").textContent = "© " + new Date().getFullYear() + " " + nick;

  /* ---------- метка платформы ---------- */
  var pf = C.platform || {};
  var tagEl = $("#tag");
  if (pf.name || C.category || C.live) {
    tagEl.hidden = false;
    $("#tagPlatform").textContent = C.live ? "В эфире" : (pf.name || "");
    $("#tagCategory").textContent = C.category || "";
    if (C.live) tagEl.classList.add("is-live");
    if (!(C.live || pf.name) || !C.category) $("#tagSep").style.display = "none";
  }

  /* ---------- кнопки ---------- */
  var cta = $("#cta"), html = "";
  if (hasUrl(pf.url)) {
    html += '<span class="glow"><a class="btn btn--primary" href="' + esc(pf.url) + '" target="_blank" rel="noopener noreferrer"><span class="btn__in">' + ICONS.play + "<span>" + esc(L.watch || "Смотреть") + "</span>" + ICONS.arrow + "</span></a></span>";
  }
  cta.innerHTML = html;
  if (!html) cta.hidden = true;

  /* ---------- шапка ---------- */
  var sched = C.schedule || {};
  var schedOn = sched.enabled && (sched.days || []).length;
  var clipItems = (C.clips && C.clips.enabled && C.clips.items) || [];
  var menu = "";
  if (schedOn) menu += '<a href="#schedule" class="is-active">' + esc(L.streams || "Стримы") + "</a>";
  else if (hasUrl(pf.url)) menu += '<a href="' + esc(pf.url) + '" target="_blank" rel="noopener noreferrer" class="is-active">' + esc(L.streams || "Стримы") + "</a>";
  if (clipItems.length) menu += '<button type="button" data-open="clips"' + (menu ? "" : ' class="is-active"') + ">" + esc(L.clips || "Клипы") + "</button>";
  if (menu) $("#menu").innerHTML = menu; else $("#menu").hidden = true;

  $("#navSocials").innerHTML = socials.map(function (s) {
    return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(s.name) + '" title="' + esc(s.name) + '">' + icon(s.name) + "</a></li>";
  }).join("");
  if (!socials.length) $("#navSocials").hidden = true;

  /* ---------- боковая подпись ---------- */
  var sl = (C.sideLabels || []).slice(0, 3);
  if (sl.length) {
    $("#side").innerHTML = sl.map(function (w) { return "<span>" + esc(w) + "</span>"; }).join("") + '<i class="side__line"></i>';
  } else $("#side").hidden = true;

  /* день недели (0 = понедельник) в часовом поясе расписания, а не посетителя */
  function todayIndex(tz) {
    var map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }, w;
    try { w = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz || undefined }).format(new Date()); }
    catch (e) { w = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date()); }
    return map[w];
  }

  /* ---------- нижние блоки ---------- */
  var blocks = 0;
  if (schedOn) {
    var today = todayIndex(sched.timezone), days = sched.days, tzl = sched.timezoneLabel || sched.timezone || "";
    $("#schedule").innerHTML =
      '<h2 class="blk__title">' + icon("calendar") + "<span>" + esc(L.scheduleTitle || "Расписание") + "</span>" + (tzl ? '<em class="tz mono">' + esc(tzl) + "</em>" : "") + "</h2>" +
      '<ul class="days">' + days.map(function (d, i) {
        var on = days.length === 7 && i === today;
        return '<li class="day' + (d.off ? " is-off" : "") + (on ? " is-today" : "") + '"' + (on ? ' aria-current="date"' : "") + "><b>" + esc(d.day) + "</b>" +
          (d.off ? "<small>Выходной</small>" : "<span>" + esc(d.time) + "</span><small>" + esc(d.title) + "</small>") + "</li>";
      }).join("") + "</ul>";
    $("#schedule").hidden = false; blocks++;
  }
  if (socials.length) {
    $("#links").innerHTML =
      '<h2 class="blk__title">' + icon("link") + "<span>" + esc(L.socialsTitle || "Соцсети") + "</span></h2>" +
      '<ul class="list">' + socials.map(function (s) {
        return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + icon(s.name) + "<span>" + esc(s.name) + "</span>" + ICONS.arrow + "</a></li>";
      }).join("") + "</ul>";
    $("#links").hidden = false; blocks++;
  }
  var ab = C.about || {};
  if (ab.enabled !== false && String(ab.text || "").trim()) {
    $("#about").innerHTML = '<h2 class="blk__title"><span>' + esc(ab.title || "О канале") + "</span></h2>" +
      '<p class="about__text">' + esc(String(ab.text).trim()).replace(/\n/g, "<br>") + "</p>";
    $("#about").hidden = false; blocks++;
  }  if (!blocks) { $("#info").hidden = true; document.body.classList.add("no-info"); }

  /* ---------- подгонка ника по ширине ---------- */
  var nickEl = $("#nick"), nickBox = $(".nick");
  function fit() {
    nickEl.style.fontSize = "";
    var avail = nickBox.clientWidth, w = nickEl.offsetWidth;
    if (w > avail && avail > 0) {
      nickEl.style.fontSize = (parseFloat(getComputedStyle(nickEl).fontSize) * avail / w * 0.98).toFixed(1) + "px";
    }
  }
  fit();
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  /* ---------- главный объект ---------- */
  var vis = C.visual || {}, mode = vis.mode || "3d", orbEl = $("#orb");
  if (mode === "none") $("#stage").hidden = true;
  else if (mode === "image" && vis.image) {
    var im = new Image();
    im.className = "orb__img"; im.src = vis.image; im.alt = vis.imageAlt || "";
    if (!vis.imageAlt) im.setAttribute("aria-hidden", "true");
    im.onload = function () { orbEl.classList.add("ready"); };
    im.onerror = function () { im.remove(); };
    $("#orbCanvas").replaceWith(im);
  } else if (window.initOrb) {
    var th2 = C.theme || {};
    try {
      window.initOrb({ wrap: orbEl, canvas: $("#orbCanvas"), c1: th2.electric || "#6F9BFF", c2: th2.violet || "#7954FF", variant: vis.variant || "glass" });
    } catch (err) { /* остаётся статичный запасной вариант */ }
  }
  /* ---------- мягкий свет за курсором ---------- */
  if (!reduce.matches && window.matchMedia("(hover: hover)").matches) {
    var raf = 0, mx = 0, my = 0, bs = document.body.style;
    document.addEventListener("pointermove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0; bs.setProperty("--mx", mx + "px"); bs.setProperty("--my", my + "px");
      });
    }, { passive: true });
  }

  /* ---------- появление ---------- */
  [".top", ".tag", ".nick", ".desc", ".cta", ".stage", ".side", ".info", ".foot"].forEach(function (sel, i) {
    var el = $(sel);
    if (!el || el.hidden) return;
    el.classList.add("rv");
    el.style.setProperty("--d", (i * 0.07).toFixed(2) + "s");
  });

  /* ---------- окно клипов ---------- */
  var sheet = $("#sheet"), body = $("#sheetBody"), title = $("#sheetTitle"), lastFocus = null;
  function open(t, h) {
    title.textContent = t; body.innerHTML = h;
    lastFocus = document.activeElement;
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop = 0;
  }
  $("#sheetClose").addEventListener("click", function () { sheet.close(); });
  sheet.addEventListener("click", function (e) { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener("close", function () {
    body.innerHTML = "";
    if (lastFocus) lastFocus.focus();
  });

  function clipList() {
    open(L.clips || "Клипы", clipItems.map(function (c, i) {
      return '<button type="button" class="row" data-clip="' + i + '"><span class="mono">0' + (i + 1) + "</span><span><b>" + esc(c.title) + "</b><small>" + esc(c.meta) + "</small></span>" + ICONS.arrow + "</button>";
    }).join(""));
  }
  function clip(i) {
    var c = clipItems[i];
    var player = hasUrl(c.embed)
      ? '<div class="player"><iframe src="' + esc(c.embed) + '" title="' + esc(c.title) + '" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
      : '<div class="player"><p><b>Демо-заглушка</b>Здесь будет видео клипа. Добавьте ссылку embed в js/config.js.</p></div>';
    open(c.title, '<p class="note" style="margin:0 0 4px">' + esc(c.meta) + "</p>" + player +
      '<button type="button" class="btn-line" data-act="clips">← Все клипы</button>');
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-open],[data-clip],[data-act]");
    if (!t) return;
    if (t.dataset.act === "clips" || t.dataset.open === "clips") return clipList();
    if (t.dataset.clip) return clip(+t.dataset.clip);
  });
})();


