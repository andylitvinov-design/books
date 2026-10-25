# Holistic House — единая программа автоматизации, доведения функций до live и роста выручки
**Версия:** 1.0 · **Дата:** 24 октября 2026 · **Часовой пояс:** America/Toronto · **Тип:** MASTER DELIVERY PROGRAM / ТЗ / ROADMAP (не реализация)

> **Назначение документа.** Это единая координационная программа поверх уже существующих продуктовых ТЗ. Она не заменяет CRM #985, воронку #990, атрибуцию #988, уведомления #1302/#1310, email #980, маркетинг #1214, коучинг #1774 или тесты #1223 и не создаёт их дублей. Подробные схемы и нормы этих модулей остаются в связанных задачах. Разделы ниже определяют зависимости, результаты, владельцев, приёмку, деньги и последовательность работ.

## 0. Цель, границы и доказательность

**Главная цель:** сделать измеряемой и реально работающей цепочку:
посещение → бесплатная ценность (тест / профиль / разбор / курс) → явное согласие на контакт → сохранённая заявка → назначенный владелец/мастер и задача CRM → подтверждённый контакт → подтверждённая запись → подтверждённая оплата → защищённый кабинет/прогресс → повторное обращение.

**Цели:**
1. Ни одна успешно сохранённая заявка не пропадает из очереди действий мастера.
2. Ни один изменённый модуль не объявляется «готовым» только по PR, зелёной сборке или HTTP 200; LIVE_VERIFIED требует своего E2E.
3. Виден фактический путь от источника до подтверждённой оплаты и повторной покупки; конверсии не выдумываются.
4. Каждое уведомление соответствует цели и согласию; внешняя доставка не считается подтверждённой по нажатию.
5. Новые интеграции запускаются поэтапно и по умолчанию без дополнительных платных API, рекламы, массовых сообщений, автоматической публикации и изменения платёжных настроек.

**Сразу не входит в этот выпуск:** собственный второй CRM, новый маркетинговый пиксель, автоматический платный AI-коуч, собственная платёжная система, автопубликация HeyGen, массовые рассылки, запуск Ads и перенос медицинской/психологической информации в рекламные системы.

## 1. Проверенная отправная точка (снимок на 24.10.2026)

