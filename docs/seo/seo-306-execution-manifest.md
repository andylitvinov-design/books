# Holistic House SEO #306 — execution manifest (living)

**Last checked:** 2026-10-16 · **Strategic master:** [Holistic House SEO Master Plan v3](./holistic-house-seo-master-plan.md) · **Issue owner/tracker:** [#306](https://github.com/andylitvinov-design/books/issues/306).
**Actual production branch:** `codex/public-book-library` · **Observed READY alias/source:** `holistichouse.vercel.app` / `f3e0eac75f4ebfa2481b63b356f25b3a25a0574c` (reconfirm before EVERY write or publication). GitHub default branch is not production source.

| ID | Deliverable | State 2026-10-16 | Evidence, acceptance or blocker |
| --- | --- | --- | --- |
| T1 | Technical SEO foundation #309 (canonical, sitemap, safe locale priority, source tests) | **DONE** | PR #309 merged earlier; published code inherited by current production |
| T1b | Historical React hydration #418 browser regression | **DONE for SEO foundation** | Existing CI restored original useId; do not weaken browser gate |
| T2a | Public technical SEO and verifier | **DONE initial / ongoing** | `npm run verify:seo`, sitemap+robots, priority 5 × EN/RU/ES = 15; source PRs #708/#709 |
| T2b | Live 15/15 audit: status, self canonical, hreflang, structured data, no private leak, mobile | **PARTIALLY VERIFIED** | Tantra EN/RU/ES public readback and READY Vercel; full automated 15-page head/meta crawl still pending |
| T2c | Preserve existing Google verification tag | **DONE source / owner pending** | `app/layout.tsx` contains `google-site-verification`; connected Google account lacks verified property |
| T3 | Free written assessment + personal consultation / Services journey | **IN PROGRESS** | PR #712 merged into current production; review real guest handoff, accuracy, links, English/Russian/Spanish |
| T4a | Distinct metadata for Yggdrasil/Tantra/Kundalini/Temple | **DONE baseline** | Academy overrides shipped via prior SEO; use individual original paths |
| T4b | Free Tantra SEO primary focus: titles, FAQs, OG, schema, 15 priority sitemap entries | **DONE** | Merged PR #708 & #709, verified EN/RU/ES public text; prices €50/30 and €100/60 preserved |
| T4c | Free Tantra SEED demand R07 separated from curriculum R04 | **THIS BRANCH** | 3 locales, all real metrics null; tests/seo-demand-map.test.mjs |
| T4d | Academy internal linking / original content / 6–8 educational answers | **NEXT** | See master plan v3 SEO-05/SEO-11, do not over-duplicate pages |
| T5a | GSC ownership verification on connected Google identity | **BLOCKED — external authorization** | GSC Wizard add_site reports unverified; existing meta tag may belong to different Google owner; cannot click Google Verify in a browser without wallet credit/login |
| T5b | Submit sitemap + inspect 15 priority pages + 28/90-day genuine search metrics | **BLOCKED by T5a** | Never replace NOT AVAILABLE with zero or use PsiTrends/Ezohata figures |
| T5c | Google SERP/Trends/Keyword Planner validation | **NOT VERIFIED** | No sourced dated geo-specific exports; editorial seeds only |
| T6 | Google Ads readiness / conversion data contract | **DRAFT / NO LAUNCH** | Separate issue #323; do not spend, enable campaigns, remarket health signals or claim clicks as conversions |
| T7 | Master SEO strategy + 90-day roadmap + Codex acceptance criteria | **THIS BRANCH** | `docs/seo/holistic-house-seo-master-plan.md`, linked to #306 |
| T8 | Public masters/Test SEO privacy and crawl control | **NEXT** | Only finished published public pages indexable, private cabinet/report/noindex protected |
| T9 | Speed/Core Web Vitals mobile baseline | **NEXT** | Dated PageSpeed/CrUX test; no invented metrics |

## Release-ready next steps

1. Merge only the current isolated SEO-doc/data PR after targeted source tests + unit/lint/TypeScript/Next build and CI. No changes to private Client Cabinet or existing author-approved service content.
2. Confirm production deployment of the **exact** merged SHA (not merely READY of a prior preview) and re-run live `npm run verify:seo -- --live-base=https://holistichouse.vercel.app`.
3. Complete an external readback for all 15 curated paths and real mobile 320/390/430px; record failures and triage.
4. Owner grants GSC property to the connected Google account or completes verification in Search Console. Then connector add_site → sitemap → URL Inspection. No manual intervention by Codex can override Google's access control.
5. Weekly issue update: what is confirmed/live, blocked, next PR, Google property status and exact source/proof.

## Rollback

Revert only the respective isolated commit/PR if it regresses routing, index safety, website, tests or CTA. Do not use stale bootstrap branch, disable existing private routes, force push concurrent work or roll back recently approved €100/60 pricing.

All tracking/keyword figures remain source-bounded and health/client-data safe.