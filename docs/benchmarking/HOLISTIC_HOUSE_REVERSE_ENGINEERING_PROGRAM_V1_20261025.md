# Holistic House — Reverse Engineering & Benchmark-to-Product: полная программа и техническое задание

**Версия:** 1.0 · **Дата:** 25.10.2026 (America/Toronto) · **Статус:** IMPLEMENTATION STARTED — G0/G1 только в виде офлайн-матрицы/валидации из PR #2061; реальная установка Remaster/REA, онлайн-исследование конкурентов и provider E2E не подтверждены.  
**Репозиторий:** https://github.com/andylitvinov-design/books · **Production branch:** `codex/public-book-library` (не default `codex/bootstrap-books`).  
**Продукт:** https://holistichouse.vercel.app · **Vercel:** `super10/codex-public-book-library` (действующий deployment READY, exact SHA и alias перепроверяются перед любым релизом).  
**Управляющий issue:** https://github.com/andylitvinov-design/books/issues/2058  
**Неизменяемый стратегический контекст:** https://docs.google.com/document/d/1lQ-ZqH7Y0mytbUg_bo-Bm9DpGE1_3_Z8H2Geqadg9Gk/edit — «Стратегия дохода, конкурентное преимущество, бенчмаркинг и ТЗ v1.0», 25.10.2026.  
**Связанные задачи:** воронка #990; CRM #985; атрибуция #988; сопровождение #1716; продуктовый консультант/цифровые продукты #1519; тесты/валидность #1223; 90-дневный курс #1298 (статус допуска новых участников сверять перед предложением).  
**Необходимое различение:** сохранили техническую программу ≠ выполнили исследования ≠ установили сторонний софт ≠ внедрили изменения ≠ получили настоящие оплаты.

---

## 0. Решение, миссия и предмет программы

**Цель:** методично заимствовать *проверенные продуктовые принципы* сильнейших приложений, не копируя их бренд, тексты, исходный код, медиа и закрытую логику, а затем **улучшать текущие** модули Holistic House небольшими проверяемыми PR. Конечный продукт — не набор клонов: это один персональный путь «вопрос/ситуация → ясность → бесплатный полезный шаг → добровольная заявка → согласование → подтверждённая оплата → личная/самостоятельная практика → повторный контакт».

**Решение по инструментам:**
1. **Основной исследовательский контур:** Remaster (предпочтительно `feature` mode) для публичных UX-потоков, замеров экрана, user pain evidence, design tokens, clean-room описаний, diff/gates. Используем как *исследовательский метод*, а не генератор слепого клона.
2. **Проверка пользовательского опыта и собственной реализации:** Playwright (Chromium/WebKit/mobile), ручная экспертиза, Lighthouse, axe или сопоставимые accessibility-инструменты; собственные unit/contract/security/E2E тесты.
3. **Разработка:** Codex в текущем Next.js/React/Supabase проекте, без нового фреймворка, нового CRM, нового кабинета, внешнего биллинга и массовой генерации исходников конкурента.
4. **REA (Reverse Engineer Anything):** дополнительный **условный** инструмент технического исследования только собственных программ, открытых/лицензированных артефактов либо объектов при документированном праве анализа; не использовать для обхода DRM, логинов, лицензий, extraction чужих JS bundles, app binaries, закрытых API.
5. **Не ставить** чужие агенты/плагины или MCP «на live», не давать доступ к продовым токенам. Сначала supply-chain аудит, изолированный пилот и закреплённая версия, затем решение о полезности.

**Итоговый бизнес-показатель:** реальные *qualified → time agreed → independently verified paid → service fulfilled*, по каждой услуге, времени и источнику. Кликовые события — диагностика UX, не выручка. Вторичная цель: улучшение качества 1-го экрана, завершения курса, сохранения прогресса, возврата пользователей и удобства работы мастеров.

## 1. Контекст, зафиксированный 25 октября 2026

### 1.1 Что уже существует; не переписывать

По дереву production-ветки на момент подготовки этого ТЗ подтверждены исходники:
- `components/home-conversation-guide.tsx` и существующая логика первого диалога.
- `components/compact-lead-capture.tsx`, `app/api/service-enquiries/route.js`: текущий путь заявок.
- `app/api/app/practitioner-client-messages/route.js`: приватная коммуникация клиента и мастера.
- `app/[locale]/holistic-support/page.tsx`, `components/holistic-support-choices.tsx`, `components/holistic-support-topic-filter.tsx`, `data/academy/holistic-support-meditations.ts`.
- `app/api/payments/square/checkout/route.js`, `app/api/payments/square/status/route.js`, `app/api/payments/square/webhook/route.js`, `app/api/billing/paypal/webhook/route.js`, `lib/commerce/square-cart-service.js`, `lib/commerce/paypal-personal.js`.
- Тесты: `tests/home-conversation-guide.test.mjs`, `tests/crm-*.test.mjs`, `tests/billing-*.test.mjs`, `tests/holistic-support-*.test.mjs`, `tests/practitioner-express-reports.test.mjs`, `tests/service-billing-browser-diagnostics.test.mjs` и др.
- `package.json`: Next.js 15.5.21, React 19, Node >=22, Supabase/Postgres, TypeScript + CSS modules/Tailwind, существующие npm scripts.
- Путь разработки — `andylitvinov-design/books`, **именно** `codex/public-book-library`; default branch другая. На снимке чтения ветки указан head `5fff2dad5591befa8a66358235267f116c30ddc5`, **это не доказательство deployed production SHA** и он может измениться в любую минуту.
- В просмотренном дереве этой ревизии не найден `AGENTS.md`; искать вновь в рабочем checkout и связанных правилах перед выполнением каждого этапа.

Стратегия 25.10.2026 утверждает действующие цены автора: €50/30 минут, €100/60 минут; €200/месяц за две 60-минутные сессии — отдельное предложение **с проверкой его реального checkout**. Нет разрешения самостоятельно назначать новые тарифы. `#1298` учитывать по реальному статусу набора.

### 1.2 Известные независимые ограничения

- Нельзя считать WhatsApp/Telegram click реальным доставленным запросом; checkout click — фактически поступившими деньгами.
- Для GA4/Meta действуют privacy holds; `PUBLIC_ANALYTICS_AVAILABLE=false` не снимать по инициативе бенчмаркинга.
- Тесты и авторские чек-ины не равны клинически валидной диагностике; точные версии и права — #1223 и `docs/assessments/HH-ASSESSMENT-QUALITY-ROADMAP-AND-TZ-2026-10-20.md`.
- CRM Contacts и приватные client profiles — разные доменные сущности; одно обращение не создаёт клиническое досье.
- Реальные провайдеры Square/PayPal, доступность merchant, платежи, возвраты и webhooks должны отдельно подтверждаться, не подменяться mock.
- Vercel/Cloudflare quotas и нагрузка; не создавать периодический crawler или частые запросы к конкурентам.
- Видео: только проверенное авторское с разрешённым использованием, lazy poster, без autoplay; HeyGen не рендерить и публично не размещать без отдельных разрешений.

## 2. Продуктовая карта конкурентов и гипотез

