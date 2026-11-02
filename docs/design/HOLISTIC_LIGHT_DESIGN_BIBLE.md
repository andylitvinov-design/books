# Holistic House — Design Bible v1.1 · Holistic Light — Warm & Alive

**Status:** canonical specification for NEW/refactored Holistic House UI (2 November 2026).  
**Owner reference:** https://docs.google.com/document/d/1zREpz2hpHA-dfilYgXS18TASkrw-D8mf_UXEFrfOvvU/edit  
**Opt-in CSS:** app/holistic-light-tokens.css.  
**Audit:** scripts/holistic-light-design-qa.mjs and existing scripts/capture-public-ui-reference.mjs, scripts/compare-ui-screenshots.mjs.

This is the design contract, not evidence that existing pages have been restyled.

## 1. Brand and visual matrix

Light, warm, alive, supportive, calm and contemporary. Use generous ivory space, crisp near-white panels, natural warm-light photography, clearly legible dark headings, rounded shapes and ONE prominent emerald/teal CTA per step. Green is an ANCHOR, not a full-page color wash; category colors add variation. Avoid monochrome sage/gray-green surfaces, tiny controls and competing buttons.

Three complementary approved reference types:
- Discovery / meditation library: pastel category tiles, large emotionally rich featured media, clear playback CTA and smaller related cards.
- Video Studio / functional pages: white task panels, obvious step hierarchy, imagery-led choices and one primary next action.
- Warm Sunrise / goal and personal practice wizard: warm sunrise photo fading into ivory, three progress steps, one question per screen, two-column pastel choices, selected checks, “from → to” summary, separately confirmed result screen.

The reference is a visual model, not a guarantee that credits, media, health outcomes or voices shown in mockups exist.

## 2. Global palette and semantic variants

| Purpose | Token/value |
| --- | --- |
| Canvas | #FCF9F2 |
| White surface | #FFFFFF |
| Soft surface | #F8F5EF |
| Primary text | #143D3A |
| Editorial navy (optional) | #17334B |
| Secondary text | #5D6A71 |
| Border | #E7E3DA, 1px |
| Main CTA | #067A67 / white |
| Focus ring | #176E6E / 3px |
| Selected | #E6F6F1 + 2px border/check |
| Warm Sunrise canvas | #FFF9F3 |
| Warm Sunrise CTA | #02774B / white |
| Warm Sunrise selected | #E8F6EA |
| Body and Energy | #EAF7F7 / icon #176E6E |
| Money and Career | #FBF2DE / icon #966A1F |
| Love and Relationships | #FCECF2 / icon #AA4068 |
| Confidence and Harmony | #F2ECFB / icon #7753B1 |
| Anti-stress | #EAF8EF / icon #08736B |

Regular text WCAG AA contrast >=4.5:1, large text/icons >=3:1; choice colors must have additional textual/check or radio state markers.

## 3. Typography, shape, space

- Spacing scale: 4/8/12/16/24/32px; mobile horizontal padding 12–16px.
- Radius: chip 12–16px, input 16–18, card 20–24, hero 26–32.
- CTA height 52–60px; controls at least 44×44px where practical.
- Mobile title 28–36px, H2 23–27, H3 18–22, body 16–18, helper 14–15. EN/RU/ES text wraps; never truncate for decorative symmetry.
- Existing sans-serif for functional UI; existing serif for editorial headings and video heroes. Do not add a costly new font merely to copy a mockup.
- Photos: sunrise, landscape, water, forest, warm natural sunlight and varied inclusive people; do not reuse one model portrait on every page. Clear image crops, optimized responsive sizes, lazy below-fold media, video poster, no autoplay.
- Check at 320/360/375/390/430px, plus 768/1280px; safe areas, virtual keyboard, one-thumb use, reduced motion, contrast and no document overflow.

## 4. Variant inheritance

**holistic-light:** primary for catalog, video library, homepage, tests and most internal pages.  
**warm-sunrise:** opt-in data-hh-design="warm-sunrise" for personal meditation, goal journey, practice generator and short guided wizards. Distinct steps: 1 choose goal; 2 current state; 3 confirm vector; then separate verified ready state. Do not promise a completed video when only text/script exists.  
**approved exceptions:** keep My Course original teal gamified theme and Business beige/wood. Protected cabinet/CRM stay information-led. The same accessibility and mobile layout rules still apply. Do not globally replace their existing theme tokens.

## 5. States and behavior

