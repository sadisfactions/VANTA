# Админ-панель VANTA — настройка Cloudflare Pages

Панель доступна по адресу `https://ВАШ-САЙТ/admin/`. Пароль и ключи хранятся только в Cloudflare, в файлах проекта их нет.

## 1. KV-хранилище (настройки и загруженные картинки)
1. Cloudflare Dashboard → **Workers & Pages → KV → Create a namespace** (имя, например, `vanta-settings`).
2. **Workers & Pages → ваш Pages-проект → Settings → Bindings (Functions) → Add → KV namespace**.
3. Variable name: **`VANTA_KV`**, выберите созданное пространство. Сделайте это для Production (и для Preview, если нужен).

## 2. Секреты (Settings → Variables and Secrets → Add, тип **Secret**)
| Имя | Что это |
|---|---|
| `ADMIN_PASSWORD` | Пароль владельца, не короче 8 символов |
| `ADMIN_SESSION_SECRET` | Случайная строка не короче 32 символов — ключ подписи сессий. Например: `openssl rand -base64 48` |
| `TWITCH_CLIENT_ID` | Только для автоматического статуса Twitch (dev.twitch.tv/console) |
| `TWITCH_CLIENT_SECRET` | то же |
| `TWITCH_CHANNEL` | Логин канала на Twitch |

Пока `ADMIN_PASSWORD` или `ADMIN_SESSION_SECRET` не заданы, вход отвечает 503 и панель закрыта. Смена `ADMIN_SESSION_SECRET` завершает все текущие сессии.

## 3. Публикация
Папка `functions/` подхватывается Pages автоматически при деплое (Git-интеграция или `wrangler pages deploy`). Не используйте `wrangler deploy` — это команда для Workers. Файл `_headers` в корне проекта добавляет защитные заголовки для `/admin/*`. После добавления привязок и секретов сделайте новый деплой.

## 4. Локальная проверка (необязательно)
```
npx wrangler pages dev . --kv VANTA_KV --binding ADMIN_PASSWORD=ваш-пароль --binding ADMIN_SESSION_SECRET=случайная-строка-не-короче-32-символов
```

## Как это работает
- Сайт при загрузке запрашивает `/api/settings` и накладывает сохранённые настройки на `js/config.js`. Если хранилище пусто или недоступно, сайт работает на значениях из `config.js`.
- Вход: пароль проверяется на сервере, выдаётся cookie `__Host-vanta_admin` (HttpOnly, Secure, SameSite=Strict, 12 часов). Запись данных требует CSRF-токена. После 5 неверных паролей вход блокируется на 15 минут (по IP).
- Картинки (аватар, баннер, фон): PNG/JPEG/WebP до 1,5 МБ, хранятся в KV и отдаются через `/api/media/...`.

## Ограничения
- KV обладает «eventual consistency»: изменения могут появляться на сайте с задержкой до минуты в других регионах.
- Счётчик неверных паролей хранится в KV и тоже обновляется не мгновенно — это защита от подбора, но не строгий лимит.
