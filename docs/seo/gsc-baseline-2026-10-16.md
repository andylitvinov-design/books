# Holistic House — first verified Google Search Console baseline (2026-10-16)

**Property:** https://holistichouse.vercel.app/ — URL-prefix, verified ownership by existing HTML tag (Google Search Console). **Connected app:** GSC Wizard `siteOwner`, `activated: true`. **Google performance settlement:** through **2026-10-14** (Google Search Console Pacific date basis; later days incomplete). **Time of property registration:** 2026-10-16T17:06:27.641Z.

This is a **Google-backed SEO baseline**, not a claim of improved rankings, indexing success or booked leads. The strategy/source of truth is [SEO Master Plan v3](./holistic-house-seo-master-plan.md) + [#306](https://github.com/andylitvinov-design/books/issues/306).

## 1. Sitemap — official Search Console state

- Submitted `https://holistichouse.vercel.app/sitemap.xml` **2026-10-16T17:06:54.788Z**, accepted and confirmed by Search Console; fetched by Google at **2026-10-16T17:06:56.139Z**.
- Provider reports `isPending=false`, **warnings 0**, **errors 0** after processing.
- Provider reports **594 submitted URLs** and **0 indexed URLs in this sitemap snapshot**. This does **not** by itself prove zero indexed URLs across the entire site or permanent de-indexing. Just submitted; indexing may take time.

## 2. URL Inspection — 19 real public URLs

Google URL Inspection API checked all **15 curated EN/RU/ES priorities** (About, Free Situation Review, Yggdrasil Basic Course, Yggdrasil free L1, Tantra Reiki free L1) and **4 extra English pages** (homepage, Services, Principles of Energywork, full 9-level Tantra).

- **19/19 inspection requests succeeded; zero errors; 0 inspected pages reported indexed.**
- Coverage among 19: **5** `Discovered - currently not indexed`, **14** `URL is unknown to Google`.
- Among curated 15 only: **3** discovered but not indexed, **12** unknown.
- Inspections did **not** report Google-chosen canonicals or a completed crawl; those fields are **null** (NOT an inferred canonical problem).
- Google inspection quota after the first 15 was 1,985/2,000 remaining; the extra four used four more. Reinspect by tracker cadence, not repeated manual polling.

## 3. GSC Wizard active monitoring

- An Indexing Tracker was created and is **active** for the initial 15 curated pages, then **four additional key entry pages** were added: **19 tracked URL total**.
- Tracker's automated indexing checks are the intended future follow-up; do not claim it can submit ordinary pages directly to Google's index.
- `emailDigestEnabled=true` was returned at the initial 15-page tracker readback. Verification of actual email delivery is separate.
- GSC Wizard property tags: `Holistic House`, `SEO`. Its sitemap configuration points to the live XML.
- Search topic cluster **Free Tantra Reiki Initiation · EN/RU/ES** with 10 editorial seeds and its matching URL content group were created.
- An official SEO milestone annotation was saved for **2026-10-16**.

## 4. Organic performance baseline

| Metric | Last 28 days | Last 90 days | Provenance |
| --- | ---: | ---: | --- |
| Organic clicks | **0** | **0** | GSC Wizard backed by Search Console API; settled to Oct 14 |
| Organic impressions | **0** | **0** | Same |
| Query/page rows | **none returned** | Not separately requested | 28-day Search Analytics page query returned no rows |
| CTR / average position | **Not meaningful without impressions** | **Not meaningful without impressions** | UI displayed 0; do not report zero as a real ranking |

**Interpretation:** early/empty measurement immediately after new property ownership. This is not evidence of a ranking decline nor proof that a crawler is blocked.

## 5. Live on-page audit: 19 public URLs

Crawler successfully audited **19/19** selected public pages; all **19 marked indexable**, with **0 critical and 0 high-severity** issues.
It emitted **54 heuristic warnings**: 19 medium (sitewide Organization schema lacks `logo`), 35 low (title/description length or some missing image alternative text).

**Technical action staged in the related GitHub PR:**
- Add the actual first-party `/holistic-house-app.svg` (existing branded asset, 192×192) to the Organization JSON-LD `logo`; this is truthful, avoids made-up logos, and addresses the recurring schema warning if the crawler accepts it.
- Give Reiki Yggdrasil Basic Course concise EN/RU/ES descriptions. It avoids replacing teacher/course copy.
- Check low-severity title length only if snippets are truncating in observed search; do not sacrifice search intent for an arbitrary 60-character threshold.
- Missing image alt warnings **require semantic review**: decorative images should keep empty `alt=""`, informative images need meaningful alt; do not mass-insert keyword-stuffed text.

## 6. Remaining integrations and action plan

- **Google Search Console and sitemap integration are completed.** Do not ask the owner to verify again or rotate the original tag.
- **GSC Wizard Google Analytics integration is not connected**: `list_ga4_properties` returned `connected=false`, empty properties; Analytics OAuth scope needs owner authorization in GSC Wizard if actual GA4 data/reports are requested. Existing `Ga4Analytics` source code is not proof of a live GA4 property.
- **Google indexation is still pending**. Check GSC index tracker next day and weekly, assess any robots/canonical errors only if Google's coverage reports them; do not use Google's restricted Indexing API for ordinary pages.
- **Do not launch Ads, make health-effect promises or use private client/test data for analytics.**
- Plan: 1) merge/release SEO fixes after source/CI QA; 2) verify exact production SHA and re-audit 19 pages; 3) watch 19 tracked URLs; 4) add source-backed metrics to [SEO #306](https://github.com/andylitvinov-design/books/issues/306).

## Source audit record

- GSC Wizard `add_site`: registered 2026-10-16, permission `siteOwner`.
- GSC Wizard `submit_sitemap` / `list_sitemaps`: 594 / 0 indexed, warnings=0, errors=0.
- GSC Wizard `bulk_inspect_urls`: 15 + 4, all succeeded; 5 discovered, 14 unknown.
- GSC Wizard `get_site_summary` (28/90 days) and `query_search_analytics` (page, 28d).
- GSC Wizard `audit_onpage_seo`: 15 + 4, 19 pages indexable.
- Source repo: `andylitvinov-design/books` production `codex/public-book-library`.