- Live URL: https://holistichouse.vercel.app; Vercel проект super10/codex-public-book-library; код: https://github.com/andylitvinov-design/books.
- Реальная production-ветка: codex/public-book-library. Default codex/bootstrap-books — другая ветка. Перед каждым PR и E2E заново проверять source SHA, READY, alias/domain и GitHub head.
- Последний прочитанный при подготовке снимок production: Vercel READY deployment dpl_5PMj3fEM12cAfPzdWPmsGHSVhcr2, SHA 56c672abc60aa61e47d0df3b07eb64dac924b37f, alias holistichouse.vercel.app. **Это исторический снимок, а не закреплённый SHA для будущих релизов.**
- Существующий POST /api/service-enquiries при успешно подтверждённом сохранении пишет зашифрованную заявку в app.public_service_enquiries и связанную карточку app.crm_contacts; UI выбирает WhatsApp/Telegram, но открытый draft / handoff не равен доставленному сообщению или брони. Источник: #985, #990, PR #1829.
- В My Practice уже есть CRM Contacts, Messages, Consent, задачи/очередь, owner-scoped API, RLS/FORCE RLS. Два реально подтверждённых аккаунта, реальная внешняя доставка, запись и оплата требуют эксплуатационной приёмки.
- Email: модуль Resend, idempotency, webhook-статусы и запреты реализованы в #980; нет доказанной production-доставки с проверенным отправляющим доменом, поэтому отправка по умолчанию OFF.
- AI Council/Telegram: owner получил реальный отчёт 24.10; в нём Gemini timeout, Mistral HTTP 429, 0/2 подтверждённых ответов этих моделей; это нельзя выдавать за полноценный мульти-AI обзор (#242).
- Growth Studio / Publer-подобная система: редакторская основа существует, реальные OAuth и unattended-публикации требуют проверки (#1214); Metricool-коннектор показывает бренд с YouTube, но не подтверждает наличие публикационного OAuth или коммерческого эффекта.
- GSC Wizard (подключённый внешний плагин) при проверке 24.10 возвращал payment_required / trial ended. Новую подписку не покупать без отдельного разрешения; вместо этого рассмотреть официальный Search Console API в рамках прав владельца.
- Runtime Vercel за 24 часа: 4 ошибки timeout при обновлении кеша публичного справочника coaching-reference; старые единичные ошибки sharp/libvips в /api/internal/housekeeping. Нужно диагностировать по текущему SHA, а не слепо считать действующим постоянным инцидентом.
- Существующие расписания ChatGPT: ежедневный тех/маркетинг аудит 12:00; идеи выручки 15:00 начиная 25.10; hourly Vercel cost monitor; ежедневная проверка скорости; ежечасное исследование тестов; PR Delivery Sweep 06:45/18:45; Portfolio Sales Audit по понедельникам; общее Brain Management управление. У этих процессов уже есть владельцы. **Не создавать вторые cron/боты/отчёты.** Проверка финального этапа Evening Delivery Closure в существующих задачах была отключена: сначала решить вопрос её восстановления/встраивания в существующий цикл, не создавать конкурирующую.

## 2. Единые определения статусов, идентификаторов и метрик

### 2.1. Строгие состояния воронки

| Событие | Что доказывает | Чего НЕ доказывает |
|---|---|---|
| visit / CTA click / wa.me или t.me handoff | переход или намерение на странице | контакт/лид/бронь/оплату |
| enquiry_saved | API подтвердил транзакцию записи заявки + владельца, есть серверный receipt | полученное внешнее сообщение |
| lead_received_verified | подтверждённое получение обращения в CRM/разрешённом провайдере; уникальный бизнес-смысл | квалификацию или оплату |
| lead_qualified | подтверждение бизнес-потребности владельцем/уполномоченным правилом | согласие на рекламу |
| follow_up_due / completed | задача создана / фактическое действие мастера | сообщение доставлено |
| booking_requested / confirmed / cancelled | запрос / независимое подтверждение расписания / отмена | оплата |
| payment_pending / confirmed / refunded | ожидание / проверенный денежный документ или receipt провайдера / возврат | успех услуги |
| course_started / lesson_completed / retest_due | сохранённый прогресс по владельцу | клинический результат |

**Ни один шаг автоматически не создаёт успех следующего.** Отсутствующие проверки обозначаются NOT_TESTED или NEEDS_VERIFICATION, провайдерный сбой — BLOCKED.

### 2.2. Дедупликация и аналитика

- Хранить стабильные ключи операции; для каждой заявки один primary receipt и только связанные CRM-объекты. Не добавлять вторую таблицу лидов, если имеющиеся сущности достаточно выразительны.
- Первичные уникальности: source_event_id / server operation ID, связанная enquiry_id, owner_id, контакт/возможность, booking_id / provider_event_id; точная схема уточняется по актуальной БД и миграциям до PR.
- Не смешивать CRM Contacts и защищённый Client Cabinet; сохранять приватные исходные ответы тестов лишь в уже авторизованном личном кабинете.
- Основные KPI: число уникальных реальных заявок; % заявок с follow-up; медианное время до первого фактического ответа; % подтверждённых записей; % подтверждённых оплат; сумма net-поступлений по валюте и периоду; повторные оплаты; стоимость расходов на канал лишь по проверенным данным. Указывать числитель, знаменатель, период, источник и статус доказательности.
- Пример: response_rate = заявки с подтверждённым ответом / все подтверждённые заявки за одинаковый период (без технических дублей). Нельзя подменять ответ созданной задачей или открытым WhatsApp draft.
- Аналитика first-party и агрегированная. Внешние GA4/Meta и персонализированные пиксели остаются на privacy hold из #988.

## 3. Программа модулей и техническое ТЗ

### M0 · Управление и восстановление цепочки доставки (P0; начать первым)

**Исполнитель:** существующие Morning Task Sweep → PR Delivery Sweep → существующий release/live-verification owner в Brain Management.  
**Цель:** один владелец выполнения задачи, один источник истины для каждого PR/issue, один terminal receipt, без конфликтующих автоматизаций.

**Реализация:**
1. Прочитать фактический список активных scheduled tasks, их last_run/errors, GitHub issues/PR, Vercel release mapping и Brain Management carryover.
2. Не включать отключённый Evening Delivery Closure автоматически; предложить безопасную реактивацию только при отсутствии другого финального owner либо встроить проверку в уже действующий процесс.
3. Связывать каждую работу одним chain_id → issue → PR → source SHA → Vercel deployment → реальный E2E → бизнес-эффект/без эффекта. Дедупликация по repo+issue+PR+сценарию.
4. Daily отчёты 12:00 и 15:00: первый — факт/ошибки/приоритеты, второй — ровно пять идей по выручке без повтора. Утренний стратегический рейтинг получает ОДИН главный actionable кандидат, не создаёт параллельную работу.
5. Telegram владельцу — один подтверждённый канал доставки через существующую Holistic House инфраструктуру. Событие provider_accepted не равно человеческому прочтению. Аудит с нулём доказательств показывает N/A, а не зелёный статус.

**Выход:** реестр задач с владельцем/доказательствами; NO_DUPLICATE_OWNER; отчёт максимум 3 приоритета и факт запуска/не запуска.

**DoD:** два последовательных цикла без дублирующих PR/оповещений; однозначный terminal-state ledger; ссылка на проверенную live-цепочку; нет дополнительных платных расходов.

### M1 · Lead Guardian — ни одна заявка не потеряна (P0)

**Основа:** существующие /api/service-enquiries, app.public_service_enquiries, app.crm_contacts, CRM follow-ups/messages/consent (#985, #990).

**Реализация:**
1. Триггер только после COMMIT исходного server-side сохранения и подтверждения валидного consent purpose. Никакого использования client-side click в качестве триггера создания лида.
2. Связать заявку с owner/assignee; выполнить идемпотентный upsert одной открытой follow-up задачи (или обновить существующую) по стабильно вычисляемому ключу; сохранять причину возникновения и audit trail.
3. SLA первого ответа — конфигурируемый срок и рабочие часы America/Toronto, а не угаданные часы; при просрочке создать нейтральное уведомление владельцу и эскалацию внутри My Practice, но не писать клиенту без разрешения.
4. Счётчики: new, awaiting_response, today, overdue, closed; отделять «отправил ответ в CRM» от «провайдер принял» и «доставлено».
5. Не полагаться на бесконечный polling. Предпочесть существующий transactional event/outbox с bounded retry, дедупликацией и server-only worker; при недоступности интеграции сохранить задачу и видимую причину сбоя.
6. Если нет согласия или пользователь отменил заявку — не инициировать внешний contact; STOP/opt-out должны блокировать автоматическую доставку.
7. Обобщённые owner-alerts допустимы, но без email/телефона, текстов обращения, тестовых баллов, данных здоровья в Telegram/push.

**E2E:** согласованная синтетическая заявка EN/RU/ES на iPhone/desktop → реальный backend receipt → одна CRM contact/enquiry → одна task → статус overdue → выполнен follow-up → повторный POST того же operation ID ничего не удваивает. Negative: без согласия, rate-limit, чужой owner, второй аккаунт, отсутствующая БД, повтор webhook.

**DoD:** 100% набора контролируемых синтетических тестовых обращений появляется в правильной CRM; 0 дублей в replay/concurrency тестах; внешний статус правдив.

### M2 · Release Proof — ни один PR не «готов» без результата (P0)

**Основа:** существующий PR Delivery Sweep, технические тесты и Vercel проект; **не новый независимый cron**.

**Реализация:**
1. При merge/обновлении production (webhook или периодический реестр) определить точную canonical branch и deployed git SHA, READY, aliases, URL и CI, сверить GitHub PR/file diff.
2. По области изменения выбрать соответствующий regression pack; не прогонять все тяжёлые suites каждый час. Перечень: главная EN/RU/ES, Profile→3 tests→Google sign-in→save/relogin, Coaching free + auth, Courses, Pro master CTA, Holistic Support, Practice CRM, video click-to-play, booking/payment только в безопасном тестовом режиме.
3. Playwright Chromium/WebKit с синтетическими аккаунтами, проверяемыми UI действиями, сетевыми ответами, сохранением и logout/relogin; 320, 375, 390, 430 px + desktop; aria/focus/keyboard/reduced-motion.
4. Контроль RLS: клиент A, мастер A, чужой мастер B, anon; ожидаемые 401/403/404 и отсутствие приватной выдачи. Не использовать реальных клиентских записей.
5. Выпуск помечать LIVE_VERIFIED только при: правильный SHA/alias + нет P0 регрессии + user-action E2E + provider receipt (если требуется). Иначе MERGED_WAITING_DEPLOY / NEEDS_VERIFICATION / BLOCKED_BY_OWNER.
6. При подтверждённой безопасной проблеме открывать/обновлять **один** предметный PR и выполнять исправление по уже одобренной политике безопасного merge; для финансовых, секретных, RLS-destructive изменений — review и отдельное согласие.
7. Runtime exceptions с группировкой по SHA/route/cause. На старте исследовать coaching cache DB connection timeout и sharp/libvips housekeeping. Сначала действующая версия и частота; фикс с тестом корня, а не cosmetic retry.

**DoD:** для одного реального целевого обновления есть цепочка issue→PR→checks→deployment/SHA/alias→результат Chromium/WebKit/mobile/auth E2E; ложные «зелёные» статусы исключены; нет дополнительных deployments только ради проверок.

### M3 · Booking ↔ Google Calendar ↔ CRM (P1)

**Основа:** будущая стадия CRM #985/#990, подключённый владельцем Google Calendar; подключение ChatGPT Calendar **не означает**, что сайт уже имеет OAuth/авторизацию.

**Реализация:**
- Минимальные scopes OAuth по подтверждённому Google-аккаунту мастера; server-side токены, отзыв доступа, bounded retries.
- Чтение free/busy и time zone America/Toronto с DST; буфер, длительность и подтверждённые расценки €50/30 мин и €100/60 мин для услуг Andrey, дополнительные услуги — только после верификации.
- Статусы requested → offered → held (с TTL) → confirmed → cancelled/rescheduled; атомарная защита от двойной записи; временная hold ≠ окончательная бронь.
- Только после подтверждения создаётся/обновляется событие Calendar и связанный CRM booking; event ID + request ID с dedupe. Отмена/перенос синхронизируются в обе стороны с журналом конфликтов.
- Нейтральные письма/уведомления лишь по соответствующему согласию; не переносить в calendar description личные тесты, диагнозы, медицинские сведения.

**E2E:** две конкурентные записи на один слот; подтверждение и перенос через DST; revoke OAuth; чужой мастер; повтор webhook.  
**DoD:** одна подтверждённая запись ↔ одно календарное событие ↔ одна CRM-сущность, отмена корректна; реальный Calendar readback, не mock.

### M4 · Payment Evidence — подтверждённая оплата (P1)

**Основа:** #990/#988; нет оснований предполагать доступность Stripe/PayPal Business или Stripe Connect. Владелец использует доступные варианты по отдельной проверке, например подтверждённый Square или Wise, без подразумеваемой публичной интеграции.

**Реализация:**
- Сначала проверить доступность законного выбранного provider/типа аккаунта, валют, комиссии, KYC, возможных invoice/payment links, API и webhooks. Никаких платных подключений по умолчанию.
- Статусы quote_requested, invoice_sent, payment_pending, payment_confirmed, refunded/disputed. Лишь подписанный provider webhook либо подтверждённая владельцем бухгалтерская операция в разрешённом интерфейсе является payment_confirmed.
- В CRM связать transaction с конкретной бронью/курсoм/услугой, owner, валютой, net/gross, provider ID; идемпотентность, refund и audit.
- Если доступна лишь ручная оплата, показать «Ожидает подтверждения» и owner-only проверку квитанции; никогда не считать скриншот клиента без верификации оплатой.
- Автопереход курса/доступа после payment_confirmed лишь при проверенном правилe entitlement и отсутствии возврата.

**E2E:** успешный verified sandbox/provider receipt, pending, failed, double webhook, refund, mismatch amount/currency, чужой доступ.  
**DoD:** verified paid order связан с корректным CRM booking/course; zero false positives; provider link работает только после согласования.

### M5 · Client Continuity — сохранение результата и удержание (P1)

**Основа:** existing My Tests, My Profile, Insights, My Development Path, My Courses, Coaching; #338/#1298/#1774/#1302/#1310/#1223.

**Реализация:**
- Маршрут Profile → добровольные тесты → сохранённый private result → предложение 14-day/90-day курса → сохранённое занятие/ответ → следующий маленький шаг. Для гостя — прозрачная возможность войти через Google ДО гарантированного сохранения.
- После первого ознакомления коучинг должен быть writing-first: мягкий последовательный открытый вопрос, возможность голосового ответа с осознанным согласием, редактирование расшифровки перед приватным сохранением. Генеративный AI-провайдер и стоимость — отдельная стадия, не через личную подписку ChatGPT как API.
- Напоминания о дне программы и retest лишь opt-in, раздельно для in-app/email/push/Telegram/WhatsApp. Дата по зоне аккаунта, тихие часы, частотный потолок, STOP.
- Курс отмечать завершённым лишь по сохранённому user-approved progress, без подмены прокси событиями открытия экрана.
- Оригинальные опросники не рекламировать как клинически валидированные до независимой оценки (#1223). Нет диагноза, назначения или гарантий от гомеопатии.
- Предлагать подходящую оплачиваемую помощь без манипуляций страхом, раскрытия чувствительных сведений в CRM и без автоматической рассылки результатов.

**E2E:** гостевой и Google аккаунт, прерванный тест, возврат после login, запрет чужого результата, 14-day retest, opt-out, голос mic deny и транскрипция на мобильном (после отдельной готовности).  
**DoD:** прогресс воспроизводим после logout/relogin; одного уведомления достаточно; нет утечек в provider.

### M6 · Resend transactional email (P1, зависимость от владельца)

**Основа:** реализованный CRM email #980; не переписывать адаптер.

- Получить контролируемый домен и адрес отправителя, верифицировать SPF/DKIM и аккаунт Resend; добавить production секреты только в Vercel. Ничего не выводить в GitHub, задачи или чат.
- Подключить подписанный webhook к существующему CRM email endpoint; состояния accepted/delivered/bounced/complained/suppressed; подписка/отписка CASL, purpose и sender contact metadata.
- Провести единичный разрешённый email на адрес владельца с подтверждённым opt-in; подписанный delivery receipt → CRM, negative bounce/STOP/double/replay; только затем включить флаги одобренных операций.
- Отдельный marketing opt-in от customer-service; массовая отправка запрещена без нового одобрения.

**DoD:** verified sender, реальный единичный полученный email, подписанный webhook, совпадающий статус CRM, unsubscribe и отсутствие дублей.

### M7 · Organic SEO & attribution без лишней подписки (P1)

**Основа:** #988/#306/#323 и существующий GA4 privacy hold.

- Не оплачивать GSC Wizard, пока доступна прямая интеграция Google Search Console API с правами владельца; проверить verification/consent и квоты. При отсутствии доступа — NOT_AVAILABLE, не выдавать нулевой трафик.
- Еженедельно сводить verified Google Search Console clicks/impressions/pages/queries с безопасным first-party агрегатом реальных заявок и оплат, без попытки индивидуально раскрывать личность посетителей.
- Приоритет landing SEO: услуги Andrey, бесплатный разбор и профиль, Business, Reiki Master, консультации; hreflang EN/RU/ES, canonical, sitemap, schema, mobile speed; используем имеющиеся SEO-процессы, а не второй аудит.
- Источник/UTM сохранять только при допустимом правовом основании; не отправлять результаты тестов, health или приватные профили в рекламные системы.

**DoD:** один источник даёт реальные данные с датами и scope, вторым подтверждены first-party бизнес-события; no invented ROI/ROAS.

### M8 · Growth Studio / Metricool / YouTube → измеримый спрос (P2)

**Основа:** #1214, #623 и HeyGen SOP #218/#219 (ai-projects-brain).

- Существующий Growth Studio становится редакторским реестром: идея → сценарий → фактическая стоимость → ручное утверждение → asset QA → согласованная публикация → campaign ID → лиды/продажи с допустимой атрибуцией.
- Чтение статистики через доступный Metricool/YouTube, проверка реального OAuth и API rights; не заявлять автопубликацию по факту наличия брендового профиля.
- Проверять, что видео сайта проигрывается после явного нажатия; один оригинальный YouTube для нескольких подходящих лендингов без копирования asset.
- HeyGen: только частный верифицированный Digital Twin Andrey, утверждённый голос EN/RU/ES, 1080p; draft ≠ render; render лишь по прямому разрешению; публикация лишь после QA lip-sync/голоса/кадра и отдельного одобрения. Private видео НЕ YouTube.
- Для каждой публикации оценивать не просмотры сами по себе, а подтверждённый спрос и связанные оплату/обращения; без обещания причинной атрибуции при неполных данных.

**DoD:** asset → ручной publish receipt → доступный аналитический отчёт → привязанный first-party исход без дублирующих событий.

### M9 · AI Council / Gemini / Mistral — надёжность, а не количество отчётов (P2)

**Основа:** ai-projects-brain #242, существующий серверный Telegram и owner-only admin.

- Сначала устранить реальную проблему timeout/429 бесплатных моделей в пределах уже утверждённых лимитов или честно считать их unavailable. Никаких повторов, обходящих provider quota, и платных fallback без согласия.
- В каждой дневной сводке атрибуция: ChatGPT audit, Gemini result, Mistral result, model-specific error, дата и проверенная ссылка. Не выдавать HTML deterministic scan за ответ модели.
- Telegram доставку подтверждать отдельно: queued, provider accepted, файл действительно получил владелец, если это проверено; дедупликация один owner report/day.
- AI предложения передавать в существующий стратегический рейтинг и текущие issues, не плодить однотипные PR. Никогда не отправлять частные данные клиентов публичным или бесплатным AI моделям.

**DoD:** статус каждого модельного запроса правдив и воспроизводим; no false 2/2, no duplicate Telegram, zero unapproved spend.

## 4. Сквозные нефункциональные требования

**Приватность и права:** server-side auth, проверка owner/assignee, Supabase RLS/FORCE RLS, запрет anon/auth на service-only таблицы, журнал согласий, purpose-specific opt-in/STOP. Контакты CRM отделены от приватных клиентских профилей. Email/Telegram/WhatsApp/SMS/push содержат только нейтральный текст + защищённую ссылку, не результаты тестов, диагнозы, здоровье или личные переписки. Серверная верификация провайдерных webhook (signature, timestamp/replay, rate limit), encryption of tokens, audit, bounded retry. Не обходить privacy hold GA4/Meta; отдельно проверить CASL/политику приватности, не заявляя автоматически юридическую сертификацию.

**Дизайн и iPhone:** EN основной, RU/ES полные зеркала; 320–430px без горизонтального скролла и залезающих кнопок, не более одного главного действия на экран; настоящие loading/error/empty states, VoiceOver/keyboard labels, минимум 44px touch targets где практически применимо, prefers-reduced-motion.

**Экономика:** новые платные API, SMS, видео-рендеры, рекламные бюджеты, домены, аккаунты и массовые сообщения требуют отдельного согласования. Реиспользовать текущие Vercel/Supabase/Metricool/Drive/GitHub инструменты и не делать повторный deployment ради метрики. Для расчётов указывать реальные валюты и курсы конверсии только после подтверждения источника.

**Наблюдаемость:** correlation ID → issue/PR SHA → backend receipt → DB record → provider status; без PII в логах. Ошибки разбирать по маршруту, релизу, частоте и исходному исключению. При источнике без данных показывать NOT_AVAILABLE.

## 5. Последовательность внедрения (ориентиры, НЕ обещание дат)

| Этап | Приоритет и предполагаемое окно | Результат / gate | Зависимости |
|---|---|---|---|
| G0: базовая верификация | P0, старт / 1–3 дня | actual branch/deployment/SHA, доступные тестовые роли, аудит расписаний, инциденты DB/sharp, baseline метрик | read-only доступ GitHub/Vercel/Supabase |
| G1: Lead Guardian | P0, неделя 1–2 | E2E заявка → одна запись CRM → одна task → follow-up и отсутствие дублей | #985/#990, синтетические роли, consent |
| G2: Release Proof | P0, параллельно G1 | 1 пилотный PR от changes до LIVE_VERIFIED с мобильным/auth proof; false success закрыт | существующий PR sweep, test fixture |
| G3: email + booking | P1, неделя 3–4 | единичный verified email; реальная бронь ↔ CRM ↔ Calendar | домен Resend, Google OAuth, owner approval |
| G4: paid evidence + retention | P1, неделя 4–5 | реальный допустимый payment status и course resume / opt-in reminder | выбранный provider, #988, #1302 |
| G5: SEO + content + AI Council | P2, неделя 5–6+ | один проверенный канал organic/content→lead→sale; truthful AI reviewer statuses | GSC rights, Metricool OAuth, #1214/#242 |

После каждого gate: зафиксировать исходное значение/деноминатор, результат, релиз, точные ссылки, нерешённые зависимости. Если зависимость не готова — не маскировать её следующим этапом.

## 6. Приёмочная матрица: end-to-end сценарии

| ID | Сценарий | Ожидаемое доказательство |
|---|---|---|
| A01 | Guest EN/RU/ES → free assessment → consent enquiry | 1 backend receipt, 1 owner-scoped CRM lead и task; без consent нет внешней отправки |
| A02 | Двойной tap/retry того же operation ID | 1 enquiry, 1 follow-up, 0 double-send |
| A03 | Client A / Master A / Master B | A и назначенный мастер видят только свои данные; B и anon ничего приватного |
| A04 | Google Login → tests → saved profile → logout/login | те же результаты и прогресс владельца; чужая сессия получает отказ |
| A05 | Open-answer coaching → save/restore/export | реальные stage transitions, приватная запись, no leaked content |
| A06 | Course → completed lesson → day-14 retest | консистентный versioned score/progress, уведомления только opt-in |
| A07 | CRM reply → external email | только после verified sender; provider delivered != merely accepted; STOP работает |
| A08 | Booking competing slots / timezone / reschedule | ноль двойных подтверждений; Calendar и CRM равны; DST корректен |
| A09 | Invoice/pay pending/paid/refund | signed provider/business verified receipt; цена/валюта и entitlement совпадают |
| A10 | Release after PR/CI | verified canonical READY SHA, alias, browser action, auth/RLS, mobile, runtime |
| A11 | Public video click + reused YouTube master | реальный click-to-play и правильный approved asset, no autoplay/render |
| A12 | AI Council free model timeout/429 | явная ошибка, нет выдуманного ответа и повторной owner-рассылки |

Проверки выполняются с разрешёнными тестовыми аккаунтами, синтетическими данными и ограниченными provider-side тестами. Любое недоступное внешнее E2E явно отражается в отчёте.

## 7. Рабочие соглашения / artefacts

- **Продуктовый главный приоритет:** https://github.com/andylitvinov-design/books/issues/990.
- **CRM, согласия, сообщения:** https://github.com/andylitvinov-design/books/issues/985 и действующая спецификация docs/crm/CRM_V6_2_LEAD_TRIAGE_20261020.md; Google Docs https://docs.google.com/document/d/1cuW1vaQrxUECQWk9b5kDvO1fRcHnbalTDOq8BppZZT8/edit.
- **Атрибуция:** https://github.com/andylitvinov-design/books/issues/988.
- **Email:** https://github.com/andylitvinov-design/books/issues/980.
- **Клиентские уведомления:** https://github.com/andylitvinov-design/books/issues/1302; native push https://github.com/andylitvinov-design/books/issues/1310.
- **Коучинг/90-day:** https://github.com/andylitvinov-design/books/issues/1774 и https://github.com/andylitvinov-design/books/issues/1298.
- **Методики:** https://github.com/andylitvinov-design/books/issues/1223.
- **Контент:** https://github.com/andylitvinov-design/books/issues/1214; YouTube OAuth https://github.com/andylitvinov-design/books/issues/623; HeyGen SOP https://github.com/andylitvinov-design/ai-projects-brain/issues/219.
- **SEO, рекламу и privacy hold:** https://github.com/andylitvinov-design/books/issues/306; https://github.com/andylitvinov-design/books/issues/323; https://github.com/andylitvinov-design/books/issues/371; https://github.com/andylitvinov-design/books/issues/988.
- **AI Council / Telegram:** https://github.com/andylitvinov-design/ai-projects-brain/issues/242.
- **Операционный контроль:** существующие Morning Task Sweep, Daily Strategic Priorities, PR Delivery Sweep, Portfolio Sales Audit, Holistic House аудит 12:00, идеи 15:00, Vercel hourly и Brain Management. Не менять расписания без отдельного решения.

**Форма приёмки каждого отдельного PR:** problem → before evidence → exact changed modules → tests (test/lint/typecheck/build) → GitHub CI URL/status → merge SHA → Vercel READY ID/SHA/domain → реальные E2E со скриншотом/серверным receipt (без PII) → actual metric effects → risk/rollback → issue update. Если разрешённый тест не проведён, точная пометка NOT_TESTED/NEEDS_VERIFICATION. PR MERGED не равно LIVE.

## 8. Решения, которые реально нужны владельцу (максимум 3)

1. **Авторизованная эксплуатационная проверка:** использовать два разрешённых тестовых аккаунта (клиент и мастер) и физический iPhone для сценариев Google login/CRM/кнопки/уведомления. Не присылать пароли или клиентские данные; OAuth и устройство подключаются через официальные UI.
2. **Официальная email-доставка:** указать домен, которым владелец управляет, и выполнить верификацию отправителя Resend в https://resend.com/domains; секреты вносить только через Vercel production settings. До этого флаги отправки OFF.
3. **Запись и оплата:** выбрать разрешённую модель записи через Google Calendar и действительно доступный платёжный provider (или ручное подтверждение), подтвердить допустимые операции; никаких автоматических списаний, аккаунтов или рекламных расходов без отдельного решения.

## 9. Правило последующего развития

Сначала G0–G2 и один реальный оплаченный путь, затем расширять канал email/Calendar/payment, затем content/SEO/AI. Идеи из ежедневного отчёта 15:00 попадают в существующий #990 или соответствующий issue только если есть конкретная гипотеза дохода, измеритель, владелец и чёткий next step. Не делать новые универсальные боты, новые зеркальные CRM, новые отчёты без проверенного устранения старого bottleneck.

**Статус документа на 24.10.2026:** ТЗ и план сформулированы; никакие описанные новые продуктовые автоматизации, платежи, внешние рассылки, OAuth или live E2E не считаются выполненными только из-за наличия этого файла.