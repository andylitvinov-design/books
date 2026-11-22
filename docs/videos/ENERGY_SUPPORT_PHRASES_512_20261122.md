# 512 scenarios × three energy/readiness levels × five support phrases

**Owner brief, 22 Nov 2026. Status: editorial draft, NOT LIVE, NOT human-reviewed.**

The existing 512 distinct 14-second short-film concepts are **not overwritten**. Their
`scenarioId`, `subsectorId`, `topicId`, `axisId`, four shots and canonical taxonomy remain
unchanged. The separate first-party data file `data/video-catalog/meaning-axis-energy-phrases-512-v1.json`
contains 512 scenario-linked records × three energy/readiness levels × five ranked phrases:
**7,680** new primary lines per locale, **23,040** localized lines in EN/RU/ES.

## Meaning of three levels (self-selection only)

- **LOW · Низкая энергия / начальная готовность** — emotional permission, validation,
  pause, gentleness; no pressure to do or feel more.
- **MEDIUM · Средняя энергия / развивающаяся готовность** — notice choices, manageable
  steps and available support; actions remain optional.
- **HIGH · Высокая энергия / устойчивая готовность** — self-directed choice,
  compassionate boundaries, integration and self-recognition, never forced achievement.

No score algorithm measures maturity, mental health or another person's readiness.
The person picks their level voluntarily. A level describes their *current available
energy and intention*, not their value, psychiatric diagnosis or permanent ability.

## Copy usage and limitations

- Each phrase is uniquely authored as a **deterministically composed editorial draft**
  from a context cue and one axis/tier-specific expression; 7,680 *full* phrases
  are unique in each of RU/EN/ES. This is not evidence of 7,680 independently
  hand-reviewed creative narratives. Human review is still needed for idiom,
  specificity and sensitive contexts (panic, childhood adversity, low mood).
- Spoken lines may be **longer than 36 characters**. For the existing Montage editor,
  a separate `*Caption` variant is at most 36 code points; these compact variants
  may repeat across different scenarios. Do not silently cut full voice text or
  claim captions are globally unique. Current UI is **not wired** to this library.
- A 14-second short video can show **one to three selected lines**, not 15. The
  fifteen are five options for each level, not 15 simultaneous overlays.
- No medical diagnoses, healing guarantees, prescriptions, coercion, private health
  profiling, social-platform delivery, or user material sent to a provider.
- No fake render: **all texts are drafts**; licensed media matching, user acceptance,
  real MP4, physical iPhone, EN/RU/ES editorial review and exact LIVE E2E are unverified.
- No HeyGen/paid API/render calls; no deployment/extra scheduled release triggered
  merely by adding static data.

## Programmatic reference

`listMeaningEnergyPhrases(scenarioId, {tier: 'low'|'medium'|'high', locale:'en'|'ru'|'es'})`
returns five ranked proposals. An omitted/invalid level returns `[]` (fail-closed).
`auditMeaningEnergyPhrases()` checks all 512 × 15 × 3 primary lines, stable IDs and
36-codepoint caption variants. Existing canonical 256 plot IDs remain unchanged.

## Local checks

- `node --test tests/meaning-axis-energy-phrases-512.test.mjs`
- Source-first structural audit of JSON, all scene and phrase IDs, locale counts,
  tier ordering, unique full copies and no duplicate with previous eight phrases.

This file is independent of the separate, still separately gated 512-scenario
concept PR; no dependency on an unmerged UI branch is assumed.