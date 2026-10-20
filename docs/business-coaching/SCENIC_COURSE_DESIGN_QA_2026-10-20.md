# Holistic House — Business & Career course visual-quality audit
**Date:** 2026-10-20  
**Scope:** `/[locale]/app/business`, EN/RU; 12 weekly coaching modules × seven days + six-day integration.
**No new course engine or data model.** This is a UX/visual refinement of the already-live account-owned coaching module.

## Reference components in this repository
- `components/app/course-slide-player.module.css` — OPORA learning-slide cyan/navy, narrow progress tracks, teal navigation CTA, one action at a time.
- `components/energywork-ai-learner.module.css` — scenic Reiki course structure: prominent intro, soft white lesson surface, learning path and accessible steps.
- `components/app/my-course.module.css` — authenticated My Courses hero/step progress.
- The *existing first-party asset* `/images/holistic-house/course-journey-landscape.svg` is reused with Next `Image unoptimized`; **no generated image, video, remote asset or image-optimization bill**.

## Quality problems found and fixed
| Before | Now | Acceptance |
|---|---|---|
| Different beige/wine visual vocabulary and weak match with active course player | Navy/scenic course hero, seafoam backgrounds, cyan progress/CTA, matching slide identity and font | CSS variables reference native OPORA course palette; no global styles leaked |
| 18 optional questions and goal form on one enormous screen | 3-step guided free onboarding (goals → optional self-check → consent); six expandable 3-item topics | Client cannot start without explicit stage-three consent; skipping does not invent scores |
| Repeated two paragraphs, day picker and many small cards compete for attention | Module outcome in its own compact header, seven large numbered day controls, one prominent white lesson slide with action + expected result | One lesson visible; current step aria-current; progressbar values are real saved counts |
| Large scrolling daily form with visually disconnected save button | Clear result textarea, optional reflection, completion check, sticky contextual Save Draft / Save & Continue bar | Actual result required only for completion; save must succeed before advancing; no duplicate call |
| Inconsistent statuses after editing | Saved/unsaved status shown without inventing completion, 44–55px controls and focus rings | Paused/completed cannot edit, v1 notes remain readable, owner-only encrypted data unchanged |
| Crowded 320–390px layouts and print side effects | Adaptive two-to-one-column, compact seven-step controls and print-only hiding of lesson chrome | No horizontal scroll, readable contrast, prefers-reduced-motion, print includes actual private report |

## Implementation details
- `components/app/business-coaching.jsx`: new onboarding visual flow and client-side presentation; existing `appFetch('business-coaching', ...)`, encryption and account checks untouched.
- `components/app/business-coaching.module.css`: scoped style layer. No impure `:global`, no globally applied `body` styles.
- `tests/business-coaching-90-days.test.mjs`: design-parity, exact asset reuse, guided consent, progress accessibility, backwards-safe save+next regression.
- All prior day definitions, results, screenshots and existing private reports remain in the same table without migration.

## Release and manual checks
- [ ] Focused CI: JS/JSX parsing and all business/development-contract tests
- [ ] Next/Vercel build: no CSS Modules purity/Next forbidden-variable errors
- [ ] Exact READY production SHA and live domain alias
- [ ] Public EN/RU business landing links to private Business course
- [ ] Authenticated owner: 3-stage start, optional skip, draft/save/continue/refresh/weekly switch, previously saved v1 results
- [ ] Mobile Safari iPhone 320px/390px portrait: no clipping, nav and sticky Save readable; laptop desktop screenshot
- [ ] Report still prints source-authored weekly results (no private notes on the public landing)

**Release claims:** Do not claim physical-device or logged-in account browser tests unless actually performed.
