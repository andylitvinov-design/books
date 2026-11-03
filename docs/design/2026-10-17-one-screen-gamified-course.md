# Holistic House — One-screen, gamified course UI
**Approved by owner:** 17 October 2026  
**Status:** Approved reusable design contract; changes on `codex/hh-gamified-one-screen-course-20261017` until production merge/verification.

## Purpose
Bring the friendly, motivating, visibly progressive interaction pattern of Duolingo-like lessons to Holistic House without copying Duolingo logos, characters, paid offers or proprietary artwork. Retain **Holistic House** typography, navy/wine brand accents, and turquoise/teal light-course identity. Original artistic references: four lesson, path and reward mockups approved by the owner in the project conversation on 17 Oct 2026.

## Every learning screen
1. **One immediately legible mobile viewport** where content length, device and text zoom permit; no mandatory page scrolling to reach the action. Main button remains docked to the bottom, above iOS safe area, as the most prominent action.
2. Compact top bar: close, genuine slide progress meter, real slide/day counters. For logged-in learners keep existing stored progress rather than estimating or fabricating results.
3. One purpose per step: short title, a hero illustration/photo *when valuable*, one concise question/instruction, the relevant answer choices, one big rounded Continue / Next / Finish CTA.
4. Prefer **simple choices with large accessible tap targets** to paragraphs. The first viewport shows 2–3 or 2×2 options when choices are short; longer original choices remain fully readable.
5. Secondary actions **Back**, **Skip** and optional explanation are subordinate. Additional explanations, transcripts and safety details may expand on demand but must remain available.
6. The original course/meditation text, videos, inputs and informed consent must remain accessible. If a phone is short, the font is enlarged or an optional section opens, the lesson body **may scroll internally**, never clip interactive content or hide warning/help links. Long videos must retain normal playback controls and an accessible 16:9 player.
7. Use system UI fonts, crisp rounded panels, subtle depth, teal gradient CTA, real scenic assets with proper aspect ratio. Use original unique bird/house/leaf illustrations in future assets if approved; don't substitute Duolingo mascots.
8. EN/RU localization maintained, existing ES support where available. No broken translations, new hard-coded clinical labels, or mandatory body-sensation focus.

## Course journey & rewards
- Daily path shows **five nearby nodes** by default, with active lesson expanded and a clear **View all 14 lessons** toggle. The learner can review the entire journey at any time; original locked-day rules still apply.
- Rewards show XP **only from genuinely saved learning participation**, not a clinical symptom score. Weekly streak may be shown only if computed reliably from verified local-day completion history, never as the illustrative “13 day streak” mockup value.
- End-of-lesson and entire-course screens can use a playful dark-teal celebration layout, with actual progress and simple next step, without monetizing anxiety or implying therapeutic success.
- Do not auto-trigger an arbitrary paid plan/trial; existing approved subscription UI remains separate.

## Included course experiences
- OPORA day lessons via `components/app/course-slide-player.jsx` and CSS. Keep 15+ current content steps and prior saved records. Compact an otherwise lengthy check-in and add opt-in instructional explanation.
- OPORA 14-day route via `components/app/course-quest.jsx` and CSS: compact nearby path with expandable all-days list.
- Academy / Reiki Practitioner AI course via `components/energywork-ai-learner.tsx` and CSS: viewport-height mobile player, choices, lessons, videos, private-save control next to the bottom CTA.
- The authenticated persistence / private note handling, course enrolment consent, Reiki initiation requirements, and existing mobile safe stop are unchanged.

## Mobile acceptance and accessibility
- Visual checkpoints: 390×844, 375×667, 320×568, browser Safari WebKit and Chrome, EN/RU and Academy where possible.
- No horizontal overflow, clipped CTA, footer under browser controls, double scrollbar for normal short slides or headline behind progress bar.
- Accessibility: 200% text zoom requires body scroll fallback; keyboard navigation, focus states, 44px tap targets when feasible, reduced-motion support.
- Verify real progress updates, answers, resume, optional paths, skips, logout guest, login consent, and dark reward content.
- This is an **educational**, non-diagnostic course; medical safety notices remain visible and intact.

## Shipping
Source repo: `andylitvinov-design/books`; production deployment branch: `codex/public-book-library`. CI and production deployment readback, actual public pages and authenticated end-to-end mobile interactions must be distinguished in release report. Do not claim mockup previews prove live functionality.