| Эталон | Для чего его изучаем | Экраны/сценарии исследования | Что создаём у себя | Не копируем / условие |
| --- | --- | --- | --- | --- |
| Practice Better | клиентская операционная цепочка | публичный обзор portal, forms, booking, inbox, invoices, help center | существующие заявка/CRM/Practice/доставка/оплаты | SaaS data model, закрытый portal, брендинг; E2E с собственными тест-аккаунтами HH |
| Kajabi | commercial offer-to-access | продукт, landing, offer, checkout, on-boarding | продающий лендинг → заказ → server-verified payment → entitlement My Courses | недоступные тарифы, непроверенные схемы платежа |
| Truity / 16Personalities | понятный бесплатный вход | вход в тест, индикатор прогресса, результаты, этичный CTA | улучшения My Tests → Results/Insights → добровольный запрос услуги | вопросы/шкалы/тексты/фирменные диаграммы; лицензирование методик отдельно |
| Mindvalley | один персональный следующий шаг | Today, continue, программа, progress | существующие My Development Path / My Courses / Profile | дублирование «Today» и social feed |
| Headspace | простой mood/intention → полезное действие | первый вопрос, выбор практики, понятный play | Holistic Support: Business/Love/Health → Meditation/Dao Hint/Energy/Talismans | медицинские обещания, дорогой AI/новый каталог |
| Insight Timer | медиатека и каталог экспертов | предметные фильтры, язык, длительность, профиль мастера | наши audio/video, безопасный player, существующие practitioner pages | чужие медиа/обложки/отзывы, непроверенное право публикации |
| Duolingo | минимальные уроки и сохранение прогресса | одно задание/экран, возврат, завершение | существующий курс OPORA/Reiki, resume, следующий шаг | наказательные streak/скопированные ассеты |
| Daylio | добровольный check-in и тренды | быстрый check-in, простое Before/After | собственные чек-ины в My Tests/Insights | clinical claims, norm scores без доказательств |
| Calm / Fabulous | приятная ежедневная практика | короткая практика, тематическая подборка, первый успешный сеанс | спокойная компактная подача и качественный player | дорогой контент/автоматические push без opt-in |

**Методологическая оговорка:** этот список — рабочие UX-гипотезы из стратегического документа и публичных описаний, **не** доказательство более высокой конверсии конкурентов. Для каждого вывод проверять на конкретном экране и сохранять ссылку, дату, условия наблюдения, скрин/схему. Официальные источники: https://practicebetter.io/features/client-portal, https://help.mindvalley.com/hc/en-us/articles/40064828017819-Your-Complete-Guide-to-the-Mindvalley-App, https://www.headspace.com/app, https://help-app.insighttimer.com/support/solutions/articles/67000664933-what-are-the-features-of-the-teacher-dashboard-, https://www.duolingo.com/help/what-is-a-streak, https://daylio.net, https://help.kajabi.com/en/articles/17174383-kajabi-products-overview.

### 2.1 Исходный приоритет направлений

1. **P0-A, выручка:** формы заказов услуг + состояние заявки + CRM + назначенное время + доказанная оплата/услуга. Реализация в рамках #990/#985/#1716; не отдельный продукт.
2. **P0-B, доверие и конверсия:** бесплатный разбор/тест → понятная интерпретация → мягкий CTA → настоящая заявка. Первый *безопасный* reverse-engineering пилот, который можно сделать без новых платёжных интеграций.
3. **P1-A, удержание:** Today/Continue, прогресс, короткая практика на базе уже существующих модулей.
4. **P1-B, контент:** Holistic Support с корректными фильтрами, локализованная медиатека и авторские мастер-страницы.
5. **P2:** новые подписки, community, масштабный marketplace, AI персонализатор, игровые механики — только при подтверждённом спросе и безопасности.

## 3. Техническая стратегия инструментов

### 3.1 Remaster — допустимый уровень применения

Официальный репозиторий: https://github.com/thenavidm/remaster. Публичная документация описывает режимы `app`, `site`, `feature`, `migrate`, стадии research → design → build/verify → launch, матрицу функций, источники, измерение публичного UI, сравнение каркаса экрана и clean-room защиту. Для Holistic House выбираем **`feature`**, а иногда исследовательский `site` без автоматического full-site clone.

**Вход:** URL публичного экрана, бизнес-гипотеза, один конкретный пользовательский сценарий, наш существующий URL, ограничения авторизации/прав/EN-RU-ES.  
**Выход:** `research/source-ledger`, screen/flow map, снимки без PII, pain hypotheses, functional behaviors, наша AS-IS/TO-BE карта, design tokens как *наблюдения*, feature matrix, тесты и решение go/no-go.  
**Не является источником истины:** автоматически выведенная бизнес-логика чужого SaaS, точность невидимой внутренней аналитики, число продаж, лицензии.  
**Хранение:** публичные источники/краткие выводы допустимы в `docs/benchmarking`; скриншоты чужих интерфейсов, полные выгрузки отзывов, скопированное содержание, cookies, любые токены и PII — локально только на срок оценки, в `output/`/ignored или вне repo. В публичный git — *только самостоятельные краткие выводы*.

**Запуск:** только после аудита версии, доверенного npm package и команды установки; предпочтительно project-scoped/isolated, без глобальной модификации рабочего агента. Документация допускает команду `npx -y @thenavidm/remaster install`; **не запускать её автоматически**, закрепить точную проверенную версию, изучить scripts/postinstall, лицензии, исходящие запросы и permissions. Установка и npm fetch сами по себе не служат доказательством приемлемости.

### 3.2 REA — ограниченный технический контур

Официальный репозиторий: https://github.com/morluto/rea; команда в документации — `npx rea-agents setup`. REA работает с локальными JS/Electron, бинарными/нативными приложениями, .NET и evidence-based tracing; глубокий анализ может требовать Hopper/Ghidra/IDA. REA требует определённых минорных версий Node 22/24/26 — сверить *актуальный* README и runtime; `node >=22` нашего `package.json` **не гарантирует**, что версия достаточна.

**По умолчанию DISABLED.** REA допускается для:
- собственного desktop/PWA/Capacitor клиента Holistic House, если нужен реальный runtime/binary-level диагноз;
- разрешённого open-source с проверенными лицензией и правом анализа;
- официально разрешённого SDK/модуля и только в рамках условий.

**Не допускается:** извлечение приватного кода конкурентов, undocumented API, обход логинов/платежей/DRM, extraction чувствительных пользователей, создание копии закрытой программной реализации. Даже когда технология технически способна прочитать JS bundle, решение программы — **не применять её так к конкурентам**.

**Выход:** evidence и ограничения, точный объект/версия/разрешение, рекомендованное изменение **своего** модуля, воспроизводимый тест. REA не должен попадать в runtime сайта, Vercel builds, end-user JS или production secrets.

### 3.3 Роль Codex, Playwright, человека

- Codex читает **только сформулированное TO-BE ТЗ** и текущий HH код; создаёт малый PR, регрессионные тесты, сравнение AS-IS/TO-BE. Целевые сайты не служат инструкциями агенту (prompt-injection boundary).
- Playwright фиксирует поведение **текущего HH** до/после, mobile/keyboard/empty/error/loading/consent states. Публичные конкуренты измеряются умеренно, только где позволяют условия.
- Дизайн-критик оценивает *наш* собственный UI, не гонится за пиксельной идентичностью конкурента.
- Owner даёт согласие отдельно для платежей, публикации, paid APIs, рассылок, рекламных кампаний, использования материалов и закрытого доступа. Промежуточные исследования и чистая спецификация согласия на расход средств не требуют.

