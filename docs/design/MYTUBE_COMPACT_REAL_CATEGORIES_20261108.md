# MyTube — compact single-row categories, real labels · 2026-11-08

## Owner-approved reference and page identity
- **Approved reference:** user's dark YouTube-style MyTube screenshot/mockup in the project conversation, revised to one row of five small grayscale category buttons.
- **Target routes:** `/en/mytube`, `/ru/mytube`, `/es/mytube`; **view type:** anonymous public MyTube video feed; this is not the light Library or the separate Video Studio. Page identity gate PASS for target and screenshot context.
- **Component:** `components/video-discovery.tsx`, MyTube-scoped `components/video-discovery.module.css`, and localized `app/[locale]/mytube/page.tsx`.
- **Baseline production source:** `09b0dd0fe709aa2d4fb55f2da1762d6e16648559`; actual Vercel serving SHA and new PR merge still require separate live verification.
- **Reference screenshot:** owner mobile chat attachment (phone OS chrome cropped for comparative browser QA); exact CSS-pixel width/DPR not available, therefore pixel-diff claim pending.

## Visual block map
1. Keep original black MyTube masthead, red play mark, navigation and 16:9 video cards.
2. Move existing localized short intro directly into a slim row with explicit four-choice **original-audio filter**: All / EN / RU / ES. This filters real video language, not translation of the site URL.
3. Search input occupies the full remaining width; one accessible 44px icon on its right opens the existing advanced controls. Remove the old separate `Filters / language / duration` row.
4. Exactly **five** neutral buttons in a single row without swipe or clipping: All plus four canonical categories from `listMyTubeCategories(locale)` only (Goals & Money / Love & Relationships / Energy & Confidence / Stress & Anxiety and their real RU/ES translations). No fabricated categories or shortcuts.
5. Hide subcategories under All. Selecting any category reveals precisely its four real localized subcategories plus All, and automatically resets incompatible topic/scenario/motif/style selections. Topics, scenarios, verified duration, source, date, sort and saved stay inside the existing advanced disclosures.
6. Four content-format tabs All / Shorts / Courses / Study remain fully functional, followed by the unchanged reviewed-video catalog.
7. Existing fixed bottom dock and safe-area behavior preserved, including ongoing separate dock-order/anchoring PRs.
8. **Verified QA overlap blocker:** sitewide iHelp is a fixed 64px-top widget that can intercept MyTube original-audio controls in the new header. Scope iHelp to a compact bottom-right launcher above the dock **only** while MyTube is mounted, preserving accessibility and all other route placements. Browser QA must check no language/FAB rectangle overlap.

## Behavioral and release contracts
- Public guest search/category/audio/format changes filter only published videos; no new catalogue, auto-approval or external player autoplay.
- Preserve authorized playback-on-click, approved metadata, source/rights checks, private data and iHelp. No new paid API, database/migration, auth, billing or external sends.
- Test at 320, 354, 390 and 430px, Chromium and WebKit, plus EN/RU/ES. Before testing filters after bottom-dock scroll, restore scroll position to top; never simulate an impossible click through the sticky topbar. Assert all 5 category chips share a single row, none require horizontal scrolling, conditional four true subcategories render correctly, language filters switch without navigation, deeper choices reset and player/empty state remains honest.
- Existing `tests/mytube-duration.test.mjs` and `scripts/verify-unified-six-dock-browser.mjs` modified, no new CI workflows or runners.
- **Preflight:** structured in-memory source assertions and CSS brace balance checked before first remote branch publication; full TypeScript, ESLint, Next build, route-matched screenshots/overlays and actual iPhone Safari not available in local connected device (Mac offline). Require protected exact-head CI and independently confirmed production Vercel READY/alias/SHA before LIVE claim.

### QA status before PR
Visual fidelity: IN REVIEW (not screenshot-verified). Functional E2E: NOT RUN. Live: NOT DEPLOYED. Blocker: full rendered CI and deployment readback.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
