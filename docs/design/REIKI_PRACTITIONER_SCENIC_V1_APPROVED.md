# Free Reiki Practitioner Program — Approved Scenic Course Design V1

**Owner approval:** 18 October 2026.  
**Reference:** approved Holistic House Reiki Practitioner mockup derived from the Anti-Stress/OPORA course design.  
**Implementation surface:** `components/energywork-ai-learner.tsx`, `components/energywork-ai-learner.module.css`.  
**Status:** design contract; production readiness must be verified separately.

## Visual contract

- Immerse the whole mobile course screen in a photographic scenic background with a deep teal-to-navy contrast gradient and soft warm sunlight. Do not create a white inset page or a paper/parchment header.
- Top chrome: small translucent back control and the Reiki Practitioner course name. Below that, a three-point journey strip: **Reiki Yggdrasil / Tantra Reiki / Kundalini Reiki**. Connect the circles with a thin line; illuminate the selected actual branch. The introductory first illuminated circle is *visual preview only*: no branch is saved or implied until explicit selection in `paths-04`.
- Opening headline: “Reiki Practitioner — your first step”, large warm white editorial serif, followed by introductory copy.
- A midnight-blue glass card presents **3 possible Level 1 initiations** and all three tradition labels. Preserve the explicit explanation that the learner must complete learning tasks and then arrange each initiation separately with Andrey; course completion alone provides none.
- Three compact benefits: **Short lessons / Practical tasks / Private progress**. The third is only available after real sign-in and explicit storage consent — do not imply guest answers are saved.
- A slim teal progress bar with precise “Lesson N of 29 / P% completed”, near the primary CTA.
- An extra-large cyan-to-turquoise **Start free program / Continue** action at the bottom, with a distinct back action only when relevant. Below: compact “Explore the programme” and private-save disclosure; tiny safety disclaimer.
- The font and spacing match the existing course system's premium calm aesthetic without borrowing proprietary Duolingo graphics.
- The owner-approved mockup shows a meditating person at sunrise. The mobile screen now uses the **dedicated clean Reiki sunrise photo** `/images/holistic-house/reiki-practitioner-sunrise.webp`, cropped from the owner-approved AI visual without any interface text. The desktop presentation retains the existing local scenic photo `/images/holistic-house/course-focus-mountain-boy.webp` to avoid upscaling the small mobile-optimized image. Both backgrounds are local, with deep teal/navy gradients; no remote photo dependency or flattened UI mockup is loaded.

## Apply to **all 29 steps**, not just the welcome card

The editorial source contains 39 unique slide IDs: 22 shared introductory steps, 5 exclusive steps per chosen tradition, and 2 final steps (29 visible steps per completed course route).

| Slide kind | Scenic-system treatment |
| --- | --- |
| `welcome` | Transparent scenic hero, 3 traditions, initiation disclosure and benefits |
| `lesson` | White high-contrast heading and teaching copy in frosted navy panel; existing illustration as secondary image |
| `video` | Accessible responsive 16:9 existing poster/click-to-play player, no autoplay |
| `practice` | Gentle instructional copy, optional 2-minute timer with start/pause/reset, optional feedback |
| `reflection` | Frosted question panel with readable text, radio/scale/textarea controls and focus rings |
| `path-choice` | Three photo cards, selected branch shown clearly, required choice before continuing |
| `finish` | Personal learning highlights, notes/print/copy, optional teacher-initiation request and non-automatic-initiation warning |

## Functional invariants

- Do not rewrite, shorten, invent or drop teaching texts, translations, original YouTube IDs, question scales, optional answers, branch progression or safety wording while making a visual redesign.
- Keep version `2026-10-17.p0` unchanged for this visual-only release: saved answers and course positions must remain valid, with no data migration.
- Preserve the server-authorized consent and account-scoped encrypted progress, conflict retry, unsaved guest mode and print-to-PDF behaviour.
- In the dedicated full-screen mobile player, keep the CTA visible while exceptionally long teaching, videos, notes or opened disclosures can scroll without clipping or truncating the content.
- Meet 320, 375/390, 430 px mobile and desktop; support browser-safe-area insets, keyboard navigation, focus-visible contrast, text zoom, reduced motion, and print white background.
- RU/EN parity is required. Spanish language is not present in this particular versioned course schema; never fake a translation.

## Acceptance checklist

1. Welcome screen hero, branch strip, main CTA and disclosure are visually coherent on iPhone.
2. Visit each slide kind and navigate forwards/back without skipping/silent saving.
3. Select Yggdrasil, Tantra, Kundalini separately: exactly 29 steps and only matching five branch steps.
4. Test 0–10 scale, long text, choice, practice timer, existing videos and unavailable-video fallback.
5. Guest answers do not persist. Signed-in course saves only after explicit consent; fail/retry and concurrent-version checks remain intact.
6. Check narrow/short phone viewport, text zoom and keyboard controls; verify long content is reachable within slide scroll.
7. Printing the final notes should contain no dark scenic background.
8. Run relevant unit/TypeScript/Next build/hosted checks and independently confirm production SHA before claiming LIVE.