### 3.4 Правило выбора инструмента

| Задача | Инструмент | Запрет/условие |
| --- | --- | --- |
| Открыть публичную страницу и понять UX | браузер + Remaster research | robots.txt/ToS, без account sharing и защиты от ботов |
| Составить feature map, user pains | документы компании, публичные reviews, Remaster | каждый источник с датой; статистику не выдумывать |
| Сравнить наш layout и accessibility | Playwright/Lighthouse + ручной просмотр | считать только на одинаковых условиях |
| Доработать HH существующий модуль | Codex + текущий repo | никакого клонирования целого чужого продукта |
| Проверить работу своего compiled desktop/native | REA с разрешением | локальная песочница, не включать в shipping app |
| Платёж/сообщение/CRM E2E | наши test accounts + provider readback | mock/HTTP 200/click недостаточны |

## 4. Процедура исследования одного UX-паттерна (SOP)

1. **Заявка на исследование.** В программе #2058 или дочернем issue: причина, продукт, экран, тема, потенциальная выручка/польза, URL нашего аналога, запрет на копирование и лимит времени.
2. **Правовая проверка.** Public visibility ≠ юридическое разрешение на массовый scraping. Проверить публичные Terms, robots, лицензию, разрешённость учётной записи/данных, лимиты запросов. При запрете автоматизированного доступа — только законный ручной обзор публичных материалов либо остановка.
3. **Source ledger.** Сохранить canonical URL, дату и время, локаль, устройство/viewport, authentication state = public/authorized, конкретное утверждение, тип evidence, вероятность ошибок. Reviews — с точной цитатой/ссылкой, не приписывать несуществующие мнения.
4. **AS-IS карта HH.** Пройти живой путь как обычный посетитель, зафиксировать исходные тексты/CTA/количество решений, консоль, network/errors, мобильное поведение и существующие компоненты.
5. **Observation competitor.** Только публичные страницы и разрешённые сценарии. Зафиксировать структуру экрана, взаимодействие при скролле, формы/ошибки если это обычный безопасный просмотр, latency без агрессивного тестирования. Не вводить реальные личные данные, не оплачивать, не создавать ложные обращения.
6. **Определить поведенческое правило.** Например: «показывать одно решение и объяснять следующий шаг», а не «взять hero и шрифт X». Сформулировать jobs-to-be-done, важные edge cases.
7. **Придумать собственное улучшение.** Указать почему оно лучше подходит HH и что надо сохранить из текущего сайта. Проверить 2–3 свои альтернативы, включая «ничего не менять».
8. **Дизайн как самостоятельное произведение.** Сохранить утверждённый теплый кремово-бежевый/коричневый стиль для мастеров/бизнеса и подходящую текущую палитру для курсов/тестов; оригинальные фото/одобренные видео; не переносить логотипы, фирменные иллюстрации, шрифты, тексты, iconography и trade dress.
9. **Technical decision record (TDR).** Приоритет, существующие компоненты, API/DB impact, privacy impact, механизм отката, флаги, тесты, стоимость. Открыть PR только когда цель измерима.
10. **Small PR.** 1 гипотеза / 1 пользовательский поток / минимальный diff. Reuse interfaces + no breaking migrations. Для скрытого UX — сначала prototype/preview, а не новая каркасная система.
11. **Verification gates.** Юнит → интеграция → браузер → RLS/consent → реальные провайдеры, если задействованы → Vercel preview → merge → READY SHA/alias/live browser → обновление issue. FAIL и BLOCKED различать.
12. **Aftercare.** Безопасный baseline и сравнение; при отсутствии полезного эффекта — rollback или решение сохранить ради качества; не выдумывать uplift и не отключать работающие сценарии.

### 4.1 Единая схема карточки исследования

Минимальные поля `study_id`, `status` (candidate/approved/rejected/blocked), `source_product`, `public_urls`, `source_date`, `terms_status`, `own_hh_route`, `existing_component`, `problem_statement`, `observed_behavior`, `evidence_quality` (official/live public/review/inference), `original_assets_copied=false`, `proposed_hh_behavior`, `alternatives`, `expected_impact`, `effort`, `risk`, `dependencies`, `privacy_check`, `owner_approval_if_needed`, `acceptance_cases`, `issue_url`, `pr_url`, `preview_sha`, `production_sha`, `live_evidence`.

Имена/данные конкурентов не должны утекать в runtime payload посетителям. Любые исследовательские скриншоты — непубличные, с законным основанием хранения и ограниченным сроком.

## 5. Требования P0 — «сначала деньги, без ухудшения бесплатного продукта»

### Epic P0.1 — Service landing и компактная форма (Practice Better/Kajabi/Headspace)

**HH-P0-01.** Публичные лендинги `/{locale}/services/alchemy-of-soul`, `/{locale}/services/free-situation-review` и действующие продуктовые страницы объясняют *один результат* на первом мобильном экране: для кого, как работает, что человек получит, честная цена/формат или «бесплатно», одно основное CTA. Видео/фото — собственные, одобренные, lazy.

**HH-P0-02.** Форма заявки на соответствующем лендинге **раскрывается inline** с анимацией только при отсутствии prefers-reduced-motion; в сценариях, где пользователь явно заказал услугу с главной, допустимо раскрытие прямо на главной. Не заменять согласованный захват модалкой/перенаправлением без UX оснований. Не дублировать компонент: улучшать `CompactLeadCapture`.

**HH-P0-03.** Минимум полей: контакт в разрешённом канале, по желанию короткий безопасный контекст/тип «ситуация» или «энергия/самочувствие», отдельное понятное consent. Не собирать в маркетинговую аналитику содержание запроса или сведения о здоровье. Правила Telegram/WhatsApp: пользователь **сам инициирует сообщение**; предварительный draft не считается отправленным, если нет подтверждения реального intake.

**HH-P0-04.** После создания заявки сервер возвращает долговечный reference и статус «получена, ожидает ответа» только после DB commit. Повторная отправка/idempotency/409/429/503, offline и reload не должны создавать дубликатов или ложных confirmations. При ошибке сохранить введённое, сообщить понятный следующий шаг.

**HH-P0-05.** EN — основная, RU и ES зеркала. CTA, цена, юридические ограничения, форма, ошибки, email/WhatsApp deep links проверяются на каждой локали. Контент «Диагностика» не выдавать за медицинский диагноз.

**Приёмка:** 320/375/390/430px без обрезки, нажатие order раскрывает именно согласованную форму, submit с consent даёт один реально сохранённый lead в правильной CRM/Practice, без согласия — нет заявки, 3 повтора — один reference, master identity verified.

### Epic P0.2 — Test / free review → понятный результат → добровольный paid next step (Truity/16Personalities)

