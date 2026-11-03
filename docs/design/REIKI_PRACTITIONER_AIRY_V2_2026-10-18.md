# Reiki Practitioner — Airy Sky Mobile Design V2
Approved visual direction: 18 October 2026

## Objective
Keep the unified **5-lesson, 45-screen** Reiki Practitioner course, its original source meditations and authenticated private progress unchanged while making the mobile course much lighter and easier to complete in a single phone viewport.

## Design contract
- Full-screen local sky-and-sunrise landscape (no stock avatar, no external image CDN) with pale blue, white and a gentle warm sun glow.
- Dark navy overlays replaced by legible near-white frosted glass; dark-teal text, soft subtle strokes, no dense shadow blocks.
- Five compact progress dots: Flight to the Sun → Tantra Reiki → Kundalini Reiki → Reiki Yggdrasil → Personal Reiki Initiation.
- On the **first screen only**, show course back/header, short title, short intro, compact systems card with **“Study all five lessons in order.”**, slim benefits and one clear CTA.
- On **all inner screens**, remove redundant top back/title controls; keep the five lesson dots and bottom Continue/Back.
- Compact spacing on phone; content may scroll inside the slide if a user enlarges type, but the CTA remains visible.
- Only one compact 'Explore the programme' disclosure. The existing Google sign-in, opt-in private saving, saved-status, and delete/reset UX live inside that disclosure, not as a permanently visible “Save your learning privately” block.
- Long notes about the optional nature of observations, the teacher-led initiation and the educational safety disclaimer are removed from the introductory view but remain in later educational content / expanded programme details. The five reports and five answers remain prerequisites for asking about a personal initiation.
- Keyboard-visible focus, readable text contrast, touch targets, reduced motion and clean printing must remain.

## Scope
`components/energywork-ai-learner.tsx`, `components/energywork-ai-learner.module.css`, a local sky illustration and targeted regression tests. Not a new course engine or video render.
