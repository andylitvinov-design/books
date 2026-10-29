# Holistic House — gradual public-page transformation v1
Date: 2026-10-28 (Toronto). Status: staged migration, not a finished all-site redesign.

## Canonical production and safe release
- GitHub: https://github.com/andylitvinov-design/books
- Target branch: codex/public-book-library (NOT the default codex/bootstrap-books).
- Host: https://holistichouse.vercel.app (Vercel team super10 / project codex-public-book-library).
- Before each PR/merge: read exact branch SHA; confirm Vercel production READY, alias, deployment SHA and CI. Build success or HTTP 200 alone is not E2E.
- Reuse existing application, scoring, privacy, CRM, payments, academy and media components. Do not change private client records or enable paid integrations.

## Approved visual language
Warm ivory/cream surfaces, forest-green headings and primary actions, restrained wood/brown for business course variants, four consistently tinted domain tiles, rounded 16–24px cards, readable 12–16px copy and 44px minimum interactive hit targets. Avoid global CSS changes when a scoped reusable module is possible. Preserve original video/photo assets and biography text. EN/RU/ES parity and accessible reduced-motion/focus states.

Canonical topic IDs from #2480:
- business -> /{locale}/explore/business
- relationships -> /{locale}/explore/love
- energy_health -> /{locale}/explore/energy
- personal_growth -> /{locale}/personality-profiles
These are simple navigational choices, NOT inferred personal health, financial or psychometric scores.

## Wave inventory (status is only what the linked PR/production checks prove)

| Wave | Routes / components | Target change | Gate / dependency |
| --- | --- | --- | --- |
| 1, current PR | /en/about, /ru/about, /es/about, /{locale}/contact | Reusable 4-sphere pathway, shared warm public styling, preserve biography, media, forms, privacy notes | local source contracts + lint + typecheck + build + Chromium/WebKit 320/390/430 + preview + production SHA |
| 2, pending | /{locale}/tests, /{locale}/client/tests, /{locale}/personality-profiles, signed-in My Tests/Insights | Guided test selection, post-test discussion, axes and honest recommendations, one canonical test engine | Reconcile active PRs #2482, #2485, #2486, #2487, #2489; no duplicates |
| 3, pending | /{locale}/services, /services/catalog, /services/*, /shop, /services/checkout, /thank-you | One service page language, server-confirmed lead flow and real order status | Coordinate with #990 CRM #985; preserve €50/30m and €100/60m only where applicable |
| 4, pending | /{locale}/academy/*, /courses/*, /holistic-support/mobile, /holistic-support/mandala, My Courses | Single catalogue/lesson pattern, existing player and assets, real progress | Integrate #2467, #2483 then #2484; preserve private media and published course sources |
| 5, pending | /library, /books, /articles/*, /masters/*, /events/*, /homeopathy, /wu-xing, /dao/*, /temple-insights | Common catalog/read/lesson shells without turning long text into cards | Preserve canonical SEO/hreflang, rights and existing source records |
| 6, pending | /client, /app/*, /app/practice, /app/messages, /admin/* | Compact professional shells, no public marketing widgets in protected workflows | Auth/RLS, privacy, real messaging-provider checks and owner QA |

## Reusable implementation rules
- Single server-rendered PublicPathwayStrip, with four source-backed public links; it intentionally does not read test data, CRM or cookies.
- Every migrated page retains its existing route and metadata, independent ES About implementation, semantic heading hierarchy, direct contact channels, original imagery, published video player and forms.
- Do not copy the bottom dock, catalogue, video player, or AI guide to create competing implementations; reconcile active PRs before changing their files.
- Migrate at most a cohesive group per PR. File/change ownership and latest base SHA must be checked before each change.
- On a new page: audit old vs. new navigation, check all links and real provider states, test 320/390/430 mobile Chromium/WebKit, keyboard/focus, EN/RU/ES and RTL overflow, lint, tsc, build, preview and production alias SHA. Use test accounts and synthetic private data where required; no real client data in logs.
- Free test completion, confirmed CRM lead, booking, payment and course progress are different events. Never mark a journey step completed on mere click or infer an unavailable score.
- No YouTube publication, avatar render, marketing messages, paid APIs or GA4/Meta privacy-hold changes without separate permission.

## Rollback
Keep previous production deployment ID and commit before merge; rollback is to re-promote last verified deployment, not to rewrite media or client records. After any rollback verify public links and protected entry again.

## Evidence ledger
Wave 1 base at PR creation: a94efddc6b6c41c4d53dcee71b0d428a156d234e; Vercel READY matched that SHA. New PR/CI, Preview and exact LIVE verification must be appended only when obtained. No other wave is claimed complete by this document.