**HH-P0-06.** Бесплатный тест или письменный разбор предоставляют полноценный результат независимо от покупки. Нельзя ставить paywall перед уже обещанным бесплатным результатом или трактовать результат как клинический.
**HH-P0-07.** Экран результата: ясный заголовок, 2–4 собственных интерпретационных пункта (только валидная версия шкалы), limitations, необязательные next steps: «самостоятельная практика», «сохранить в кабинет», «личный разбор от €50». Порядок по контексту, не по скрытому чувствительному profiling.
**HH-P0-08.** На EN/RU/ES копия интерпретации содержит фактический score/version/evidence limitations, без медицинских обещаний, без лицензированных вопросов конкурента. UX (progress, next step, компактность) можно использовать как паттерн.
**HH-P0-09.** Сообщения/CTA не содержат answers/scores, симптомов или диагностических labels в URL, GA4, UTM, pixel, внешних мессенджерах или email subject.
**HH-P0-10.** Гость может завершить бесплатный путь, при последующем согласованном сохранении не потерять свой результат; миграцию guest→account выполнять только через существующие проверенные механизмы.
**Приёмка:** доступность бесплатного результата без покупки, нажатие CTA не создаёт лид само по себе, сохранённый consent + серверный lead в существующей CRM, никаких PII/answers в external network/request logs; тесты #1223 не получают ложную «валидацию».

### Epic P0.3 — CRM, переписка, запись, оплата (Practice Better/Kajabi)

**HH-P0-11.** Канонический workflow: `landing → inquiry_started → enquiry_saved → qualified → time_agreed → payment_pending → payment_verified → service_started → completed`; отдельные cancelled/refunded/failed. Это **семантические состояния**, а не требование бездумно создать все новые DB enums — согласовать с существующей моделью.
**HH-P0-12.** Из формы или реально подтверждённого внешнего intake создаётся один CRM lead с owner/practitioner scope, source attribution только несенситивные разрешённые tokens. Не создавать автоматически приватный клиентский профиль из случайного клика.
**HH-P0-13.** Исполнитель получает только свои обращения. Сменивший мастер/клиент не получает чужой history по подмене ID. Server auth, RLS policies, audit trail, ownership checks и concurrency.
**HH-P0-14.** Сообщения подтверждаются через реальные server send / provider inbox readback, acknowledgement по согласованным правилам; нейтральные внешние уведомления без содержания тестов/здоровья.
**HH-P0-15.** Время считается согласованным **после** взаимного подтверждения; не после выбранного слота или draft сообщения. Перенос/отмена фиксируется в одном статусном реестре.
**HH-P0-16.** Square/PayPal/manual receipt: авторитетный provider receipt или документально подтверждённый owner receipt, верная сумма/валюта/service, webhook signature/idempotency/replay. `payment_verified` независимо от click, а entitlement — после verify. Не исходить из наличия Stripe/PayPal Business.
**HH-P0-17.** Условия €/CAD conversion, cancellation/refund и private delivery — до приёма платежа; не создавать цены/подписки самостоятельно.
**Приёмка:** реальный тест «клиент A → мастер B → согласование → реальный провайдер/документ → кабинет», мастер C не имеет доступа, двойной webhook не даёт двойную услугу/доступ. Когда нет реального verified merchant: **BLOCKED**, не «PASS».

## 6. Требования P1 — персональный маршрут, курсы, медиатека

### Epic P1.1 — One next step / Today (Mindvalley)

**HH-P1-01.** В уже существующем кабинете (не новый маршрут/профиль) показывать одно основное актуальное действие: «Продолжить урок», «Посмотреть мой результат», «Ответить на сообщение» или «Выбрать практику», в зависимости от server-scoped реального статуса.
**HH-P1-02.** Приоритет действий детерминирован и объясним: незавершённое персональное действие → продолжение начатого курса → добровольная практика; ничьи private data не включаются в публичный HTML.
**HH-P1-03.** Empty state: для нового пользователя есть понятный бесплатный старт, не бесполезный пустой dashboard. Ошибки загрузки имеют retry, reload и переключение языков сохраняют прогресс.
**Приёмка:** 2 разных аккаунта видят только свои очереди; одно действие ведёт в корректный модуль ≤2 кликов; никаких чувствительных данных через public cache.

### Epic P1.2 — Headspace/Daylio, Holistic Support

**HH-P1-04.** На `/{locale}/holistic-support` сначала выбрать тему «Business / Love / Health», затем один из существующих форматов «Meditations / Energy Support / Dao Hint / Talismans». Отображать только релевантный контент на языке посетителя; без бесконечного первого экрана и без добавления 4 конкурирующих CTA.
**HH-P1-05.** «Dao Hint» раскрывает следующий экран с текстовым вопросом и нейтральной символической подсказкой; добровольный переход к бесплатному разбору мастера. Это не клиническая диагностика.
**HH-P1-06.** Чек-ин (если есть разрешённая авторская шкала) — 1–3 простых действия, понятная история и честное «самоотчёт»; отсутствие доказательств чувствительности/валидности явно описано.
**Приёмка:** тематические фильтры не создают новых сущностей, media locale не перемешивается, приватное не выдаётся публично, no invented treatment promise.

### Epic P1.3 — Insight Timer / профиль мастера / медиатека

**HH-P1-07.** Переиспользовать существующую страницу мастера и контент модели services/articles/meditations; профиль показывает услуги, публичные статьи, разрешённые аудио/видео, языки, самостоятельный короткий alias с uniqueness/slug validation/auth. Не создавать отдельный marketplace backend.
**HH-P1-08.** Каждая медиа-карточка: изображение, название, язык, длительность при наличии, тип, один Play; responsive full width на телефоне, без пустых широких колонок. Video poster lazy click-to-play без autoplay.
**HH-P1-09.** Своя медиатека фильтруется по language/topic/format; английская «Flight to the Sun» — английскому разделу, корректно проверенные русские медитации — русскому. Медиа только по подтверждённым правам; private files только через защищённое хранилище и account scope.
**HH-P1-10.** Запись/загрузка видео или аудио обращения самим мастером — только в авторизованном интерфейсе, лимиты/тип/MIME/размер, malware/content checks по допустимым инструментам, preview/replace/remove, отдельное обозначение языка и consent на публичную публикацию.
**Приёмка:** responsive 320–430px, play с фактическим media URL, доступность keyboard/captions/transcripts where available, разграничение публичного/приватного.

### Epic P1.4 — Duolingo/Mindvalley, My Courses / OPORA / Reiki

**HH-P1-11.** Сохранить действующий course engine, не заводить второй Duolingo-style engine. Один учебный смысл/действие на экран, 1 короткая инструкция, back/resume/progress, мягкое «нужно потренироваться ещё».
**HH-P1-12.** Progress читается с сервера после реального save, остаётся после обновления/смены устройства; Day 14 retest только если методика/права/версия позволяют, без клинических предсказаний.
**HH-P1-13.** Starter/tier access следуют действующей подписке/бесплатному лимиту; entitlement к платному материалу только после независимой проверки оплаты, без задержки потери уже законно полученных доступов.
**HH-P1-14.** Для бизнес-курсов сохранить утверждённый beige/wood стиль; для коротких уроков соответствующий принятый gradient/teal; сдержанная мотивация без манипулятивных streak/штрафов.
**Приёмка:** один настоящий пользователь проходит start → save → close → resume → complete; минимальные размеры touch 44px; не ломаются исторические completed/legacy версии курсов.

## 7. Новые требования к дизайну и копирайту

