(function () {
  "use strict";
  const VS = window.VANTA_SETTINGS;
  const DEFAULTS = VS.fromConfig(window.SITE_CONFIG);
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = o => JSON.parse(JSON.stringify(o));

  const st = { draft: null, saved: "", csrf: "", view: "overview", storage: true, twitch: null, saving: false };

  const ZONES = ["Europe/Moscow", "Europe/Kaliningrad", "Europe/Samara", "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk", "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Vladivostok",
    "Europe/Kyiv", "Europe/Minsk", "Asia/Almaty", "Asia/Tbilisi", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"];
  const PRESETS = [
    { name: "VANTA", c: ["#6F9BFF", "#465DFF", "#7954FF", "#AA7CFF"] },
    { name: "Океан", c: ["#4FD1FF", "#2F6BFF", "#3B4DFF", "#8AA2FF"] },
    { name: "Аврора", c: ["#5CF2C8", "#3A8DFF", "#7B6CFF", "#B79CFF"] },
    { name: "Магента", c: ["#FF7AD9", "#B04DFF", "#8A5CFF", "#D09CFF"] }
  ];
  const STATUS_CHIPS = ["Сегодня стрима не будет", "Вернусь на следующей неделе", "Скоро начинаем"];
  const SECTIONS = [
    ["schedule", "Расписание стримов"], ["socials", "Список соцсетей внизу"], ["about", "Блок «О канале»"],
    ["news", "Объявления"], ["donate", "Кнопка «Поддержать»"], ["clips", "Раздел «Клипы» в меню"], ["side", "Вертикальная подпись у кристалла"]
  ];

  const ico = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const VIEWS = [
    ["overview", "Обзор", ico('<rect x="3.5" y="3.5" width="7" height="7"/><rect x="13.5" y="3.5" width="7" height="7"/><rect x="3.5" y="13.5" width="7" height="7"/><rect x="13.5" y="13.5" width="7" height="7"/>')],
    ["profile", "Профиль", ico('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-5.500 8-5.500s6.500 1.500 8 5.500"/>')],
    ["status", "Статус эфира", ico('<circle cx="12" cy="12" r="3"/><path d="M6 6a8.500 8.500 0 0 0 0 12M18 6a8.500 8.500 0 0 1 0 12"/>')],
    ["schedule", "Расписание", ico('<rect x="3.500" y="5" width="17" height="15" rx="2"/><path d="M3.500 10h17M8 3v4M16 3v4"/>')],
    ["links", "Ссылки и поддержка", ico('<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>')],
    ["look", "Оформление", ico('<circle cx="12" cy="12" r="8.500"/><path d="M12 3.500v17M3.500 12h17" opacity=".5"/>')],
    ["content", "Контент", ico('<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>')]
  ];
  const TITLES = { overview: "Обзор", profile: "Профиль", status: "Статус эфира", schedule: "Расписание", links: "Ссылки и поддержка", look: "Оформление", content: "Контент" };

  /* ---------- сеть ---------- */
  async function api(method, path, body, headers) {
    const h = Object.assign({}, headers || {});
    if (method !== "GET") h["X-CSRF-Token"] = st.csrf;
    let b = body;
    if (body && !(body instanceof Blob)) { b = JSON.stringify(body); h["Content-Type"] = "application/json"; }
    let r;
    try { r = await fetch(path, { method, headers: h, body: b, cache: "no-store" }); }
    catch (e) { throw { network: true }; }
    if (r.status === 401) { location.replace("/admin/login.html"); throw { auth: true }; }
    let j = null; try { j = await r.json(); } catch (e) { /* пусто */ }
    if (!r.ok) throw { status: r.status, data: j };
    return j;
  }

  /* ---------- состояние ---------- */
  const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split("."); const last = ks.pop();
    const t = ks.reduce((a, k) => a[k], o);
    t[last] = v;
  }
  const dirty = () => !!st.draft && JSON.stringify(st.draft) !== st.saved;

  function updateBar() {
    const d = dirty();
    $("#saveBtn").disabled = !d || st.saving;
    $("#discardBtn").disabled = !d || st.saving;
    $("#dirtyChip").hidden = !d;
    $("#savebar").classList.toggle("is-dirty", d);
    $("#saveMsg").textContent = st.saving ? "Сохранение…" : d ? "Есть несохранённые изменения" : "Все изменения сохранены";
  }

  function toast(text, kind, list) {
    const el = document.createElement("div");
    el.className = "toast toast--" + (kind || "ok");
    el.innerHTML = esc(text) + (list && list.length ? "<ul>" + list.map(i => "<li>" + esc(i) + "</li>").join("") + "</ul>" : "");
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), kind === "bad" ? 9000 : 3500);
  }

  /* ---------- элементы форм ---------- */
  const field = (label, inner, hint, cls) => `<label class="field ${cls || ""}"><span class="field__label">${esc(label)}</span>${inner}${hint ? `<span class="field__hint">${esc(hint)}</span>` : ""}</label>`;
  const text = (path, label, o) => { o = o || {}; return field(label, `<input type="${o.type || "text"}" data-bind="${path}" value="${esc(getPath(st.draft, path))}" maxlength="${o.max || 120}" placeholder="${esc(o.ph || "")}" ${o.auto || ""}>`, o.hint, o.cls); };
  const area = (path, label, o) => { o = o || {}; return field(label, `<textarea data-bind="${path}" rows="${o.rows || 3}" maxlength="${o.max || 500}" placeholder="${esc(o.ph || "")}">${esc(getPath(st.draft, path))}</textarea>`, o.hint, o.cls); };
  const sw = (path, label, rerender) => `<label class="sw"><input type="checkbox" data-bind="${path}" ${rerender ? "data-rerender" : ""} ${getPath(st.draft, path) ? "checked" : ""}><i></i><span>${esc(label)}</span></label>`;
  const card = (title, hint, body) => `<section class="card"><h2 class="card__title">${esc(title)}</h2>${hint ? `<p class="card__hint">${esc(hint)}</p>` : ""}${body}</section>`;

  /* ---------- разделы ---------- */
  function vOverview() {
    const d = st.draft, live = d.status.mode === "auto" ? (st.twitch && st.twitch.live) : d.status.live;
    const game = d.status.mode === "auto" ? (st.twitch && st.twitch.game) : d.status.game;
    const twitchNote = d.status.mode === "auto" ? (st.twitch === null ? "Проверяем Twitch…" : st.twitch.error ? "Twitch API не настроен или недоступен" : "Данные Twitch") : "Задано вручную";
    return `
      <div class="stats">
        <div class="stat"><div class="stat__k">Сайт</div><div class="stat__v"><span class="badge ${dirty() ? "badge--off" : "badge--ok"}"><i></i>${dirty() ? "Есть правки" : "Опубликован"}</span><small>${st.storage ? "Хранилище подключено" : "Хранилище недоступно"}</small></div></div>
        <div class="stat"><div class="stat__k">Трансляция</div><div class="stat__v"><span class="badge ${live ? "badge--live" : "badge--off"}"><i></i>${live ? "LIVE" : "OFFLINE"}</span><small>${esc(twitchNote)}</small></div></div>
        <div class="stat"><div class="stat__k">Игра</div><div class="stat__v">${esc(live && game ? game : "—")}<small>${live ? "сейчас в эфире" : "эфир не идёт"}</small></div></div>
        <div class="stat"><div class="stat__k">Режим статуса</div><div class="stat__v">${d.status.mode === "auto" ? "Авто" : "Вручную"}<small>${d.status.mode === "auto" ? "через Twitch API" : "приоритет за вами"}</small></div></div>
      </div>
      ${!st.storage ? `<div class="note note--bad">Хранилище KV не подключено: изменения сохранить нельзя. Добавьте привязку VANTA_KV в настройках Cloudflare Pages.</div>` : ""}
      <section class="card"><h2 class="card__title">Быстрые переходы</h2><p class="card__hint">Основные разделы панели. После правок нажмите «Сохранить» внизу.</p>
        <div class="tiles">
          ${["status", "schedule", "profile", "links", "look", "content"].map(v => `<button type="button" class="tile" data-go="${v}"><b>${esc(TITLES[v])}</b><span>${{
            status: "LIVE / OFFLINE, игра, режим", schedule: "Дни, время, часовой пояс", profile: "Ник, описание, аватар",
            links: "Соцсети, донаты", look: "Цвета, фон, кристалл", content: "Объявления, тексты, блоки" }[v]}</span></button>`).join("")}
        </div>
      </section>
      <p><a class="btn btn--primary" href="/" target="_blank" rel="noopener"><span>Открыть публичный сайт ↗</span></a></p>`;
  }

  function mediaField(slot, label, wide) {
    const path = slot === "background" ? "visual.background" : "profile." + slot;
    const url = getPath(st.draft, path);
    return `<div class="field"><span class="field__label">${esc(label)}</span>
      <div class="media ${wide ? "media--wide" : ""}">
        <div class="media__thumb">${url ? `<img src="${esc(url)}" alt="">` : "нет"}</div>
        <div class="media__act">
          <label class="btn btn--ghost btn--sm"><span>${url ? "Заменить" : "Загрузить"}</span><input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${slot}"></label>
          ${url ? `<button type="button" class="btn btn--ghost btn--sm" data-rm-media="${slot}"><span>Убрать</span></button>` : ""}
        </div>
      </div><span class="field__hint">PNG, JPEG или WebP до 1,5 МБ. Загруженный файл публикуется после нажатия «Сохранить».</span></div>`;
  }

  function vProfile() {
    return card("Основное", "Все поля необязательны: пустое поле на сайте не показывается.", `<div class="grid">
        ${text("profile.nick", "Никнейм (крупно на главной)", { max: 32 })}
        ${text("profile.displayName", "Отображаемое имя (в шапке)", { max: 40, hint: "Если пусто — используется никнейм." })}
        ${text("profile.game", "Основная игра или направление", { max: 60 })}
        ${text("profile.platformName", "Платформа", { max: 24 })}
        ${text("profile.channelUrl", "Ссылка на канал (кнопка «Смотреть стрим»)", { type: "url", max: 300, ph: "https://", cls: "span2" })}
        ${area("profile.tagline", "Краткое описание на главной", { rows: 2, max: 200, cls: "span2" })}
      </div>`) +
      card("О канале", "Подробный рассказ от первого лица. Текст показывается как есть, ничего не добавляется автоматически.",
        area("profile.about", "Подробное описание", { rows: 6, max: 1200 })) +
      card("Изображения", "", `<div class="grid">${mediaField("avatar", "Аватар")}${mediaField("banner", "Баннер", true)}</div>`);
  }

  function vStatus() {
    const s = st.draft.status, auto = s.mode === "auto";
    return card("Режим определения статуса", "Автоматически — статус берётся из Twitch. Вручную — вы сами задаёте, идёт ли эфир; Twitch тогда не опрашивается.",
      `<div class="seg" id="modeSeg"><button type="button" data-mode="auto" class="${auto ? "is-on" : ""}">Автоматически (Twitch)</button><button type="button" data-mode="manual" class="${auto ? "" : "is-on"}">Вручную</button></div>`) +
      (auto ? card("Автоматический режим", "Статус и игру подставляет сервер через Twitch API. Для работы нужны переменные TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET и TWITCH_CHANNEL на хостинге.",
        `<p>${st.twitch === null ? "Проверяем Twitch…" : st.twitch.error ? `<span class="badge badge--bad"><i></i>Twitch API недоступен или не настроен</span>` : `<span class="badge ${st.twitch.live ? "badge--live" : "badge--off"}"><i></i>${st.twitch.live ? "LIVE" : "OFFLINE"}</span> ${esc(st.twitch.game || "")}`}</p>
        <p><button type="button" class="btn btn--ghost btn--sm" data-act="twitch"><span>Проверить сейчас</span></button></p>`)
      : card("Ручное управление", "Включайте LIVE только во время реального эфира.", `<div class="grid">
          <div class="field span2">${sw("status.live", "Сейчас в эфире (LIVE)")}</div>
          ${text("status.game", "Название текущей игры", { max: 80, hint: "Показывается рядом с LIVE и в расписании." })}
        </div>`)) +
      card("Дополнительный текст статуса", "Короткая заметка под описанием на главной. Оставьте пустым, чтобы скрыть.",
        `${text("status.text", "Текст", { max: 160, ph: "Например: Скоро начинаем" })}<div class="chips">${STATUS_CHIPS.map(c => `<button type="button" class="chipbtn" data-chip="${esc(c)}">${esc(c)}</button>`).join("")}<button type="button" class="chipbtn" data-chip="">Очистить</button></div>`);
  }

  function vSchedule() {
    const sc = st.draft.schedule;
    const zones = ZONES.indexOf(sc.timezone) < 0 ? [sc.timezone].concat(ZONES) : ZONES;
    return card("Расписание", "Выключенное расписание полностью скрывается с сайта.",
      `<div class="grid"><div class="field span2">${sw("schedule.enabled", "Показывать расписание на сайте", true)}</div>
        ${field("Часовой пояс эфиров", `<select data-bind="schedule.timezone">${zones.map(z => `<option ${z === sc.timezone ? "selected" : ""}>${esc(z)}</option>`).join("")}</select>`, "По нему определяется «сегодня», а не по времени посетителя.")}
        ${text("schedule.timezoneLabel", "Подпись пояса (например, МСК)", { max: 8 })}</div>`) +
      card("Дни недели", "Включите день и укажите время начала, либо оставьте выходной.",
        `<div class="rows">${sc.days.map((d, i) => `<div class="dayrow ${d.off ? "is-off" : ""}">
          <span class="dayrow__name">${esc(d.day)}</span>
          <label class="sw"><input type="checkbox" data-day-on="${i}" ${d.off ? "" : "checked"}><i></i><span>${d.off ? "Выходной" : "Эфир"}</span></label>
          <input type="time" data-bind="schedule.days.${i}.time" value="${esc(d.time || "")}" ${d.off ? "disabled" : ""} aria-label="Время ${esc(d.day)}">
          <input type="text" class="field--title" data-bind="schedule.days.${i}.title" value="${esc(d.title || "")}" maxlength="40" placeholder="Название (необязательно)" ${d.off ? "disabled" : ""} aria-label="Название ${esc(d.day)}">
        </div>`).join("")}</div>`);
  }

  function listRows(listPath, o) {
    const list = getPath(st.draft, listPath);
    return `<div class="rows">${list.map((it, i) => `<div class="row ${it.enabled ? "" : "is-off"}">
        <label class="sw"><input type="checkbox" data-bind="${listPath}.${i}.enabled" ${it.enabled ? "checked" : ""} aria-label="Показывать"><i></i></label>
        ${field(o.nameLabel, `<input type="text" data-bind="${listPath}.${i}.name" value="${esc(it.name)}" maxlength="24">`)}
        ${field("Ссылка", `<input type="url" data-bind="${listPath}.${i}.url" value="${esc(it.url)}" maxlength="500" placeholder="https://">`, "", "field--url")}
        <div class="row__act">
          <button type="button" class="icon-btn" data-move="${listPath}:${i}:-1" ${i === 0 ? "disabled" : ""} aria-label="Выше">↑</button>
          <button type="button" class="icon-btn" data-move="${listPath}:${i}:1" ${i === list.length - 1 ? "disabled" : ""} aria-label="Ниже">↓</button>
          <button type="button" class="icon-btn icon-btn--danger" data-del="${listPath}:${i}" aria-label="Удалить">✕</button>
        </div></div>`).join("")}</div>
      <p><button type="button" class="btn btn--ghost btn--sm" data-add="${listPath}"><span>+ ${esc(o.addLabel)}</span></button></p>`;
  }
  function vLinks() {
    return card("Соцсети", "Иконки в шапке и список внизу. Ссылки без адреса или с выключенным переключателем на сайте не показываются. Порядок — как в списке.", listRows("socials", { nameLabel: "Название", addLabel: "Добавить ссылку" })) +
      card("Поддержка", "Меню кнопки «Поддержать». Добавляйте DonationAlerts, Boosty и любые другие способы. Пустые или выключенные не показываются.",
        `<div class="grid">${text("donate.label", "Текст кнопки", { max: 24 })}</div><br>` + listRows("donate.methods", { nameLabel: "Способ", addLabel: "Добавить способ" }));
  }

  function vLook() {
    const t = st.draft.theme, cur = [t.electric, t.blue, t.violet, t.lilac].map(x => x.toLowerCase()).join();
    return card("Цветовая схема", "Выберите готовую схему или задайте два цвета: основной и вторичный. Остальные оттенки подберутся автоматически.",
      `<div class="swatches">${PRESETS.map((p, i) => `<button type="button" class="swatch ${p.c.map(x => x.toLowerCase()).join() === cur ? "is-on" : ""}" data-preset="${i}"><span class="swatch__c">${p.c.map(c => `<i data-c="${c}"></i>`).join("")}</span>${esc(p.name)}</button>`).join("")}</div><br>
       <div class="colors">
         <label class="color"><input type="color" data-color="electric" value="${esc(t.electric)}">Основной</label>
         <label class="color"><input type="color" data-color="violet" value="${esc(t.violet)}">Вторичный</label>
       </div>`) +
      card("Главный объект", "",
        `<div class="grid">${field("Кристалл", `<select data-bind="visual.mode"><option value="3d" ${st.draft.visual.mode === "3d" ? "selected" : ""}>Показывать 3D-кристалл</option><option value="none" ${st.draft.visual.mode === "none" ? "selected" : ""}>Скрыть</option></select>`)}
        ${field("Форма", `<select data-bind="visual.variant"><option value="crystal" ${st.draft.visual.variant === "crystal" ? "selected" : ""}>Кристалл</option><option value="spire" ${st.draft.visual.variant === "spire" ? "selected" : ""}>Вытянутый</option></select>`)}</div>`) +
      card("Фоновое изображение", "Подмешивается к фону мягко и затухает к низу страницы.", mediaField("background", "Фон", true));
  }

  function vContent() {
    const items = st.draft.news.items;
    return card("Описание на главной", "Тот же текст, что и «Краткое описание» в профиле.", area("profile.tagline", "Описание", { rows: 2, max: 200 })) +
      card("Тексты кнопок и заголовков", "Пусто — используется стандартный текст.", `<div class="grid">
        ${text("labels.watch", "Кнопка просмотра", { max: 30, ph: "Смотреть стрим" })}
        ${text("donate.label", "Кнопка поддержки", { max: 24, ph: "Поддержать" })}
        ${text("labels.scheduleTitle", "Заголовок расписания", { max: 40 })}
        ${text("labels.socialsTitle", "Заголовок соцсетей", { max: 40 })}
        ${text("labels.aboutTitle", "Заголовок «О канале»", { max: 40 })}
        ${text("labels.newsTitle", "Заголовок объявлений", { max: 40 })}</div>`) +
      card("Объявления", "Короткие записи на главной. Закреплённое показывается первым (закрепить можно одно). Пустые записи при сохранении удаляются.",
        `<div class="rows">${items.map((n, i) => `<div class="row row--news">
          <div class="grid">${field("Текст", `<textarea data-bind="news.items.${i}.text" rows="2" maxlength="280">${esc(n.text)}</textarea>`)}${field("Дата", `<input type="date" data-bind="news.items.${i}.date" value="${esc(n.date)}">`)}
          <div class="field span2">${`<label class="sw"><input type="checkbox" data-pin="${i}" ${n.pinned ? "checked" : ""}><i></i><span>Закрепить</span></label>`}</div></div>
          <button type="button" class="icon-btn icon-btn--danger" data-del="news.items:${i}" aria-label="Удалить объявление">✕</button></div>`).join("")}</div>
          <p><button type="button" class="btn btn--ghost btn--sm" data-add="news.items"><span>+ Новое объявление</span></button></p>`) +
      card("Блоки сайта", "Отключённые блоки скрываются полностью.", `<div class="grid">${SECTIONS.map(s => `<div class="field">${sw("sections." + s[0], s[1])}</div>`).join("")}</div>`);
  }

  const RENDER = { overview: vOverview, profile: vProfile, status: vStatus, schedule: vSchedule, links: vLinks, look: vLook, content: vContent };

  function render() {
    const y = window.scrollY;
    $("#view").innerHTML = RENDER[st.view]();
    $("#title").textContent = TITLES[st.view];
    document.title = TITLES[st.view] + " — панель управления";
    $("#nav").innerHTML = VIEWS.map(v => `<button type="button" class="nav__it ${v[0] === st.view ? "is-on" : ""}" data-go="${v[0]}" ${v[0] === st.view ? 'aria-current="page"' : ""}>${v[2]}<span>${esc(v[1])}</span></button>`).join("");
    document.querySelectorAll(".swatch__c i").forEach(i => { i.style.background = i.dataset.c; });
    window.scrollTo(0, y);
    updateBar();
  }

  function go(v) {
    st.view = v;
    document.body.classList.remove("nav-open");
    $("#burger").setAttribute("aria-expanded", "false");
    history.replaceState(null, "", "#" + v);
    render();
    $("#view").focus({ preventScroll: true });
    window.scrollTo(0, 0);
    if (v === "overview" || v === "status") checkTwitch(false);
  }

  /* ---------- Twitch ---------- */
  async function checkTwitch(force) {
    if (st.draft.status.mode !== "auto") return;
    if (st.twitch !== null && !force) return;
    st.twitch = null; if (st.view === "status" || st.view === "overview") render();
    try {
      const r = await fetch("/api/twitch-status", { cache: "no-store" });
      const j = r.ok ? await r.json() : null;
      st.twitch = j && typeof j.live === "boolean" ? { live: j.live, game: j.game || "" } : { error: true };
    } catch (e) { st.twitch = { error: true }; }
    if (st.view === "status" || st.view === "overview") render();
  }

  /* ---------- события ---------- */
  document.addEventListener("input", onChange);
  document.addEventListener("change", onChange);
  function onChange(e) {
    const t = e.target;
    if (t.dataset.bind) {
      const v = t.type === "checkbox" ? t.checked : t.value;
      setPath(st.draft, t.dataset.bind, v);
      updateBar();
      if (t.dataset.rerender || t.dataset.bind === "visual.mode") render();
      if (t.type === "checkbox" && /^(socials|donate\.methods)\.\d+\.enabled$/.test(t.dataset.bind)) t.closest(".row").classList.toggle("is-off", !t.checked);
      return;
    }
    if (e.type !== "change") return;
    if (t.dataset.dayOn !== undefined) {
      const d = st.draft.schedule.days[+t.dataset.dayOn];
      if (t.checked) { delete d.off; d.time = d.time || "18:00"; d.title = d.title || ""; } else { d.off = true; }
      updateBar(); render(); return;
    }
    if (t.dataset.pin !== undefined) {
      st.draft.news.items.forEach((n, i) => { n.pinned = t.checked && i === +t.dataset.pin; });
      updateBar(); render(); return;
    }
    if (t.dataset.color) {
      st.draft.theme[t.dataset.color] = t.value;
      const th = st.draft.theme;
      th.blue = VS.mix(th.electric, th.violet, .35);
      th.lilac = VS.mix(th.violet, "#ffffff", .3);
      updateBar(); render(); return;
    }
    if (t.dataset.upload) { upload(t.dataset.upload, t.files && t.files[0]); t.value = ""; }
  }

  document.addEventListener("click", e => {
    const t = e.target.closest("button,a,[data-go]");
    if (!t) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.mode) { st.draft.status.mode = t.dataset.mode; updateBar(); render(); if (t.dataset.mode === "auto") checkTwitch(true); return; }
    if (t.dataset.chip !== undefined) { st.draft.status.text = t.dataset.chip; updateBar(); render(); return; }
    if (t.dataset.act === "twitch") return checkTwitch(true);
    if (t.dataset.preset) { st.draft.theme = (c => ({ electric: c[0], blue: c[1], violet: c[2], lilac: c[3] }))(PRESETS[+t.dataset.preset].c); updateBar(); render(); return; }
    if (t.dataset.move) {
      const [p, i, d] = t.dataset.move.split(":"), l = getPath(st.draft, p), a = +i, b = a + +d;
      if (b >= 0 && b < l.length) { const x = l[a]; l[a] = l[b]; l[b] = x; updateBar(); render(); }
      return;
    }
    if (t.dataset.del) {
      const [p, i] = t.dataset.del.split(":"); getPath(st.draft, p).splice(+i, 1); updateBar(); render(); return;
    }
    if (t.dataset.add) {
      const p = t.dataset.add, l = getPath(st.draft, p);
      if (p === "news.items") l.unshift({ id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), text: "", date: new Date().toISOString().slice(0, 10), pinned: false });
      else if (l.length < (p === "socials" ? 12 : 8)) l.push({ name: "", url: "", enabled: true });
      updateBar(); render(); return;
    }
    if (t.dataset.rmMedia) { removeMedia(t.dataset.rmMedia); return; }
  });

  /* ---------- изображения ---------- */
  async function upload(slot, file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast("Подходят только PNG, JPEG и WebP.", "bad");
    if (file.size > 1.5 * 1024 * 1024) return toast("Файл больше 1,5 МБ.", "bad");
    try {
      const r = await api("POST", "/api/admin/media/" + slot, file, { "Content-Type": file.type });
      setPath(st.draft, slot === "background" ? "visual.background" : "profile." + slot, r.url);
      updateBar(); render(); toast("Изображение загружено. Нажмите «Сохранить», чтобы опубликовать.");
    } catch (e) { toast(errText(e), "bad"); }
  }
  async function removeMedia(slot) {
    try { await api("DELETE", "/api/admin/media/" + slot); } catch (e) { if (!e.auth) return toast(errText(e), "bad"); }
    setPath(st.draft, slot === "background" ? "visual.background" : "profile." + slot, "");
    updateBar(); render();
  }

  function errText(e) {
    if (e.network) return "Нет связи с сервером. Проверьте подключение.";
    const m = { too_large: "Файл слишком большой.", unsupported_type: "Неподдерживаемый тип файла.", storage_unavailable: "Хранилище недоступно (нет привязки KV).", bad_csrf: "Сессия устарела. Обновите страницу.", bad_origin: "Запрос отклонён.", not_configured: "Сервер не настроен." };
    return (e.data && m[e.data.error]) || "Ошибка сервера (код " + (e.status || "?") + ").";
  }

  /* ---------- сохранение ---------- */
  async function save() {
    if (st.saving || !dirty()) return;
    st.saving = true; updateBar();
    try {
      const r = await api("PUT", "/api/admin/settings", { settings: st.draft });
      st.draft = VS.merge(DEFAULTS, r.settings); st.saved = JSON.stringify(st.draft);
      toast("Сохранено. Изменения уже на сайте.");
    } catch (e) {
      if (e.data && e.data.error === "validation") toast("Исправьте ошибки и повторите.", "bad", e.data.errors);
      else toast(errText(e), "bad");
    }
    st.saving = false; render();
  }
  $("#saveBtn").addEventListener("click", save);
  $("#discardBtn").addEventListener("click", () => {
    if (!dirty() || !confirm("Отменить все несохранённые изменения?")) return;
    st.draft = JSON.parse(st.saved); render(); toast("Изменения отменены.");
  });
  window.addEventListener("beforeunload", e => { if (dirty()) { e.preventDefault(); e.returnValue = ""; } });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    if (e.key === "Escape") { closePreview(); document.body.classList.remove("nav-open"); }
  });

  $("#logout").addEventListener("click", async () => {
    if (dirty() && !confirm("Есть несохранённые изменения. Выйти без сохранения?")) return;
    window.onbeforeunload = null;
    st.saved = JSON.stringify(st.draft);
    try { await api("POST", "/api/admin/logout", {}); } catch (e) { /* всё равно уходим */ }
    location.replace("/admin/login.html");
  });
  $("#burger").addEventListener("click", () => {
    const o = document.body.classList.toggle("nav-open");
    $("#burger").setAttribute("aria-expanded", String(o));
  });
  $("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));

  /* ---------- предпросмотр ---------- */
  const frame = $("#previewFrame"), stage = $("#previewStage");
  let dev = "desktop";
  function fitPreview() {
    const w = dev === "mobile" ? 390 : 1440, h = dev === "mobile" ? 844 : 900;
    const sc = Math.min(1, stage.clientWidth / w, stage.clientHeight / h);
    frame.style.width = w + "px"; frame.style.height = h + "px";
    frame.style.transform = "scale(" + sc + ")";
  }
  function openPreview() {
    try { sessionStorage.setItem("vanta_preview", JSON.stringify(st.draft)); } catch (e) { return toast("Не удалось подготовить предпросмотр.", "bad"); }
    $("#previewModal").hidden = false;
    frame.src = "/?preview=1&t=" + Date.now();
    fitPreview();
    $("#previewClose").focus();
  }
  function closePreview() { $("#previewModal").hidden = true; frame.src = "about:blank"; }
  $("#previewBtn").addEventListener("click", openPreview);
  $("#previewClose").addEventListener("click", closePreview);
  $("#devSeg").addEventListener("click", e => {
    const b = e.target.closest("button[data-dev]"); if (!b) return;
    dev = b.dataset.dev;
    document.querySelectorAll("#devSeg button").forEach(x => x.classList.toggle("is-on", x === b));
    fitPreview();
  });
  window.addEventListener("resize", () => { if (!$("#previewModal").hidden) fitPreview(); });

  /* ---------- запуск ---------- */
  (async function init() {
    try {
      const r = await fetch("/api/admin/session", { cache: "no-store" });
      if (!r.ok) throw new Error("status " + r.status);
      const j = await r.json();
      if (!j.authenticated) return location.replace("/admin/login.html");
      st.csrf = j.csrf; st.storage = j.storage !== false;
      st.draft = VS.merge(DEFAULTS, j.settings || {});
      st.saved = JSON.stringify(st.draft);
      const h = location.hash.slice(1);
      st.view = RENDER[h] ? h : "overview";
      $("#shell").hidden = false; $("#gate").hidden = true;
      render();
      if (st.view === "overview" || st.view === "status") checkTwitch(false);
    } catch (e) {
      $("#gate").textContent = "Не удалось загрузить панель. Обновите страницу.";
    }
  })();
})();



