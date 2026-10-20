# Holistic House — source-aligned authorial scale clusters and scoring integrity
Date: 18 October 2026. Owner-requested technical quality improvement.

## What is now measured

For every active *original* Holistic House numeric questionnaire and each distinct subscale, a score must have a traceable path:
**named construct → exact assigned question IDs → original integer response options → immutable sum/mean/single-answer scorer → actual attainable numeric values → clearly explained report intervals**.

The implementation uses `lib/assessments/author-score-clusters.js` only for **verified original** result versions whose item assignments and permissible score limits match their registered definition. It is presentation-only. It never asks for, guesses, modifies, stores or reconstructs a client's individual answers.

### Actual score example: money-related difficulty vs accessible coping (v2)

Each of two **separate** subscales contains 3 different questions with responses 0–4. The canonical scorer calculates a 3-item mean, rounded to two decimal places. The full possible score lattice is:
`0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3, 3.33, 3.67, 4`.

The five explanation rows group these **actual possible means**, using the original questionnaire's response anchors rather than decimal fifths of an assumed clinical severity range:

| Original response anchor | Attainable score interval | Interpretation |
|---|---|---|
| Not at all | 0–0.33 | Mean falls nearest to original 0 response |
| A little | 0.67–1.33 | Mean falls nearest to original 1 response |
| Somewhat | 1.67–2.33 | Mean falls nearest to original 2 response |
| Quite a lot | 2.67–3.33 | Mean falls nearest to original 3 response |
| Very much | 3.67–4 | Mean falls nearest to original 4 response |

These are **not validated groups, percentiles, symptom diagnoses, responsiveness cutoffs or proof of a treatment effect**. The actual construct of each named subscale determines whether higher responses reflect more reported difficulty, more accessible choices, or a neutral trait. Averages can mask quite different combinations of item responses.

For a 4-item 1–5 sum, attainable values range **4–20** and groups are based on the mean's proximity to the original 1–5 response anchors — never on an invented 0–100 "health" score. For a single 0–10 state rating, only integer values are possible; intervals use attainable integer endpoints.

### Methodological safeguards

- The exact registered definition ID, version, scoring key and source hash must match the scored result. Invalid or unachievable numeric values receive **no authored cluster interpretation**.
- Duplicate/unknown subscale question IDs, an impossible min/max, inconsistent item polarity, or unsupported reverse-keyed composition are **not silently accepted**. Such scales remain raw descriptions pending source-level review; they do not acquire fabricated severity/resource ranks.
- The 6 historical original v1 inventories with *mixed question polarity* are not retrospectively labeled pure resource/difficulty scales. Newer approved v2 split subscales retain their separately scored questions. Historical results remain immutable.
- The Bach flower weighted theme profile remains a traditional, symbolic **weighted theme-match**, not a validated clinical psychometric scale; this engine deliberately does not fabricate five severity clusters for it.
- Every eligible report shows **each cluster's exact numeric endpoints, label, specific construct and limitations** plus an expandable item-to-subscale map and score aggregation method (EN/RU). Question source language is respected; score labels can be localized without claiming validated translation.
- Only signed-in full reports show the item-level composition and interpretation. The existing guest score-only / save-to-cabinet boundary is retained.

## Scientific validity is a separate gate

COSMIN emphasizes **relevance, comprehensiveness and comprehensibility** of the item content and response options for the intended population before reliability/structural validity can be established:
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/

This PR delivers **arithmetic correctness, transparent content mapping and interpretation discipline**, not an independent demonstration of content/construct validity. New authorial scales still require respondent cognitive interviews, qualified expert panel review, adequate test-retest and structural reliability data, measurement-error/responsiveness estimates, population sampling and separately validated language adaptations. Do not market as a clinical or diagnostic validated scale without those studies.

## Release gates

1. Unit test synthetic low/middle/high profiles and exact scored values for active versioned author tools across EN/RU, including split difficulty/coping, 1–5 sums and 0–10 single-answer ratings.
2. All ordinary eligible authored measures must expose one-and-only-one correctly selected interval and its exact mapped source questions. Fail closed for invalid and incompatible score versions.
3. Assert every interval boundary corresponds to a value the actual scorer can produce; gaps in possible values are acceptable and explicitly explained.
4. Keep source-published clinical cutoffs, specialized ASRS counts, RSES/ERQ trait neutrality, unchanged database v1/v2/v3 payloads, PDF and guest privacy contracts intact.
5. Verify Vercel READY exact commit; broad site CI and full authenticated browser acceptance are separate release gates.

