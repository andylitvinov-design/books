# Holistic House — Reverse Engineering / Benchmark-to-Product Program v1.0
**Рабочая программа и исполнимое ТЗ · 25.10.2026 · владелец продукта: Andrey Litvinov**  
**Статус:** DESIGN + IMPLEMENTATION STARTED (G0/G1), не подтверждение E2E, оплаты или внедрения на live.  
**Управляющая задача:** [books #2058](https://github.com/andylitvinov-design/books/issues/2058)  
**Стратегия дохода и бенчмаркинга:** [Google Doc, 25.10.2026](https://docs.google.com/document/d/1lQ-ZqH7Y0mytbUg_bo-Bm9DpGE1_3_Z8H2Geqadg9Gk/edit)  
**Код:** [andylitvinov-design/books](https://github.com/andylitvinov-design/books), production branch `codex/public-book-library` (default `codex/bootstrap-books` — другая ветка), Vercel project `super10/codex-public-book-library`, live alias https://holistichouse.vercel.app. Любой release проверяется заново по точному SHA.

## 0. Управленческое решение и неизменяемые ограничения
### 0.1. Что мы делаем
Мы **не клонируем чужие приложения**. Мы исследуем публично наблюдаемые продуктовые задачи, последовательности экранов, безопасные UX-паттерны и официальные описания функций; создаём собственные требования, компоненты и тесты в существующей платформе Holistic House. Цикл: `исследование → доказательство → формализация функциональности → gap-check текущего кода → маленький PR → тесты → реальный E2E → корректные метрики`.

**Первая экономическая цель:** превратить действующий бесплатный вход и страницы личных услуг в проверяемую цепочку `сохранённая заявка → квалификация → согласование → платёж у провайдера → оказанная услуга`. Полезный бесплатный путь остаётся самодостаточным. Цена реальных услуг Andrey: €50/30 мин; €100/60 мин. Пакет €200/месяц — только на согласованных условиях; он не равен автоматическому подписочному платежу.

**Вторая цель:** улучшить retention и платные цифровые продукты в уже существующих My Tests, My Courses, My Development Path, Insights/Reports, Holistic Support и My Practice, не создавая дублирующую LMS/CRM/checkout.

### 0.2. Что запрещено
- Переносить чужой исходный код, JS-бандлы, изображения, копирайт, тексты опросников, бренд, пиктограммы, лицензируемые шрифты, приватные данные, закрытые API, логины, чужие видеозаписи или фирменные элементы. **Clean-room:** инженер сначала получает только функциональную спецификацию; исходные материалы конкурента остаются в закрытой исследовательской зоне.
- Обходить paywall, CAPTCHA, DRM, авторизацию, ограничения доступа, rate limits, robots.txt или ToS; не создавать ложные учётные записи и не тестировать платные чужие продукты без разрешённого доступа.
- Устанавливать REA/Remaster без проверки источника, версий, лицензии, зависимостей и запуска в isolated sandbox. Никаких production-ключей в инструментах исследования. Никакого автоматического `npx -y latest` или автообновления без проверки.
- Копировать медицинские утверждения, proprietary scoring, материалы тестов, собирать чужие пользовательские профили; выдавать психометрические/клинические результаты за доказанные.
- Включать GA4/Meta/pixel в обход privacy hold, создавать платные API-вызовы, рекламы, массовые рассылки, видео HeyGen или реальные оплаты без необходимых допусков.
- Передавать результаты тестов, приватные заметки или сведения о здоровье в рекламу, мессенджеры, push, SMS, UTM, referrer, видео или репозитории. Внешние уведомления — нейтральные ссылки в защищённый кабинет.

### 0.3. Источники истины и текущие модули
| Область | Существующий источник | Сохранить |
|---|---|---|
| Продажи, лиды и конверсия | [#990](https://github.com/andylitvinov-design/books/issues/990), [#988](https://github.com/andylitvinov-design/books/issues/988); `components/compact-lead-capture.tsx`, `app/api/service-enquiries/route.js` | CRM insert только после согласия, корректный server receipt, идемпотентность, не считать клик лидом |
| CRM и сообщения | [#985](https://github.com/andylitvinov-design/books/issues/985), `docs/crm/CRM_DEVELOPMENT_PROGRAM_V5_1_20261020.md`, `app/api/app/practitioner-client-messages/route.js` | owner/request scope, RLS, нейтральные notifications; CRM Contact ≠ закрытая карточка клиента |
| Бесплатный вход | `components/free-entry-landing.tsx`, `components/free-situation-review-form.tsx`, `components/home-conversation-guide.tsx` | текущие EN/RU/ES, реальная ценность бесплатно, частная анкета только в защищённом контуре |
| Тесты | [#1223](https://github.com/andylitvinov-design/books/issues/1223), `docs/assessments/HH-ASSESSMENT-QUALITY-ROADMAP-AND-TZ-2026-10-20.md` | версии методик, ограничения валидности, никакого импорта чужих вопросов |
| Личные услуги/месячный план | [#1716](https://github.com/andylitvinov-design/books/issues/1716), `app/[locale]/services/` | договорённости, подтверждённая оплата, отсутствие ложной брони |
| Digital products | [#1519](https://github.com/andylitvinov-design/books/issues/1519) | сущности Course Engine и entitlements |
| Курсы/коучинг | [#1298](https://github.com/andylitvinov-design/books/issues/1298), `components/app/`, `lib/inner-growth/` | текущую паузу набора 90-дневного курса не снимать без решения |
| Медиа и медитации | `app/[locale]/holistic-support/`, `data/academy/holistic-support-meditations.ts`, [ai-projects-brain #218](https://github.com/andylitvinov-design/ai-projects-brain/issues/218) и [#219](https://github.com/andylitvinov-design/ai-projects-brain/issues/219) | утверждённые права, lazy video без autoplay; приватное не YouTube |
| Платежи | `app/api/payments/square/*`, `app/api/billing/paypal/*`, `lib/commerce/*` | не делать фиктивный checkout; проверить provider id/status/webhook, валюта, юридический аккаунт |

Реальное состояние каждой функции и комментарии issue заново проверять до кода; этот список **не означает, что каждая интеграция live/E2E исправна**.

## 1. Выбор и безопасное использование технологии
### 1.1. Remaster — основной инструментарий UX
Источник: https://github.com/thenavidm/remaster. Официально описан режим `feature` для добавления одной функции в уже существующий продукт, плюс `measure/interact/design/sweep/parity`. **Использование:** описать только публичный сценарий, измерить расположение/видимость/переходы, оставить от конкурента только функциональный flow, построить HH-версию в существующих модулях. Скриншоты, наблюдения и review snippets — локально в некоммитимом каталоге. Код/копирайт/ассеты не переносить.

### 1.2. REA — только при доказанной необходимости
Источник: https://github.com/morluto/rea. REA умеет анализировать JS и бинарные артефакты. Для обычных публичных экранов **не нужен** и повышает риски интеллектуальной собственности, безопасности и supply chain. Возможное применимое поле: диагностика собственного опубликованного JavaScript/пакета или явно лицензированного артефакта, когда исходники недоступны. Перед каждым запуском: объект, права, конкретный технический вопрос, зафиксированная версия, одобренная песочница, запрет извлечения секретов.

### 1.3. Контролируемая цепочка установки (только sandbox)
1. Получить официальный URL/Git SHA/npm tarball и pinned checksum, лицензию, SECURITY.md, release notes, аудит опубликованных scripts и зависимостей. Для Remaster первоначальный кандидат — только точная проверенная версия, **не** `latest` в production.
2. Проверить разрешения процесса, исходящие домены, scripts install, возможность отключить telemetry, filesystem access, процессную изоляцию, путь загрузок, права GitHub и npm. Threat model: supply-chain, prompt injection через страницы, непреднамеренный доступ к localStorage/cookies/аккаунтам.
3. Создать временный sandbox без `.env`, без Supabase/HeyGen/Vercel/Stripe/Square/PayPal токенов, без SSH agent, с недоверенной браузерной сессией без пользовательских cookies. Записать версию Node, OS, pinned package hashes; ограничить egress только разрешёнными host'ами.
4. Установить, выполнить `--help`/`status` и dry-run; проверить созданные файлы, доступы, запросы, размер хранения и удаление. Не разрешать чужому содержимому запуск shell/coding action.
5. Первый benchmark — только **публичная документация** и ручное отображение анонимных страниц; если страница ограничивает браузер, остановиться, не обходить защиту.
6. Лишь после G0 перейти к одному Remaster `feature`. Никаких автоматических вставок стороннего кода в HH.

На момент создания этого ТЗ установка/запуск третьего ПО **не подтверждены**; без Mac/browser sandbox G0/G1 имеют статус PARTIAL/BLOCKED. Приложенные JSON/скрипт — безсетевой baseline и формализованная очередь, **не результаты замера UX конкурентов**.

## 2. Конкурентная матрица и ответные сценарии HH
Вход для первых проб: 9 компаний, выбранных в действующей стратегии. Официальные справочные страницы — начальный источник, не гарантия того, как работает текущий UI. Каждый «перенимаемый» элемент должен пройти реальный anonymous-flow walkthrough отдельно.

| Конкурент | Функциональная гипотеза для исследования | Целевой модуль HH | Порядок |
|---|---|---|---|
| Practice Better | клиентский путь от запроса до защищённой переписки и состояния сессии | CRM/My Practice/messages/checkout | P0 (после доступа к тестовым аккаунтам) |
| Truity / 16Personalities | первая ценность от теста и ясный следующий шаг | My Tests → Reports → optional CTA | P0 |
| Kajabi | прозрачная покупка → access entitlement | действующая корзина / My Courses | P0 (зависит от платёжного E2E) |
| Mindvalley | «Сегодня»: продолжить начатое / next step | existing cabinet / My Courses | P1 |
| Headspace | быстрый выбор темы и одной доступной практики | Holistic Support | P1 |
| Daylio | добровольный короткий check-in и честная динамика | My Tests / Insights | P1 |
| Insight Timer | каталог авторских аудио/видео по языку, длительности и теме | Holistic Support / страницы мастеров | P1 |
| Duolingo | краткое одно действие за раз и сохранение прогресса | My Courses / ОПОРА / Reiki | P2 |
| Calm / Fabulous | атмосфера/регулярность коротких практик | существующие курсы/медиа | P2 |

### 2.1. Карточка каждого образца — обязательные поля
`competitor_id`, официальный `source_url` с датой доступа, право/тип доступа, исследуемый `user_job`, anonymous screen sequence, доступные состояния (`empty/loading/error/success/back/retry`), число шагов, основные CTA, mobile screenshots **в закрытой research-папке**, A11y observations, важные ограничения, «не копировать», user pains (с точной ссылкой), измеренные метрики vs гипотезы, `target_existing_module`, gap matrix, estimate, owner approval, engineer review и release evidence.

Копирование всегда `functional intent only`. Степень доказательств: `docs_only` → `anonymous_ui_observed` → `hh_implemented` → `hh_browser_tested` → `hh_provider_verified`; нельзя перескакивать ступени. Декларации конкурентов ≠ измерения конверсии.

### 2.2. Приоритизация
Использовать нормированную ordinal-оценку `impact, confidence, reversibility, effort, risk` от 1 до 5; score `(impact × confidence × reversibility)/(effort × risk)` — **инженерная сортировка, не прогноз продаж**. P0 всегда определяется бизнес-блокером verified enquiries/payments, даже если визуальная мелочь получает больший балл. Оценка пересматривается после просмотра реального public flow, исключения дублей в коде, юридического gate и наличия E2E.

## 3. ТЗ пилота №1 — тест/бесплатный разбор → безопасный запрос
**Объект:** существующие `/en|ru|es/tests`, `/en|ru|es/services/free-situation-review`, guest assessment result и `/api/service-enquiries`. **Основная гипотеза:** помощь в выборе следующего добровольного шага на 1 экране + короткая проверяемая форма лучше, чем общая навигация и неясный статус контакта. Нет утверждения о фактической конверсии до измерения.

### Функциональные требования FR-01…FR-12
- **FR-01** Гость может начать бесплатный тест/письменный разбор без принудительной оплаты/создания платного профиля. Сохранение результата и protected материалов — по явному действию.
- **FR-02** Первый экран мобильного (320–430 px) объясняет одним заголовком пользу, формат (письменный, а не бесплатная видеовстреча), для кого, срок без неподтверждённой гарантии; одно главное действие; реальное Andrey фото/одобренный ролик с poster/Play.
- **FR-03** Результат теста содержит понятную интерпретацию конкретного инструмента и добровольные варианты: продолжить бесплатно, посмотреть подходящую существующую практику, обратиться за письменным разбором или заказать личную сессию; **без рекламного таргетинга на private scores**.
- **FR-04** CTA прямой платной сессии не заставляет проходить бесплатный тест. Раздельно `€50/30 min` и `€100/60 min`, если это действующий тариф Andrey; чужие предложения не перетарифицировать.
- **FR-05** Форма **встроена в исходную страницу/раскрывается на ней**, а не модальное окно и не переход на другой лендинг. Использовать существующие `CompactLeadCapture` / `ContactChannelChooser` по действующему UX.
- **FR-06** Запрашивать минимальный контакт: валидный E.164 с `+` либо email там, где это разрешено, отдельный opt-in только на ответ по конкретному запросу; запрет health details в форме и URL.
- **FR-07** POST только same-origin; серверный rate limit; UUID operationId, idempotent replay, 409 conflict; encryption/contact privacy; backend возвращает `saved:true + referenceCode` только после атомарной записи; при 429/503 не считать лид созданным.
- **FR-08** Мессенджер открывается только **после** подтверждённого CRM receipt. Передаётся нейтральная тема/номер заявки, без телефона, email, private answers или медицинских сведений. Если handoff не открылся, номер заявки остаётся и появляется fallback.
- **FR-09** Два разных состояния: `contact_saved` ≠ `message_delivered`; `enquiry_requested` ≠ `booking_confirmed`; `payment_requested` ≠ `payment_verified`. Текст UI отражает только подтверждённый этап.
- **FR-10** В CRM один contact per allowed identity without overwrite suppressed contacts, один enquiry на operationId; CRM Contact и private client case различаются, права проверяются сервером.
- **FR-11** EN основная, RU/ES параллельные; 320, 360, 375, 390, 430 и desktop; visible focus, button 44 px, no horizontal overflow, reduced motion.
- **FR-12** Контекстный CTA разрешает дальнейший путь в существующие My Courses/My Development Path/My Practice; не создавать параллельный модуль «персональные рекомендации».

### Проверка G2
**Исследование конкурента:** официальные страницы + письменная картография доступного anonymous flow, без попытки получить premium ответы или scoring.  
**Изменение HH:** один небольшой PR, воспроизводимый before/after UX с screenshots; каждый изменённый элемент связан с row в reference-matrix; не более одного нового состояния/эксперимента за раз.  
**Приёмка:** см. матрицу тестирования в `7`, в том числе реальный server-confirmed CRM readback с тестовым согласием. Нельзя выдавать синтетический POST за подтверждённую доставку мастеру.

## 4. ТЗ пилота №2 — Practice Better/Kajabi patterns в действующей коммерции
- **FR-13** `contacted / qualified / time_agreed / payment_pending / payment_verified / in_progress / completed` — явные состояния существующих доменных сущностей с actor, timestamp, immutable ref; не выдумывать новые endpoints, сверить реально существующие.
- **FR-14** Мастер видит очередь заявок и unread сообщения в `/ru/app/practice?panel=clients`. Ответ и отметка просмотра сохраняются; чужая практика не видна. Не объединять public lead и private client notes без разрешения.
- **FR-15** При платном заказе показывать точную цену, валюту, полную сумму, условия переноса/возврата; предложение €200/месяц без автоматического продления и без обещания бесконечной переписки.
- **FR-16** Square/PayPal подключать только при реально разрешённом merchant-пути. Provider server readback/webhook confirmation перед `paid`; повторный callback не выдаёт второй entitlement. Нет доступного провайдера → честный `Request`, не фиктивная оплата.
- **FR-17** После verified payment открыть именно нужный продукт/курс/сессию в уже существующем кабинете; проверка owner/account scoping, logout/expiration, refunds/revocation.
- **FR-18** Внешние SMS/Telegram/WhatsApp/push/email содержат только нейтральные уведомления и protected link; opt-in/STOP и фактическое подтверждение у провайдера до DONE.

**Gate G3:** настоящее внешнее подтверждение оплаты/получения сообщения (или BLOCKED с точным артефактом), E2E 2 аккаунта + отдельный чужой мастер, audit log, идемпотентные webhook, mobile.

## 5. P1–P2 backlog по лучшим паттернам
- **FR-19 / Mindvalley Today:** на существующем home кабинета только продолжение последнего активного курса, 1 практическое действие, необработанные сообщения по доступной роли. Не новая база профилей.
- **FR-20 / Headspace:** тема Business/Love/Health → ровно соответствующие существующие meditation / energy support / Dao hint / talismans. Уменьшать число решений на первом экране, не собирать чувствительные сведения ради маркетинга.
- **FR-21 / Daylio:** необязательные 10–30-секундные check-ins, повтор через 14 дней, корректное сравнение по версии и языку методики. Не превращать авторский шкальный индекс в медицинский диагноз.
- **FR-22 / Insight Timer:** карточки медитаций с автором, poster, длительностью, языком, темой; фильтры, audio/video play, resume после refresh, rights metadata, fast loading; страницы мастеров переиспользовать.
- **FR-23 / Duolingo:** одна мысль/действие на экран, 7-экранный урок ОПОРА, регулярное сохранение прогресса, Continue/Later, доступность, без наказательных streak.
- **FR-24 / Kajabi:** один проверенный платный мини-курс из существующего материала: preview → согласованная цена → реальный receipt → entitlement → My Courses → прогресс.
- **FR-25 / Personal master landing:** услуги, аудио/видео медитации и статьи существующего мастера, медиа с языком и правами; красивый короткий alias только после проверки уникальности и reserved slugs.
- **FR-26 / Business consulting:** страницы и предложения в одобренной тёплой древесно-бежевой гамме, один hero CTA, одна мысль/фото на мобильный экран, не повторять темы-маркеты услуг без понятного результата.
- **FR-27 / Video:** verified Andrey HeyGen Digital Twin (Avatar IV routine, V hero, III drafts); generate/publish только по соответствующему согласию; 16:9 website/YouTube, 9:16 Shorts, 1080p QA. Private media никогда не на публичном YouTube.

## 6. Техническая архитектура программы
### 6.1. Статические исследовательские артефакты
Создать `data/benchmarking/reference-patterns.json` — ограниченную матрицу источников/гипотез без персональных данных, ассетов и чужого HTML/JS; `lib/benchmarking/reference-matrix.mjs` — runtime-validation + ordinal prioritization; `scripts/benchmarking/plan.mjs` — безсетевой просмотр приоритетов; `tests/benchmark-reference-matrix.test.mjs` — автоматические guardrails. Большие снимки, скрины конкурентов, локальные расшифровки — только временно локально, **не в публичном GitHub**.

**Schema v1:** `schemaVersion`, `updatedAt`, `method` и массив `patterns[]`: `id, competitor, job, pattern, primarySource, sourceKind, evidenceLevel, estimatedImpact, estimatedConfidence, implementationEffort, reversibility, operationalRisk, hhRoute, hhModule, priority, status, originalAssetsAllowed:false, note`. Данные со статусом `docs_only` — справочные, не доказательство реального UX. URL только HTTPS. Счёт «экономии»/«конверсии конкурента» не хранить без измерения.

### 6.2. Дополнительный защищённый evidence manifest после G0
Для каждой исследованной цепочки: дата UTC, версия/коммит инструментов, root URL, право на доступ, список screens/events, diff assumptions, risks, snapshots kept private, reviewers. Логи скриптов и архивы без raw visitor payload и без cookies; политика хранения с удалением снимков и ограниченным доступом. В Git только обезличенный verdict, публичные источники и собственные HH screenshots.

### 6.3. Integration pattern
Изолированный research workspace (без secrets) → human/product review требований → существующие Next.js/React/CSS modules → server-side endpoints с Supabase/Postgres RLS → contract/E2E tests → GitHub PR → Vercel preview/production после gates. Не давать исследовательскому агенту права deploy/write на внешние интеграции. Никакой автоматизации «увидел чужой сайт → смёржил у нас».

## 7. Воспроизводимая матрица тестирования
| ID | Сценарий | Критерий |
|---|---|---|
| QA-01 | Source validation | Каждый row с официальным source, уникальным id, без незаконного asset/code копирования |
| QA-02 | Consent / input | Без opt-in POST не отправлен; телефон и email валидируются; payload без health content |
| QA-03 | Enquiry success | 201 + `saved:true` + HH-reference и независимый readback сохранённой заявки |
| QA-04 | Duplicate / retry | один operationId → одна заявка; 409 при изменённом payload; retry после network fail не создаёт дубль |
| QA-05 | Error states | 400/401/403/409/429/503/timeout/cancel корректны и честно показаны, messenger не открывается при отказе |
| QA-06 | Messenger | нейтральный request id; при blocked popup сохранённый receipt, fallback links, без личных данных |
| QA-07 | CRM rights | клиент A ↔ мастер B; мастер C не видит/не обновляет; logout/expired session denied |
| QA-08 | Messages | настоящее отправление → readback другого аккаунта → seen/ack; mock не E2E |
| QA-09 | Payment | provider verifies exact currency & amount; webhook duplicate does not double-credit; refund revokes access correctly |
| QA-10 | Course access | paid entitlement только после `payment_verified`; продолжение/прогресс корректно сохраняется |
| QA-11 | Privacy | нет PII/scores/health details в URL/GA/pixel/push/server logs/external messages |
| QA-12 | Locales | EN/RU/ES и hreflang/canonical; нет переводов с ложными медицинскими обещаниями |
| QA-13 | Accessibility | keyboard tab/focus; ≥44px touch; meaningful alt; zoom 200%; reduced motion; role/status announcements |
| QA-14 | Mobile browser | WebKit iPhone 320/360/375/390/430px, Android Chromium; no overflow/hidden CTAs; Safari popup behavior |
| QA-15 | Performance | замер до/после p75 LCP, CLS, INP, JS/runtime errors, bytes HTML/RSC; новые assets только lazy/approved |
| QA-16 | Release | focused + unit + typecheck + lint + build, миграции и RLS, PR CI checks, review diff, Vercel READY/SHA/domain/readback |

**Для каждого QA:** PASS (артефакт/ссылка), FAIL (репродукция), BLOCKED (внешний доступ/секрет/реальный пользователь), NOT RUN; никакого общего PASS при провале существенного шага.

## 8. План 90 дней с самостоятельными deliverables
**Дни 1–3 · G0 Initial Safety/Inventory.** Проверить ветку prod, AGENTS, существующие PR/issue, код и тесты; сделать 9-строчную матрицу; зафиксировать pinned tool versions/риски; создать безсетевой validator. Результат: этот документ, issue, matrix, test, PR. **Gate:** нельзя объявлять измерение конкурента без браузера и действительного evidence.

**Дни 4–7 · G1 Public Research.** Выбрать 3 P0 конкурентов (Practice Better, Truity/16Personalities, Kajabi), пройти только общедоступные paths в sandbox/браузере с согласованным доступом; замерить steps, touch targets, accessibility (видимое) и источники; сравнить с HH. Результат: 3 feature maps, критичные UX gaps, идентификаторы существующих HH компонентов. **Gate:** privacy/legal review.

**Дни 8–14 · G2 First Feature.** Один точечный UX PR: test/free review → ясное следующее действие → existing CRM capture, без новых форм/БД; 2 версии local screenshot; unit/contract/browser tests; при доступе — реальные согласованные тестовые заявки. **Gate:** загруженный интерфейс, реальный browser click-path, CRM readback; иначе BLOCKED.

**Дни 15–30 · G3 Revenue Integrity.** Объединить existing leads/CRM/messages/checkout status; исправить реальный узкий блокер от заявки к подтверждённой оплате; провести легальную фактическую sandbox/real-provider проверку и восстановление после ошибок. **Gate:** payment provider ID & amount readback, session entitlement; если недоступно — зафиксировать до деталей внешний блокер.

**Дни 31–45 · G4 Daily Client Value.** P1 Today/Headspace/Daylio адаптация через existing modules; никаких диагнозов, сильное permission scoping; mobile QA. **Gate:** сохраняется контекст и прогресс существующего пользователя.

**Дни 46–60 · G5 Courses & Media.** Доработка существующего course engine и Holistic Support: темы/медиа/one screen, нужный язык, надёжный resume, права на контент. **Gate:** playback/progress across refresh and login.

**Дни 61–75 · G6 Practitioner Journey.** Оформление услуги мастера, медитации, публикация контента с reviewer; существующая CRM; открытые профиль/alias; безопасность неавторизованного мастера. **Gate:** permissions/preview/published result, нет двойного каталога.

**Дни 76–90 · G7 Measured Optimization.** Короткие контролируемые UX-эксперименты только при lawful consented measurement; 14-дневный baseline; реальные подтверждённые enquiries, bookings, payments, completion; выбрать следующий backlog по эффекту. **Gate:** измеримый outcome или честный «данных недостаточно».

### 8.1. Время, стоимость, ресурсы
Плановые интервалы — **ориентиры зависимости**, не обещание даты поставки. На G0 и G1 — ноль платных API/рекламы/HeyGen-рендеров; браузер/Playwright на локальном/dev окружении; код и тесты в существующем репо. Отдельное одобрение перед платным пакетом, реальной отправкой клиенту, внешним sandbox платёжным действием, видео рендером или масштабным crawl. Проверять бюджет Vercel/Cloudflare/KV; не добавлять постоянные cron-проходы ради research.

### 8.2. RACI
**Owner:** цены/публичное позиционирование/юридические условия/реальные клиентские согласия/платёжный провайдер/видео QA/publish.  
**Product/engineering:** собирать источники и факты, писать ТЗ, small diff, контрактные тесты, PR/release evidence, исправлять дефекты.  
**Security/QA:** проверять права, threat model, RLS/consent, доступность, мобильность, источники публикации; блокировать релиз без доказательств.

## 9. Метрики и принятие решений
**Продукт:** доля посетителей, дошедших до добровольного следующего шага *при разрешённой измеримости*; доля сохранённых заявок среди начавших форму; квалификация, согласование, полученная оплата, повторный заказ; для курсов: actual start/continue/completion.  
**Операции:** success/error rate POST, duplicated operation IDs, delivery confirmation rate, recovery from provider errors, старые непрочитанные сообщения.  
**Качество:** mobile layout regressions, a11y checks, image/JS bytes, p75 LCP/CLS/INP.  
**Запрещённая подмена:** нельзя считать `WhatsApp click` полученным сообщением; `saved enquiry` — записью; `checkout created` — получением средств; `green build` — рабочим E2E.

Нулевая точка — baseline только после lawful privacy review; `PUBLIC_ANALYTICS_AVAILABLE=false` не менять без согласования. Если данных нет, писать `NOT MEASURED`, не строить график из предположений. A/B изменение одно за раз и только при достаточной выборке; при малых n — наблюдение и UX интервью, не декларация uplift.

## 10. Риски, решения, откат
- **R1/IP:** similarity/copyright → unique HH copy/assets/layout; feature spec без исходных материалов; scope review до build.
- **R2/ToS:** запросы к конкурентов сверх разрешённого → robots/ToS allowlist, ручной путь и паузы, stop on block.
- **R3/Supply chain:** непроверенный npx/postinstall → pinned artifact, no secrets, sandbox, logs, SHA, owner go перед external access.
- **R4/Prompt injection:** чужая страница может содержать инструкции → data-only parser, не исполнять команды или markdown со страницы.
- **R5/Privacy:** утечка пользовательских данных → no private browsing profiles/cookies, минимальные логи, RLS, закрытый research storage.
- **R6/Medicine/legal:** неверные диагнозы или терапевтические обещания → редакция safety copy, научная категоризация методик.
- **R7/False business metrics:** click vs paid → schema/server readback/provider verification.
- **R8/Regression/cost:** дублирование компонентов, RSC load, expensive CI → exact diff, focused tests, perf baseline, targeted rollback по PR SHA.
- **R9/Concurrent PRs:** изменения live во время пилота → перед кодом/merge переснять prod SHA, PR status, актуальную программу; rebase, никаких force pushes на prod.

**Rollback:** revert точного merged PR либо Vercel rollback по идентифицированному deployment; при additive DB changes — обратная совместимость и резервная копия; не откатывать user data «на глаз».

## 11. Границы «готово»
**G0 Complete** только если есть реальная оценка безопасности/pin/запуск sandbox (не сейчас). **G1 Complete** только если есть доказательства публичного flow. **G2 Feature Complete** только после UX screenshots + тестов + server readback и approval. **LIVE** только Vercel READY + точный git SHA + проверенный alias, click-path. **PAYMENTS DONE** только реальная независимая provider verification. Слияние документационного PR — не доказательство, что приложение улучшено.

## 12. Операционная инструкция агенту Codex / последующим итерациям
1. Открыть [#2058](https://github.com/andylitvinov-design/books/issues/2058), последние комментарии связанных issue, production branch HEAD, Vercel latest READY SHA, текущие AGENTS.md.
2. Запустить `node scripts/benchmarking/plan.mjs` и `node --test tests/benchmark-reference-matrix.test.mjs`. Найти следующую P0 строку и текущий модуль; если он уже реализован — пометить gap `none`, не повторять.
3. Для конкретного образца — только публичные страницы, ссылка + дата + notes; Remaster `feature` в sandbox после G0. Никогда не использовать код/ассеты оригинала.
4. Составить небольшой acceptance checklist, baseline screenshots, 1–3 затрагиваемых компонентов, разрешённые источники. Сначала проверить contract/performance/consent существующего кода.
5. Изменить код, сделать unit/contract/browser tests, typecheck, lint, build, review RLS и запреты PII. Собрать PR, CI и diff.
6. После разрешённого merge проверить exact prod SHA и app live, при необходимости provider readback. В issue записать PASS/FAIL/BLOCKED evidence, следующий инкремент, ссылки, цену изменений.
7. Не использовать эту инструкцию как разрешение на auto-pay, bulk messaging, Ads, HeyGen render/publish, scraping protected content или самовольное снятие privacy hold.

## 13. Справочные ссылки
- Remaster: https://github.com/thenavidm/remaster
- REA: https://github.com/morluto/rea
- Playwright: https://playwright.dev/docs/intro
- Practice Better: https://practicebetter.io/features/client-portal
- Mindvalley: https://help.mindvalley.com/hc/en-us/articles/40064828017819-Your-Complete-Guide-to-the-Mindvalley-App
- Headspace: https://www.headspace.com/app
- Insight Timer: https://help-app.insighttimer.com/support/solutions/articles/67000664933-what-are-the-features-of-the-teacher-dashboard-
- Duolingo: https://www.duolingo.com/help/what-is-a-streak
- Daylio: https://daylio.net
- Kajabi: https://help.kajabi.com/en/articles/17174383-kajabi-products-overview

**Next action:** завершить inventory/безсетевой планировщик и PR, затем начать контролируемый замер P0 конкурентов при наличии безопасной browser sandbox. Отдельно проверить provider E2E коммерческой цепочки; до этого ставить BLOCKED, не DONE.
