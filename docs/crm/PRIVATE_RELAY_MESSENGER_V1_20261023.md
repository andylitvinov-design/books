# Holistic House — Private Relay Messenger v1.0
**Дата:** 23 October 2026 · Toronto. **Статус:** ТЗ + поэтапная реализация (проверять PR/CI и production SHA перед заявлением о запуске).

**Владелец:** Holistic House. **Код:** `andylitvinov-design/books`, интеграционная ветка `codex/public-book-library` (не default `codex/bootstrap-books`).
**Связано:** [CRM/Messages #985](https://github.com/andylitvinov-design/books/issues/985), [Master Network #715](https://github.com/andylitvinov-design/books/issues/715), [Remote Energy Support #826](https://github.com/andylitvinov-design/books/issues/826), [Telegram/WhatsApp #1302](https://github.com/andylitvinov-design/books/issues/1302).

## Продуктовое решение
Мастер и клиент ведут переписку с привязкой к **одной подтверждённой заявке на услугу**. Holistic House хранит текст внутри защищённого кабинета, направляет разрешённые нейтральные уведомления через официальный мессенджер и связывает ответы с исходным запросом. **Ни мастер, ни клиент не видят друг у друга личные телефон/email/Telegram handle/WhatsApp number** из маршрутов заявок, карточек, сообщений, уведомлений или API. Платформа-оператор при необходимости имеет отдельную ограниченную, протоколируемую зону обработки контактных данных (CRM); доступ мастера ≠ доступ оператора.

Сначала работает безопасный **in-app relay**. Внешние каналы включаются только после подтверждения связанного chat identity, отдельного opt-in, провайдерского разрешения и испытания реального устройства. **Внешний отправитель всегда официальный Holistic House**, не личный аккаунт мастера; клиенту видны название платформы и защищённая ссылка.

## Основной сценарий (сессия энергетической поддержки)
1. Клиент выбирает опубликованную услугу, фото мастера, формат, длительность 10/20/30/60 мин, слот, цену и добровольное согласие. Доступность, стоимость и запись — только из подтверждённых backend-данных; заявка ≠ бронь ≠ оплата.
2. Заявка `consultation_requests` привязывается к авторизованному account и конкретному `recipient_practitioner_id`; guest без подтверждённого аккаунта не получает автоматический приватный двусторонний чат.
3. В `My Practice → Clients` мастер видит только заявку на свою услугу, псевдоним клиента, статус, согласованную цель/слот и сообщение после удаления личных контактов; кнопка **«Написать через Holistic House»** открывает существующий защищённый диалог.
4. Мастер отправляет короткий ответ. Сервер проверяет verified session, владельца заявки, назначенного активного мастера, блокировку/статус, видимость, rate limit и operation UUID. Сообщение шифруется и коммитится в `app.practitioner_request_messages`; передача не влияет на сохранение.
5. Клиент видит ответ в `My consultations`, а при подтверждённой подписке получает **только** «Holistic House: у вас новое сообщение» + ссылку на кабинет, без полного текста или личных деталей.
6. Клиент отвечает через свой кабинет. В будущем: ответ на **конкретное уведомление** официального Telegram-бота / официальный WhatsApp канал может быть принят webhook, проверен и привязан к одной открытой заявке. Без точной однозначной привязки входящий текст не попадает к мастеру.
7. Заявка имеет отдельные статусы pending/confirmed/reschedule/completed/declined, а уведомление — queued/suppressed/provider_accepted/provider_delivered/failed; **клик, отправка формы, Bot API accepted, бронирование и оплата — разные подтверждения**.

## P0: техническая реализация без новых провайдеров
- Переиспользовать существующие `/api/app/practitioner-client-messages`, `createPractitionerClientMessages`, CRM message queue, `app.consultation_requests`, `app.practitioner_request_messages` и Telegram notification opt-in; **не создавать вторую CRM, чат или каталог**.
- Защитить master-facing сериализацию *на сервере*: `getMyPractice`, `updateMyRequest`, `listPublicServiceEnquiries` не возвращают контакты в `contact` или свободном описании. Имя — только нейтральный псевдоним, телефон/email/chat handle удаляются. Не полагаться на UI-only скрытие.
- Не допускать прямой обмен контактами через новое сообщение участника (валидация на сервере); приватные заметки мастера не отправлять клиенту; для исторических сообщений и исходных обращений применять redaction при просмотре.
- EN/RU/ES: пояснять, что общение защищённое, какие уведомления реально подключены, что внешняя доставка **не гарантирована**. Оставить адекватный fallback «Открыть переписку» даже при выключенном Telegram/WhatsApp.
- Запретить публикацию персональных контактов через поле `record_contact` в стандартном мастерском UI. Существующие encrypted CRM lead contacts принадлежат оператору платформы; их не экспортируют автоматически в кабинет мастера.
- Клиентские контакты сохранять зашифрованными для разрешённого service delivery, privacy rights и account recovery — **без раскрытия мастеру**. Не выводить подтверждение Telegram из `@username` или WhatsApp из введённого номера.
- Без массовых рассылок, внешних API-вызовов, schema changes, денег или рекламы в P0.

## P1: контролируемый Telegram reply bridge (отдельный release gate)
- Применять существующий `notification_telegram_links` с доказанным `/start` challenge, expiry/STOP и уникальным chat hash. Никогда не отождествлять user по телефону/email/username.
- После `sendMessage` фиксировать `provider_message_id`. Входящий update принимается **только** от verified Telegram webhook, в private chat, при действующем consent topic `messages`, совпадении `reply_to_message.message_id` с сохранённым исходящим уведомлением **этого же chat/account/request**, открытом request status и неповторённом provider update.
- Сервер не отправляет текст мастера в Telegram: только нейтральный сигнал и защищённый URL. Входящее сообщение по явному действию клиента фильтруется на контактные/медицинские данные, записывается зашифрованно как `client` с server-side verified binding; мастер читает в своём кабинете.
- Никогда не использовать произвольный `requestId` от клиента как достаточную авторизацию или webhooks из CRM owner Inbox, не делать auto-retry при неясном результате. Нужны отдельные idempotency/ACL SQL, integration tests и подписанный webhook fixture.
- Не подключать бота к существующим чужим webhook; использование verified shared practice bot допустимо лишь после проверки его меню, токена и маршрута. Outbound gate `HH_CLIENT_TG_SEND_APPROVED` остаётся OFF до реального тестового opt-in и согласия владельца.

## P2: WhatsApp Business reply bridge
- Только Meta WhatsApp Business Platform/Cloud API (официальный WABA/phone ID, signed webhook, approved templates). **Не** WhatsApp Web, личный `wa.me` мастера и не обход 24h service window.
- Нужны verified inbound account binding, отдельный transactional opt-in, STOP, rule для шаблонов/стоимости, quiet hours, cap и owner-approved budget. При отсутствии официального провайдера показывать «не подключено», а не «отправлено».
- Не выдавать клиенту номер мастера, мастеру номер клиента; official business sender может быть виден клиенту как контакт Holistic House.

## Privacy / security
- До каждого чтения/записи: server-side verified auth, resource owner/assigned active practitioner check и `RLS+FORCE RLS`; private/health `Client Cabinet` отдельно от `CRM Contacts`.
- Отправлять во внешние каналы **только нейтральные уведомления**; никаких результатов тестов, диагнозов, симптомов, материалов отчёта, текстов консультаций, личных ссылок/секретов. Никаких pixel/GA4/Meta событий с PII.
- Вежливое модерационное предупреждение при попытке передать номер, email, ссылку или `@handle` в portal conversation. Старые сообщения экранировать при выдаче; не утверждать идеальную фильтрацию намеренно обфусцированных контактов.
- Идемпотентность `operationId` + per-request lock; вызовы провайдера только после commit; webhook signature/nonce/replay/rate protection; scoped secrets server-only; retention/deletion, complaint/abuse escalation, audit без raw text/PII.
- При отсутствии verified channel — сообщение сохраняется в сайте, external `suppressed`/not attempted. `accepted` у API не равно delivered или read.

## Приёмка / тест-план
1. **A мастер, B другой мастер, C клиент**: C оставляет безопасную заявку A; A может прочитать/ответить; B получает 404 и не может угадать request; C видит ответ. Обратная отправка C→A, видимость master notes, блокировка после closed/withdrawn, concurrent/replayed operationId.
2. **Контакты:** email, E.164 phone, Telegram @username, `t.me/`, `wa.me/` и full URLs не появляются в master JSON/карточке/истории; API пытается сохранить прямой contact exchange — отказ. Client own account не теряет encrypted contact; owner CRM scopes не перепутаны.
3. **Mobile+locales:** EN/RU/ES, 320/390/430px, доступны кнопки/индикаторы, keyboard/focus, loading/errors, безопасные returnTo links.
4. **Telegram:** opt-in/unlink/STOP, valid webhook, invalid secret, wrong/replayed update, forbidden chat, read-back, реальные provider ID и телефон получателя; **не запускать** без owner approval и тестового аккаунта.
5. **WhatsApp:** negative provider readiness, WABA signed webhook и окно 24h в sandbox; costs OFF.
6. CI: focused tests + typecheck + lint + Next production build; PR against actual branch; Vercel READY exact SHA and domain; настоящая signed-in two-account E2E после слияния. Без подтверждённых проверок писать `BLOCKED / NOT VERIFIED`, не `DONE`.

## Rollout/rollback
Шаг 1: безопасная master-facing приватность и существующий сайт-чат (P0). Шаг 2: Telegram inbound reply feature flag OFF до E2E. Шаг 3: WhatsApp (после юридической и провайдерской проверки). Реверсивные code-only изменения без удаления существующих контактных данных; прежние записи только у платформенного оператора и в собственной учётной записи. Подключение платных провайдеров/массовых отправок требует отдельного разрешения.

**Открытые внешние блокеры:** verified Telegram chat + реальное получение/ответ, WhatsApp WABA + Meta review, физический iPhone, authenticated A/B/C E2E.