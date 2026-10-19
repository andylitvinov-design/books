# Holistic House — SEO Master Plan v3: концепция, программа 90 дней и ТЗ

**Актуально:** 16 октября 2026 · **План:** 16.10.2026–14.01.2027 · **Owner:** Andrey Litvinov.
**Главный трекер и история:** [books #306](https://github.com/andylitvinov-design/books/issues/306). **Код/production source:** `andylitvinov-design/books`, ветка `codex/public-book-library`; НЕ репозиторная default-ветка `codex/bootstrap-books`.
**Связанные планы:** [Growth #223](https://github.com/andylitvinov-design/books/issues/223), [Google Ads readiness #323](https://github.com/andylitvinov-design/books/issues/323), [SEO demand map](../../data/seo-demand-map.json), [execution manifest](./seo-306-execution-manifest.md).

> **Single source of truth:** этот живой документ хранит согласованные SEO-акценты, стратегию, дорожную карту и проверяемое ТЗ. Issue #306 хранит историю, решения и статус задач; `data/seo-demand-map.json` хранит структурированные ключевые слова с provenance. Датированные старые аудиты — архив на дату, не сегодняшнее состояние. При каждом изменении обновлять документ + манифест + комментарий в #306, не плодить стратегические дубликаты.

## 0. Решение от 18.10.2026 — SEO v3.1: качество поиска → подтверждённый лид → запись

**Статус 18.10.2026:** первый SEO-спринт [PR #992](https://github.com/andylitvinov-design/books/pull/992) **merged и LIVE** (`c834aee16d71c5e83e2ebd049d8aa837ff398ced`, Vercel READY `dpl_DAJ1xJsexeWw3ohP8WdZX3zxRRPF` в проверенном временном окне). Следующий отдельный спринт: исправление старого аудитора, релевантная перелинковка Home → /tests, содержательные объяснения/FAQ и воспроизводимое мобильное QA через GitHub Actions. **Published URL ≠ Google indexed URL**; реальные заявки/оплаты не выдумывать.

### Пересмотр концепции

- **North star:** реальные квалифицированные обращения, подтверждённые заявки на инициацию, записи и оплаты, а не число SEO URL. Анализировать organic non-brand/brand, landing page, language, topic, cohort; сравнивать только проверенные GSC и CRM события. Не приписывать органике незаслуженные конверсии.
- **Три понятных бесплатных входа:** публичный каталог self-check tests → частный интерфейс прохождения; Free Situation Review (анкета + рисунок «Я — цель — проблема» → письменный разбор, без обещания бесплатного звонка); бесплатная диагностика ресурсов Wu Xing. Платные консультации только по добровольной отдельной заявке.
- **Курс Reiki:** SEO landing → добровольный Start Course (лид стадии 1 лишь при подтверждённой записи/действии, не при просмотре) → выполнение модулей → письменный запрос на персональную инициацию (лид стадии 2) → подтверждение преподавателем. Tantra free introduction и полный 9-level course имеют отдельные канонические темы и страницы.
- **Local vs worldwide:** EN/P1 — systemic/business constellations и консультации Toronto/Ontario; EN worldwide — Reiki courses/free introductory sessions; RU/ES — полноценный, не механически дублированный перевод действительных услуг. Не вводить вымышленные адреса, лицензии, отзывы, события или гарантии результата.
- **Privacy/health:** рекламная аналитика хранит только безопасную техническую атрибуцию и факты получения согласия/регистрации, без ответов тестов, причин обращения, симптомов, рисунков и персональных рекомендаций. Client Cabinet, test explorer/results, приватные документы — noindex/авторизация. Homeopathy — education, без заявлений о лечении заболеваний.

### Карта «интент → URL → микроконверсия → CRM»

| Priority | Intent / topic | Один основной URL / family | Проверяемая конверсия |
| --- | --- | --- | --- |
| P0 | free psychological self-checks / бесплатные тесты / tests de autoevaluación | `/{en,ru,es}/tests` → приватный `/{locale}/client/tests` | Открытие каталога → начало теста → сохранение (отдельно, без текста ответов) |
| P0 | free written situation review | `/{locale}/services/free-situation-review` | Успешно принята заявка и сохранена в CRM, а не только клик |
| P0 | Toronto constellations / personal and business sessions | существующие опубликованные страницы Services/Andy | Подтверждённый лид и запись |
| P0 | Tantra Reiki free introduction | `/{locale}/academy/reiki/tantra-reiki/free-initiation` | Заявка на доступ/инициацию после указанного процесса, без обещаний автоматики |
| P1 | Reiki Yggdrasil, Tantra 9-level, Kundalini, Temple | существующие Academy routes | Start course, завершённый курс, инициатива на персональную инициацию |
| P1 | free Wu Xing resource profile | `/{locale}/wu-xing` / реально существующая форма | Подтверждённое прохождение/запрос; не передавать персональный профиль в GA4 |
| P1 | branded trust / about Andrey | `/{locale}/about` / `/` | Переход на услугу и подтверждённая заявка |
| P2 | quality education/library | существующие страницы, без массовых thin URL | Контекстные переходы на релевантную услугу |

### 90-дневная программа (18.10.2026–15.01.2027)

**Спринт A · 18–25 октября — P0 / crawl и доступность.** Убрать `/en|ru|es/tests` → приватный редирект, создать уникальные indexable публичные страницы с EN/RU/ES контентом и прямым CTA на существующий noindex explorer. Добавить sitemap/hreflang/self-canonical/OG, source regression и browser проверку 320/390/430 px. Перепроверить фактические 200/404, ошибочные редиректы, H1 на /es, untranslated labels, broken media, IA v2, production acceptance и ветку release. Исправлять source bug, не отключать CI.

**Спринт B · 26 октября–8 ноября — P0 / conversion.** Публичные Home, Free Review, личные/бизнес-расстановки, Reiki L1: уникальные value propositions, первое действие в видимой области, ясные ограничения и реальные цены, смысловые текстовые ссылки; никакого дубля «бесплатный звонок». CRM `source/medium/campaign/landing/locale/first-touch/last-touch` с consent gating, dedupe и server-confirmed events `lead_created`, `course_started`, `initiation_requested`, `booking_confirmed`, `payment_confirmed`. Трекать отдельно клик, submit и реально принятый лид; без медицинских/психологических ответов и без искусственной атрибуции.

**Спринт C · 9 ноября–6 декабря — P1 / полезный контент и доверие.** На базе верифицированных поисковых тем обновить 6–8 *оригинальных* образовательных материалов, не генерировать сотни одинаковых страниц: сравнение трёх Reiki-систем, что входит в бесплатную инициацию, безопасная первая практика, личная расстановка, письменная Free Review, осторожное чтение баллов тестов, Toronto FAQ, процесс онлайн-консультации. Каждому материалу — автор, дата/пересмотр, проверяемые источники, внутренние ссылки к одному реальному посадочному URL. Только легитимные упоминания и ссылки партнёров; никаких покупных ссылок или вымышленных отзывов.

**Спринт D · 7 декабря–15 января — P1/P2 / эффективность.** Еженедельные GSC queries/pages/country/device, index coverage/public URLs, duplicate titles, source-verified Lighthouse mobile and CWV when available; каждые 28 дней анализ landing → real lead → service → sale by source. Перенаправлять усилия лишь на проверенные кластеры. Реклама/бюджет отдельно в #323, не запускать без авторизации.

### ТЗ SEO-18 с критериями приёмки

1. **SEO-18-01 Public tests landing (P0, started):** EN/RU/ES `/{locale}/tests` должны возвращать 200, собственные Title/H1/Description, absolute self-canonical и взаимные hreflang; никаких редиректов в `/client/tests`; в sitemap ровно 3 этих публичных URL без query strings; интерактивный `/{locale}/client/tests` остаётся `noindex,follow:false` и закрыт в robots. CTA должен вести в существующий интерактивный каталог, без изменения учётных записей/результатов; mobile 320/390/430 без горизонтального скролла.
2. **SEO-18-02 Crawling/IA (P0):** для всех публичных URL sitemap HTTP 200 либо объяснённый canonical redirect, H1 (не дублированный), теги, noindex/private, media links; QA — machine-readable report по timestamp/точному deployment SHA. Прогон `npm run verify:seo`, `npm run verify:ia-v2`, `npm run lint`, `npx tsc --noEmit`, `npm run build` и релевантный browser; регрессии не скрывать.
3. **SEO-18-03 Lead attribution (P0):** безопасные `first_touch`, `last_touch`, `source/medium/campaign`, `landing_path`, `locale`, `consent_status`, `event_id` с дедупликацией и согласованием CRM; переходы и клики не считать оплатами/лидами. Не пересылать чувствительные данные в GA4/Ads; проверка GDPR/PIPEDA/consent и ролей admin.
4. **SEO-18-04 Service links & trust (P1):** уникальное поле Title/H1, индексируемый смысловой текст на ключевых Services/Academy, понятный путь до действия, фактический автор/подтверждённый опыт, корректный legal scope. JSON-LD только для реального видимого контента.
5. **SEO-18-05 Analytics (P1):** `/admin/seo` должен указывать дату и провайдера, явно показывать offline/stale, не выводить фиктивные CTR/revenue. На 18.10 прямой доступ GSC Wizard **blocked: subscription_required**; Google ownership не аннулируется этим сообщением. Сервисный аккаунт для real-time админки подключать только в server env с ограниченными правами и отдельно после согласования. Измерения индексации, CTR и дохода не выдумывать.
6. **SEO-18-06 Release gate:** от актуальной `codex/public-book-library`, проверка чужих активных PR, source/build/browser/public SEO, merge только с зелёным gate; Vercel READY + canonical alias + exact source SHA + live 200/metadata/privacy. При ошибке — не называть Published/Live.

**Факт на 18.10:** GitHub source подтвердил P0 redirect из `next.config.ts` на `/{locale}/client/tests`; privacy explorer задана `robots: { index:false, follow:false }`. PR branch `seo/public-test-discovery-20261018` содержит начатое исправление и source tests. Сам production не изменён, пока PR не принят и не проверен. Google baseline 601 sitemap URL, Google crawl и 1/19 tracked indexed из 17.10 — исторический датированный snapshot, не текущие результаты.


### 18 октября — SEO-18-07: дополнительная техническая приёмка и навигация

**Обнаруженный регресс в собственном SEO-контроле:** `scripts/verify-live-sitemap.mjs` ошибочно продолжал требовать 301/308 для `/en/tests → /en/client/tests`, хотя #992 заменил устаревший redirect на публичную indexable EN-страницу. Исправить контракт и добавить `/en/tests`, `/ru/tests`, `/es/tests` в spotlight: HTTP 200, один H1, точный self-canonical, reciprocal `hreflang` EN/RU/ES/x-default, неблокирующий robots, OG/Twitter, реальные CTA, отсутствие личных ответов. Не обходить ошибки — разрешать только каноническую публичную страницу.

**Пользовательская перелинковка:** Home EN/RU/ES должна иметь отдельную текстовую ссылку на `/{locale}/tests` рядом с блоком бесплатного мониторинга, при этом прямой guest-start `/{locale}/client/tests` остаётся без лишнего шага. Не изменять авторизацию, результаты/баллы и внутреннюю конверсионную логику. Публичная страница тестов объясняет 3 реальные темы, ограничения методик, возможность гостевого старта и приватность; текст без медицинских диагнозов и гарантий.

**Экономное независимое mobile/browser QA:** существующий GitHub workflow `hh-live-seo-audit.yml` после production push запускает public-only Chromium 320/390/430 px × EN/RU/ES (9 сценариев), проверяет горизонтальный скролл, H1 ≥28px, вводный текст ≥15px, CTA ≥44px, title/description/canonical/hreflang/noindex и сохраняет PNG+JSON на 14 дней. Никаких логинов, тестовых ответов, писем или платных браузерных сервисов. **Это имитация мобильного Chromium, не физический iPhone и не данные GSC/CrUX.**

**Гейт:** `node --test tests/seo-nightly-crawl.test.mjs tests/public-tests-seo-landing.test.mjs`, `npm run verify:seo`, `npx tsc --noEmit`, `npm run build`, PR CI, READY exact SHA, фактический live JSON/PNG. Если общий CI падает в других одновременно меняющихся модулях — документировать без ослабления проверок. В GSC Wizard на 18.10 `subscription_required`; не пытаться обойти оплату или пере-верифицировать Google.

## 1. North star и продуктовые воронки

**Цель SEO — подтверждённые обращения и продажи, не количество страниц/позиций.** Английский EN — основное продвижение; RU и ES — полные, честные локализации, каждая со своим каноническим URL. Локальные услуги ориентированы на Toronto/Ontario, дистанционные программы Reiki — Canada/международный англоязычный поиск.

1. **Личная работа:** Search → About/Services/внятный landing → бесплатный письменный Free Situation Review: короткая анкета → собственноручный рисунок «Я — ЦЕЛЬ — ПРОБЛЕМА» → персональный письменный разбор. Это **не бесплатный звонок**. Затем добровольная платная консультация (€50/30 мин express; €100/60 мин standard) или конкретная услуга.
2. **Academy:** Search → точная Reiki/Temple система и ступень → оригинальные тексты/видео/PDF, реальные условия → добровольная заявка WhatsApp → преподаватель подтверждает доступность. Просмотр видео и семь вопросов не равны фактической инициации.
3. **Free self-check tests:** открытое прохождение и оценка шкал → предложение войти через Google, получить объяснение и рекомендации; приватные ответы, результаты, личные документы, Client Cabinet, персональные видео **никогда не индексировать**.
4. **Маркетплейс мастеров:** уникальная публичная карточка реально подтверждённой услуги → контакт/запись; пустые, неопубликованные, дублирующиеся профили и бесконечные фильтры не должны создавать «индексный спам».
5. **Library/Homeopathy education:** полезные оригинальные материалы с внутренними ссылками на связанные страницы, без медицинских гарантий, выдуманных диагнозов, недоказанных отзывов и подмены обычной/неотложной помощи.

## 2. Карта приоритетов и поисковых намерений

*Все фразы — редакторские seed-гипотезы, НЕ подтверждённая частотность, CPC или позиции.* Каждому главному поисковому намерению нужен один основной URL. Нельзя создавать пять одинаковых лендингов под один запрос.

| Priority | Поисковые запросы / смысл | Главная посадочная | CTA / ограничение |
| --- | --- | --- | --- |
| **P0** | free tantra reiki initiation; free tantra reiki level 1; online tantra reiki initiation; free tantra reiki attunement | `/{locale}/academy/reiki/tantra-reiki/free-initiation` | video → materials → 7 questions → **request** free teacher-led introduction (если доступно) |
| **P0** | free personal situation assessment; free situation review; бесплатный разбор ситуации по рисунку | `/{locale}/services/free-situation-review` | анкета+рисунок → письменный разбор, не звонок |
| **P0** | family constellations Toronto; personal constellation session | `/en/services/andy-litvinov/personal-constellation-session` | описать формат, границы и реальную запись |
| **P0** | business constellations Toronto | `/en/services/andy-litvinov/business-situation-constellation` | конкретные deliverables, без финансовых гарантий |
| **P0** | reiki courses online; free initiation into Reiki systems | `/{locale}/academy/principles-of-energywork` | различить Yggdrasil / Tantra / Kundalini, ссылки на 3 отдельных курса |
| **P0** | free Reiki Yggdrasil initiation; Reiki Yggdrasil Level 1 | `/{locale}/academy/reiki/yggdrasil/free-initiation` | свободная вводная vs платная персональная инициация, PDF |
| **P1** | tantra reiki training; tantra reiki nine levels | `/{locale}/academy/reiki/tantra-reiki` | оригинальная **9-level** программа, НЕ подмена free L1 |
| **P1** | Kundalini Reiki 3 levels; Kundalini Reiki free initiation | программа + отдельная free page | оригинальный PDF/видео, подтверждённая заявка |
| **P1** | Andrey Litvinov, Holistic House | `/{locale}/about` и Home | реальные компетенции/опыт, никаких выдуманных лицензий |
| **P1** | free stress tests; psychological self assessment | законченные PUBLIC tests landing pages | честная методика/ограничения, PRIVATE results noindex |
| **P1** | Temple Studies | `/{locale}/academy/temple-studies` | реальные традиции и формат занятий без выдуманных дат |
| **P2** | materia medica, Reiki source materials, symbolic practice | существующие Library/Academy/Homeopathy | helpful content, технический аудит thin/orphan/duplicate |
| **HOLD** | hypnotherapy Toronto / homeopathy consultation Toronto | отдельная стратегия между PsiTrends и Holistic House | юридическая проверка титулов и health-claims перед Ads |

**Семантическая защита:** код-кластер R04 = Tantra 9-level curriculum; новый R07 = Free Tantra Reiki Level 1. RU/ES имеют самостоятельные эквивалентные заявки. Не создавать «free attunement automatically», «certified healer», «disease cure» SEO-текстов.

## 3. Проверенное состояние на 16.10.2026

**Обновление 16 октября — впервые VERIFIED Google Search Console.** Право собственности подтверждено официальным Google через уже опубликованный HTML-тег. GSC Wizard зарегистрировал https://holistichouse.vercel.app/ с правом `siteOwner`. Google принял и скачал sitemap.xml: **594 URL заявлено, 0 индексировано по моментальному отчёту карты сайта, 0 предупреждений и ошибок**. Search Analytics 28/90 дней с данными по 14.10: **0 кликов, 0 показов**, CTR и средняя позиция без показов не имеют содержательной интерпретации. [Датированный Google baseline и on-page аудит 19 публичных страниц](./gsc-baseline-2026-10-16.md).

- Production: https://holistichouse.vercel.app/ · Vercel project `codex-public-book-library`, source `codex/public-book-library`. Последний увиденный READY production SHA на дату аудита: `8c6506155e094e47800a395735d3f4130cab5644`. Он может измениться — каждый новый PR обязан проверять alias и commit заново.
- Merged [#708](https://github.com/andylitvinov-design/books/pull/708), [#709](https://github.com/andylitvinov-design/books/pull/709): EN/RU/ES Free Tantra SEO Title, descriptions, H1, FAQ, OG/Twitter, WebPage+Breadcrumb JSON-LD, sitemap priority и regression checks. Public readback английской, русской и испанской страниц был сделан. Сохранены оригинальные видео, семь вопросов в свернутом блоке, WhatsApp. Актуальные личные офферы Tantra: €50/30 мин и €100/60 мин.
- Priority sitemap: **5 проверяемых семейств × EN/RU/ES = 15 специальных URL** (About, Free Situation Review, Yggdrasil Basic, Yggdrasil free L1, Tantra free L1). Общий динамический sitemap больше и меняется; число URL **не** равно числу проиндексированных Google страниц. `robots.txt` ссылается на `sitemap.xml`; private path не должны попадать в индекс.
- `app/layout.tsx` содержит исходный `google-site-verification` тег, и **Google подтвердил ownership подключённому аккаунту 16.10.2026**. Доступ GSC Wizard активен. Sitemap принят и скачан, 15 curated + 4 дополнительные публичные страницы проверены Google URL Inspection (5 «обнаружены, не в индексе», 14 «неизвестны Google»). **Indexing Tracker активен для 19 URL.** Повторная проверка собственности не требуется.
- GSC предоставляет настоящий начальный baseline **0 показов/0 кликов** за 28/90 дней до 14 октября. Это не доказывает отсутствия проиндексированных URL за всё время: после регистрации карта показывает 0/594 и требуется время на обход. Отдельно GSC Wizard **не получил Google Analytics OAuth-scope** (`list_ga4_properties`: `connected=false`); код `Ga4Analytics`/consent не доказывает подключение GA4. Keyword Planner, Google Trends, реальная конверсия и meaningful CTR/позиция всё ещё **NOT AVAILABLE**.
- Бесплатное предложение Tantra — запрос вводной инициации с преподавателем, при наличии свободного времени, а не автоматический результат от просмотра ролика.
- Поиск/индексация: Google требует полезный авторский контент, crawlable internal links, корректный canonical/hreflang; запрещены ненадёжные медицинские обещания. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## 4. Программа продвижения на 90 дней

### Этап 0 — 16–22 октября: база и измеримость (P0)
- [x] SEO-лендинг Free Tantra 3 локали LIVE, 15 priority URLs добавлены, sitemap и robots подготовлены.
- [x] Verification meta есть в repository source.
- [x] Google подтвердил права через существующий HTML-тег; GSC Wizard получил `siteOwner` и зарегистрировал свойство.
- [x] Google скачал `https://holistichouse.vercel.app/sitemap.xml` (594 URL, 0 ошибок); выполнена проверка 15 приоритетных + 4 дополнительных страниц и включён Indexing Tracker для 19 URL. **Само индексирование ещё ожидается**, без обещания срока.
- [x] GSC Wizard on-page crawler: 19/19 проверенных публичных страниц indexable, 0 high/critical, 54 heuristic предупреждения. [Baseline](./gsc-baseline-2026-10-16.md).
- [ ] Независимый LIVE SEO regression на exact release SHA, reciprocal hreflang/self-canonical/noindex private/redirects и mobile screenshots 320–430px.
- [ ] Продемонстрировать гостевой CTA→WhatsApp *handoff*, не заявлять, что клик означает доставленный лид.

### Этап 1 — 23 октября–5 ноября: money pages (P0)
- [ ] Согласовать Home/Services/личный landing и Free Situation Review: понятный оффер, не free call, цены отдельно, EN/RU/ES, видимый мобильный CTA.
- [ ] Доработать public personal/business constellations: кому, с чем работают, формат, что получает клиент, ограничения, WhatsApp.
- [ ] Естественные контекстные внутренние ссылки Home/Services/Academy → Free Situation Review и Free Tantra L1; тексты ссылок должны содержать реальный смысл, не keyword-stuffing.
- [ ] Mobile 320/375/390/430px для free Tantra: читаемый H1, 3 компактных предложения, вопросы закрыты изначально, видимые кнопки, без jank/горизонтального скролла.
- [ ] Public masters marketplace: индексировать только реально опубликованные подробные карточки, `noindex` для пустых/черновых, фильтры без бесконечной URL-комбинаторики.

### Этап 2 — 6–26 ноября: Академия и авторский контент (P1)
- [ ] По отдельности улучшить Yggdrasil (7 modules, Basic 5 levels), Tantra (9 levels), Kundalini (3 levels), Temple Studies, Principles of Energywork; не сводить всё к «generic Reiki».
- [ ] Подготовить 6–8 ценных оригинальных объяснений: what free introduction means; Reiki systems compared; online Level 1 process; 7 study questions; what a personal session covers; first practice guide; free written assessment methodology; Toronto consultation FAQ.
- [ ] Организовать путь Academy hub → course → free L1 → programme/download/WhatsApp; сильные текстовые ссылки, точная семантика.
- [ ] Для существующих оригинальных видео — poster/click-to-play, доступность, транскрипт, корректные подписи. Новые генерации/публикации видео только по отдельному явному поручению.

### Этап 3 — 27 ноября–17 декабря: техническая и локальная SEO-гигиена (P1)
- [ ] Crawl **реальных публичных** sitemap URL: status/redirect chain/title/H1/indexable/canonical/hreflang, orphan/duplicates, thin pages и публичные ошибки.
- [ ] Проводить PageSpeed/CrUX с источником, датой, средой и сравнимыми метриками; не выдумывать оценки/время.
- [ ] Развести роли PsiTrends (если primary hypnotherapy) и Holistic House, не создавать конкурирующие Google Business Profile по одному адресу без оснований; проверить реальные GBP сведения и title policy.
- [ ] Подтвердить GA4 real property, consent, public-only anonymous events, DebugView. Ни тестовые ответы, ни заболевания/психопрофили, ни PDF/рисунки клиента не должны передаваться в аналитику.

### Этап 4 — 18 декабря–14 января 2027: оптимизация по фактам (P1/P2)
- [ ] При наличии GSC: 28/90d query/page/country/device, CTR opportunities и реальные indexed/coverage exceptions, сравнение EN/RU/ES.
- [ ] Контент улучшать по конкретным запросам и проблемам пользователя, а не «создать 100 thin страниц».
- [ ] Публиковать ежемесячный SEO scorecard с verified leads/bookings, indexed public URLs, CTR/position только из GSC и CPA/ROI только если Ads реально согласован, запущен, и данные достоверны.
- [ ] **Ads:** готовность и требования в #323; без явного отдельного подтверждения никаких кампаний, биллинга, бюджета, ремаркетинга по здоровью.

## 5. Codex / dev ТЗ с критериями готовности

| ID | ТЗ | Файлы / данные | Проверка |
| --- | --- | --- | --- |
| SEO-01 | Проверить GSC ownership handoff: существующий tag, owner account; не делать самодельную OAuth-верификацию | `app/layout.tsx`, Search Console | Google реально сообщил Verified + property читаема connector-ом |
| SEO-02 | 15 EN/RU/ES priority sitemap + canonical/hreflang/robots/private/noindex | `app/sitemap.ts`, `data/seo-priority-paths.js`, `scripts/verify-seo.mjs` | 15/15 unique canonical, reciprocal languages, no PII and client paths |
| SEO-03 | Обновить R07 Free Tantra seed EN/RU/ES не смешивая R04 curriculum | `data/seo-demand-map.json` | 3 unique locale+cluster, all unknown metrics null, real free-page URLs |
| SEO-04 | Free assessment and paid consultations no misleading promises | Home, Services, landing | письменный разбор != free phone call, actual EN/RU/ES CTA, €50/30 €100/60 accurate |
| SEO-05 | Crawlable context links / no orphan Free L1 | Home/Academy/Services | настоящие `<a>` links без дубликатов/конфликтующих redirect |
| SEO-06 | JSON-LD, trust, local information | Academy/About | no false credentials, star ratings, cure claims, fake GBP addresses |
| SEO-07 | Public test entries vs private client boundary | Tests/app/report routes | public helpful routes indexable; results, clients, questionnaires private/noindex |
| SEO-08 | Marketplace page lifecycle and facets | Public masters/service routes | only published/unique/indexable; drafts and filter combos noindex |
| SEO-09 | GSC/GA4 + conversion semantics | connected tools/real logs | property, consent, DebugView verified; click ≠ confirmed lead |
| SEO-10 | Performance/mobile accessibility | PageSpeed & browser QA | dated real CWV report, 320–430px, no autoplay large MP4 |
| SEO-11 | Original EN/RU/ES educational content | Academy/Library/Service | unique helpful content, language parity, medically safe |
| SEO-12 | Release + checklist & documentation | #306, this plan, manifest | isolated PR, test evidence, Preview SHA, Vercel READY live SHA + rollback |

**Политика исполнения:** перед каждой задачей проверить Vercel canonical alias, branch, latest SHA and concurrent PRs. Не редактировать `codex/bootstrap-books` или старую копию. Сначала targeted unit tests, затем `npm run verify:seo`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, browser acceptance и `npm run verify:seo -- --live-base=https://holistichouse.vercel.app` когда доступен live. Ошибка тестов = воспроизведение и исправление либо точное описание blocker. Каждый PR содержит изменённые файлы, дату, результаты, preview/live SHA и rollback. Не ломать Кабинет, Тесты, курсы Reiki, формы, цены, видео, приватность и авторские тексты.

## 6. KPI, метрики, privacy

| KPI | Статус baseline 16.10.2026 | Кто подтверждает |
| --- | --- | --- |
| 15 приоритетных трёхъязычных URL | введены в source / public; свежий full smoke требуется | GitHub+Vercel+live |
| Google verified property | **VERIFIED · siteOwner** (16.10.2026) | Search Console + GSC Wizard |
| Google sitemap indexing (snapshot) | **0 / 594** after first submission; not whole-site count | Google Search Console `list_sitemaps`, 16.10 |
| Organic clicks / impressions, 28d & 90d | **0 / 0** through 14.10; not a trend | GSC API, property verified 16.10 |
| CTR / average position | **Not meaningful without impressions** | Wait for impressions and Google crawl |
| Search volume / CPC / Google Trends | **NOT AVAILABLE** | Google Planner / original Trends export |
| Qualified enquiries and paid bookings | **NOT VERIFIED** | actual consented receipt/business journal |
| GA4 Realtime/DebugView and attribution | **NOT VERIFIED** | correct GA4 account |
| CWV (LCP/INP/CLS) | **NOT MEASURED in this checkpoint** | dated PageSpeed/CrUX |
| Paid Ads spend | **No launch in this SEO project** | owner approval/#323 |

**Metric integrity:** `null` означает отсутствие данных, не ноль. Нельзя переносить цифры PsiTrends/Ezohata в Holistic House. Search Console = Google impressions/clicks; sitemap count ≠ indexed count; Google Trends 0–100 ≠ monthly volume. Microconversion click (в WhatsApp) ≠ подтверждённая заявка. Не передавать имена, диагнозы, здоровье, персональные результаты тестов, нарисованные схемы, сообщения и кабинет в GA4/Ads или индекс.

## 7. Внешние блокеры и рабочий handoff

- **Google Search Console теперь подключён**: URL-prefix подтверждён, тег не менять, владелец больше не должен подтверждать сайт. [Google baseline](./gsc-baseline-2026-10-16.md). Отслеживать Indexing Tracker и корректно реагировать на настоящие покрытия/ошибки после обхода Googlebot.
- Попытка открыть Search Console через авторизованный браузерный коннектор 16.10 остановилась **до запуска** из-за недостаточного баланса стороннего wallet; никаких денег автоматически не тратить.
- Сделано: GSC Wizard `add_site` → sitemap accepted/fetched → URL Inspection 19 pages → baseline 28/90 days → 19 URL tracked + Free Tantra content group/search cluster. Будущая работа: добиваться полезного контента/доступности для обхода и **ждать фактической индексации**, не делать повторные отправки sitemap каждый день.
- **GA4 scope в GSC Wizard не подключён** (`connected=false`); если нужны отчёты GA4, владелец должен отдельно разрешить Google Analytics доступ в tool.gscwizard.com. Код GA4 на сайте не является верификацией account-level аналитики. Ads, billing и compliance — отдельные разрешения; согласно [Google people-first](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) нужны реальные авторские объяснения, а не SEO-спам.

## 8. Процесс ведения документа и ссылки

Каждую пятницу: добавить dated STATUS к #306 + execution manifest (DONE/IN REVIEW/BLOCKED/NEXT), проверить последние live source SHA и 15 URLs. В конце месяца: scorecard из **реального источника** и 3–5 следующих задач с owner/DoD. Списки задач держать в issue + manifest, не плодить новые стратегии. При смене политики менять здесь и фиксировать дату.

**Источники:** [SEO #306](https://github.com/andylitvinov-design/books/issues/306); [Growth #223](https://github.com/andylitvinov-design/books/issues/223); [Ads #323](https://github.com/andylitvinov-design/books/issues/323); [Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

**Changelog 2026-10-16 · afternoon:** Google ownership/siteOwner verified, sitemap 594/0 Google snapshot, all 19 URL inspected and tracked, 19/19 on-page indexable; source-backed first 28/90d zeros saved. See GSC baseline. Safe Organization logo and Yggdrasil metadata improvements in next SEO PR.

**Changelog 2026-10-16:** v3 consolidates Free Tantra L1 SEO release, 15 priority locale URLs, real GSC access blocker, R07 seed, updated paid/free offers, goals, roadmap, Codex specs, KPI and privacy policies.

## SEO live follow-up — 2026-10-16 (post-#741/#743)

Production audit is tied to the exact Vercel source SHA, not the repository
default branch. On 16 October 2026 the verified production deployment was
\`4c7e64dd3a6e7cdeaa5389731eedfa58db3d790a\` (READY, aliased to
\`https://holistichouse.vercel.app\`).

- The public sitemap fetch returned **604 distinct URLs**: **196 EN, 197 RU,
  187 ES**, plus **24 unprefixed** (mostly canonical book-reader paths).
  Old \`/books\` redirect and client/admin routes were absent.
- Source/live spot checks: ES homepage language metadata is Spanish; EN Books
  canonical/OG/Twitter are present; \`/en/tests\` resolves to
  \`/en/client/tests\`; random RU missing route returns real HTTP 404.
- In the sample, EN/RU/ES remedy Arnica descriptions are complete, localized
  and 126–134 characters. The legacy EN/RU Books descriptions were only
  67 characters; ES Services description was 229; EN Library 165. This
  follow-up adds human-written 120–160-character replacements.
- **Google Search Console:** the earlier *historical baseline* on this date
  remains 594 submitted, 0 indexed, 0 errors, 0 warnings. Updated sitemap
  was **re-submitted successfully at 2026-10-16 19:44:25 UTC**. Google
  confirmed receipt, with a new download pending. Do not confuse the live
  604-URL sitemap with a confirmed Google fetched/indexed count.
- The dedicated public-only live auditor checks *every* indexed route for
  HTTP 200, sitemap lastmod/hreflang reciprocity, redirects and sampled
  page title/description/H1/lang/canonical/OG/Twitter plus 404. It stores a
  JSON report as a GitHub Actions artifact. An independent Lighthouse workflow
  measures mobile/desktop performance, LCP, CLS, TBT and lab SEO, with INP
  only if actually available.
- CrUX field data **not configured** in the connected GSC Wizard (no CrUX
  API key). Google mobile performance >=90 and field INP are **not verified**;
  do not assert a performance score without a real Lighthouse report.
- Historical broad test-suite failures include pre-existing brittle
  Services/Nav assertions; acceptance must distinguish them from actual code
  regressions. Separate SEO/live tests remain mandatory, not silently waived.

**Remaining pass gate:** Live audit artifact must show all 604+ canonical
sitemap URLs = HTTP 200 and no invalid hreflang/metadata; then check the
updated Vercel SHA/alias, mobile Lighthouse score and real ES source quality
on the most frequently visited pages.


### 16.10.2026 — live SEO acceptance, updated canonical sitemap

- Production commit `d46b97755a890b77590f5cb504a7f82bf2632e2e` verified READY with `holistichouse.vercel.app` alias. Source PRs: [#741](https://github.com/andylitvinov-design/books/pull/741), [#743](https://github.com/andylitvinov-design/books/pull/743), [#745](https://github.com/andylitvinov-design/books/pull/745).
- First exhaustive GitHub Actions audit checked 604 indexed sitemap URLs: 599 returned 200, 5 redirects, 0 404/5xx, 0 network failures. The 5 redirects were two obsolete Relationships paths and three `master-shamanic-healing` Academy aliases. The code now indexes canonical pages only; live map has **601 distinct URLs** (five removed, two canonical Explore pages added).
- Google Search Console downloaded the final 601-URL sitemap on **2026-10-16 19:55:59 UTC**. Warnings=0, errors=0, indexed=0 in current crawl snapshot. Do not equate accepted URLs with indexed URLs. Earlier 594/604 snapshots are historical.
- Confirmed 404 pages for EN/RU/ES return HTTP 404, one H1, correct locale, consistent title and `noindex`. EN/RU/ES book and library descriptions plus ES Services description were corrected to 120–160 characters. Canonicals/OG/Twitter are checked on selected pages by the automated auditor.
- A GitHub Actions workflow now checks *every* current sitemap URL and publishes a JSON artifact, with a production-deploy grace period on push to avoid checking the previous Vercel commit. An independent Lighthouse workflow records public Home mobile/desktop LCP/CLS/TBT/score and lab SEO once executed.
- CrUX real-user history is **not configured** in connected GSC Wizard, and Lighthouse score ≥90 or INP are not yet confirmed. The broad pre-existing suite has unrelated legacy UI-contract failures; the dedicated live SEO audit is not to be bypassed.

## 2026-10-16 23:11 UTC — PR #739 released; 15-page HTML acceptance

- [PR #739](https://github.com/andylitvinov-design/books/pull/739) merged at **23:08:21 UTC** as `7443781dcf0225fbc2e75448bece3d30bc1f4f1c`. The actual squash tree `27ab8f5218b9477e166042cdacc00ffe2335ce34` equals the independently computed merge tree and the exact candidate with **17/17 successful CI checks**. This includes the restored strict shared acceptance checks; earlier broad-suite failures above are historical, not current blockers.
- Vercel alias `https://holistichouse.vercel.app` independently resolved at **23:10:19 UTC** to deployment `dpl_9zDqSt9Rs3qLwgvc3pyiCNhTKB2W`, **READY**, source SHA `7443781dcf0225fbc2e75448bece3d30bc1f4f1c`.
- At **23:13:01 UTC**, the alias had advanced to **READY** descendant `4f9f34c2af4b4968acb82e7960866919f5536d87` (deployment `dpl_7HQVkox4UQno6HFzKSz6tEqpK4P9`, PR #751, direct parent `7443781`). The observations below are bounded by these two alias snapshots; individual responses do not expose a verified commit SHA, so they are not all assigned to the earlier deployment.
- Fresh public GETs at **23:10:35–23:11:41 UTC** passed the released HTML verifier for **all 15 priority EN/RU/ES URLs**: HTTP 200 without following redirects; 15 distinct nonempty titles; exactly one title, description and H1; absolute self-canonical; reciprocal EN/RU/ES hreflang; valid JSON-LD including WebSite and the required Tantra WebPage/BreadcrumbList; no observed public `noindex` in meta or response headers. This is public HTML acceptance, not proof of Google indexing or a mobile visual audit.
- `npm run verify:seo` source-only checks passed, plus **54/54 focused source/synthetic regression tests**. At **23:14 UTC**, ordinary unauthenticated GETs of the exact public `robots.txt` and `sitemap.xml` URLs returned HTTP 200 without redirects, credentials or a protection bypass. The released validators passed on these saved responses: **601 unique sitemap URLs**, all **15 priority URLs with reciprocal locale alternates**, no private-route families, query/fragment URLs, duplicates or unexpected origins; effective robots rules allow the priority pages and block the tested private path families. Sitemap SHA-256: `8632e4b989822ab81d4aa252f2d1ae670454a9337b568b874dbcd7670314d0e9`; robots SHA-256: `b6b6ea9df11f88208fd8016d87e7f6901213f1b756d69ba055d4645468e98bcd`. The earlier 15:45 `Tunnel connection failed: 403 Forbidden` was a historical transport failure and no longer reproduces; it is not a current blocker or a verified owner refusal. The 601 URLs were checked for sitemap structure/privacy, not individually fetched in this checkpoint.
- Fresh public HTML at **23:12 UTC** also confirms exactly one localized Free Tantra Level 1 anchor on each EN/RU/ES Home and Academy page (**6/6 pages**).
- Delivered: localized contextual Home/Academy → Free Tantra Level 1 links; ES course-entry label explicitly says the course is in English while retaining its existing English destination. Approved free/paid offers, original videos, questions and enquiry choices remain intact. PR #742’s channel labels and PR #706’s assessment changes are preserved.
- GSC facts remain those in the dated baseline and later **19:55:59 UTC / 601 submitted URLs** checkpoint above; earlier 594/604 snapshots are historical. No new GSC submission or inspection was performed. Sitemap-listed/audited URLs must not be described as Google-indexed URLs. Future checks depend on an available authorized connector and do not change Google ownership.

**Remaining priorities:** retain whole-sitemap HTTP/metadata audit coverage separately from this 15-page acceptance; verify 320–430px visual/accessibility and actual Lighthouse/CWV results; finish Services contextual-link/public-card lifecycle review while preserving the separately merged consultation-form work in [PR #751](https://github.com/andylitvinov-design/books/pull/751); verify published masters versus private results/cabinet boundaries; improve original educational content and monitor genuine Google crawl/indexing evidence. GA4 consent/access and confirmed enquiry attribution remain separate, unverified work. Do not equate a WhatsApp click with a received enquiry.

### 16.10.2026 23:57 UTC — Free Tantra: scoped mobile UX acceptance

**SEO-10, мобильная часть Free Tantra EN/RU/ES: PASS.** Публичные `/en|ru|es/academy/reiki/tantra-reiki/free-initiation` проверены в настоящих viewport Chromium 320×844, 390×844 и 430×844, DPR 1. Все девять сочетаний без горизонтального скролла; заголовки, цены и основные CTA не обрезаны. Сохранены оригинальное видео `w2BN-HYmHUk`, семь вопросов, пять шагов, WhatsApp/Telegram и €0 / €50 за 30 минут / €100 за 60 минут.

На 390 px для всех локалей подтверждены Enter/Space и видимый фокус вопросов, раскрытие контактов касанием и клавиатурой, Tab к WhatsApp, полная видимость обеих ссылок 134,5×48 px и отсутствие перекрытия по hit tests. Прокрутка до конца страницы проходит. Первичная обрезка контактов в раннем снимке оказалась вопросом времени съёмки: после стабилизации автоматической прокрутки не воспроизводится. Исправлений сайта для этой приёмки не потребовалось.

**Evidence:** [успешный run 38983868377](https://github.com/andylitvinov-design/ai-projects-brain/actions/runs/38983868377), artifact `public-free-tantra-mobile-evidence` [12082387433](https://api.github.com/repos/andylitvinov-design/ai-projects-brain/actions/artifacts/12082387433), 39 JPEG + JSON, 23:57:13.892–23:57:30.116 UTC. Размеры и SHA256 всех изображений проверены; ZIP SHA256 `26758d9db83876715d41194f5912737f4bf94533ef987d7db1d58ab1abfd552a`. Артефакт хранится до 30.10.2026 23:57 UTC.

**Production bounds:** отдельные Vercel readback в 23:55 UTC до и 23:57 UTC после съёмки совпали: READY `dpl_GZvJMFGbTcosM6HzFm3AvwZD41h7`, canonical alias `holistichouse.vercel.app`, source SHA `60e11d5df9b2cb683963ff14dc85dfe472a45cf2`. Код probe: `ai-projects-brain@347917ac4bb289909cf416df44492a360ac24df2`; его commit не является source SHA сайта.

**Scope:** top/choices на всех ширинах; подробные интерактивные состояния и конец страницы только на 390 px. Эмуляция Chromium, не физический iPhone/Safari. Воспроизведение видео, внешняя отправка сообщений, реальные заявки, CWV/CrUX, индексация и остальные money pages этим аудитом не приняты. Общие SEO/analytics acceptance gates остаются отдельными.
