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

**Google Search Console теперь VERIFIED; продолжай на основе фактов:**
- GSC Wizard зарегистрировал URL-prefix `https://holistichouse.vercel.app/` как `siteOwner`. Google **принял и скачал sitemap.xml** (594 submitted, 0 indexed в начальном снимке, 0 errors/warnings); выполнен URL Inspection 15+4 публичных страниц: 5 discovered/not indexed, 14 unknown, 0 indexed. Google Search Analytics за 28/90 дней по 2026-10-14: 0 impressions и clicks; позиции/CTR пока неинформативны.
- 19 страниц добавлены в активный Indexing Tracker. Не повторяй проверку ownership и не запрашивай новый meta token. Не делай спам-повторных submit sitemap или неиспользуемых Indexing API calls. Результаты и источники: `docs/seo/gsc-baseline-2026-10-16.md`.
- Технический on-page live-аудит GSC Wizard: все 19 URL indexable, 0 critical/high, 54 heuristic замечания (19 sitewide Organization logo, 35 low по длине meta и alt). Сначала проверить официальный брендовй logo asset; decorative images не должны получать SEO-спам alt.
- Впервые появившееся индексирование и crawl coverage проверяй по tracker после реального времени обхода; никакой гарантии числа дней/позиций не давай. Все источники и даты сохраняй в #306.
- Отдельно `list_ga4_properties` вернул `connected=false`: нужно самостоятельное Google Analytics OAuth согласие владельца через `tool.gscwizard.com` перед account-level GA4 reports; код Ga4Analytics не доказывает подключение.
- Никакого запуска Google Ads/покупок/генерации HeyGen/публикации личных данных, отправки медицинских профилей в аналитику без отдельного разрешения.

**Готовый результат:** небольшие безопасные PR → QA/tests → merge в verified production source при соблюдении release gate → Vercel production READY exact SHA → live audit. В #306 отдельно перечислить Done / Not Verified / Blocked / Next. Не обещай будущих действий как выполненных.
