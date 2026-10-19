# Holistic House: questionnaire measurement-quality gates (18 October 2026)

Status: **technical corrections proposed for review, not an independent psychometric validation study**. No private client results, responses, dates, demographics, contact data or medical records are used in this work.

## What the complete installed-library audit establishes — and does not

Read alongside `full-library-technical-quality-audit-2026-10-18.md`, `professional-quality-ledger-2026-10-18.csv`, `full-library-scale-matrix-2026-10-18.csv` and [Books #342](https://github.com/andylitvinov-design/books/issues/342).

- 145 runnable method keys; 230 immutable registered EN/RU source versions. Of the method keys, 73 are Holistic House original educational/self-reflection tools; 72 refer to published-source candidate instruments.
- Verified version/content-hash/scorer matching, declared numeric bounds, reverse scoring and computed totals **do not** establish relevance, comprehensiveness, comprehensibility, structural validity, reliability, measurement invariance, responsiveness, clinical diagnosis or commercial permissions.
- An original HH tool is **descriptive and not independently validated** unless additional *instrument/version/language/purpose-specific* empirical evidence is approved. A published-source candidate is not automatically certified for every population or translated language.
- No global percentage of psychological health, no universal clinical bands for author tools, no claims that a changed score proves therapy success, and no statistical confidence/accuracy number made up from the scoring algorithm.

## Implementation in this quality pass

1. `lib/assessments/monitoring.js`: filter monitoring baselines, due dates, history series and claimed multi-point trends through the same immutable version/score verification used for client reports. If the most recent result is unverifiable, retain its raw history but **do not** promote an older successful result as the current measurement. Retake suggestions remain possible. Do not mutate any saved records.
2. `lib/assessments/test-kinds.js`: change the externally sourced catalogue's displayed category from an unqualified **Professional/Pro** to **Published-source tests/Source** (localized in RU/ES), while retaining the stable internal `professional` category key. This states provenance, not validation.
3. `data/assessments/catalog.js`: use **Weekly Wellbeing Check-in / Самочувствие за неделю** for the authored eight-question weekly self-report, rather than implying a measured aggregate of "psychic health"; its immutable questionnaire title/questions/axes/scorer remain unchanged.
4. Dedicated synthetic regressions in `tests/psi-monitoring.test.mjs` and `tests/test-kinds-catalog-audit.test.mjs`: wrong SHA, impossible score, malformed date, invalid intermediate record, last-attempt rejection, genuine compatible retest, untouched input, and EN/RU/ES classification labels.

This change **does not touch source item wording, reverse keys, scores, thresholds, clinical safety signals, persisted result versions, database migrations or private records.** The separate cross-version Trends UI fix is tracked in PR #1009.

## Priority content-validity review before creating new author versions

| Candidate | Current content concern / research hypothesis | Next required review | Safe UI now |
| --- | --- | --- | --- |
| `hh-current-state` v2 | Five single-item 0–10 ratings describe different constructs (difficulty, support, tension, fatigue, daily-life impact), not one internally consistent "mental-health scale" | Expert review of each construct/anchor and respondent cognitive interviews, including how "now" and "impact" are understood | Five independent descriptive values; never a total percentage or diagnostic composite |
| `hh-weekly-pulse` v1 | Eight different state/symptom/function/resource items cover distinct domains; a common omega/alpha for the entire instrument would be inappropriate | Check comprehensibility and recalled 7-day timeframe for each item and decide whether validated multi-item domains are actually needed | Eight separate check-in values; no synthetic overall health score |
| `hh-money-pressure` v2 | Split economic difficulty vs available coping (three items per subscale) improves construct coherence over mixed-direction v1, but neither subscale is validated | Two separate content reviews; item correlations and dimensionality on consenting pilot respondents; appropriate external anchors | Two descriptive three-item means; archived v1 incomparable |
| `hh-overthinking-loop` v2 | Five rumination/difficulty items and one interruptibility rating are distinct; the singleton cannot have estimated within-scale reliability | Content review, pilot structural evidence for five-item score, test–retest error; keep the singleton descriptive | Separate domains; never infer recovered ability from historic v1 |
| `hh-screen-saturation` v2 | Five overload items vs a one-item relief/context rating; contexts may strongly affect answers | Confirm coverage, understandability and timeframe; examine whether an external validated measure addresses the goal better | Two descriptive domains; archived v1 incomparable |
| `hh-bach-flower-profile`, socionics, enneagram, and other typologies | Traditional/symbolic or exploratory theme matches are not validated psychological diagnoses and lack clinical cutoffs | Keep a nonclinical evidence grade; do **not** use them for remedy prescriptions or calibrated mental-health claims | Explicit reflection/typology context and no medical prediction |

## Evidence and release protocol (no unconsented research)

1. **Define a construct per score/subscale**, timeframe, intended audience, response anchors and clinical/nonclinical use. Prefer a licensed/open published scale with appropriate evidence instead of inventing a new scale when possible.
2. **Content validity first:** qualified independent reviewers assess item relevance and domain completeness; voluntary cognitive interviews with intended EN/RU respondents check wording and answer comprehension. Log disagreements, alternate wording and harms; review each subscale separately.
3. **Pilot only with explicit research consent:** pre-register hypotheses and a justified sample-size/precision plan; estimate structure, internal consistency *only for appropriate multi-item reflective scales*, test–retest reliability/measurement error and convergent/discriminant associations. Avoid inferring reliability from one person's repeated check-ins; do not mine the Client Cabinet automatically.
4. **Language:** verify EN and RU administration texts separately. Structural parity of question IDs or a translated result screen does not establish test adaptation, norms or score equivalence. Do not show ES questionnaire validity before actual ES adaptation evidence.
5. **Interpreting change:** only exact-compatible versions can be paired numerically. Label a difference as an observed self-report change until reliable change and responsiveness are independently supported for that scale/population. No invented SEM, SDC, RCI, percentile or numeric confidence estimates.
6. **Revision control:** any newly approved question set must be an *additive immutable version* with new content hash, exact item-score mapping, separate EN/RU language approval and append-only DB registration. Never mutate historical definitions or back-fill answers from aggregate stored scores.
7. **Publication gate:** unit/boundary/negative tests, consent/safety/rights checks, EN/RU mobile runner/results/PDF acceptance, exact-commit Vercel READY, source/hash readback, then confirm the intended public domain. Do not claim psychometric validation until external evidence exists.

### References

- COSMIN systematic review guideline v2.0 (2024), content validity and measurement properties per subscale: https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/
- International Test Commission Guidelines for Translating and Adapting Tests, 2nd edition: https://www.intestcom.org/page/14
- ITC/ATP Guidelines for Technology-Based Assessment, updated 2025: https://www.intestcom.org/page/16
- Existing full-source audit: `full-library-technical-quality-audit-2026-10-18.md`.

**Owner-facing status vocabulary:** technical scoring checked ≠ measurement scientifically validated ≠ production published.
