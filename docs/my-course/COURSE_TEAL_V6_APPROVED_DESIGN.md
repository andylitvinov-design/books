# Holistic House — My Course V6 · Approved Blue–Turquoise Interaction Design

**Approved image master (Google Drive):** https://drive.google.com/file/d/1fVeeSSZMw6LqqlSFENg8T9P6lF7f-XLy/view
**Design-system Google Doc (image embedded):** https://docs.google.com/document/d/14lEYwzHoWAEjR8bTm1NtkjPbLb7mXQaKhjhKKn32_e4/edit

## Visual contract
- Calm premium blue–turquoise palette: navy #16334f, cyan #059eaf, pale blue #effaff, mint #ddf7f2, warm gold only for optional celebration.
- Mobile-first. Welcome/TODAY is a **single compact photo-led card**. Progress and today's CTA visible above the 14-day path.
- Four chapter milestones, separate day rows, spacious accessible touch targets. Expanding one day shows **one takeaway** and an action where applicable. No huge overlapping future-day previews.
- Lesson is a **deck**. One semantic block per screen (self-observation / original idea / optional recall / working phrase / each guided section / ritual / real-life micro-transfer / optional metaphor / private journal / optional before-after / neutral feedback / saved completion).
- Permanent bottom CTA, back and skip controls, visual progress, focus management, reduced-motion and safe-area support.
- Decorative illustrations are original SVGs in public/images/holistic-house. Photo background reuses site-owned images; no externally hotlinked image CDN, Duolingo trademarks or owl mascot.
- Detailed legacy lesson and graphs are available behind optional disclosures; private results and approved text stay available.

## Data and safety
- The actual /api/app/course/* endpoints remain authoritative. One check-in is saved only after a successful API response. Skipping is not a saved observation.
- The existing immutable lesson ID, cycle day, idempotency operation ID and course revision checks remain the same.
- A lesson is not awarded XP until the server returns a saved session. XP measures participation only; it never depends on self-reported symptom levels or test answer selection.
- EN/RU are authored explicitly; original psychological questionnaire items, response anchors, scoring, measurement provenance and user authorization are unchanged.
- 14 local calendar days and the original V4 content version remain unchanged; missed days stay missing.
- No claims of diagnosis, treatment, cure, guarantees or real-time professional monitoring.

## Source
- components/app/course-slide-player.jsx + .module.css: one-slide lesson flow.
- components/app/course-today.jsx + .module.css: today's photo hero, nested legacy reading, collapsed trends and preserved weekly review.
- components/app/course-quest.jsx + .module.css: illustrated 14-day map and one-day takeaway.
- components/app/my-course-theme.css: course-only global cabinet blue skin (via :has).
- components/app/my-course.module.css + course-r3-steps.module.css + course-quiz.module.css: onboarding/focus/test palette and one-question mode.
- tests/my-course-quest.test.mjs + tests/my-course-teal-slides.test.mjs: source and layout-contract tests included in test:app.

## Verification gates
- npm run test:app, npm run build, npm run lint, npx tsc --noEmit.
- EN/RU 320, 360, 390, desktop sizes; verify no horizontal overflow or hidden bottom actions.
- Synthetic authenticated active course: open/save/skip/retry, change quick and no-imagery preferences, day rollover, repeated completion, day 7/14 review, accessibility.
- Production: verify live Vercel alias SHA and authenticated UX separately. CI test fixtures cannot substitute for a real signed-in client's private iPhone QA.