- **Сохранить узнаваемость бренда HH.** Не переносить скопированные competitor page sections в production и не применять автоматом чужие design tokens: tokens конкурента допустимы как аналитическое наблюдение.
- Для продажи: на мобильном первый экран — одна ценность, авторское фото/разрешённое видео, один главный CTA, честный тариф, короткая вторичная ссылка. Секции «выгоды», «как проходит», «что получаете», «пример результата», «отзывы с разрешением», «FAQ», «форма» — в логическом порядке; не размещать 3 разные услуги как равноправные hero блока единой услуги.
- Формы раскрываются внутри лендинга там, где ожидается inline-поведение; состояние формы сохраняется, фокус и скролл предсказуемы. Не показывать длинные сложные формы до первого осмысленного выбора.
- Mobile 320/375/390/430px; desktop 768/1024/1365; safe areas iOS, tablet; test at 200% zoom, keyboard, screen reader labels, headings, WCAG 2.2 AA как целевой стандарт, prefers-reduced-motion, contrast, touch >=44px.
- Все изменённые UI состояния локализованы EN/RU/ES (включая loading/validation/no network/empty). Никаких непрочитанных/англоязычных fallback в русском/испанском без явной маркировки доступного контента.
- Изображения/videos оптимизируются по LCP/CLS/bytes; poster и lazy embed; no autoplay; SVG/иконки — свои/проектные с правом применения, а не скопированные с чужих сайтов.
- SEO: canonical/hreflang, alt, мета, индексировать только публичные страницы; личный кабинет, отчёты, CRM и private assets не индексировать.

## 8. Архитектура и минимальный контракт

### 8.1 Модули — карта изменений

| Capability | Источник HH | Допустимые изменения | Запрещённый вариант |
| --- | --- | --- | --- |
| Conversational entry | `components/home-conversation-guide.tsx` | CTA, понятные choices, корректные маршруты | отдельный pay-to-chat бот |
| Lead capture | `components/compact-lead-capture.tsx`, `app/api/service-enquiries/route.js` | inline expand, validation, server acknowledged lead | дублирующий /api/leads-v2 |
| Practitioner CRM/Messages | существующие `/api/app/*`, #985 | owner-scoped states, follow-ups, реальные ack | второй CRM/непроверенные WhatsApp sends |
| Payments | existing Square/PayPal/manual | provider verify, ledger/idempotency, order state | клиентский `paid=true` по query param |
| My Tests/Results/Insights | существующий app + assessments registry | presentational clarity and lawful CTA | скопированные лицензированные тесты/диагнозы |
| Courses / Development Path | существующий course engine | navigation, server resume, lesson UX | параллельная БД курсов |
| Holistic Support | `app/[locale]/holistic-support/*` + components/data | compact topics, filtered media, authorized assets | дубль кабинета/открытое private video |
| Practitioner pages | действующие practitioner/service modules | SEO alias, master public content, visual cards | второй marketplace |

### 8.2 Server invariants и RLS

1. Источник истины для saved lead — DB row после commit, для `qualified` и `time_agreed` — аутентифицированное подтверждённое действие, для `payment_verified` — provider/readback или документально подтверждённый owner receipt с audit.
2. `idempotency_key` на submission/payment/webhook/content publish по фактическому существующему контракту; конфликт/повтор не создаёт второй статус или second entitlement.
3. `account_id`, `practitioner_id`, `client_id` не принимаются как доказательство полномочий из фронтенда; сервер проверяет владельца из сессии/claims; PostgreSQL RLS enabled/FORCE where appropriate, negative tests от третьего участника.
4. Приватные тесты, свободные тексты, audio/video, медицинские контексты — шифрование/retention/access policies в существующих схемах; no server logs with secrets/PII; не прятать protected assets за публичным Unlisted YouTube.
5. Additive migration только при невозможности через текущие модели, обязательные rollback/data compatibility/backup. Не создавать новые сущности ради соответствия конкуренту.
6. Параметры, связанные с рекламой, содержат только allowlisted non-sensitive source/channel/campaign. Опциональный opt-in/opt-out записывается с evidence, но не смешивается с обработкой заявки.

### 8.3 Принцип «помечать доказательство каждой ступени»

- `viewed / clicked` — UI interaction (только при правомерном сборе).
- `enquiry_saved` — серверная транзакция + DB ID/reference.
- `message_delivered` — верификация у провайдера или реальный inbox readback; internal save ≠ внешний delivery.
- `booked` — согласование времени обеими сторонами / authoritative booking event.
- `paid` — provider-confirmed receipt + reconciled amount/currency/identity, not redirect.
- `fulfillment` — реальное проведённое/выданное действие и доступ в кабинете.
- `revenue` — фактически полученная сумма с обработкой возвратов/комиссий; не показатель кликов.
- `live` — READY Vercel deployment, exact deployment SHA, alias на canonical домен и доказанный browser flow.

## 9. Приватность, комплаенс, безопасность и лицензии

### 9.1 Clean-room и авторское право

- Конкурент: только общеизвестные продуктовые *идеи*, виды пользовательских сценариев, факты публичных интерфейсов и законные наблюдения.
- Не копировать исходники, HTML/JS, proprietary question banks, тексты, фотографии, записи, анимации, SVG, branded colors/logos, патентованные/лицензированные методы или закрытую business logic.
- **Отделять research и implementation:** исследователь пишет абстрактное поведенческое ТЗ со ссылкой на evidence; разработчик работает по ТЗ и HH repo, а не копирует экран/код конкурента. Независимый code/content similarity review и asset provenance по PR.
- Изучение конкретной услуги через добровольный тестовый аккаунт допустимо *только* если прямо разрешают Terms и нет обхода ограничения; не создавать аккаунты конкурентов автоматически, не выполнять покупку/скрейпинг закрытого без решения владельца.
- Не обходить CAPTCHA, robots, paywall, MFA, rate limits, API authorization, DRM; блокирующие UX-потоки фиксировать как «не наблюдали». Условия и правовые риски перед спорным кейсом проверяет владелец/юрист, не AI-агент.

### 9.2 Supply chain третьих инструментов

**Gate SEC-00 (перед любым `npm`):** проверить официальный repo, тег/commit, подпись/релиз, лицензию, автора, зависимости и install scripts, примеры network calls, SECURITY.md/PRIVACY.md, permissions, есть ли telemetry; получить внутренний stop/go. Pin dependencies и hash/lockfile в изолированном каталоге, запускать как непривилегированный процесс без секретов, Google OAuth, npm publish, browser cookies, SSH, `~/.aws`, production env.

**Gate SEC-01:** эксперимент только с публичными сайтами, отделённый browser profile без входа в личные аккаунты; минимум сетевых запросов, лог доменов/запросов, запрет скачивания/отправки приватных данных.

**Gate SEC-02:** результат анализа не используется как инструкции к shell/agent; все URL/тексты с чужих страниц — недоверенный контент, прежде чем выполнить команду/изменить файл нужны подтверждённый intent, repo diff и политика безопасности.

**Gate SEC-03:** проверка лицензии самого инструмента/зависимостей отдельно от лицензий конкурентов; нельзя делать вывод «open-source агент = разрешено клонировать платный SaaS».

### 9.3 Privacy by design