Every new component needs actual idle, focus, selected, disabled, pending, success, empty and error states. Buttons keep live actions and secure data flows. Confirmed generation, file save, notification delivery and payment are distinct milestones. EN/RU/ES translations complete. No private test/health data in public screenshots or alerts.

## 6. Manual 100-point rubric

| Dimension | Points |
| --- | ---: |
| Color, light and brand warmth | 20 |
| Readability and typography | 15 |
| Component consistency and states | 20 |
| Mobile composition, clear CTA | 20 |
| Accessibility and speed | 15 |
| Product correctness and EN/RU/ES | 10 |

90–100 excellent; **85–89 acceptable**; 70–84 correct; below 70 revise. Automatic STOP regardless of score: broken action, privacy exposure, 320px overflow, important focus/contrast failures, blocked button/input, incorrect cost or false delivery claims.

## 7. Browser audit and screenshot comparison

Source audit: node --test tests/holistic-light-design-qa.test.mjs.  
Public live baseline: node scripts/holistic-light-design-qa.mjs --origin=https://holistichouse.vercel.app.  
The read-only public audit runs isolated guest Chromium/WebKit and captures screenshots/DOM/CSS and warns about overflow, tap targets, opaque control contrast, potential green wash and route mismatches. It is a *preliminary technical audit*; subjective look and alignment to the owner's screenshot must still be reviewed by a human/design assistant.

Current representative public routes: /ru/meditations; /ru/holistic-support/mandala; /ru/holistic-support/mobile; /ru/practice; EN/ES mandala; 320px WebKit. Extend the route set when a new public page is introduced. Do not point generic capture at protected /app, /admin, /client, payments or token query URLs.

Pixel fidelity requires the same route + locale + role + auth state + viewport + DPR + crop as the reference. Use scripts/compare-ui-screenshots.mjs for side-by-side, overlay and diff. No color ratio or CI result alone proves visual fidelity, actual saved state, video render, payments or delivery.

## 8. UI PR acceptance contract

Identify canonical view and page owner; read AGENTS.md and visual-to-code skill. Reuse existing components and tokens, avoid duplicate navigation or independent color constants. Include route-specific screenshots at 320/390/430 + WebKit, substantive click/disabled/error states, EN/RU/ES, actual data/role flows and Design QA score. Record automated findings separately from manual visual review and real E2E. Merge only with required exact-HEAD checks, then verify production READY, source SHA, canonical domain and real interactions. Existing custom themes remain explicit exceptions.

## 9. Daily 05:07 Toronto audit -> actual repair (not reports alone)

The canonical public-only QA is scheduled daily at **05:07 America/Toronto**, in GitHub default branch `codex/bootstrap-books` through the EXISTING `.github/workflows/hh-nightly-public-crawl.yml`. GitHub Actions native timezone handles EST/EDT. The separate 07:15 UTC nightly SEO crawl stays intact. See dependent default-branch PR #3145.

The daily workflow checks out real production branch `codex/public-book-library`, runs `scripts/holistic-light-design-qa.mjs` as a guest-only read, and records screenshot/DOM evidence. Its trusted `scripts/holistic-light-qa-handoff.mjs` ranks findings by severity and creates/updates **one** issue labeled `hh:design-qa` titled `[Design QA] Holistic Light — daily action queue`. Repeated defects, including EN/RU/ES variants, must not spawn parallel issues. For failed captures, report an infrastructure blocker, never a false clean bill.

The **already existing** Chat Product Repair hourly :35 worker uses one special 06:35 Toronto run to inspect the fresh daily issue and execute up to one safe, confirmed source fix. It must first reuse existing PRs/lease; only create a new scoped PR when no matching PR exists and the source problem is reproduced. It may not invent a patch to make a report look actionable. Honor runner-capacity policy and production protections.

Required independently verified receipts: AUDIT_RUN -> ACTION_QUEUE_ISSUE -> (CLAIM or BLOCKER) -> SOURCE_COMMIT -> PR -> exact-head CI -> MERGE_SHA -> real serving Vercel READY_SHA -> LIVE browser action. Absence of an item cannot be silently called success. Automatic CSS audits are advisory on human visual warmth and cannot prove private/auth/provider E2E.

Priority order: broken app/route and protected data first; reproducible overflow/contrast and first-screen CTA next; muted-green image/style review only after an approved screenshot and same-view comparison. Existing My Course teal and Business wood themes remain explicit approved exceptions.
