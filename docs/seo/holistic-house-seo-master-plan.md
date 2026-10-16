# Holistic House — SEO Master Plan v3: концепция, программа 90 дней и ТЗ

**Актуально:** 16 октября 2026 · **План:** 16.10.2026–14.01.2027 · **Owner:** Andrey Litvinov.
**Главный трекер и история:** [books #306](https://github.com/andylitvinov-design/books/issues/306). **Код/production source:** `andylitvinov-design/books`, ветка `codex/public-book-library`; НЕ репозиторная default-ветка `codex/bootstrap-books`.
**Связанные планы:** [Growth #223](https://github.com/andylitvinov-design/books/issues/223), [Google Ads readiness #323](https://github.com/andylitvinov-design/books/issues/323), [SEO demand map](../../data/seo-demand-map.json), [execution manifest](./seo-306-execution-manifest.md).

> **Single source of truth:** этот живой документ хранит согласованные SEO-акценты, стратегию, дорожную карту и проверяемое ТЗ. Issue #306 хранит историю, решения и статус задач; `data/seo-demand-map.json` хранит структурированные ключевые слова с provenance. Датированные старые аудиты — архив на дату, не сегодняшнее состояние. При каждом изменении обновлять документ + манифест + комментарий в #306, не плодить стратегические дубликаты.

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

- Production: https://holistichouse.vercel.app/ · Vercel project `codex-public-book-library`, source `codex/public-book-library`. Последний увиденный READY production SHA на дату аудита: `f3e0eac75f4ebfa2481b63b356f25b3a25a0574c`. Он может измениться — каждый новый PR обязан проверять alias и commit заново.
- Merged [#708](https://github.com/andylitvinov-design/books/pull/708), [#709](https://github.com/andylitvinov-design/books/pull/709): EN/RU/ES Free Tantra SEO Title, descriptions, H1, FAQ, OG/Twitter, WebPage+Breadcrumb JSON-LD, sitemap priority и regression checks. Public readback английской, русской и испанской страниц был сделан. Сохранены оригинальные видео, семь вопросов в свернутом блоке, WhatsApp. Актуальные личные офферы Tantra: €50/30 мин и €100/60 мин.
- Priority sitemap: **5 проверяемых семейств × EN/RU/ES = 15 специальных URL** (About, Free Situation Review, Yggdrasil Basic, Yggdrasil free L1, Tantra free L1). Общий динамический sitemap больше и меняется; число URL **не** равно числу проиндексированных Google страниц. `robots.txt` ссылается на `sitemap.xml`; private path не должны попадать в индекс.
- В `app/layout.tsx` уже есть тег `google-site-verification`. В GSC Wizard на 16.10 доступны PsiTrends и Ezohata, но Holistic House **не verified для подключённого Google account**; `add_site` вернул явную ошибку отсутствия проверки. **Не просить новый токен без проверки, почему текущий не подтверждает подключённый аккаунт**.
- Код `Ga4Analytics`/consent существует; это не доказательство реальной связки корректной GA4 property, DebugView и верифицированных лидов. Keyword Planner, Google Trends numeric, CTR/position/index count, verified conversion — **NOT AVAILABLE** до получения источника.
- Бесплатное предложение Tantra — запрос вводной инициации с преподавателем, при наличии свободного времени, а не автоматический результат от просмотра ролика.
- Поиск/индексация: Google требует полезный авторский контент, crawlable internal links, корректный canonical/hreflang; запрещены ненадёжные медицинские обещания. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## 4. Программа продвижения на 90 дней

### Этап 0 — 16–22 октября: база и измеримость (P0)
- [x] SEO-лендинг Free Tantra 3 локали LIVE, 15 priority URLs добавлены, sitemap и robots подготовлены.
- [x] Verification meta есть в repository source.
- [ ] **Подтвердить права на GSC именно для подключённого Google-аккаунта:** существующий tag или Full permission от владельца.
- [ ] После подтверждения: GSC Wizard property, submit `https://holistichouse.vercel.app/sitemap.xml`, URL inspection всех 15 priority pages, статус indexation с реальными датами.
- [ ] CI + authenticated/external LIVE SEO smoke 15/15 URL, hreflang reciprocal, self-canonical, noindex private, redirects, 404/soft-404, Google meta; сделать проверку с точным SHA и отчётом.
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
| Google verified property | **BLOCKED** для connected account | Search Console |
| Google indexed count, clicks, impressions, CTR, avg position | **NOT AVAILABLE** | GSC property+dated report |
| Search volume / CPC / Google Trends | **NOT AVAILABLE** | Google Planner / original Trends export |
| Qualified enquiries and paid bookings | **NOT VERIFIED** | actual consented receipt/business journal |
| GA4 Realtime/DebugView and attribution | **NOT VERIFIED** | correct GA4 account |
| CWV (LCP/INP/CLS) | **NOT MEASURED in this checkpoint** | dated PageSpeed/CrUX |
| Paid Ads spend | **No launch in this SEO project** | owner approval/#323 |

**Metric integrity:** `null` означает отсутствие данных, не ноль. Нельзя переносить цифры PsiTrends/Ezohata в Holistic House. Search Console = Google impressions/clicks; sitemap count ≠ indexed count; Google Trends 0–100 ≠ monthly volume. Microconversion click (в WhatsApp) ≠ подтверждённая заявка. Не передавать имена, диагнозы, здоровье, персональные результаты тестов, нарисованные схемы, сообщения и кабинет в GA4/Ads или индекс.

## 7. Внешние блокеры и рабочий handoff

- Для Search Console нужно **одно действие пользователя/владельца** в том же Google-аккаунте, который подключен к GSC Wizard: открыть [Search Console](https://search.google.com/search-console), выбрать URL-prefix `https://holistichouse.vercel.app/` и попробовать уже установленный HTML-тег, либо дать связанному аккаунту права Settings → Users and permissions → Full. Если другой Google identity требует новый token, сначала получить его и добавить проверенным способом, не удаляя имеющийся verification тег.
- Попытка открыть Search Console через авторизованный браузерный коннектор 16.10 остановилась **до запуска** из-за недостаточного баланса стороннего wallet; никаких денег автоматически не тратить.
- После подтверждения: GSC Wizard `add_site` → submit sitemap → inspect 15 pages → source-backed 28/90 day report. Codex не может «выдать» Google ownership только изменением кода.
- GA4 code есть, но нет подтверждения connected Google Analytics property. Ads, billing и compliance — отдельные разрешения; согласно [Google people-first](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) нужны реальные авторские объяснения, а не SEO-спам.

## 8. Процесс ведения документа и ссылки

Каждую пятницу: добавить dated STATUS к #306 + execution manifest (DONE/IN REVIEW/BLOCKED/NEXT), проверить последние live source SHA и 15 URLs. В конце месяца: scorecard из **реального источника** и 3–5 следующих задач с owner/DoD. Списки задач держать в issue + manifest, не плодить новые стратегии. При смене политики менять здесь и фиксировать дату.

**Источники:** [SEO #306](https://github.com/andylitvinov-design/books/issues/306); [Growth #223](https://github.com/andylitvinov-design/books/issues/223); [Ads #323](https://github.com/andylitvinov-design/books/issues/323); [Google Search Central](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

**Changelog 2026-10-16:** v3 consolidates Free Tantra L1 SEO release, 15 priority locale URLs, real GSC access blocker, R07 seed, updated paid/free offers, goals, roadmap, Codex specs, KPI and privacy policies.