- По умолчанию нет Google/Meta/third-party analytics на private pages. GA4/Meta/advertising privacy hold не обходить. Контент запроса, тестов, здоровья, сексуальных практик, переписки не отправлять в пиксели или клиентские URL.
- Нельзя использовать персональные ответы тестов для рекламной сегментации или автоматического навязывания персональной «диагностики».
- Исследовательские sample sessions — только синтетические без real PII; для реальных клиентов требуется отдельное согласие и минимизация.
- Нейтральные push/SMS/Telegram/WhatsApp: «В кабинете доступно обновление» и защищённая ссылка, без contents/score/symptoms.
- Security acceptance включает auth, role isolation, RLS, CSRF/session, input validation, injection protection, abuse/rate limiting, SSRF/URL allowlist, XSS, media access, privacy opt-out/STOP, retention and deletion.

## 10. QA и доказательства качества

### 10.1 Mandatory проверка на каждый PR

1. Прочитать реальные issue/AGENTS/актуальный SHA branch и open PR, убедиться что модуль/фикс ещё не реализован и не конфликтует с другими.
2. Измерить baseline текущего собственного поведения до правки (route, viewport, elapsed, console, render/layout snapshots без PII).
3. `npm run test:unit` и релевантные `node --test tests/...`; `npm run lint`, `npx tsc --noEmit`, `npm run build` (или CI эквивалент). Документировать независимые сбои; не писать «green», если глобальные проверки красные.
4. `npm run verify:seo` для SEO-маршрутов, dedicated unit/contract tests, Playwright desktop + Chromium mobile + WebKit mobile, manual iOS/Android если требуется физический телефон.
5. Контроль new routes: locale preservation, metadata, keyboard, screen reader labels, 320/375/390/430, offline/slow 3G/retry, 200% zoom, reduced motion.
6. Performance: comparison same environment/device/network, p75 Web Vitals при реально достаточной выборке, локальные Lighthouse snapshots и размера HTML/RSC/JS; не заявлять скорость без доказательства.
7. Security: tenant/client/master A/B/C, negative 401/403, rate limit, CSRF/session, role checks/RLS, secret/token scan, no external data leak.
8. Если затронуты платежи/доставка — отдельный provider/readback E2E, только после явного разрешения на реальную транзакцию/сообщение.
9. Проверить Vercel preview commit + QA, merge только при безопасном diff и CI, **после** merge — Vercel deployment READY + SHA + canonical host; вручную открыть изменённые live routes и повторить flows.
10. Обновить #2058 и профильный issue: PR/diff, tests, failed/blocked reasons, exact SHA/deployment ID, before-after, rollback, next owner actions (не более 3).

### 10.2 Таблица обязательных сценариев

| ID | Сценарий | Ожидаемое доказательство |
| --- | --- | --- |
| E2E-01 | Гость открывает EN/RU/ES коммерческий лендинг на 320/390/430 | первый экран, CTA, legal copy, fonts/media, no overflow |
| E2E-02 | Order раскрывает inline capture, keyboard focus / Escape если применимо | одна форма, сохраняется контекст, нет нежелательной модалки |
| E2E-03 | Submit без consent или с неверным контактом | ничего в CRM, валидатор, предсказуемая ошибка |
| E2E-04 | Submit + double-click + network timeout/retry | 1 DB lead/reference и однозначная user acknowledgement |
| E2E-05 | Обычный WhatsApp/Telegram open | только draft/open; **не** считать доставкой |
| E2E-06 | Гость бесплатно заканчивает тест → результат → save/CTA | бесплатное содержимое доступно, нет PII в URLs |
| E2E-07 | Реальный тестовый клиент + мастер + посторонний мастер | клиент/мастер видят только допустимое, постороннему 403 |
| E2E-08 | Клиентское сообщение, просмотр, reply | 2 UI + DB readbacks; провайдер отдельно при внешнем канале |
| E2E-09 | Создать платежный заказ, вернуться без оплаты | paid=false, никакого entitlement |
| E2E-10 | Подтверждённый платёж и повтор webhook | один verified receipt, один entitlement, cabinet access |
| E2E-11 | Неправильная валюта, отмена, refund | нет ложной оплаты, корректное состояние/аудит |
| E2E-12 | Start/close/reload/resume/complete курс | сохранённый server progress, account isolation |
| E2E-13 | Фильтры Holistic Support + video/audio + locale | медиа не перемешаны, Play воспроизводит правильный asset |
| E2E-14 | Выключенный consent, logout, неавторизованный admin/client | нет cookies/PII leaks, no private cache/index |
| E2E-15 | Merge и Vercel READY на canonical host | проверенный deployed SHA, live click-path; «CI PASS» недостаточно |

**Статусы:** PASS=проверено на указанном уровне с доказательством; FAIL=воспроизводимый дефект; BLOCKED=нет разрешения/real account/provider/phone или условия не позволяют тест; NOT_RUN=не выполнялось. Синтетика никогда не переименовывается в real E2E.

## 11. Аналитика, эксперименты и экономика

### 11.1 North-star и вспомогательные показатели

**North-star:** подтверждённая чистая выручка / трудоёмкость + оплаченные заявки по услугам. Метрики:
- `qualified_enquiries / server_confirmed_enquiries`; `time_agreed / qualified`; `provider_verified_payments / time_agreed`; `net_cash_received`; `repeat_paid`, срок ответа, возвраты.
- UX: доля дошедших до результата (при законном измерении), form validation failure, accessibility errors, mobile completion, course save/resume, click-to-useful-action.
- Perf: LCP/CLS/INP и HTML/RSC bytes с одинаковыми методиками замера, контрольные приборы/версии.
- Качество исследований: доля функций с независимым evidence, PR с доказанным rollback, bugs/regressions per feature.
- Business guardrail: 0 новых платных API или provider charges без разрешения, 0 PII leaks, 0 дубликатов CRM, 0 ложных оплат.

### 11.2 Правила экспериментов

1. Сначала честный baseline за 14 дней **если** разрешён сбор и достаточно наблюдений; иначе «not measured», никакого фиктивного GA4.
2. Менять одну продуктовую гипотезу за раз, фиксировать версию UI, дату, источник, locale/device, denominator, % missing/opt-outs.
3. При низком объёме — качественные интервью/ручная приёмка вместо «статистически значимого» победителя.
4. При улучшении CTA не ухудшать качество лидов, стоимость исполнения, отказ/возврат, accessibility или privacy.
5. Через 7/14/30 дней сравнить не только click-through, но и paid conversion; при отсутствии payment provider отдельное состояние BLOCKED.

### 11.3 Приоритет по ICE / ограничение WIP

Сначала **Risk gate** (privacy/legal/payment/auth); провал = не брать в работу. Для прошедших:
- Impact 1–5 (потенциал улучшить именно подтверждённую ценность и бизнес-путь).
- Confidence 1–5 (качество evidence + fit к существующим модулям, а не яркость чужого UI).
- Effort 1–5 (чем дороже, тем ниже итог).
- Формула приоритета: `Impact × Confidence / Effort`. Время на P0 до P2 распределить по проверенным состояниям/зависимостям; этот показатель — планирование, не обещание результата.
- WIP: одновременно максимум 1 P0 коммерческий flow PR и 1 независимое публичное UX улучшение; не параллелить изменения в тех же компонентах.

## 12. Программа по неделям и Gates (оценка, не обязательство сроков)

