# Services / Assist — four visible questions, approved mobile first-screen (16 Nov 2026)

## Route and identity
- Canonical reference/target: guest RU/EN/ES /{locale}/services, ordinary Services first screen, 390×844 CSS px, not Study /holistic-support/mobile and not the protected practice editor.
- Owner reference is the latest conceptual Holistic House cream/emerald mobile mockup, **overridden by the subsequent explicit instruction**: all four actual questions must be visible together, not four steps or one question with four answers. No exact pixel overlay can be claimed against that mismatched conceptual screenshot.
- Existing production branch: codex/public-book-library (8b7c37098c12ac71304bd412b630f51645b0d2c5 during preparation). Existing Vercel project codex-public-book-library, canonical domain holistichouse.vercel.app; deployment verification remains independent.
- Source owner: app/[locale]/services/page.tsx + components/services-assist-quiz.tsx/.module.css. Existing Ali messenger remains on explicit ?assist=chat; all existing ServicesCompactCatalog panels and handlers remain unchanged. Global UnifiedMobileDock renders once from existing shell.

## Visual hierarchy / geometry targets
- Existing header and global site navigation: KEEP. Existing dock with MyTube, MyVideo, My Coach, AI/Chat, Services, Study, Profile: KEEP, never duplicate.
- Compact scenic header: MOVE/RESTYLE; up to ~80 CSS px on 390 phone, ivory/light with small sunrise accent, 26–32px serif title and clear 13–14px subtitle.
- Four inline, simultaneously visible fieldsets in a single warm-white card: NEW, Q1 6 choices in 3×2, Q2 4 choices in 2×2, Q3 and Q4 4 choices in 4×1. Answer buttons at least ~35–40px high with visible selected check, no separate Next.
- One primary emerald 45px submit, disabled until all four answers; no outbound request and no persistence. Matching uses existing published catalog rules; focus work = money/business and existing verified business consultation route. Hard budget/format constraints remain authoritative.
- Six discoverable service categories in 2 columns × 3 rows immediately below, ~47px each, readable ~13–15px. Includes a visible money/business card; "All services" jumps to the original lower catalog; no fabricated product listings.
- Existing three personal cards, fourteen service panels, free resources, Telegram/WhatsApp handoffs and disclaimer remain below, no change to CRM, payment, provider, consent or auth.

## Behavior and QA
- Guest selects one button in each of four fieldsets; button updates pressed/check without page navigation. Submit shows current verified ranked cards below categories, scrolls there only on user click; revising answers hides old results. Empty combination has honest message.
- RU/EN/ES parity; touch/keyboard, focus rings, responsive 320/354/390/430, no horizontal overflow, single dock above iOS safe area. Desktop >760 retains the existing service conversion/showcase rather than duplicate quiz.
- Test source contract in tests/services-four-question-quiz.test.mjs; adapt the already-used public-services browser suite to exercise new first screen before checking original Ali at ?assist=chat. Browser screenshots, matched-view overlay and LIVE iPhone checks: NOT YET RUN at source authoring. Never claim visual or deployment acceptance before independent evidence.
- No automatic chat, sensitive answer storage, AI call, email lead, provider charges or new release publisher.

## Status
Source prepared for one atomic Git-tree commit/PR. Visual: IN REVIEW. Functional provider E2E: NOT CLAIMED. LIVE: NOT VERIFIED.

## Verified repair note (16 November, after PR initial CI)
- First HEAD Core lint, syntax, TypeScript and Next production build: PASS.
- Public Services browser FAIL: at the Spanish route the existing page imported `isSupportedLocale` from the unrelated *remedies* RU/EN locale registry and rejected `/es/services`. The same page also had no Spanish page-level copy. Corrected to the existing three-locale public registry and translated Spanish metadata/footer; subordinate public Services components already include Spanish translations.
- Specialist FAIL: `BASE_ADVANCED: PRODUCTION_BASE_CHANGED` after unrelated protected CI and Mandala updates. Repair re-parents the same six-file scoped feature onto the currently verified protected source base (no CI bypass), in one immutable HEAD update.
- Layout defect from isolated local Chromium prototype: original card plus six categories extended below 844px portrait dock. Reduced introductory copy, eliminated redundant progress strip, placed Q2 options in one row and shortened category heading. The local prototype alone is not LIVE evidence.
- Extended existing route-specific browser acceptance: all six categories, including business, must be in the viewport above the real dock; RU/EN/ES and complete original Ali journey remain asserted. Full real browser acceptance must pass on the new exact HEAD before protected merge.

## Follow-up repair: exact required CI on HEAD 5562cfd3
- Core lint/TypeScript/Next build PASS on exact HEAD. However hh-specialist failed closed with BASE_ADVANCED after another protected production advance (Homeopathy Mind #4441), so hh-merge-check rightfully failed.
- Website video browser verification found stale source-regex expectation in tests/personal-testimonials.test.mjs: it required locale as Locale even though PublicLocale now supports RU/EN/ES and the correct JSX is locale={locale}. Keep the actual testimonial ordering and all media assertions unchanged; repair only this source assertion.
- Production latest base #4441 added source-backed Homeopathy Mind checks inside the same public Services browser script. Rebuild that file from the latest trusted base, insert only the four-question first-screen contract; retain all new Homeopathy Mind assertions.
- New Vercel release awaits protected merge plus existing hourly publisher. No manual dispatch, no CI bypass and no claims of LIVE until canonical alias+SHA and browser actions are proven.

## Final browser failure root cause on original HEAD 5562cfd3
- Repeat Public Services browser run 43931951616 still timed out waiting for [data-services-quiz] only on /es/services (scripts/verify-public-services-production.mjs Spanish case). The direct app/es/services/page.tsx route **shadows** the dynamic app/[locale]/services/page.tsx; updating the latter could not change Spanish rendering. The original analysis that only the remedies locale gate caused this symptom was incomplete.
- Fix the ACTUAL dedicated Spanish route: render the same ServicesAssistQuiz locale="es" by default and preserve the old ServicesAssistMobile on explicit ?assist=chat; retain all existing Spanish metadata, paid/free offer panels, navigation and disclaimers.
- Separately, fix the confirmed stale tests/personal-testimonials.test.mjs source regex for the expanded three-language PublicLocale. Keep all content/video ordering assertions.
- Base update #4441 Homeopathy Mind assertions are explicitly preserved when merging the public Services acceptance browser script from current protected base. Subsequent protected CI and actual live mobile proof still required.
