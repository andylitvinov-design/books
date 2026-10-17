# Holistic House — Approved post-test course welcome (17 October 2026)

**Status:** Approved by project owner. This is the visual and interaction reference for the OPORA Anti-Stress course flow after finishing required starting assessments.

## Screen contract

After valid baseline tests, show **one** compact mobile-first turquoise welcome screen, not a dashboard or another battery of tests and scales. The page should fit the first phone viewport where reasonably possible, with an unobstructed fixed global bottom navigation.

Visual order:

1. Large serene heron-by-water photo, cropped from the approved mobile mockup, at /images/holistic-house/course-start-heron.webp.
2. Small congratulations eyebrow and clear heading: “Your course is ready” / «Ваш курс готов!».
3. One sentence that explains the starting block is suggested from completed test results, not a medical diagnosis.
4. One pale turquoise card with selected block number/name/one-line description and “Day 1 of 14”. Default to the existing provisional educational recommendation (e.g. “02 · Stabilization and self-regulation”).
5. Small **collapsed** disclosure: “View all 6 programme blocks” / «Посмотреть все 6 блоков программы», with six selectable alternatives; keep qualified-clinician-only AS4 visible but prevent unsupported self-guided start.
6. One large saturated turquoise **“Let’s go →”** / **«Поехали! →»** CTA, which accepts the suggested supported course goals and opens lesson 1. No intervening form for selecting test scales.
7. Small non-diagnostic note. Avoid lengthy explanatory sections on primary screen; substantive safety rules remain enforced in course flow.

## Behavioural invariants

- Preserve existing prior consent, completed tests and their scores, privacy scope, account/course checks, and server-backed start/recovery.
- Require a recent owner-scoped Weekly Pulse for OPORA; never infer recommendations from invented results.
- Clicking the CTA is an **explicit choice** to save a supported measured-scale set and module selection. Merely opening the screen or disclosure never writes.
- Without eligible directional scales, use existing clearly non-measured **general educational-goal fallback**; do not fabricate scale results.
- Do not automatically launch clinical-only AS4; authenticated clinical support is separate.
- Same responsive design and localized copy for EN/RU/ES.
- Day 1+ resumes existing course without repeating congratulations.

## Implementation

Components: components/app/antistress-module-finder.jsx, components/app/antistress-module-finder.module.css, components/app/course-r3-steps.jsx, components/app/my-course.jsx.

Baseline model and labels: lib/inner-growth/antistress-module-router.js (do not modify medical routing for visual design).

Accessibility: high-contrast CTA, keyboard focus rings, accessible disclosure, no autoplay, reduced motion. Lightweight local WebP, not external CDN. No paid plan pricing, testing recommendations or upsells before the primary CTA.
