# Profile-first Support Mobile · approved visual implementation (29–30 Oct 2026)

Status: **implemented in PR; rendered mobile / CI / production still to verify**.

## Source of truth and page identity
- Owner-approved generated portrait-first UI mock (the last mock in this chat), a concept for the EXISTING guest route `/{en,ru,es}/holistic-support/mobile`, without a query. Not the protected client dashboard, the independent public `/personality-profiles` introduction or the Mandala editor.
- Original old first two screenshots: `/personality-profiles`, clear main CTA and 3-step explanation. Newer screenshot: interactive Support panels, local check-ins, courses, published videos, five-tab dock.
- Reference is a **concept**, so screenshots of distinct original routes are not valid pixel overlays. Compare updated rendered Support against its own screenshot at a matching route / viewport / guest state, and check approximate visual landmarks rather than asserting false pixel identity.
- Production reference at development start: `487e4f501e38fccdc1354dee1104df48f4272703`, Vercel `dpl_FT9hJNSpj3modFV7csmhw4U19eHR` READY. Reverify before merging and at public URL.

## Visual layout (mobile 320–430px; wider layouts remain responsive)
1. Single compact branded header with internal site navigation; no global promo bars, no duplicate full PublicSiteHeader. Search → real Test Explorer; My → existing client route; RU/EN/ES + Menu → existing settings panel.
2. Prominent mint/cream hero with **existing local illustrated portrait photo**, green serif `Создайте свой профиль`, real maroon profile-builder action and subordinate free-tests action. All text and click targets visible and legible. Hero photography is an existing first-party asset, not an unlicensed external image nor the full mock screenshot.
3. Always-visible three-card `Как это работает` — choose → free tests → results. Small lock note explains sign-in only for private storage. No collapsed help that conceals the explanation.
4. Four colorful `Популярные направления` profile cards; each preselects the indicated allowlisted builder direction via the existing builder `?start=1&focus=...`. Responsive at 320px with contained horizontal card scrolling, not document overflow.
5. Evergreen scenic free-test teaser. Existing check-ins, portrait/file input, tools, goals, full meditation player, courses, masters, progress, original five-tab mobile navigation continue underneath, with no second CRM or test catalogue.

## Actual actions
- Profile CTA: `/{locale}/personality-profiles?start=1`; only an explicit click skips the redundant introductory screen, no automatic data upload/save.
- Four card links: `?start=1&focus=wellbeing|work|relationships|identity`; allowlist only, user can change every selection; no private data in URLs.
- Both tests CTAs: `/{locale}/client/tests` with guest Test Explorer.
- Photo/test/health sliders remain local until explicit actions; initial 5/10 is neither a clinically measured score nor a persisted result.
- Profile and tests do not start a CRM lead, authenticated session, booking, checkout or send provider messages merely because they are opened.

## QA gates
- Extend existing `hh-support-mobile-mock-browser.yml`, **not another workflow**: EN/RU/ES × Chromium/WebKit × 320/390/430 geometry and screenshots, clickable destinations in RU390 (real builder and guest tests), new H1/H2 hierarchy, no sideways document overflow, original video/guide/forms retained, no autoplay.
- Tests: `tests/holistic-support-onboarding-bridge.test.mjs`; existing Support/profile builder contracts; TypeScript, ESLint, Next production build. Browser workflow checks real links and first-step state; mocks only external public provider directory, no fake guest Test Explorer / account.
- Resolve all exact-head failures, inspect output images and visual differences, and merge into verified `codex/public-book-library` only with safe review. Exact Vercel READY SHA and canonical EN/RU/ES paths required. Owner's physical iPhone verification is additional evidence, never inferred from browser emulation.

## Related in-flight PRs
- #2553 is the only implementation PR for this requested hybrid; do **not** create parallel duplicates.
- #2551 / #2545 alter the **separate explicit quick-goals row** and should be rebased separately after this change, without replacing the profile-first entrance or treating 5/10 placeholders as measurement.
