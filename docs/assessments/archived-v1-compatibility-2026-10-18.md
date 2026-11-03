# Archived Holistic House questionnaire compliance — 18 October 2026

## What changed
Three older original self-reflections were already corrected for **new** administrations by their immutable v2 definitions. This release upgrades interpretation of **existing v1 saved results**, without changing their text, score keys or stored values:

| Questionnaire | Old v1 | New v2 |
|---|---|---|
| Money Pressure / Давление денег | Six items combined distress and available coping into one mean (0–4) | Two separate three-question means: money difficulty and coping/resources |
| Overthinking Loop / Петля переосмысления | Five worry/rumination difficulty items + one interruptibility item averaged together | Five-item difficulty mean and separate one-item interruptibility rating |
| Screen Saturation / Экранная перегрузка | Five overload items + one relief-after-offline item averaged together | Five-item difficulty mean and separate one-item offline relief/context rating |

We confirmed **all 6 historical EN/RU item sets** correspond exactly, question ID and question text, to the independently grouped v2 source sets. The v1 result remains one six-item mean and **cannot be split** using only its archived sum. No attempt is made to reconstruct a client's individual answers.

### Archived numeric map
For six 0–4 integer responses, the exact possible average is the original unweighted sum divided by six and rounded to two decimals. The **25 actually attainable mean scores** from 0 to 4 are:
0; 0.17; 0.33; 0.5; 0.67; 0.83; 1; 1.17; 1.33; 1.5; 1.67; 1.83; 2; 2.17; 2.33; 2.5; 2.67; 2.83; 3; 3.17; 3.33; 3.5; 3.67; 3.83; 4.

They are grouped only into **arithmetical response-proximity intervals**, not validated domains or severity categories:

| Group | Attainable range | Correct reading |
|---|---|---|
| Near "Not at all" | 0–0.33 | Lower overall endorsement of unlike statements; **not** proven low difficulties |
| Near "A little" | 0.5–1.33 | Low aggregate agreement; difficulty and coping can differ substantially |
| Near "Somewhat" | 1.5–2.33 | Mean may hide opposite combinations of difficulties and resources |
| Near "Quite a lot" | 2.5–3.33 | Higher aggregate agreement is **not** a standalone difficulty score |
| Near "Very much" | 3.5–4 | High agreement with unlike items is **not** high severity, successful coping or recovery |

Each archived report now explicitly labels the result as v1, shows these attainable intervals in the actual scoring language, and exposes the six unchanged question texts grouped by their source-verified v2 construct **for transparency only**. The visible caution states why neither group can be rescored from the old saved mean. The Results Dynamics screen uses the same historical response interval but never reports an improvement or decline from v1 to v2.

### Scope and safety
- The new completed-test catalogue already uses v2 for these three keys. In-progress saved v1 records and old results are preserved for replay.
- Comparisons across v1 and v2 are blocked by result version, source hash, scoring dimensions and period provenance. A user must complete v2 to obtain two independent current subscale scores.
- The report renderer verifies the exact registered v1 ID and hash, its 0–4 average lattice, the two distinct v2 constructs and equality of all source item texts/IDs in the two versions. Fail closed for altered, inapplicable or unknown records.
- No scores, response keys, items, answer alternatives, database rows, translations, clinical cutoff thresholds, protected instruments or previous user results are modified.
- **Psychometric validity is not established.** Numerically correct score intervals and improved content labeling are not reliability, content validity, measurement invariance or treatment efficacy. These original HH measures remain nonclinical self-reflection.

## Professional source for managing revisions
- International Test Commission, *Guidelines on Practitioner Use of Test Revisions, Obsolete Tests, and Test Disposal*: https://www.intestcom.org/page/19
- COSMIN content validity framework (relevance, comprehensiveness, comprehensibility): https://pubmed.ncbi.nlm.nih.gov/40562250/
- ITC, Guidelines for Translating and Adapting Tests, 2nd edition: https://www.intestcom.org/page/14

## Acceptance
Unit contracts: all six EN/RU versions, 25 attainable mean scores per form, exact v2 source question match, one-and-only-one archived band for each score, two distinct item groups, invalid/altered provenance rejected, post-update v2 remains first-run default, non-comparable historical/current trends, no mixed-direction clinical dials, no changes to saved records, guest privacy remains intact. Check exact merge Vercel READY; generic site CI failures unrelated to assessments must be reported separately, not described as green.