## Follow-on source-rubric clarity (18 October 2026, review 4)

This is a **presentation and construct-accuracy change for version-verified author-created questionnaires**, not a change in validated psychometric properties.

### The respondent can now see a verifiable chain

For each eligible active HH subscale, the full client report shows:

1. The exact currently scored construct and **its actual source question texts**, not a guessed reconstructing of the individual's answers.
2. The immutable sum/mean/single-answer calculation, number of items, original minimum/maximum and rounding rule. For `mean`: the sum of numeric response codes divided by the item count, with two-decimal output rounding. For `sum`: a coded-response sum, and a multiplier only if the original scorer declares one.
3. For source-anchored scales, numeric answer codes and their original labels (`0 — Not at all`, ..., `4 — Very much`, or `1–5` scales), separately from the **rounded average**, which is *not* evidence that every underlying response equals the nearest option.
4. Every score band is based solely on an **exact list of actually attainable values**, including two-decimal gaps (e.g. with 3 integer 0–4 responses: 0, .33, .67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3, 3.33, 3.67, 4). Exposing each band’s exact score points prevents visually implied false decimal possibilities.
5. Plain EN/RU content-limit notes for historically mixed or conceptually heterogeneous tools. `hh-felt-safety` combines bodily noticing, comfort, boundaries and action choice; its overall mean **is not a direct measure of objective safety or trauma**. `hh-body-mind-context` measures authored observation habits and when to seek professional care, **not disease severity or a psychosomatic cause**. `hh-current-state` and `hh-weekly-pulse` consist of distinct single-item ratings, not one validated global mental-health scale. Version-2 money, overthinking and screen reflections have separate difficulty/coping/context subscales; archived mixed-domain v1 results remain immutable and incomparable. Authorial socionics, enneagram, DISC and temperaments are not validated identity categories.

The response mapping is suppressed rather than misrepresented if individual question anchor labels contradict the questionnaire-level global anchor labels. Source questions with heterogeneous items are still displayed, but an arithmetic average does **not** establish an internally consistent latent trait. Single-item check-ins cannot claim internal-consistency reliability.

### Evidence limits and actual next steps

- These five sections are **editorial descriptions of possible answers**, never population norms, clinical severity categories, reliable-change thresholds or validated diagnoses. No extra individual response data is inferred from a stored sum.
- Technical verification checks actual score lattice/mapping/provenance; it does not validate content, internal consistency, test–retest reliability, measurement invariance or treatment effects.
- Independent qualified reviewer assessment of item relevance, completeness and comprehensibility **per construct/subscale**, consenting respondent cognitive interviews (EN/RU separately), pilot psychometrics and explicit, prospectively approved questionnaire-version updates remain mandatory before making stronger scientific claims.
- Do not put `item response 0–4` labels on source forms that use distinct per-question anchors; no newly authored labels may silently replace original language-specific questions or source-approved cutoff scales.
- The changes do not modify clinical instruments, source version hashes, database values, private client answers, screening safety handling, or licensing permissions.

### Regression acceptance

`tests/author-score-clusters.test.mjs` now checks all active eligible HH subscales for unique, ordered, immutable and complete score-point sets, exactly one current band, source-coded labels, explicit sums/means/single ratings, EN/RU construct limits and unaltered source records. Named cases cover money-pressure v2 numeric lattice (including gaps), five independent 0–10 current-state items, felt-safety, body-mind-context, overthinking and screen load. UI checks require exact answer code, possible score-point and construct-limit disclosures.

Follow [COSMIN v2.0](https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/) and [ITC test adaptation](https://www.intestcom.org/page/14) for all future empirical content and language claims.

**Release gate:** exact-head unit tests + Vercel READY production SHA + public EN/RU runner and authenticated report/PDF playback are separate evidence sources. Never call this work scientific validation or production live before the corresponding gates pass.
