# Telegram owner onboarding — план и ТЗ (20.10.2026)

## Результат для владельца

**Одно место для Telegram BotFather Token:** [Vercel → Holistic House → Environment Variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables), Production, Encrypted `HH_PRACTICE_TG_BOT_TOKEN`. Это существующий @Andydotbot. Не создавать второго бота. Не дублировать его токен в GitHub или AI Council.

Владелец уже писал `/start` боту Dot 11 октября. **Telegram хранит непрочитанные обновления максимум 24 часа**. Если после ввода токена автообнаружение не видит актуальный `/start`, понадобится отправить **ровно одну новую команду** `/start` в [@Andydotbot](https://t.me/Andydotbot). Не нужен @userinfobot.

**Чего не требуется от владельца:** получать и вручную вводить numeric chat ID, копировать Relay Key между Vercel проектами, пользоваться терминалом или вручную отправлять HTTP запросы — при условии, что у Codex есть авторизованный Vercel доступ и у бота нет конкурирующего webhook.

## Архитектура (источник истины)

- GitHub: [andylitvinov-design/books](https://github.com/andylitvinov-design/books), **production branch** `codex/public-book-library`.
- Live: [holistichouse.vercel.app](https://holistichouse.vercel.app), Vercel project `codex-public-book-library`.
- Один владелец: Telegram @AndyTherapist, существующий bot @Andydotbot.
- Server-to-server AI Council relay уже реализован в [PR #1300](https://github.com/andylitvinov-design/books/pull/1300) и [PR #248](https://github.com/andylitvinov-design/ai-projects-brain/pull/248). Рандомный `HH_COUNCIL_TG_RELAY_KEY` / `COUNCIL_TELEGRAM_RELAY_KEY` уже настроен в обоих проектах, **не менять**.
- Отправка статистики мастера: защищённый Vercel cron `/api/internal/practice-telegram-digest`, 13:00 UTC, источник Supabase `service_funnel_daily`.
- Отправка ежедневных AI ревью и ТЗ: GitHub Actions 09:15 America/Toronto **архивирует** публичные HTML/HTTP анализы в [Issue #242](https://github.com/andylitvinov-design/ai-projects-brain/issues/242); HH cron в 15:00 UTC читает только проверенные public GitHub Actions комментарии и направляет Telegram через тот же бот.
- Muse personal — только manual; Gemini/Mistral — только с реальными ключами/разрешённым бесплатным тарифом. Нельзя считать отсутствие модельного ответа настоящим аудитом ИИ.
- Пока реального Bot API acceptance нет, **статус BLOCKED**.

## Этапы

### P0 · Инвентаризация — сделано

- GitHub PR #1300 / #248 merged, production Vercel deployments READY (текущий SHA проверять каждый раз).
- Готовы существующие роли Supabase и private receipt/lease таблицы для обоих ежедневных отчётов.
- Vercel содержит `HH_PRACTICE_TG_ENABLED=false`; нельзя обходить этот opt-in.
- Токен `HH_PRACTICE_TG_BOT_TOKEN` и numeric `HH_PRACTICE_TG_CHAT_ID` пока НЕ найдены. Не придумывать их.

### P1 · Получение numeric private chat ID — код

Файлы:
- `lib/practitioners/telegram-owner-discovery.mjs` — чистый, тестируемый read-only Bot API клиент.
- `app/api/internal/telegram-owner-discovery/route.js` — разовый внутренний маршрут; защищён существующим `CRON_SECRET` через `cronAuthorized`; не public/UI.
- `tests/telegram-owner-discovery.test.mjs` + `.github/workflows/hh-central-telegram.yml`.

Точный алгоритм:
1. Только при наличии формально корректного BotFather token запросить `getMe`; проверить `is_bot=true`, точный username **Andydotbot**.
2. Запросить `getWebhookInfo`; если `url` непустой — **остановить** сценарий как `webhook_active`. Не использовать getUpdates и не вызывать `deleteWebhook`, `setWebhook`, `drop_pending_updates`.
3. Если webhook отсутствует — `getUpdates?limit=100&timeout=0` **БЕЗ offset**. Без offset Telegram не подтверждает / не удаляет обновления; не вмешиваться в работу другого клиента.
4. Найти только свежее (за 24 ч) личное сообщение `/start`, где `from.username` = `AndyTherapist` (без учёта регистра), `from.id == chat.id`, `chat.type=private`, `from.is_bot!==true`. Игнорировать группы, другие имена, старые/пересланные сообщения.
5. Ещё раз проверить `getChat(chat_id)`: numeric ID, type private, username AndyTherapist. Если всё верно, выдать numeric ID **только авторизованному оператору** через private no-store route; никогда публично и не в логах.
6. Вернуть безопасный диагностический `status`: `token_missing`, `wrong_bot`, `webhook_active`, `awaiting_new_start`, `chat_identity_unverified`, `telegram_unavailable`, `verified`. Ни одна ошибка не включает токен или чужие данные.

### P2 · Однократное действие Codex — после получения токена

1. Используя законное, уже подключённое окружение Vercel, вызвать защищённый внутренний маршрут **с серверным `CRON_SECRET`**, не помещая значение секрета в логи/чат.
2. При `verified` получить numeric chat ID **приватно**. Codex (не владелец вручную) создаёт в том же Holistic House Vercel project Production `HH_PRACTICE_TG_CHAT_ID` типа Encrypted. ID не сохранять в PR / issue.
3. Пересобрать production, проверить exact SHA и `READY`; через существующий `getMe`/`getChat`/`getWebhookInfo` проверить Bot + owner до отправки.
4. После проверки включить в HH Vercel Production `HH_PRACTICE_TG_ENABLED=true`. AI Council Vercel `COUNCIL_TELEGRAM_ENABLED=true` (не копируя токен) после отдельного приватного probe и разрешения владельца, включающего эти отчёты. GitHub Secrets Telegram не добавлять.
5. В случае неудачной или ошибочной идентификации вернуться к `false`, ничего не отправлять. **Никогда не перепривязывать другого владельца**.

### P3 · Тест настоящей доставки

- Одно нейтральное тестовое сообщение в подтверждённый личный чат.
- Bot API `ok=true`, `result.chat.id === configuredChatId`, `message_id` подтверждён. Это **не** read receipt.
- Ручной owner-check получения, затем дневная статистика и .md отчёт GitHub по отдельности. Запустить повторно и подтвердить `already_claimed`, отсутствие дублирующих документов.
- Проверить `401` без cron-auth, `422` на неверный bot/chat, no-store, отсутствие секретов в HTTP и runtime logs.

### P4 · Webhook fallback — отдельная ветка безопасности

Telegram `getUpdates` официально не работает, когда webhook установлен. Если `getWebhookInfo.url` уже заполнен, Codex сначала устанавливает **кому принадлежит текущий webhook**. Вмешиваться нельзя.

- Если webhook обслуживает текущий, уже авторизованный сервис владельца, он должен передавать **одноразовое подтверждение** owner `/start` в защищённый handler; это требует проверки существующего кода и прав.
- Если webhook чужой/неизвестный, нельзя читать его, отключать или переназначать без отдельного подтверждения. Допустимый запасной вариант: владелец вводит numeric ID в то же защищённое поле Vercel или подтверждает миграцию своего webhook. Токен всё равно не копируется в другие сервисы.

## Контроль безопасности, ограничений и расходов

- Только server-side; нет пользовательского BotFather Token в браузере/JS, Telegram info bot и GPT/Issue.
- Ключ `CRON_SECRET` нужен лишь авторизованному Vercel оператору; route никем анонимно не вызывается.
- Не читать клиентские сообщения, психологические отчёты, медицинские сведения, платежи.
- Нового cron/платного API/вызовов ИИ эта доработка не добавляет.
- Для реальных Gemini/Mistral анализов бесплатно-ориентированные API ключи остаются отдельной настройкой и **не блокируют** базовую Telegram связность; Muse manual.
- Не обещать zero-cost GitHub/Vercel тарифов: используются уже действующие ресурсы.
- Выполнить unit, syntax, production-build/Next.js и negative-security проверки. Не выдавать PR CI за реальную Telegram-доставку.

## Пакет приёмки и отчёт

Код, тесты, миграции (если действительно нужны), PR, SHA, production deployment READY. Для Bot API отдельно: `getMe` verified, `getWebhookInfo` state, `getChat` verified, `sendDocument` accepted, реальное получение владельцем проверено. Всё остальное — `needs verification`.

**Упрощённая инструкция владельцу:** открыть [BotFather](https://t.me/BotFather), `/mybots` → @Andydotbot → API Token, скопировать только в [одну страницу Vercel](https://vercel.com/super10/codex-public-book-library/settings/environment-variables), Production Encrypted `HH_PRACTICE_TG_BOT_TOKEN`. Если после этого Codex скажет `awaiting_new_start`, отправить `/start` ещё раз [@Andydotbot](https://t.me/Andydotbot). Никакой @userinfobot и никаких токенов в чат.

