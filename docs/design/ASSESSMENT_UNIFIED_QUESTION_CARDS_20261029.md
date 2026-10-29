# Holistic House · Unified Assessment Question Cards · 29 October 2026

Status: **Implementation PR / release-gated**. Owner approved the warm, cream-and-sage question-card reference after viewing the CDC Healthy Days mobile screenshot. The screenshot is an **illustrative visual target**, not an image to paste into the product. Never conflate a source-only check with rendered browser acceptance, and never call a merge live until the canonical alias resolves the merged SHA.

## Exact page identity

| Surface | Canonical app state | Existing owner |
|---|---|---|
| Public guest assessment | `/{en,ru}/client?plan=<opaque-id>`, or `?run=<opaque-id>`; temporary guest session, `phase=questions` | `components/app/cabinet-landing.jsx` (`GuestAnswerChoices`) |
| Guest assessment journey progress | same guest route, selected multi-test battery | `components/app/guest-test-journey-progress.jsx` |
| Signed-in saved assessment | `/{en,ru}/app/runs/<opaque-id>?mode=quick|guided`; authorized Cabinet | `components/app/app-workspace.jsx` (`Runner`) |
| Course-linked assessment | existing `/app/runs` route with approved course parameters | same existing `Runner`, preserves course progress |

EN is the product's primary interface. RU is the translated interface, **not an unvalidated translation of EN-only published instrument text**. The app `/app` route does not currently serve ES; do not falsely describe ES app test completion as available. Public entry/explorer maintains its present ES behavior/fallback.

**Do not compare screenshots against the audio library or the video editor**: they are only design-language references, different components and routes. The provided actual screenshot was the *guest CDC test page* on iPhone. The generated example depicts individual cards and progress; content is synthetic artistic representation, not a substitute for canonical instrument item wording.

## UI measurements and visual change map

| Region | Old behavior | New reusable visual behavior | Constraint |
|---|---|---|---|
| Page heading/progress | large sticky pale-green guest block followed by duplicated huge questionnaire H2 | soft warm-cream summary, short green steps, circular completion percentage; visually duplicate H2 hidden but available to accessibility tree | no overlay over Q1 on iPhone |
| Quick/Guided | tiny pills above long plain-form question text | 2 equal rounded large buttons (at least 44px target), label + duration | mode switch changes presentation only, never scores |
| Quick questions | large serif loose text, only dividing lines, answer field attached directly | separate padded rounded 18–21px cards, 12–14px gaps, pastel sequence-number circles, completed visual state | one card per original immutable question, same order |
| Guided question | formerly a bare div/fieldset | same numbered accessible question card in single-question mode | preserve Back/Next and server progress |
| Question title | mixed very large fonts, English source and RU UI joined | Georgia 17–23px readable line-height, original question `lang` set to instrument locale; separate UI caption | source original stays unchanged |
| Answer choices | cramped mobile 0–10 and 5-choice scales | grid-responsive touch targets ≥44px, accessible aria-pressed, show source anchors | 0 stays a valid answer; all original values unchanged |
| Day count | narrow native dropdown joined to label | full-width rounded native select ≥52px, 16px font on iOS | min/max from question, 0–30, no invented ordinal ranges |
| Helper/safety | method-specific, trauma and CDC notes | preserved in cards under original question | no hiding safety/rights notices |
| Error/finalize | existing server retry and finish CTA | untouched beyond shared visual skin | saved run, signed-in ownership and guest storage remain server-authoritative |

Tokens: base background `#fffefa` / `#f5f9f0`, ink `#302e29`, sage `#376b56`, muted gray-green `#66766c`, border `#e7e6de`, rose `#f9e4df`, light green `#e5efdf`, sand `#f9edd7`. No video, stock imagery, generated textual content or remote data fetch.

### Layout and responsive acceptance

Check **320, 354, 390, 430px** in Chromium and WebKit; supplement 768/1440px. Question cards fit viewport with ≤3px horizontal overflow, readable title 16–26px, mobile select font ≥16px, ≥44px touch controls, intro/methodology unbroken, native select openable, focus visible, no segment overflow. Guided: exactly one card; Quick: complete questionnaire as cards. Browser screenshots are synthetic test records, never private results; use side-by-side review, overlay and heatmap where same-route screenshot reference exists.

The shared CSS intentionally requires the `hh-test-experience` class and `data-test-card-system=v1` on existing runners. **No new route, shadow component, database, API, CRM, source scoring or instrumentation**.

## Existing flow and non-regression

1. Public `/tests` → `/client/tests` → guest battery → `/client?plan=...` → server-saved guest run → individual result → explicit save-to-Cabinet intent; no automatic Google account creation or account lead.
2. Authenticated Cabinet → `/app/runs/<id>` → answers via `appFetch(runs/<id>/save)` with `expectedRevision` and idempotent `operationId` → submitted result → protected Report.
3. Quick and Guided use identical registered instrument `definition.questions`, stable IDs, same server scoring and submission. Long instruments, trauma instructions, ASRS6 original markings, zero-valued responses and CDC day-count remain intact.
4. Preserve consent/adult/guest safeguards, server ownership, revision conflict recovery, disabled/busy states, stop/worsening warning, optional context and English source disclosures. No health data to analytics, external chat or marketing.

## QA plan / release gates

- Focused source contract + existing `tests/app-assessments.test.mjs`, `tests/guest-single-via-family.test.mjs`, `tests/test-kinds-catalog-audit.test.mjs` to ensure unrelated instruments and scoring remain stable.
- Existing **`scripts/verify-mhc-sf.mjs`** synthetic guest + signed-in Quick/Guided cases now invoke `scripts/helpers/assessment-card-visual-verifier.mjs`; 320/354/390/430px Chromium and WebKit screenshot/geometry, original responses/server save/score/refresh; no extra external provider.
- Typecheck, ESLint of changed JS/CSS imports, production Next build, GitHub Actions exact-head checks and diff review.
- Compare rendered guest `/ru/client?plan=<synthetic>` and Cabinet at consistent 390px to the approved **structure**, not pixel-claim to generated mobile image with invented content; identify missing alignment/touch errors.
- Merge only into verified `codex/public-book-library` if green, after concurrent PR checks. Verify `https://holistichouse.vercel.app` READY with exact SHA and real anonymous test journey. Real signed-in owner account/iPhone Safari is an additional QA gate.

**No live release is inferred from this design document or code commits.**
