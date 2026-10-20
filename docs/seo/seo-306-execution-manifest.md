# Holistic House SEO #306 — execution manifest (living)

**Last checked:** 2026-10-18 (source changes only; see dated verification below) · **Strategic master:** [Holistic House SEO Master Plan v3](./holistic-house-seo-master-plan.md) · **Issue owner/tracker:** [#306](https://github.com/andylitvinov-design/books/issues/306).
**Actual production branch:** `codex/public-book-library` · **Observed READY before this PR:** `holistichouse.vercel.app` / `8c6506155e094e47800a395735d3f4130cab5644` (verify newest production SHA after merge). GitHub default branch is not production source.

| ID | Deliverable | State 2026-10-16 | Evidence, acceptance or blocker |
| --- | --- | --- | --- |
| T1 | Technical SEO foundation #309 (canonical, sitemap, safe locale priority, source tests) | **DONE** | PR #309 merged earlier; published code inherited by current production |
| T1b | Historical React hydration #418 browser regression | **DONE for SEO foundation** | Existing CI restored original useId; do not weaken browser gate |
| T2a | Public technical SEO and verifier | **DONE initial / ongoing** | `npm run verify:seo`, sitemap+robots, priority 5 × EN/RU/ES = 15; source PRs #708/#709 |
| T2b | On-page SEO 15 curated + 4 key entry pages | **DONE on-page; mobile/independent crawl PENDING** | GSC Wizard audited 19/19 indexable, 0 critical/high; 54 heuristic issues, mainly original Organization logo + image alt/length; [dated baseline](./gsc-baseline-2026-10-16.md) |
| T2c | Preserve verification tag | **DONE + VERIFIED OWNER** | Google confirmed existing HTML tag; GSC Wizard property registered `siteOwner` on 16.10.2026 |
| T3 | Free written assessment + personal consultation / Services journey | **IN PROGRESS** | PR #712 merged into current production; review real guest handoff, accuracy, links, English/Russian/Spanish |
| T4a | Distinct metadata for Yggdrasil/Tantra/Kundalini/Temple | **DONE baseline** | Academy overrides shipped via prior SEO; use individual original paths |
| T4b | Free Tantra SEO primary focus: titles, FAQs, OG, schema, 15 priority sitemap entries | **DONE** | Merged PR #708 & #709, verified EN/RU/ES public text; prices €50/30 and €100/60 preserved |
| T4c | Free Tantra SEED R07 vs curriculum R04 | **DONE** | PR #714 merged, EN/RU/ES 3 seeds, all unmeasured Google search estimates null; regression test present |
| T4d | Academy internal linking / original content / 6–8 educational answers | **NEXT** | See master plan v3 SEO-05/SEO-11, do not over-duplicate pages |
| T5a | Google Search Console ownership/connection | **DONE** | Google verified URL-prefix; GSC Wizard siteOwner and active property; no further owner verification required |
| T5b | Submit sitemap + Google inspection + baseline | **SUBMISSION + BASELINE DONE; INDEXING PENDING** | Google fetched sitemap.xml 2026-10-16; 594 submitted, 0 indexed in immediate snapshot, 0 errors/warnings; 19 URL inspections: 5 discovered/nonindexed, 14 unknown; 28/90d clicks/impressions 0 through Oct 14 |
| T5d | GSC Wizard indexing tracking / Free Tantra SEO cluster | **DONE** | 19 important public URLs auto-tracked (active tracker), email digest flag on; Free Tantra EN/RU/ES query cluster+content group and GSC launch annotation saved |
| T5e | GSC Wizard GA4 access | **BLOCKED owner consent** | `list_ga4_properties`: connected=false; add Google Analytics permission in connected GSC Wizard account (no new analytics claims) |
| T5c | Google SERP/Trends/Keyword Planner validation | **NOT VERIFIED** | No sourced dated geo-specific exports; editorial seeds only |
| T6 | Google Ads readiness / conversion data contract | **DRAFT / NO LAUNCH** | Separate issue #323; do not spend, enable campaigns, remarket health signals or claim clicks as conversions |
| T7 | Master SEO strategy + 90-day roadmap + Codex acceptance criteria | **DONE** | PR #714 merged, v3 strategy + #306 + manifest saved; GSC baseline now included |
| T8 | Public masters/Test SEO privacy and crawl control | **NEXT** | Only finished published public pages indexable, private cabinet/report/noindex protected |
| T9 | Speed/Core Web Vitals mobile baseline | **NEXT** | Dated PageSpeed/CrUX test; no invented metrics |


### 2026-10-18 — SEO-18 implementation checkpoint (PR not yet merged)

- Strategic master updated with date-specific v3.1 addendum: organic → genuinely useful free entrance → consented verified CRM lead → appointment/sale, plus 90-day sprints and SEO-18-01…06 acceptance.
- **Source verified:** `next.config.ts` redirected `/{en,ru,es}/tests` to `/{locale}/client/tests` (robots-blocked and `noindex`). New public informational `app/[locale]/tests/page.tsx` has 3 independent localized texts, descriptive headings, canonical/hreflang and visible CTAs; interactivity still at private `/client/tests`. `data/seo.js` now adds 3 EN/RU/ES public test URLs and reciprocal alternates, no private URLs. Added `tests/public-tests-seo-landing.test.mjs` source guard.
- **Release:** branch `seo/public-test-discovery-20261018` only; **NOT YET VERIFIED live**. Mandatory next: CI/checks, 320/390/430 browser, 3× production HTTP 200/self canonical, private noindex, exact release SHA/alias. Do not call these three pages indexed.
- **GSC access:** GSC Wizard connector returned `payment_required / subscription_required` on 2026-10-18; Google ownership from earlier verification is not undone. Live GSC index/CTR cannot be refreshed through this connection. Legacy 601/19/1 figures remain explicitly 2026-10-17 snapshots.
- **Risk:** active PRs modifying Home, Courses and CRM; do not overwrite concurrent work. Production deployment list during audit had a BUILDING newest commit with previous READY, so no new production revision is claimed.

## Next work following Google's acceptance

1. Run targeted tests for actual official Organization logo and concise localized Yggdrasil Basic Course meta descriptions. Preserve original course video, protected private routes and approved prices; ship small PR and verify Vercel exact SHA.
2. Re-audit the 19 public URLs after the release. Distinguish decorative empty image alt from informative missing alt. Check reciprocal hreflang, canonicals, privacy/noindex, 320/390/430px layouts.
3. Keep the GSC Wizard tracker active for **19 URLs**; wait for new Google crawl and indexed-state changes. Do not resubmit sitemap every hour or claim an indexing SLA; check [Google baseline](./gsc-baseline-2026-10-16.md).
4. Confirm Google Analytics access only if owner grants scope; do not confuse GSC data with GA4. No paid Ads, video generation or health-sensitive tracking.
5. Every work unit reports test results, exact production SHA+alias, real GSC indexed/crawl state and SEO issue #306 update.

## Rollback

Revert only the respective isolated commit/PR if it regresses routing, index safety, website, tests or CTA. Do not use stale bootstrap branch, disable existing private routes, force push concurrent work or roll back recently approved €100/60 pricing.

All tracking/keyword figures remain source-bounded and health/client-data safe.

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

### 16.10.2026 23:57 UTC — Free Tantra mobile evidence accepted

- **T4b / Free Tantra mobile UX: DONE в узком объёме EN/RU/ES.** 9 случаев 320/390/430×844, DPR 1: нет горизонтального скролла, целы заголовки/тарифы/CTA; сохранены исходное видео `w2BN-HYmHUk`, 7 вопросов, 5 шагов, WhatsApp/Telegram, €0/€50 30 мин/€100 60 мин.
- **390 px, все локали:** questions Enter/Space + видимый фокус; touch/keyboard-open/Tab контактов после стабилизации; обе ссылки полностью видимы и не перекрыты, 134,5×48 px; конец страницы достигнут. Ранний неустоявшийся снимок не подтвердил дефект; сайт не менялся ради приёмки.
- **Run:** [38983868377, success](https://github.com/andylitvinov-design/ai-projects-brain/actions/runs/38983868377). **Artifact:** [12082387433, public-free-tantra-mobile-evidence](https://api.github.com/repos/andylitvinov-design/ai-projects-brain/actions/artifacts/12082387433), 39 JPEG + report.json, capture 23:57:13.892–23:57:30.116 UTC; все размеры/hash проверены. ZIP SHA256 `26758d9db83876715d41194f5912737f4bf94533ef987d7db1d58ab1abfd552a`; expiry 30.10.2026 23:57 UTC.
- **До/после capture:** Vercel 23:55/23:57 UTC, одинаковый READY `dpl_GZvJMFGbTcosM6HzFm3AvwZD41h7`, alias `holistichouse.vercel.app`, source `60e11d5df9b2cb683963ff14dc85dfe472a45cf2`. Probe source отдельно: `ai-projects-brain@347917ac4bb289909cf416df44492a360ac24df2`.
- **Остаётся отдельно:** T2b другие priority pages, T3 guest journey, T9 реальные performance/CWV данные, GSC/GA4 и конверсии. Этот checkpoint не закрывает Issue #306 целиком. 320/430 имеют top/choices + geometry; подробная интерактивность проверена на 390. Не physical iPhone/Safari; без проверки playback или отправки в мессенджеры.

### 18.10.2026 — Sprint SEO-18-07, production follow-up after #992

- **Confirmed previous release:** [PR #992](https://github.com/andylitvinov-design/books/pull/992) merged `c834aee16d71c5e83e2ebd049d8aa837ff398ced`; observed Vercel production **READY** `dpl_DAJ1xJsexeWw3ohP8WdZX3zxRRPF` with `holistichouse.vercel.app` canonical alias. EN/RU/ES public tests page texts/links served without redirects; historical sitemap readback 673 URLs, three tests URLs included, no private entries. **These are dated production observations, not today's Google indexing results.**
- **Actual bug fixed in follow-up branch:** `scripts/verify-live-sitemap.mjs` still asserted an obsolete redirect `/en/tests → /en/client/tests`. Removed outdated expectation, added all 3 public landing spotlight pages and explicit CTA/canonical/hreflang/noindex checks. Public tests meta descriptions shortened to ≤160 chars, real first-party portrait used for OG/Twitter images.
- **SEO content + discovery:** independent EN/RU/ES sections now explain three exploration topics, limits and FAQ; public localized links added on Home beside preserved direct guest-test CTAs. No new private/test results, no medical claims or changed tariffs.
- **Affordable browser QA:** existing `hh-live-seo-audit.yml` extended with read-only Chromium 320/390/430px for all 3 public locales. Script saves 9 viewport captures + JSON for 14 days. This CI source work is **not a claim of mobile PASS until the exact run succeeds**, and not physical Safari/iPhone evidence.
- **Pending release acceptance:** targeted source unit + TypeScript + build, focused CI and production READY alias/exact SHA, then verify public pages and GitHub mobile/browser audit artifacts. Preserve unrelated concurrent CRM/report/course PRs; do not merge if this change introduces regressions. GSC Wizard account remains subscription-blocked (no fresh index/CTR).
