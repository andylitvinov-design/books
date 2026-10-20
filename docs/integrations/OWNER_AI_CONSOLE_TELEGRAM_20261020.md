# Holistic House — собственный Telegram → AI Console → Telegram

Дата: 20 октября 2026. Production branch: codex/public-book-library. Только для владельца, не является клиентским AI-консультантом.

## Интерфейс
В существующем @Andydotbot команда /ai открывает меню «Gemini + Mistral / Gemini / Mistral». При выборе бот просит ответить на его сообщение вопросом (ForceReply); текстовый вопрос без выбора идёт обоим ИИ. Прямые команды: /gemini вопрос, /mistral вопрос, /council вопрос. Каждый подтверждённый результат приходит отдельным сообщением с точным именем модели, после есть «Задать ещё вопрос». Это тот же серверный модуль Gemini/Mistral, который обслуживает ежедневные аудиты AI Council. Синхронизация истории сообщений с открытой браузерной вкладкой AI Council пока НЕ реализована.

## Архитектура и безопасность
- Только существующий /api/app/notification-channels/telegram/webhook, без второго бота/токена/webhook. Клиентские /start с токеном, /stop, CRM уведомления и прочие боты сохраняются.
- Вход: Telegram secret-token header, приватный chat, from.id=chat.id, username @AndyTherapist и точное совпадение числового ID с ранее верифицированной зашифрованной парой владельца. Username недостаточен. Клиентские запросы не направляются в модели.
- Выход: sendMessage исключительно на зафиксированный приватный owner chat. BotFather token и числовой chat ID не раскрываются в браузер, логи, issue, веб AI Console или код. Меню команд имеет Telegram scope «chat» только для владельца; callback_query разрешается на уже подписанном webhook, чужой активный webhook нельзя перезаписать.
- Supabase: приватная таблица app_private.telegram_owner_ai_updates с FORCE RLS, хранит только update_id, action, mode, статусы и время, БЕЗ prompt/response, телефонов, chat ID, результатов тестов или API ключей. ON CONFLICT DO NOTHING делает обновления идемпотентными, автоматический повтор запроса к моделям отключён.
- Частота: максимум 10 вопросов в час, длина 2000 символов. Очевидные токены, email, телефоны отклоняются до отправки ИИ. Это не полноценная DLP-проверка: владелец должен не отправлять клиентские и медицинские данные.
- Только бесплатные запросы: Gemini требует HH_COUNCIL_GEMINI_API_KEY и HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED=true; Mistral требует HH_COUNCIL_OPENROUTER_API_KEY, live catalog c pricing=0, max_price=0, allow_fallbacks=false, exact model ID и usage.cost=0. Иначе настоящего модельного ответа НЕТ; подделка недопустима.
- Gate HH_OWNER_AI_TG_ENABLED=true включает только эту ветку webhook после выкладки на Production. При false клиентские Telegram уведомления не меняются.

## Развёртывание
1. Записать новую SQL миграцию, проверить FORCE RLS и GitHub CI / Vercel READY / SHA на production. В Vercel Production https://vercel.com/super10/codex-public-book-library/settings/environment-variables включить HH_OWNER_AI_TG_ENABLED=true, сделать Redeploy после изменения env. Не дублировать BotFather token или numeric chat ID — оба уже безопасно привязаны.
2. В кабинете https://holistichouse.vercel.app/ru/app/practice?panel=clients → CRM → Integrations нажать «Подключить меню AI». Этот шаг безопасно подтверждает существующий webhook, регистрирует приватные Telegram команды и читает их обратно.
3. В https://t.me/Andydotbot отправить /ai, выбрать модель, ответить обезличенным рабочим вопросом и проверить фактический полученный ответ. Для Gemini/Mistral вписать действующие ключи своих подтверждённых бесплатных аккаунтов только в Vercel Production Env (не чат), если их ещё нет.

## Приёмка и откат
Тесты Node: действительный owner vs клиент/другой чат, callback, клиентские /start и /stop, секреты/PII, idempotency, FREE-only модель и стоимость, приватный SQL RLS. HTTP 200 и mocks не доказывают E2E. Подтверждать E2E только по реальному Telegram update → provider response → Telegram Bot API acceptance → проверка сообщения у владельца. При инциденте: HH_OWNER_AI_TG_ENABLED=false и redeploy; клиентские уведомления сохраняются.
