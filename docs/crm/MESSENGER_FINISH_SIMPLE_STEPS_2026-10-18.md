# CRM Messages Holistic House — что осталось сделать (инструкция владельцу и Codex)

**18 октября 2026 · Toronto.** Основная CRM, заметки, задачи, переписки, безопасность и отправка через официальные серверные адаптеры уже написаны. **Ни один реальный внешний канал пока не подключён**: в Vercel Production нет `HH_CRM_MSG_*` ключей.

## Что нужно сделать владельцу — только 2 действия

**1. Создайте отдельного Telegram-бота** в [@BotFather](https://t.me/BotFather), команда `/newbot`. Не используйте `@ezohata_diagnostics_bot` или другого бота, который уже обслуживает клиентов или имеет собственный webhook.

**2. Разрешите Codex настроить этот новый бот в Vercel** и провести одну тестовую переписку с вашим собственным Telegram. Токен BotFather передавайте **только в защищённое поле Secrets/Environment Variables**, не вставляйте его в ChatGPT, GitHub Issue, PR, логи или публичный комментарий. Для пилота понадобится числовой chat ID вашего собственного Telegram; Codex может безопасно получить его из `getUpdates` до установки webhook, когда вы отправите `/start` новому боту.

После этого всё остальное (включая кнопки, webhook и проверку базы) выполняет Codex по инструкции ниже. **Без предоставления собственного BotFather токена это невозможно завершить.**

## Задание Codex — точный порядок, без включения всех клиентов

1. Откройте [issue #985](https://github.com/andylitvinov-design/books/issues/985), [runbook](./MESSENGER_LIVE.md) и актуальный `lib/crm/messenger-policy.js` в `andylitvinov-design/books`. Сверьте настоящий live SHA с Vercel `codex-public-book-library`, ветка `codex/public-book-library`.
2. Получите токен **только что созданного** бота через защищённый путь. Верифицируйте `getMe` и бот ID. Убедитесь, что `getWebhookInfo` не указывает на другое приложение. **Никогда не перехватывайте чужой webhook и не удаляйте очередь pending updates.**
3. Когда владелец пришлёт `/start` новому боту, получите числовой `chat.id` **без публикации токена/других пользователей**. Для пилота в Vercel Production установите серверные (не `NEXT_PUBLIC_`) переменные:
   - `HH_CRM_MSG_TELEGRAM_TOKEN` — секрет BotFather.
   - `HH_CRM_MSG_TELEGRAM_BOT_ID` — ID из `getMe`.
   - `HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET` — отдельный случайный 32+ символный секрет из букв, цифр, подчёркивания или дефиса.
   - `HH_CRM_MSG_TELEGRAM_ENABLED=true`.
   - `HH_CRM_MSG_TELEGRAM_PILOT_ENABLED=true`.
   - `HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID` — **только** ID собственного тестового чата владельца.
   - **Оставьте `HH_CRM_MSG_PRODUCTION_APPROVED` выключенным/неустановленным.** Не включайте Meta-флаги и маркетинговые рассылки.
4. Выполните безопасный Production redeploy, проверьте `READY` и точный SHA. Войдите под владельцем в [My Practice → CRM → Messages](https://holistichouse.vercel.app/ru/app/practice) → «Каналы» → Telegram → **«Подключить»**. Кнопка проверяет `getMe`, не заменяет чужой webhook, устанавливает секретный HTTPS webhook и проверяет его URL повторным чтением.
5. Отправьте **с allowlisted Telegram-чата** `/start`, затем «Тест Holistic House CRM». Убедитесь, что сообщение появилось только у правильного owner в CRM, создан ровно один безопасный CRM lead, дубль одного webhook не создаёт второе сообщение. Ответьте вручную нейтральной фразой и проверьте `accepted` от Telegram. Telegram не подтверждает `delivered/read` — не придумывайте таких статусов.
6. Проверьте из **другого, не разрешённого** тестового аккаунта: сообщение не сохраняется в CRM и **ответ на такой аккаунт не отправляется**. Проверьте `/stop`, реакцию «Не связываться», архив и конфликтующие повторные send request IDs. Убедитесь в отсутствии PII/token в логах.
7. Только когда владелец явно подтверждает работу Telegram для настоящих клиентов, планируйте снятие пилотного ограничения и `HH_CRM_MSG_PRODUCTION_APPROVED=true`; без такого отдельного разрешения **сохраните pilot режим**. Проверьте официальные правила, допустимость контактирования, стоимость и приёмку.
8. Для WhatsApp / Instagram / Messenger **не придумывайте** WABA, phone ID, Meta App secret, профессиональный аккаунт, Page token и разрешения. Подключение возможно только из принадлежащего владельцу Meta Business; проверьте [Meta Developers](https://developers.facebook.com/apps/) и подходящий продукт. Настройте отдельные server-side ключи и webhook только после прохождения Meta app/business review и проверки политики чувствительных услуг. **Никаких платных шаблонов / массовых рассылок без отдельного бюджета и разрешения.**
9. Запустите `node --test tests/crm-messenger.test.mjs`, CRM source workflow / lint и Next.js build; проверьте Supabase owner RLS, 401 unauthenticated, 403 cross-account, callback secret/HMAC. Обновите [#985](https://github.com/andylitvinov-design/books/issues/985) и `docs/crm/MESSENGER_LIVE.md` фактическими ID, тестовыми результатами и Production SHA **без секретов**.

## Где смотреть готовность

В My Practice → CRM → «Сообщения» → «Каналы» есть подсказки на русском/английском/испанском, **имена недостающих переменных (без их значений)**, адрес нужного webhook и безопасная кнопка копирования. Код различает обычный Production и пилот, ограниченный одним Telegram `chat.id`.

## Стоп-кнопка и безопасность

- **Немедленная остановка канала:** `HH_CRM_MSG_TELEGRAM_ENABLED=false` в Vercel Production + redeploy. Входящие webhook получат 401, исходящие отправки заблокируются.
- **Остановка пилота:** `HH_CRM_MSG_TELEGRAM_PILOT_ENABLED=false` + redeploy, пока общий Production Approval OFF.
- **Глобальный стоп:** `HH_CRM_MSG_PRODUCTION_APPROVED=false`; полный выпуск для всех клиентов больше не разрешён. После изменения environment variables обязательно проверьте новый активный deployment.
- Никогда не размещайте клиентские клинические данные, potency/dosage, психопрофиль, отчёты, private cabinet/session URLs и токены в этих рабочих сообщениях.

**Завершено на стороне кода ≠ подключены реальные провайдеры.** Отправка клиентам остаётся выключенной до описанного подтверждённого теста и разрешения владельца.
