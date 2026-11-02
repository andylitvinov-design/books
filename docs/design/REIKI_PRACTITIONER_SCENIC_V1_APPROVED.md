# Free Reiki Practitioner Program — Approved Scenic Course Design V1

**Owner approval:** 18 October 2026.  
**Reference:** approved Holistic House Reiki Practitioner mockup derived from the Anti-Stress/OPORA course design.  
**Implementation surface:** `components/energywork-ai-learner.tsx`, `components/energywork-ai-learner.module.css`.  
**Status:** approved V1 visual language carried forward into the unified five-lesson course (p1); production readiness must be verified per release.

## Visual contract

- Immerse the whole mobile course screen in a photographic scenic background with a deep teal-to-navy contrast gradient and soft warm sunlight. Do not create a white inset page or a paper/parchment header.
- Top chrome: small translucent back control and the Reiki Practitioner course name. Below that, five connected lesson circles: **Flight to the Sun / Tantra Reiki / Kundalini Reiki / Reiki Yggdrasil / Personal Reiki Initiation**. Illuminate the current lesson distinctly from completed lessons. The first circle is highlighted on welcome as a starting position, not completed credit; the former single-branch picker is no longer part of the course.
- Opening headline: “Reiki Practitioner — your first step”, large warm white editorial serif, followed by introductory copy.
- A midnight-blue glass card presents **One course · 5 lessons · 3 Reiki systems**. All three traditions are studied in sequence. Each personal Level 1 initiation is arranged separately with Andrey; course completion alone provides none. Five optional-during-study reports and five lesson answers are required only before requesting a teacher review for personal initiation.
- Three compact benefits: **Short lessons / Practical tasks / Private progress**. The third is only available after real sign-in and explicit storage consent — do not imply guest answers are saved.
- A slim teal progress bar with precise “Lesson N of 45 / P% completed”, near the primary CTA.
- An extra-large, full-width cyan-to-turquoise **Start free program / Continue** action at the bottom, with a smaller secondary back action below it only when relevant. Below: compact “Explore the programme” and private-save disclosure; tiny safety disclaimer.
- The font and spacing match the existing course system's premium calm aesthetic without borrowing proprietary Duolingo graphics.
- The owner-approved mockup shows a meditating person at sunrise. The mobile screen now uses the **dedicated clean Reiki sunrise photo** `/images/holistic-house/reiki-practitioner-sunrise.webp`, cropped from the owner-approved AI visual without any interface text. The desktop presentation retains the existing local scenic photo `/images/holistic-house/course-focus-mountain-boy.webp` to avoid upscaling the small mobile-optimized image. Both backgrounds are local, with deep teal/navy gradients; no remote photo dependency or flattened UI mockup is loaded.

## Apply to **all 45 steps**, not just the welcome card

The published p1 curriculum contains **45 sequential unique slide IDs** spanning five lessons: Flight to the Sun, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil, and preparation for personal initiation. Every learner sees all three Reiki traditions in a single course, not one conditional branch. Each screen reuses the same scenic shell, progress rail, editorial typography, feedback surfaces and bottom CTA.

| Slide kind | Scenic-system treatment |
| --- | --- |
| `welcome` | Transparent scenic hero, 3 traditions, initiation disclosure and benefits |
| `lesson` | White high-contrast heading and teaching copy in frosted navy panel; existing illustration as secondary image |
| `video` | Accessible responsive 16:9 existing poster/click-to-play player, no autoplay |
| `practice` | Gentle instructional copy, optional 2-minute timer with start/pause/reset, optional feedback |
| `reflection` | Frosted question panel with readable text, radio/scale/textarea controls and focus rings |
| `experience` (onboarding reflection) | Four large Reiki-experience options with guidance and an explicitly required first selection |
| `review checklist` | Glass panel showing five reports + five question answers; voluntary during study, required before requesting initiation review |
| `finish` | Personal learning highlights, notes/print/copy, initiation readiness, optional teacher-initiation request and non-automatic-initiation warning |

## Functional invariants

- Do not rewrite, shorten, invent or drop teaching texts, translations, original YouTube IDs, question scales, optional answers, ordered lesson progression or safety wording while making a visual redesign.
- The current p1 version is `2026-10-18.p1` after the separately verified five-lesson migration; this visual-only polishing pass does **not** change version or stored answers. Preserve the p0 compatibility path and account-scoped encrypted data.
- Preserve the server-authorized consent and account-scoped encrypted progress, conflict retry, unsaved guest mode and print-to-PDF behaviour.
- In the dedicated full-screen mobile player, keep the CTA visible while exceptionally long teaching, videos, notes or opened disclosures can scroll without clipping or truncating the content.
- Meet 320, 375/390, 430 px mobile and desktop; support browser-safe-area insets, keyboard navigation, focus-visible contrast, text zoom, reduced motion, and print white background.
- RU/EN parity is required. Spanish language is not present in this particular versioned course schema; never fake a translation.

## Acceptance checklist

1. Welcome screen hero, five sequential stage dots, main CTA and disclosure are visually coherent on iPhone.
2. Visit each slide kind and navigate forwards/back without skipping/silent saving.
3. Follow all **45** steps without branch selection; every tradition appears in the required order. The first circle is active on welcome; prior circles display a distinctly completed state.
4. Test 0–10 scale, long text, choice, practice timer, existing videos and unavailable-video fallback.
5. Guest answers do not persist. Signed-in course saves only after explicit consent; fail/retry and concurrent-version checks remain intact.
6. Check narrow/short phone viewport, text zoom and keyboard controls; verify long content is reachable within slide scroll.
7. Printing the final notes should contain no dark scenic background.
8. Run relevant unit/TypeScript/Next build/hosted checks and independently confirm production SHA before claiming LIVE. A dedicated synthetic guest-only browser test walks the full 45-step route in EN/RU using Chromium/WebKit at 320–430px, saving representative screenshots and checking backgrounds, real progress, CTA visibility and overflow. This does not replace physical iPhone or signed-in private-save acceptance.
