# Holistic House test type and scoring-key audit — 2026-10-13

Scope: the **registered source catalogue**, not a claim that the live website, database migrations, or published content are updated.

## Three exclusive discovery types
- `professional` — externally sourced professional questionnaires with a registered full form, source URL and scoring. Reference-only professional methods are still non-runnable if rights/safety are not cleared.
- `monitoring` — HH-created check-ins, symptom/resource questionnaires and state-tracking scales. A descriptive score is *not* a validated norm or clinical diagnosis.
- `hobby` — explicit original Holistic House typology/traditional self-reflections: Bach flower profile, socionics, enneagram, DISC-style and four temperaments. Not MBTI or a clinical interpretation. Do not auto-treat these as mental health diagnoses or actionable deficit scales.

Classification is centralized in `lib/assessments/test-kinds.js`. Existing `testStyle` remains a *presentation/depth* facet, independent of the new type. All three categories may be combined using inclusive checkboxes; unrelated facets are intersected. The selected set is preserved if hidden by a filter. `kinds` is whitelisted in OAuth test-selection preferences.

## Original scoring keys and clinical conclusions — audit boundaries
- `ASSESSMENT_DEFINITIONS` contains immutable instrument ids, questionnaire version, locale, content hash, scoring key and, for configured scales, item sets, reverse-keyed items, scoring method and direction. `scoreAssessment` rejects unregistered or altered definitions.
- `interpretationPlan` and per-scale `buildAssessmentResultReport` provide **bilingual, version-bound descriptive explanations and practical next steps**. Published cutoffs, where specifically sourced, remain separate from score-position descriptions.
- The new audit verifies **every startable catalogue key and language** against the registered scoring definition, item-key references, full low/high scoring runs, two-language report sections and a matching interpretation plan. A new or unreviewed key does not automatically become startable from this classification.
- Professional/type labeling requires a documented **source URL** but **does not** independently verify that an external published author's original key, translation, population norms, clinical interpretation or digital-use permission is correct. Such verification requires manual source-by-source review with authoritative materials.
- HH-authored keys and hobby typologies have original **site** scoring logic, not original published clinical norms. Do not market them as professional clinical tests.
- The 2026-10-13 registered interpretation audit test references **109 unique active keys** (and validates source plans). This count is not proof of live Supabase content rollout.
- The pending separate PR #388 proposes stricter version+hash-keyed published interpretation content in the database. It has its own independent SQL, permission and production release gates. Do not substitute this UI classification for that release or claim PR #388 has shipped.

## Regression checklist
- All current startable keys: min/max scoring + EN/RU section conclusions; no missing named scorer, version, content hash or interpretation plan.
- Professional requires source evidence; explicit hobby list; HH monitoring stays separate.
- Three kind filters OR together, AND with length/areas/topics. Preserve manually selected tests and unavailable research gating.
- EN/RU/ES human labels and accessible checkboxes in simple and advanced picker; type symbol alongside the test title; OAuth preferences retain safe categorical selections.
- Unit/app/CI, browser and release tests must pass on the exact merged commit before production is declared ready. No client data, DB, live credentials, pricing or source questionnaire definitions changed by this feature.
