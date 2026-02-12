# Кинозритель: лендинг + админка

Проект теперь состоит из:
- публичного лендинга c формой кандидата (`/`)
- закрытого админ-кабинета для обработки заявок (`/admin`)
- backend API + хранилища заявок (Postgres или локальный JSON) + синхронизации в Excel webhook

## Что реализовано

- Авторизация в админке по логину/паролю (JWT, без токена доступ к API закрыт).
- Роли:
  - `admin`: просмотр/редактирование/экспорт.
  - `viewer`: только просмотр.
- Список заявок с фильтрами:
  - статус (мультивыбор)
  - город
  - дата (с/по)
  - источник (`utm_source`)
  - поиск по ФИО/телефону
- Быстрые действия в списке:
  - смена статуса
  - копирование телефона
  - открытие карточки
  - добавление заметки
- Карточка заявки:
  - контакты
  - прохождение шагов
  - статус/решение
  - заметки и теги
  - быстрые кнопки: `Позвонила`, `Написала`, `Не отвечает`, `Назначить интервью`
- Экспорт:
  - CSV (по текущим фильтрам)
  - ссылка на Excel workbook (если задана)
- Excel интеграция:
  - при создании/обновлении заявки backend отправляет webhook в Microsoft 365/Power Automate
- Антидубликаты:
  - повторные заявки по телефону помечаются как `duplicate`
- Vercel-ready:
  - API работает через serverless entrypoint `api/[...path].js`
  - route `/admin` отдается как SPA через `vercel.json`

## Запуск

Требования: Node.js 18+.

1. Установить зависимости:

```bash
npm install
```

2. Запустить фронт и сервер вместе:

```bash
npm run dev
```

По умолчанию:
- фронт: `http://localhost:5173`
- backend API: `http://localhost:3001`
- админка: `http://localhost:5173/admin`

## Дефолтный доступ

- Логин: `tatyana`
- Пароль: `admin12345`

Смените это через переменную `ADMIN_USERS` (см. ниже).

## Переменные окружения

- `VITE_API_BASE` — base URL API для фронтенда (если фронт и API на разных доменах)
- `VITE_API_PROXY_TARGET` — target прокси для dev-сервера Vite (по умолчанию `http://localhost:3001`)
- `PORT` — порт backend (по умолчанию `3001`)
- `JWT_SECRET` — секрет для JWT
- `JWT_EXPIRES_IN` — TTL токена (по умолчанию `12h`)
- `DEFAULT_ASSIGNEE` — ответственный по умолчанию (по умолчанию `Татьяна`)
- `DATABASE_URL` — Postgres connection string (рекомендуется для Vercel/production)
- `DATA_FILE` — путь к JSON базе заявок (используется как fallback, если `DATABASE_URL` не задан)
- `EXCEL_WEBHOOK_URL` — webhook URL для синхронизации в Excel/Power Automate
- `EXCEL_WORKBOOK_URL` — URL excel-файла (кнопка "Excel" в админке)
- `ADMIN_USERS` — пользователи в формате:

```text
username:password:role:displayName;username2:password2:viewer:Name
```

Пример:

```text
tatyana:StrongPass123:admin:Татьяна;viewer1:ViewerPass1:viewer:Наблюдатель
```

Можно скопировать `.env.example` в `.env` и заполнить значения.

## Режимы хранения данных

- `DATABASE_URL` задан: заявки хранятся в Postgres (подходит для Vercel).
- `DATABASE_URL` пустой: заявки хранятся локально в `server/data/applications.json` (локальная разработка).
- На Vercel без `DATABASE_URL` fallback идет в `/tmp/kinozritel-applications.json` (временное/эфемерное хранение, не для production).

## Деплой на Vercel

1. Подключите проект в Vercel (Framework Preset: Vite).
2. Добавьте переменные окружения:
   - `JWT_SECRET`
   - `ADMIN_USERS`
   - `DATABASE_URL` (обязательно для production)
   - `EXCEL_WEBHOOK_URL` и `EXCEL_WORKBOOK_URL` (опционально)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy.

## Как работает Excel интеграция

Backend отправляет POST на `EXCEL_WEBHOOK_URL` при:
- создании заявки (`action: "create"`)
- изменении заявки (`action: "update"`)

В payload есть:
- `application_id`
- `row` (подготовленный маппинг полей под табличную структуру)
- `application` (полный объект заявки)

Если webhook не задан, backend логирует предупреждение и продолжает работу.