| Время | Фаза / работа | Артефакт | Gate / критерий перехода |
| --- | --- | --- | --- |
| День 0–2 | G0: аудит production branch, live Vercel, existing PR/issues, Terms/лицензий Remaster/REA, vendor security | snapshot/ADR, зависимости, budget = 0 | безопасный эксперимент разрешён или STOP |
| День 3–5 | G1: 3 P0 публичных источника (Practice Better, Truity/16P, Kajabi) + сравнение HH | evidence ledger, AS-IS/TO-BE, 3 user flows, ICE | данные достаточны, нет копирования |
| День 6–10 | G2: один пилот свободный результат/услуга → inline CTA → backend acknowledged lead | маленький PR, tests, desktop/mobile preview | E2E lead и нет regressions |
| День 11–14 | G3: CRM/payment gap audit с Practice Better/Kajabi, без реальных списаний | статусная карта, list of blockers, permission-safe checks | реально подтверждённый live поток или BLOCKED |
| Неделя 3–4 | G4: допилить полноту коммерческой цепочки только в имеющемся code | 1–2 small PR, provider proof if approved | consent/RLS/CRM/payment pass |
| Неделя 5–6 | G5: Today/Continue + minimal Holistic Support benchmark | UX research + focused PRs | прогресс/контент без потери privacy |
| Неделя 7–8 | G6: Meditation/practitioner listing/player или OPORA/Reiki micro UX (выбрать один) | 1 pilot + localized QA | media ownership и resume verified |
| Неделя 9–10 | G7: traffic/retention metrics при lawful measurement; один минимальный A/B | measured report | оплаченные/пользовательские исходы различимы |
| Неделя 11–12 | G8: remove unsuccessful changes, unify components, release notes, next quarter decisions | postmortem, backlog reprioritization | нет дубликатов/неоплаченных зависимостей |

**Если G0 или G2 заблокированы:** ничего не разворачивать вопреки политикам, продолжать независимую UX-спецификацию и внутренний test harness; статус BLOCKED. Сроки зависят от существующих параллельных PR, живых провайдеров, проверки лицензий и ручных согласований. Зафиксировать оценку времени после Discovery, не расходовать ресурсы вслепую.

## 13. Backlog готовых карточек для small PR

| ID | Priority | Гипотеза и результат | Основной модуль HH | Не делать |
| --- | --- | --- | --- | --- |
| BENCH-01 | P0 | оценка Remaster security/Terms, pinned sandbox, research ledger | docs + dev-only tools | install on prod / secrets |
| BENCH-02 | P0 | собственная click-path baseline mobile/free review | existing services and tests | new landing architecture |
| BENCH-03 | P0 | компактное раскрытие inline capture после CTA | `CompactLeadCapture` | modal + redirect where not desired |
| BENCH-04 | P0 | server-verified lead + dedup + honest consent | `/api/service-enquiries` + CRM | click-as-lead |
| BENCH-05 | P0 | friendly result, privacy-safe next step | My Tests/Insights + #1223 | borrowed clinical scores |
| BENCH-06 | P0 | messages/task/workday UX improvements | My Practice + #985 | CRM-v2 |
| BENCH-07 | P0 | payments/order status E2E across Square/PayPal | existing commerce | fake paid after redirect |
| BENCH-08 | P1 | personalized single Today/Continue | My Development Path / Courses | new profile/AI engine |
| BENCH-09 | P1 | first-screen Holistic Support intent filters | existing Holistic Support | duplicated navigation |
| BENCH-10 | P1 | meditation audio/video public player with rights/locale | existing media and master pages | unlisted as private storage |
| BENCH-11 | P1 | practitioner profile + chosen alias and content cards | existing practitioner modules | new marketplace |
| BENCH-12 | P1 | OPORA/Reiki one-action slide + resume | existing Course Engine | copied Duolingo character/streak |
| BENCH-13 | P1 | accessibility + LCP/CLS/perf bundle regression | relevant route + performance tests | autoplay/heavy clone CSS |
| BENCH-14 | P2 | Daylio-like trend/readable check-ins | My Tests/Reports; #1223 | fabricated validity |
| BENCH-15 | P2 | one paid mini-course entitlement test | existing billing + My Courses | unsupported price/subscription |
| BENCH-16 | REA-LIMITED | authorized own-app runtime failure investigation | own PWA/Capacitor/client if needed | analysis of competitor binaries |

Каждый BENCH-* не создавать автоматически как 16 новых GitHub issues; на этапе работы привязывать к существующему профильному issue, открывать дочерний только когда принят scope/DoD. Не превращать backlog в параллельный долг.

## 14. Роли, решения и документация

- **Owner/Product:** утверждение платных расходов, цен, публикации, новых чувствительных интеграций/сообщений и использования фото/видео; решает Go/No-go по пилоту.
- **Product investigator:** отбирает research, записывает evidence, AS-IS/TO-BE и ограничения доступа, не пишет код по чужому источнику.
- **Codex/engineer:** читает текущий production branch, issues, schema, миграции; делает минимальный diff и тесты.
- **QA/security reviewer:** независимый проверяющий на originality, RLS, consent, locale, mobile, provider E2E и rollback.
- **Release operator:** merge, Vercel READY, SHA, alias, live browser, даты, evidence на issue.

**Артефакты в репозитории (только авторские выводы, без копий чужого контента):**
- эта программа: `docs/benchmarking/HOLISTIC_HOUSE_REVERSE_ENGINEERING_PROGRAM_V1_20261025.md`;
- следующие пилоты: `docs/benchmarking/studies/BENCH-XX.md` (создавать по потребности);
- release/evidence от нас: текущий `docs/audits` / issue/PR, приватные собственные browser traces в разрешённом хранилище, не в public git;
- без дополнительной БД специально для «benchmark telemetry»; экспериментальные счётчики только в существующей privacy-safe аналитике после разрешения.

**Регулярный рабочий цикл:** выбрать 1 user pain → собрать минимум 2 независимых evidence sources → AS-IS тест → TO-BE с собственной эстетикой → security review → 1 PR → CI/browser E2E → по разрешению live проверка → update issue → измерение после. Исследование не должно порождать автоматические PR каждую ночь или ежечасно без оснований.

## 15. Матрица Go/No-Go и Stop conditions

**GO** если одновременно: улучшает утверждённый бизнес-путь; есть доступные публичные evidence; Terms/лицензии и privacy разрешают метод; решение сохраняет существующие данные и UX; owner approvals получены где требуются; есть test plan, rollback, измеримая проверка.

**STOP** если: требуют обойти доступ/DRM/ToS, скачать proprietary код/ассеты, предоставить секреты стороннему npm/MCP, использовать чужие реальные аккаунты/PII, потратить деньги без согласия, включить сбор здоровья в рекламный pixel, обойти RLS, создать ложную оплату/бронь, дублировать CRM/кабинет, нарушить locale/доступность, сделать merge с неопределённым production base/SHA.

**PAUSE / NO-GO** если: инструмент небезопасен, требует слишком широкий доступ или эффект против конкурента не подтверждён; тогда пользоваться обычными ручными публичными UX исследованиями и Playwright **без REA/Remaster**, работать по тем же спецификациям.

## 16. Acceptance для всей программы (не путать с accept конкретного PR)

