/* ============================================================
   Конфигурация шаблона — значения по умолчанию.
   Если подключена админ-панель (/admin), сохранённые в ней настройки
   переопределяют этот файл; без панели сайт работает по этим значениям.
   Если значение пустое (""), [] или false — элемент не показывается.
   ============================================================ */
window.SITE_CONFIG = {
  nick: "VANTA",
  description: "Стримы, игры, общение.\nЗдесь всегда хорошая атмосфера.",

  // Подпись над ником: платформа + категория контента (любое можно оставить пустым)
  platform: { name: "Twitch", url: "https://www.twitch.tv/" },
  category: "Counter-Strike 2",

  // Поддержка. Кнопка открывает меню способов; ссылка открывается в новой вкладке.
  // Сейчас DonationAlerts и Boosty ведут на главные страницы сервисов — замените на персональные ссылки клиента.
  // Пункт с пустым url: для DonationAlerts и Boosty подставляется главная страница сервиса, для остальных
  // показывается «Скоро». Способы можно добавлять и удалять. Пустой список methods скрывает кнопку.
  donate: {
    label: "Поддержать",
    methods: [
      { name: "DonationAlerts", url: "https://www.donationalerts.com/" },
      { name: "Boosty", url: "https://boosty.to/" },
      { name: "Другой способ", url: "" }
    ]
  },

  // Статус эфира и текущая игра.
  //  mode: "manual" — значения берутся ниже; сервер не нужен.
  //        live: true ставьте ТОЛЬКО во время реального эфира; game — название текущей игры.
  //  mode: "auto"   — статус приходит из Twitch API через серверную функцию (см. functions/api/twitch-status.js).
  //        В этом режиме live и game из конфига игнорируются. Нужны переменные окружения на хостинге:
  //        TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_CHANNEL (логин канала). Секреты в этот файл не вносить.
  //        endpoint — адрес функции, refreshSeconds — период опроса (не меньше 30).
  status: {
    mode: "manual",
    live: false,
    game: "",
    endpoint: "/api/twitch-status",
    refreshSeconds: 60
  },

  labels: {
    watch: "Смотреть стрим",
    streams: "Стримы",
    clips: "Клипы",
    scheduleTitle: "Расписание стримов",
    socialsTitle: "Соцсети"
  },

  // Социальные сети (иконка подбирается по названию: Twitch, YouTube, Telegram, Discord, X, Instagram, TikTok, VK)
  socials: [
    { name: "Twitch",   url: "https://www.twitch.tv/" },
    { name: "YouTube",  url: "https://www.youtube.com/" },
    { name: "Telegram", url: "https://t.me/" },
    { name: "Discord",  url: "https://discord.com/" },
    { name: "X",        url: "https://x.com/" }
  ],

  // Расписание (демонстрационные значения — замените перед передачей клиенту).
  // enabled: false — блок полностью скрывается.
  // timezone — часовой пояс эфиров (IANA), по нему определяется «сегодня». timezoneLabel — подпись рядом с заголовком.
  // Каждый день: { day, time, title } или выходной { day, off: true }. Время у каждого дня своё.
  // Ровно 7 записей, начиная с понедельника.
  schedule: {
    enabled: true,
    timezone: "Europe/Moscow",
    timezoneLabel: "МСК",
    days: [
      { day: "Пн", time: "18:00", title: "Игра" },
      { day: "Вт", off: true },
      { day: "Ср", off: true },
      { day: "Чт", time: "18:00", title: "Игра" },
      { day: "Пт", time: "18:00", title: "Игра" },
      { day: "Сб", off: true },
      { day: "Вс", off: true }
    ]
  },

  // Блок «О канале» (нижняя правая колонка). enabled: false или пустой text — колонка скрывается целиком.
  // Текст ниже — демонстрационный, замените его перед передачей клиенту.
  about: {
    enabled: true,
    title: "О канале",
    text: "Демо-текст. Здесь коротко расскажите, во что играет автор, какой формат трансляций он предпочитает и какая атмосфера царит в чате."
  },
  // Клипы (кнопка «Клипы» в меню). enabled: false — скрыть.
  // embed — ссылка вида https://www.youtube-nocookie.com/embed/ID. Пока пусто — показывается заглушка.
  clips: {
    enabled: true,
    items: [
      { title: "Лучший момент #1", meta: "Клип · 0:42", embed: "" },
      { title: "Лучший момент #2", meta: "Клип · 0:31", embed: "" },
      { title: "Лучший момент #3", meta: "Клип · 1:08", embed: "" }
    ]
  },

  // Вертикальная подпись справа от главного объекта (до 3 слов, [] — скрыть)
  sideLabels: ["Play", "Improve", "Win"],
  footerLabel: "Streamer",

  // Главный объект. mode: "3d" (WebGL-скульптура) | "image" (статичная картинка из image) | "none".
  // variant (для 3d): "crystal" (по умолчанию) | "spire" (более вытянутый). Если WebGL недоступен, показывается мягкий статичный вариант.
  visual: { mode: "3d", variant: "crystal", image: "", imageAlt: "" },

  // Цветовые акценты
  theme: {
    electric: "#6F9BFF",
    blue: "#465DFF",
    violet: "#7954FF",
    lilac: "#AA7CFF"
  }
};








