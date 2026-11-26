# SEO Opportunity Finder · implementation and release checklist · 2026-11-26

Extends the existing authenticated /admin/seo workspace and GSC read-only service-account adapter; no new site, dependency, subscription, workflow schedule, Vercel Sandbox, DB table or external AI request. Related: #306, #3061, #988, #990, #5280. Production source: codex/public-book-library.

## Implemented in this PR
- All 20 categories from the supplied Search Console regex concept, plus free, Reiki/initiation and consultation. Unicode-aware matching in EN/RU/ES (not ASCII word boundaries), multi-label intent and 4/8/10-word counts.
- Eight additional signals: quick wins, low CTR, rising/declining observed query-page impressions, possible cannibalization within one landing language, commercial intent, question/answer review, possible query/page language mismatch. These are heuristics: neither complete demand nor validated search volumes, lead counts, content gaps or verified ranking forecasts.
- Read settled GSC web query+page rows over 7/28/90 days, same-length immediately preceding period, Pacific calendar dates, bounded 2,500 rows per interval. Google omits anonymized queries and returns top rows; absence is unknown, not zero. No false growth from missing prior rows.
- Use current canonical public sitemap allowlist and additional private-segment denylist. No raw-query persistence, public exports, GitHub issue payloads, or forwarding to AI. Drop obvious email/phone/URL/control-character rows. Remaining searches may still be sensitive: owner-authenticated UI only.
- Existing /admin/seo offers explicit Load analysis / Refresh, filters by category and landing page language, measured impressions, clicks, CTR, position, prior observations, heuristic priority and actionable review instructions. Default admin load unchanged; no provider reads for guests. UI follows existing RU/EN admin shell; ES query classification and landing filter supported.
- Tests exercise date ranges, 31 filter IDs, multilingual sample classifications, allowlist, privacy, scoring, comparison and auth.

## Remaining integration / actual owner acceptance
1. Confirm production read-only GSC service account credentials HH_GSC_SERVICE_ACCOUNT_EMAIL / HH_GSC_SERVICE_ACCOUNT_PRIVATE_KEY; verified site ownership in user's Google account does not grant this service account read access. Google Cloud Search Console API enabled, add account with read permission to https://holistichouse.vercel.app/; no keys in chat or GitHub. GSC Wizard subscription not required. Test production owner session for actual non-empty rows or verified NO_VISIBLE_ROWS. Do not equate disconnected with zero.
2. Exact-HEAD Node tests and CI, review, merge to verified production branch, then verify exact SHA and authorized UI on mobile; no independent paid build.
3. Extend existing standalone PR Monitor SEO tab (separate source/release lane) with safe link to authenticated /admin/seo#seo-opportunities or category aggregates only after privacy review. Do not add raw query strings to public monitor.
4. Daily review and weekly digest should reuse an existing authorized SEO Analyst schedule, no new cron/workflow per #5280. Until GSC is connected no actual demand report can be delivered. Use owner-safe summary and idempotent action IDs; never publish query strings to public GitHub.
5. For Gemini editorial support, reuse only configured zero-additional-spend model path. Owner-reviewed redacted topic/intent and verified public page content only; raw search queries not sent to model. Require structured draft and human review, verify claims/pricing, no automatic publication. Actual content gaps require reading page content; language gaps require matching canonical families, not only language mismatch.
6. Track approved changes against publication timestamps, with a comparable pre-change period and 7/28/90-day post-change observations. Existing CRM attribution must be independently verified before showing conversion lift. Do not create a second schedule, data pipeline or public report. Existing PR review/release gates unchanged.

## References
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://github.com/andylitvinov-design/books/issues/3061
