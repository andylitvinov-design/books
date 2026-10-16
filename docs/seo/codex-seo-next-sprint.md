# Codex: продолжить техническое SEO Holistic House по существующей программе #306

Ты работаешь в репозитории `andylitvinov-design/books`. **Не создавай новую стратегию и не начинай с чистого листа.** Главная стратегия/ТЗ — `docs/seo/holistic-house-seo-master-plan.md` (v3 от 2026-10-16), актуальный чек-лист — `docs/seo/seo-306-execution-manifest.md`, решения и история — GitHub Issue [#306](https://github.com/andylitvinov-design/books/issues/306); data seeds — `data/seo-demand-map.json`. Связанные Growth #223 / Google Ads #323.

**Production:**
- Проверить Vercel alias `holistichouse.vercel.app`, project `codex-public-book-library` и exact LIVE SHA.
- Source branch `codex/public-book-library`; GitHub default `codex/bootstrap-books` НЕ использовать в качестве deployment source.
- Прежде чем вносить изменения, прочесть актуальные `AGENTS.md`/`CLAUDE.md`, посмотреть незамерженные PR и проверить, не заменяют ли concurrent PR ту же страницу. Не использовать старую версию Services/Academy.
- Merged #708/#709 уже обеспечивают SEO Free Tantra EN/RU/ES. Их нельзя переписать. Бесплатное — только заявка на вводную инициацию, оригинальное видео, 7 вопросов. Платные варианты: €50/30 и €100/60. На Free Situation Review — анкета/рисунок → персональный письменный разбор, не бесплатный звонок.

**P0 — проверь и сделай самостоятельно (без дополнительных вопросов):**
1. Собери список 15 curated SEO URLs по пяти семьям из `data/seo-priority-paths.js`; проверь на текущем production: HTTP, redirect, self-canonical, alternate EN/RU/ES, соответствие H1+Title/Description, robots, OG, JSON-LD. Проверь sitemap/robots; никакие `/client`, тестовые ответы, пользовательские отчёты, `/app`, `/admin` и токены не должны попадать в sitemap/индекс. Создай воспроизводимый report PASS/FAIL с timestamp, URL, exact source SHA, без фальшивых цифр.
2. Прогони `npm run verify:seo`, `node --test tests/seo-demand-map.test.mjs tests/seo-priority-paths.test.mjs tests/tantra-free-initiation-seo.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Исправляй конкретные ошибки; не ослабляй тесты и не отключай приватность.
3. Проверь мобильные 320/390/430px: Free Tantra H1, video poster, компактные три оффера, accordion 7 questions закрыт, CTA/WhatsApp, PDF; Free Situation Review и личная платная консультация. Не делай новых видео и не меняй тарифы.
4. Приведи internal linking Home / Services / Academy / Reiki hub → реальная Free Tantra L1 page и Free Situation Review, но только если конкретных контекстных ссылок не хватает. Сохранить авторские тексты EN/RU/ES и внешний вид. Никакого keyword stuffing и дублирующих landing.
5. Отдельно проверь публичный Masters marketplace/test catalogue: индексируются лишь полноценные опубликованные публичные страницы; фильтры/личные результаты/кабинет не плодят URL. Предложи атомарный PR только после проверки фактического кода.
6. Обнови `docs/seo/holistic-house-seo-master-plan.md`, execution manifest и #306 с результатами и ссылками. Каждый PR должен включать список файлов, тесты, browser QA, security/privacy, rollback и evidence для exact SHA.

**External Google gate — НЕ имитировать:**
- В `app/layout.tsx` уже есть тег `google-site-verification`; GSC Wizard сообщает, что `https://holistichouse.vercel.app/` не verified именно для connected Google account. НЕЛЬЗЯ произвести OAuth/Google ownership лишь кодом. Если у тебя есть авторизованная сессия реального владельца, проверь Google Search Console и официальный статус; запроси/используй новый token только если Google потребует его для этого аккаунта, сохрани старый; не публикуй токен в issue.
- Только после Google says Verified: GSC Wizard add_site → submit `https://holistichouse.vercel.app/sitemap.xml` → inspect 15 pages → реальные 28/90-day reports с датой/свойством/geo.
- Если доступа нет, зафиксируй один конкретный owner action: Search Console → нужный Google identity → verify existing tag OR verified owner grants Full access. Не объявляй sitemap submitted, indexed pages, clicks=0, conversions=0.
- GA4 Tag/consent code не равен verified GA4 account/DebugView. Настрой только при доступной правильной property, не отправляй пациентские/тестовые данные.
- Никакого Google Ads запуска, оплаты услуг, HeyGen generation, публикации личных данных/видео или изменения прав без отдельного разрешения.

**Готовый результат:** небольшие безопасные PR → QA/tests → merge в verified production source при соблюдении release gate → Vercel production READY exact SHA → live audit. В #306 отдельно перечислить Done / Not Verified / Blocked / Next. Не обещай будущих действий как выполненных.
