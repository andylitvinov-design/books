# Authored core check-in candidates, 2026-10-19

Status: **inactive local candidate**, not a live quality improvement or a validated measure.
Pinned source: `e604e43340c62d37c507374503471827daeee073`.

## Purpose and evidence limits

These are original Holistic House self-observation questions for adults, not diagnostic instruments, a crisis screen, personality tests, or a comprehensive mental health measure. EN/RU wording is an authored bilingual draft; translation equivalence, reliability, responsiveness, content validity and clinical usefulness have not been established empirically. No validated instrument items, proprietary scoring keys, norms or thresholds are incorporated. Adding clearer questions and safer arithmetic does not prove greater measurement accuracy.

Design follows the distinction between relevance, comprehensiveness and comprehensibility in [COSMIN content-validity guidance](https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/). Cognitive interviews and user testing are still required. [ITC adaptation guidance](https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf) supports reviewing language/cultural equivalence rather than assuming it. [Meaningful-change guidance](https://healthmeasures.net/interpret-scores/meaningful-change/) does not supply thresholds for these authored forms; none are borrowed. These sources justify design constraints, not the individual questions' validity.

## Versioned forms and exact scoring

Authoritative complete EN/RU wording, anchors, order and identifiers are in `data/assessments/hh-core-checkins-v3.js`.

| Key | New version | Recall | Items | Responses |
|---|---|---|---:|---|
| hh-current-state | v3 | right now | 6 | integers 0–10, item-specific endpoints |
| hh-weekly-pulse | v2 | past 7 days as a whole | 8 | integers 0–10, item-specific endpoints |
| hh-resource-pulse | v2 | right now | 6 | integers 0–10, item-specific endpoints |
| hh-monthly-profile | v2 | past 30 days | 18 | integers 0–4, five extent labels |

Each locale/version has a new UUID, translationVersion and semantic contentHash; resultVersion is `facet-profile-v1`. Every item maps to exactly one equally named dimension via the unchanged `raw-dimensions:v1` scorer. The dimension value is the original integer response. There is no reverse coding, weighting, total, percentage, mean, normative band, rank, percentile, diagnostic cutoff or rounding. All dimensions use `non-normative` direction. Topic labels do not create validated subscales.

Monthly anchors: EN `Not at all / A little / Moderately / Quite a lot / Very much`; RU `Совсем нет / Немного / Умеренно / В значительной степени / В очень большой степени`. These indicate extent across the stated period, not the number of days or clinical severity.

### Item map

Current state: difficulty intensity; usable energy; self-support; inner tension; fatigue; interference with an intended action. The old combined energy/inner-support item is not reused. The last item gets `state.current_interference`; difficulty/tension/fatigue retain their construct IDs within a strictly different version. No cross-version linkage is permitted.

Weekly: emotional wellbeing; inner tension; perceived load; restoration after sleep; usable energy; concentration; felt connection; ability to carry out necessary everyday activities. All have new facet IDs. Sleep is not combined with rest, concentration with clarity, or connection with support.

Resources: energy; self-support; perceived availability of support from people; connection; influence on a next small step; personal meaning of current activities. No `resources.overall` exists. Perceived availability is not evidence that assistance is objectively available.

Monthly: emotional grounding, self-care, needs awareness; connection, relational safety, asking for support; bodily comfort, restoration after sleep, physical energy; concentration, manageable load, daily responsibilities; direction, meaningful activities, a desired next step; practical support, emotional support, companionship. All 18 have new descriptive IDs. No six-domain mean or global mean is emitted. Statements about ability/perceived support avoid assuming that an actual request or difficult event occurred. The companionship question has no implicit previous-period comparison.

## Missing, invalid and incomplete observations

All questions remain required for submission and persisted scoring. Null, undefined or absent responses cannot become a completed result. Out-of-range, fractional, non-finite, string, boolean, object, array and unknown-key responses fail the existing validator. No response is imputed. Zero is an answered endpoint, distinct from missing.

The new `analyzeCheckin` API can describe an incomplete draft: each unanswered facet has `value:null,status:missing`; completeness is an integer answered/expected/missing count, not a quality score. A draft profile is **not** a persisted scored result. The API does not make N/A or skip work end-to-end. A future UI must preserve the ability to stop without forcing a false zero; unsupported N/A collection needs its own reviewed contract.

The five existing current-state optional note fields are retained. They are excluded from numerical analysis, not copied into comparisons, and do not establish that two difficulties refer to the same subject. No additional sensitive free text is required.

## Comparison contract

`compareCheckinObservations` accepts two answer observations with exact provenance, authenticated-caller account ID, and canonical UTC measurement timestamps. It recomputes facets, never accepts a supplied score/total as verified. This pure function is not an authorization boundary.

The full definition ID/key/version/hash, language/translation version, scorer/version, result version and timeframe must match. Different accounts or valid-but-different forms produce no facet disclosure. Equal/reversed timestamps produce no delta. Invalid provenance/answers fail closed. Missing values suppress only the affected facet. Both `state.problem_intensity` and `state.current_interference` always suppress automatic deltas: no trusted same-subject contract currently exists. Matching note text or a caller-supplied boolean is insufficient.

Comparable facets show only previous/current integers and signed raw response-point differences: higher-response, lower-response, same-response. Two observations do not establish a trend. No clinical importance, causal attribution, percent improvement, treatment effect, or statistical precision is inferred. Overlapping recall windows and recall bias remain limitations.

## Compatibility and preservation evidence

All 235 pre-existing definition objects, including UUIDs, hashes, result versions and order, have semantic SHA256 `9afca15f63b384214cf31326319fd3be3b884f5f27f22a256014cb271b79ca97` before and after. Existing core source files and catalog bytes are unchanged. The only edit to the definition resolver is an additive import and array spread. No registry SQL, migration, stored result, UI or catalog activation changes are included.

Tests run actual shared validation, scoring, run creation/save/submit and saved-result validation for all eight candidates at both endpoints. They reject missing/invalid values, malformed dimension arrays, fractional saved values, forged provenance, mixed account/form/locale, non-increasing/invalid timestamps, subject ambiguity, and unexpected fields. Mixed monthly responses prove that every original integer is preserved separately. Legacy core scoring and the complete old-definition fingerprint are retained.

Candidate-focused suite: 93/93 pass. Unchanged broad `app-assessments.test.mjs`: **31/32 on both baseline and candidate**. Its semantic-hash test fails on the known five pre-existing EN professional additions (emotion-decision-making, responsive joy, responsive distress, empathic concern, ONS wellbeing). This change neither repairs nor hides those baseline hash defects. Full repository, build, browser and production validation have not been run for this isolated source closure.

## Release gates: must remain inactive

1. Independent item/content/EN–RU review; respondent comprehension and applicability work.
2. Resolve rights/registry readiness and exact technical registration/readback through a separately authorized process; this package writes no database.
3. Wire the profile and comparison policy through actual result/report/history UI and native synthetic browser tests. The existing generic `compareResults` still computes raw differences for any dimension and does **not** enforce the difficulty-subject policy. Do not activate these definitions through the catalog until that route is reconciled.
4. Ensure every display retains individual labels/anchors, incomplete status, neutral descriptions and evidence limits; no fallback clinical bands, summary totals or unsupported comparisons.
5. Verify immutable legacy results and cross-version rejection end-to-end, then exact full CI/build and native EN/RU accessibility tests.

Passing this candidate's software tests is not psychometric validation and does not mean the user's live check-ins have yet changed.
