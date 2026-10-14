# Holistic House — My Course Focus 2.0: permanent course style & learning model
Approved: 2026-10-14 | Reference owner: Holistic House | Language: RU/EN (+ ES-ready)

## Canonical links and assets
- Approved original mobile screen with young man looking over coast: https://drive.google.com/file/d/1swY8akeapPeXgaI742mFcV0-XpZ5cNlt/view
- Expanded widescreen visual concept: https://drive.google.com/file/d/1nI3ksyXIoPfviq-i4ZMM_kEso6jRdnWK/view
- Site-ready cropped scenic illustration: https://drive.google.com/file/d/15hG-ryUIqsmXKJ9sWWTYV4VuQ8gRbKae/view
- Site asset: public/images/holistic-house/course-focus-mountain-boy.webp
- Canonical implementation: components/app/course-focus-entry.jsx and .module.css; parent course-today.jsx and my-course.jsx.
- Prior approved interface: docs/my-course/COURSE_TEAL_V6_APPROVED_DESIGN.md and COURSE_V7_MOCKUP_FIDELITY.md.
- Existing curriculum passports are stored in docs/myspace; never replace their authored lesson content with generic AI copy.

## Essential visual direction
Use the image of a young adult wearing a teal jacket, sitting with back to viewer above a beautiful warm coastal landscape. The artwork should evoke spaciousness, inner resource and encouragement—not infantilize people or imitate Duolingo characters. Soft sky-blue/teal/light cream gradient, navy headlines, warm golden sunlight, premium clean typography. The illustrated person is the preferred visual, replacing generic meditating-woman illustrations in the fullscreen landing.

The original 3-screen design board was a *visual inspiration*. Do not impose three compulsory onboarding slides or daily re-onboarding. Mobile default: one fullscreen entry with a large picture, clear lesson goal, real progress, exactly one dominant action. White/translucent cards sparingly; generous space. Real text renders as HTML over/under art rather than baked-in image text.

## Interaction contract: focus first
1. Enter existing active course => fullscreen focus gateway (fixed 100dvh) over all cabinet navigation. Hide or occlude brand/site toolbar, Master/Account menus, tabs Today/Path/Details, XP and five-icon bottom bar.
2. Focus screen: tiny discreet Close, Holistic House brand, promise, course title, day N/14, *actual current lesson title*, compact description, subtle actual progress bar and ONE prominent Start/Continue lesson CTA. No extra CTA or upgrade promotions.
3. On first course start: warm welcome. After first start store UI-only welcome-seen preference in browser; on subsequent entries use Continue, keeping actual day from API. Never store a fake progress count in localStorage.
4. The fullscreen lesson already exists in course-slide-player.jsx; clicking primary enters it directly. One task per screen, 44px minimum targets, sticky CTA, thin progress, optional skip; preserve existing safety disclaimers and user choice.
5. Closing the entry returns to My Courses selector, preserving all course results and history. After successful completion, use gentle completion and optionally a separate 14-node course path; never interrupt the lesson with bottom navigation or notifications.
6. Roadmap may be accessed after leaving the focus screen or after lesson completion. A Duolingo-like curved path is useful as an optional motivational view, not the first view or a substitute for course content.

## Critical business model
- 14 lessons/day steps are **completion-driven**: unfinished Day 1 remains Day 1 tomorrow. Do not increment the active day merely because local calendar date changed.
- Server source of truth: lib/inner-growth/course-progress.js courseLessonProgress and lib/app/growth-daily.js. They already calculate current day using saved consecutive sessions and allow at most one new lesson per local calendar day after completion. Do not regress this protection or rewrite client private data.
- Completion and XP only after successful idempotent server-side session save. XP is participation, not measured health gain. On an unfinished day, resume the same immutable day/lesson ID.
- Use authored day-specific titles, instructions and durations. Avoid invented 5-minute claims when metadata absent, and do not add unapproved diagnostic/medical/cure promises.
- One free active course as established in My Courses; paid plans may offer additional concurrent courses. Upsells belong on course-selection/subscription screen, not in lessons.
- Preserve self-report baseline vs end, private consent, EN/RU authored course text, and current progress.
- User can exit/restart, reduce motion, and request non-imagery practices without pressure.

## Visual tokens and layout
Background #E8F9FC to #F3FCFC; primary #079EAE to #058DA9; navy #123D55; soft border #CFE9EB. Headline 30-40px mobile; body 15-18px; CTA at least 56px high; 18-24px radii, subtle shadows. Hero illustration ~26-32dvh and crop preserves the young man, coastline and warm sunlight. Proper safe-area padding env(safe-area-inset-top/bottom); on short screens scroll inside focus overlay while primary remains visible. Respect prefers-reduced-motion and focus-visible.

## Quality acceptance
- On first open the course fits 320/375/390/430px and iOS Safari, no sideways scroll, no clipped illustration/CTA.
- No cabinet nav/Master/Account buttons visible behind focus overlay.
- Clicking primary opens same saved current lesson in focus player, not a detached nonpersistent demo.
- Return to unfinished day after overnight rollover; server confirmed completion unlocks next day, never before.
- Reload, resume, exit, private API failures and cancellation preserve progress and authorization.
- Check contrast, VoiceOver/screen-reader labeling, keyboard Escape and safe-area overlap.
- Only mark deployed when GitHub commit and Vercel production alias are both verified.

## Memory index
Search terms: MySpace / Holistic House / Course Focus / scenic boy / mountains / full-screen course / Duolingo inspiration / course model. This document is the canonical always-searchable course style brief; future redesigns must consult it before changes.