- [ ] Исходная стратегия и текущие профильные issues связаны, source-of-truth не размножены.
- [ ] Изолированный PoC исследовательских инструментов проведён или обоснованно отклонён; записаны версии, лицензии, permissions и результат.
- [ ] Минимум 3 приоритетных публичных user flows задокументированы с датой, ссылками и проверяемым выводом.
- [ ] По 1 pilot feature есть реальный baseline, собственный TO-BE, originality/brand audit, small PR, green applicable CI, mobile/locale/accessibility/regression evidence.
- [ ] Реальная CRM заявка читается назначенным мастером; не маскируются непроверенная внешняя доставка, неподтверждённая запись или оплата.
- [ ] При работе с billing verified provider receipt/amount/currency/order, successful access; иначе BLOCKED.
- [ ] Ни один endpoint/таблица/каталог/кабинет не продублирован ради паттерна конкурента.
- [ ] После каждого merged change известны exact production commit SHA, Vercel deployment READY, canonical alias, live browser flow и rollback.
- [ ] По итогам двух циклов исследовать полезность инструмента: измеренные часы до/после, качество PR, число ошибок, retained benefit. Если затраты/риски превышают пользу — отказаться от инструментов.
- [ ] Owner получает 1–3 конкретных действия со ссылками только в местах, где нужен его личный доступ/согласие.

## 17. Конкретный первый пилот: BENCH-03/04/05 (готовое handoff-ТЗ)

**Тема:** «Понятный результат → добровольная сессия → реальный контакт».  
**Эталоны:** публичный паттерн результата теста Truity/16Personalities; фокус страницы/CTA Headspace; подтверждение заявки Practice Better.  
**Наши места:** существующий результат одного свободного теста или `free-situation-review`, `CompactLeadCapture`, `/api/service-enquiries`, CRM #985; точную точку подключения выберет engineer после current source audit.

**User stories:**
- Как гость я бесплатно вижу честный собственный вывод по тесту, не обязан покупать/логиниться; я могу выбрать одну доступную самостоятельную практику или запросить €50/€100 персональную сессию.
- Как посетитель с конкретным запросом я открываю форму в текущем экране, ввожу минимум контакта, отдельно соглашаюсь, могу исправить ошибку, получаю реальный ID сохранённой заявки — без ложного обещания записи.
- Как мастер я вижу ровно одну новую заявку в существующей CRM, её проверенный источник, могу сделать follow-up; не получаю результаты здоровья в публичных messenger уведомлениях.

**Detailed contract:**
1. UI не показывает платный overlay и не скрывает бесплатный result; отдельное consent checkbox/подтверждение согласно существующей законной реализации.
2. Form component reused, обрабатывает loading/error/submit/resubmit; inline behaviour при согласованном UX; корректный scroll/focus.
3. Existing enquiry route определяет реально авторизованного practitioner/owner; whitelist service_key, validator, rate limit + dedup, privacy filters; no raw medical notes in attribution.
4. Successful submission → server response с собственным reference и permanent DB readback → CRM list/read, **не** выражать это как оплачено.
5. Альтернативные Telegram/WhatsApp доступны только как добровольный внешний канал и не считаются lead без подтверждённого intake.
6. Никакая платёжная логика в этом пилоте не изменяется; платная сессия оформляется через текущую верную цепочку и независимые блокеры #990.

**Acceptance:** тест 320/390/430, EN/RU/ES; no horizontal overflow; screen-reader labels; no forced auto-enrolment; 0 new DB tables по умолчанию; double submit=1 lead; error=0 ложных success; provider-independent CRМ readback; CI/preview/live SHA доказаны. **Выпуск пилота не означает готовность оплаты**.

**Порядок CODING handoff:**
- сначала получить current SHA/PR/AGENTS и прочитать компоненты + тесты;
- составить короткий технический diff plan и зафиксировать owner-approved UX;
- написать/обновить regression tests, затем минимальный implementation;
- lint/typecheck/unit/build/Playwright/RLS;
- PR в `codex/public-book-library`, review CI, разрешённый merge, Vercel READY/SHA/alias;
- доказать E2E формы и real CRM; оставить payment отдельным BLOCKED при отсутствии provider confirmation.

## 18. Ссылки на источники и границы знания

**Технологии:** https://github.com/thenavidm/remaster (README + clean-room/security/privacy), https://github.com/morluto/rea (README + installation/security/disclaimer), https://playwright.dev/docs/intro, https://developers.google.com/web/tools/lighthouse. Текущие инсталляционные команды, версии и лицензии **проверять перед установкой**, документация меняется.

**Наш продукт:** https://github.com/andylitvinov-design/books/tree/codex/public-book-library, https://github.com/andylitvinov-design/books/issues/2058, https://github.com/andylitvinov-design/books/issues/990, https://github.com/andylitvinov-design/books/issues/985, https://github.com/andylitvinov-design/books/issues/988, https://github.com/andylitvinov-design/books/issues/1716, https://github.com/andylitvinov-design/books/issues/1519, https://github.com/andylitvinov-design/books/issues/1223.

**Фиксация статуса:** 25.10.2026 добавлена начальная программная реализация G0/G1: `data/benchmarking/reference-patterns.json` (10 hypothesis rows), `lib/benchmarking/reference-matrix.mjs` (валидация источника, приватности и планового ранжирования), `scripts/benchmarking/plan.mjs` (CLI без сети), `tests/benchmark-reference-matrix.test.mjs` и профильный GitHub workflow `.github/workflows/hh-benchmark-program.yml` — PR #2061. Это **не** web crawl, не запись в CRM, не запуск платных сервисов и не установка Remaster/REA. Профильный benchmark workflow в первом прогоне PASS; общие workflow могут FAIL из-за других модулей и требуют независимой оценки перед merge. Продуктовая UX правка — отдельно #2063, без предположения о live. Расширенная UX-съёмка конкурентов, реальная CRM-подача, провайдерские платежи и live mobile E2E **не выполнялись в рамках подготовки этого документа**. Каждый следующий PR обязан записывать новые доказательства отдельно.

---

**Версионирование:** v1.0 — исходная программа; v1.1 — корректировки после G0 и исследовательского пилота; v2.0 — изменения архитектурного scope только после проверки эффекта. Приоритет действующей стратегии и существующих продуктовых контрактов выше любой инструментальной рекомендации.

### Приложение A. Реализация G0/G1 без установки сторонних инструментов (25.10.2026)

Read-only offline pilot не требует секретов, доступа к браузерному профилю, Supabase, Vercel, HeyGen или сторонним платным API. Запускать после клонирования текущей production-ветки и безопасного checkout на отдельной ветке: `node --test tests/benchmark-reference-matrix.test.mjs`, `node scripts/benchmarking/plan.mjs`, `node scripts/benchmarking/plan.mjs --json`. Не путать сортировку приоритетов с измерением конверсии. Исходные документы конкурентов сохранять ссылками без копирования чужих материалов. CI: `.github/workflows/hh-benchmark-program.yml` и профильные tests. Реальную Remaster/REA установку, privacy/ToS разрешение и egress check продолжать только после выхода отдельной Mac-песочницы в online и фиксированного supply-chain review. На дату редактирования Mac `air-andrii-3.lan` показывает OFFLINE через Desktop Commander: tool installation на Mac объективно BLOCKED. Этот блокер не мешает выпуску безопасного offline harness.
