# Ali · подтверждённая связь двух Telegram-разборов (20.11.2026)

Сценарии *Telegram Business* (личный `@holistichouse`) и *бесплатный диагностический бот* (`@holistichouse_bot`) сохраняют независимые согласия, заявки, защищённые CRM-пакеты и идентификаторы. Клиент, оформив оба запроса, **после подтверждения Send диагностического резюме** вправе явно написать в боте `/link HH-XXXXXXXXXXXX`. Номер берётся из подтверждённой заявки Business; его не размещают в URL и не пересылают сторонним провайдерам.

В одном серверном transaction + signed Telegram webhook + проверенном контексте V3 сверяются:
1. Подписанный Telegram user_id из официального приватного бота и проверенный `verifiedTelegramUserId` зашифрованной диагностической сессии;
2. HMAC `telegram_peer_hash`, вычисленный для *того же самого* подписанного Telegram user_id, с записью отдельной Business сессии;
3. Точный номер `reference_code`, `service_key='personal_review'`, `stage='submitted'`, `consent_at` и письменный формат;
4. Тот же мастер через `practitioner.trusted_auth_user_id` и уже подтверждённый CRM owner.

При несовпадении ответ одинаков и не раскрывает наличие чужих заявок. При совпадении отдельная, нейтральная запись о verified cross-reference попадает в существующую закрытую CRM, а `linkedBusinessReference` сохраняется только внутри шифрованного allowlist V3 (без новых таблиц, платной модели или публичного API). Повторное отправление команды идемпотентно, другая ссылка не заменяет прежнюю автоматически. Получение фото/рисунка/анкеты требует их **отдельной** проверенной квитанции; связывание не превращается в подтверждённую запись или оплату.

Приёмка: `node --test tests/ali-business-diagnostic-link.test.mjs tests/ali-free-package-receipts.test.mjs tests/ali-business-review-triad.test.mjs`, существующий CRM/Core CI и реальное двухаккаунтное Telegram E2E без данных клиентов. До подтверждённого LIVE SHA не заявлять production готовность.

## Защита мастера RLS
У действующей политики `app.practitioners / inbox_practitioner_read` есть условие `id::text = current_setting('hh.practitioner_id', true)`. Поэтому при подписанной команде `/link` бот сначала устанавливает **фиксированный сервером** `PRACTITIONER_ID` внутри своей DB-транзакции (`set_config(..., true)`), затем проверяет `trusted_auth_user_id` против защищённого owner из `crm_msg_resolve`, Telegram HMAC и полностью подтверждённую Business-заявку. Чужой user_id не запускает привязку; номер заявки сам по себе не даёт доступа. SQL-политика не ослаблялась, новые GRANT не создавались.
