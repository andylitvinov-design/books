# HH Emotional Vector Matrix 64 + Resource/Relief v1 — 2026-11-05
Status: implemented taxonomy and optional transparent scoring; not a diagnosis, validated psychometric resource scale, editorial approval for all 64 paths, or proof of LIVE deployment.

## Distinguish the three axes
1. **Emotion:** 8 «Сейчас» clusters × 8 «Хочу» clusters = 64 possible emotional vectors, with IDs ev64:<now>><want>. All 48 existing STSE state IDs map into the appropriate side. A user can refine a cluster to the exact legacy state.
2. **Meaning:** 8 separate meaning axes; 64 × 8 = 512 *potential* emotion × meaning intersections, not 512 reviewed ideas or ready-made films.
3. **Resource:** independent, optional self-report. Never substitute a resource score for the user's chosen vector, diagnose or authorize a mandatory emotional experience.

## Eight current / eight desired clusters
Current: Тревога и страх; Стыд и самокритика; Злость и обида; Усталость и истощение; Одиночество и отчуждение; Растерянность и потерянность; Бессилие и скованность; Печаль и уныние.
Desired: Спокойствие и безопасность; Уверенность и способность действовать; Самопринятие и доброта к себе; Границы и свобода; Энергия и движение; Близость и контакт; Ясность и направление; Надежда и радость.
These are two lists, not row-by-row prescribed pairs. RU/EN/ES labels and editable valence are defined in lib/mandala/meaning-emotion/emotional-vector-matrix.mjs.

## Resource calculation
E = available energy now (0..10), I = intensity of *current* feeling (0..10), V = personally rated pleasantness (−3..+3). For a selected current cluster, a **labeled editorial suggestion** of V is available, but an explicit user rating supersedes it.
- Current signed emotional charge: Q = V × I (−30..+30).
- Indicative resource: R = clamp(10 × E + Q, 0, 100).
- Example: E=4, V=−2, I=7 → Q=−14, R=26/100.
- Missing E or I → R=null, never zero; missing V and no selected cluster → Q=null. Neutral zero is a real answer. Preserve V, I, E, Q and R separately.
- Negative pleasantness does not equal helplessness: anger can mobilize. Elevated R does not mean clinical readiness. For low E ≤3 or high I ≥8, the existing gentle-delivery constraints take priority.

## Existing data and editorial gates
Previous Idea Engine still holds 8 exact curated emotional transitions × 8 meaning axes × 3 ideas = 192 source-curated but **not owner-approved** ideas. The eight exact transitions map to seven of these broader cluster cells because shame→self_acceptance and self_criticism→compassion share one cluster cell. The remaining 57 cluster cells have no curated meaning ideas: make all 64 directions selectable but do not fabricate ideas. If an exact pair is not curated, retain a safe neutral video path and a transparent editorial-missing message.

Preserve separate film template / emotional scenario / scene script, explicit selection, original topic/scenario IDs, licensing and render gates. No additional provider API, paid service, background polling or personal diagnosis.

## Acceptance
- 64 stable, localized vectors and no overlaps in canonical 48 state registry.
- Optional precise-state refinement, legacy preset buttons and session-local preferences.
- E/V/I/Q/R calculation with signed and edge-case tests.
- No regressions in original 8 source-curated pair→idea routing.
- CI, GitHub protected merge, Vercel production SHA and real mobile interaction verified separately.
