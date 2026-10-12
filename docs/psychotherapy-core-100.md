# Holistic House — 100 clinically relevant psychotherapy assessment instruments

## Scope (2026-10-11)

A **curated 100-instrument professional discovery collection** has been added to the existing Test Explorer. These are **100 established named measures and interviews**, NOT 100 newly licensed, runnable online questionnaires. The public-facing list includes instruments that require a licensed professional or permission before administration. Self-reflection questionnaires authored by Holistic House remain in the regular catalog and are not falsely presented as validated clinical instruments.

- Source of the exact 100 keys, 10 domains and original EN/RU plain-language summaries: `data/assessments/psychotherapy-core-100.js`.
- The 100-key group is displayed in the existing catalog via the **100 psychotherapy tests** tab, linked directly from the initial simple picker.
- **15 missing professional instruments** are appended as *metadata-only references* to the Mind–Body registry; original 128 research references become **143** (count assumes this base revision).
- Current **76 runnable tests** and their immutable questionnaire versions, scoring, client permissions, save flows, reports, recommendations, and longitudinal gauges are unchanged.
- Research registry items are searchable, but are **not startable**. Without a permitted questionnaire, no new result, false score band, or pseudo-diagnosis appears.
- The four available status labels are conceptually: ready online only when rights cleared, rights review pending, restricted/licensed, and clinician/managed-safety. Code preserves the more precise per-instrument `rightsStatus`.

## What each card means

A professional measure's public card can describe its purpose without reproducing protected item wording, scoring keys, thresholds, or standardized norms. A card is NOT a claim that a measure has been adapted/validated for a different language. Existing official-English questionnaires remain in English. Source/rights checks are required individually before making a given reference startable, including commercial-web usage, translations and electronic administration.

Examples needing particular safeguards:

- **MMPI-3, PAI, ADOS-2, DIVA-5:** protected or clinician-administered. Never add unofficial questions, norms, automated diagnosis or unauthorised administration.
- **CAPS-5, ACE, LEC-5, CTQ-SF, IES-R, PC-PTSD-5:** trauma-sensitive wording and clinician support. Keep managed safety and referral boundaries.
- **SCOFF, EAT-26, EDE-Q:** possible eating-disorder risk, not casual lifestyle scoring.
- **PHQ-9:** existing safety gate must remain; a risk-related response must not be normalized into a generic 'green' wellness gauge.
- **Couple/family and personality measures:** interpret culturally and contextually; scores are not a partner rating or fixed identity diagnosis.

## Implementation and verification

- Existing `lib/assessments/test-explorer.js` tags existing full-catalog entries with curated collection membership; no parallel questionnaire runner or result database.
- `availability: 'core'` filters the curated set while the other existing topic/problem, language, scale and sorting controls continue to work. Selected outside-core tests still remain visible in the editor.
- New references in `data/assessments/mind-body-monitor-registry.js` are all `enabled: false`, rights-gated and have no definition in `ASSESSMENT_DEFINITIONS`.
- Regression: `node --test tests/psychotherapy-core-100.test.mjs tests/mind-body-monitor.test.mjs tests/test-explorer.test.mjs`; lint/build/browser checks in CI and QA of EN/RU mobile Test Explorer.
- Do not apply DB migrations for metadata-only additions. If later licensing is secured, implementation must include separate source-backed immutable definitions, verified version/scoring, reviewed per-range interpretations, hash-guarded DB migration, private persistence QA and clinician acceptance.

## Production gate

This branch is for a reviewable pull request. A GitHub merge does not by itself prove the production alias has deployed the new commit; verify exact production SHA, Vercel READY and the public page. Do not claim 100 newly runnable tests or live release until verified.
