# Holistic House SEO #306 — execution manifest (living)

**Last checked:** 2026-10-16 · **Strategic master:** [Holistic House SEO Master Plan v3](./holistic-house-seo-master-plan.md) · **Issue owner/tracker:** [#306](https://github.com/andylitvinov-design/books/issues/306).
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

## Next work following Google's acceptance

1. Run targeted tests for actual official Organization logo and concise localized Yggdrasil Basic Course meta descriptions. Preserve original course video, protected private routes and approved prices; ship small PR and verify Vercel exact SHA.
2. Re-audit the 19 public URLs after the release. Distinguish decorative empty image alt from informative missing alt. Check reciprocal hreflang, canonicals, privacy/noindex, 320/390/430px layouts.
3. Keep the GSC Wizard tracker active for **19 URLs**; wait for new Google crawl and indexed-state changes. Do not resubmit sitemap every hour or claim an indexing SLA; check [Google baseline](./gsc-baseline-2026-10-16.md).
4. Confirm Google Analytics access only if owner grants scope; do not confuse GSC data with GA4. No paid Ads, video generation or health-sensitive tracking.
5. Every work unit reports test results, exact production SHA+alias, real GSC indexed/crawl state and SEO issue #306 update.

## Rollback

Revert only the respective isolated commit/PR if it regresses routing, index safety, website, tests or CTA. Do not use stale bootstrap branch, disable existing private routes, force push concurrent work or roll back recently approved €100/60 pricing.

All tracking/keyword figures remain source-bounded and health/client-data safe.