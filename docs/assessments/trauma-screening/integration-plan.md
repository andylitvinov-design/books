# Trauma screening integration gates

Baseline: codex/public-book-library e8968339771e1f3ae849dcb80703ea4a096dbcea, remote rechecked 2026-10-14. This document records the historical pre-integration plan. The two new versions have since passed technical registration/readback; release-review.md describes the opt-in activation candidate and remaining publication gates.

## Historical baseline runner gaps (before this candidate)
Both components/app/app-workspace.jsx and components/app/cabinet-landing.jsx render the complete static questions array and derive completion from it. Only one global instruction/timeframe is presented; section labeling is specific to Bach. Optional context is collected after responses using hard-coded generic fields. These cannot faithfully administer these three instruments unchanged.

The latest version of app_private.validate_run, in supabase/migrations/20261003011500_hh_app_guest_report_flows.sql, rejects terminal runs unless the number of answer keys equals the complete question count. PC-PTSD-5 exposure=NO requires five symptoms to remain structurally unasked. Therefore it needs a separately authorized database validation-function change; fabricated zero responses, dummy codes and false partial definitions are unacceptable workarounds. No SQL change is included or authorized in this candidate.

## Bounded ordinary-code integration
PCL-5 and adult ITQ do not require structural skips. Their front matter can be stored through the existing encrypted context_ciphertext. No client records need to be read. All existing definitions and hashes must remain unchanged.

1. New, version-pinned English-only definitions. PCL-5 uses the exact Criterion A form rather than a self-attested external assessment checkbox. Preserve exact exposure-type and natural-vs-violent/accidental death distinctions. Optional narrative stays optional. ITQ preserves event anchor/time since, all four section instructions, both impairment sections and original response anchors. No invented DSM gate for ITQ.
2. Shared definition-scoped required context validation, using the encrypted context payload. Save permits partial front matter; submit and guest claim require the full applicable context. Persisted records and rescoring must use the same validated context. Never infer clinical confirmation from a user assertion.
3. Shared front-matter UI and section instructions in both authenticated and guest paths, including quick/guided modes, restart, resume, answer edits, and back navigation. Keep required front matter before symptom responses. Clear derived readiness on edits. Generic existing instruments retain exactly their current behavior.
4. Dedicated arithmetic scoring. Neutral raw dimensions only in the live result contract; no diagnostic labels, generic severity bands or a selected probable-PTSD cutoff. ITQ impairment never contributes to symptom totals; endorsement >=2; any clinician-facing pattern is explicitly a self-report algorithm requiring professional evaluation.
5. Additive source/rights guides, deterministic content hashes and new-row registration payload after integration tests and independent review. No DB writes, publication, activation or PR until review approval. Check current canonical again before packaging and merge the eight-IPIP additions without replacement.

## Verification
Offline fixtures currently cover minima/maxima, source-derived patterns, ITQ >=2 and impairment boundary, DSO alone, mutual exclusivity, PCL cluster minima, missing/null/sparse/malformed responses and structural skip. Required remaining checks: source-to-rendered UI comparison, guest/auth parity, submit/claim context enforcement, interrupted/resumed flows, English-only labels, existing definition/hash preservation, full unit/lint/type and build when available, isolated DB suite using synthetic data, independent review. Passing code tests does not establish clinical suitability or validation for the site's population.

## Files expected to change on integration
- New data/assessments/trauma-screening-2026.js and shared administration/section components
- lib/assessments/definitions.js, scoring.js, run-lifecycle.js
- lib/app/repository.js and guest-repository.js
- components/app/app-workspace.jsx and cabinet-landing.jsx
- Later additive catalog, interpretation, methodology, guides, registration JSON and tests

No migration, RLS, access settings, cost change, existing registry-row update, or client-data read is in scope.
