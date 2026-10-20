# Holistic House — evidence tiers and better check-ins
**Reviewed 20 October 2026 · Source:** `codex/public-book-library` and 18–19 October inventories  
**Status:** software review + proposed new questionnaires, **not** independent psychometric validation.

## 1. Exactly what already exists

- **150 currently runnable method keys**: 73 original Holistic House methods, 77 methods with published sources. **No current exact-edition/respondent-language/population review has an approved A–D grade** in `ASSESSMENT_EVIDENCE_REVIEWS`. This does **not** mean every published instrument lacks external scientific evidence; it means local evidence extraction and review are not yet complete.
- Automated controls: immutable source IDs/versions and content hashes; real original source questions and numeric scoring bounds; reverse scoring; source-only screening thresholds; EN/RU separate source editions; fail-closed historic results; exact compatible comparisons; protected sensitive/client data; rights-gated reference catalog and licensed questionnaires kept non-runnable.
- `assessmentValidity` already requires exact edition, independently reviewed primary evidence and population/language fit before issuing grades. This pass additionally requires **verified score implementation**; a review of a published study cannot excuse a mismatched scorer.
- Prior discovery had a **7-point automatic boost** for the category `professional` and **3 "match %" points** for the same category, despite zero approved evidence grades. Removed both. A publisher link or a professional-looking badge does not count as a psychometric property.

## 2. Evidence-readiness groups — not medical accuracy percentages

| Machine key | Count of runnable | Meaning and permissions |
| --- | ---: | --- |
| `reviewed_exact_edition` | **0** | Reserved for methods with independent human evidence review covering the exact questionnaire, scorer, respondent language, population and appropriate psychometric domains. This is **not** an automatic diagnosis/usage licence |
| `published_source_pending` | **77** | Published-source methods; the exact local version and intended-use evidence passport are **not yet signed off**. Original published English evidence cannot be transferred to RU/ES merely by translating report copy |
| `author_self_reflection` | **64** | HH check-ins/author reflection, descriptive only; no independently established test–retest error or diagnostic cutoffs |
| `symbolic_typology` | **9** | Bach flower theme, socionics, enneagram, DISC, historical temperament, chakra/Kundalini, tantric-development, tantric-energy-sensitivity and tantric personality portrait. May support voluntary reflective discussion, **not** diagnosis, remedy selection efficacy or clinical prediction |
| `reference_only` | **0 runnable** | Research references and reserved rights-gated tests are kept out of executable forms until separate rights/safety/evidence gates clear |

These groups state **status of review**, not that one person has higher or lower psychological quality. Group numbers may change only when exact evidence reviews are completed. Use `node --conditions=react-server scripts/audit-psychometric-quality-2026.mjs` for a machine-readable grouping of the entire current catalog; no patient data is accessed.

## 3. Technical correctness is not the same as instrument validity

The full 18 October read-only audit checked 230 earlier source versions, 417 declared scored dimensions and thousands of source-item connections without finding empty item lists or broken declared bounds. The 19 October work repaired score-oriented report ranking, separated burden/resource interpretation and guarded repeated results. Five additional professional English forms were added later, giving 150 runnable keys. Neither source signature verification nor an attractive color gauge can establish relevance, comprehensiveness, comprehensibility, reliability, criterion validity, responsiveness or cultural equivalence.

A fixed universal 100-point grade is especially inappropriate for **single-item** and **formative** measures: internal consistency and EFA/CFA may be undefined or irrelevant. Grade only using a justified construct-specific review protocol; do not fill irrelevant criteria with favorable points. For unreviewed versions, the appropriate label remains **evidence pending**.

### Existing content issues to prioritize

- `hh-current-state` v2: one question asks about *both* energy and inner support. Other items are separate 0–10 ratings. It is incorrect to create a single psychological-health score out of them.
- `hh-weekly-pulse` v1: combines anxiety **or** tension, sleep **or** rest, supported **and** connected. Anchors ask respondents to summarize an entire week without checking whether answers represent typical or exceptional days.
- `hh-felt-safety` v1: mean of awareness, comfort, boundaries and action choice implies one latent construct and can wrongly suggest evaluation of actual safety/trauma.
- `hh-body-mind-context` v1: mixed awareness, interference and healthcare-navigation knowledge cannot measure disease severity or a psychosomatic cause.
- `hh-money-pressure` v2 has distinct difficulty and coping dimensions, a better technical construct split than old v1, **not** proof of psychometric validation.
- `hh-overthinking-loop` and `hh-screen-saturation` v2 each have a **one-item domain** arithmetically scored as mean/1. It is one descriptive response; within-scale reliability cannot be calculated.
- Of 73 author families, 11 were flagged P0 for item-content review in `hh-original-family-review-2026-10-19.csv`, two P1 and 60 P2. These are editorial risk priorities, **not** measured invalidity scores.

## 4. Candidate new forms — do NOT overwrite v1/v2

### Current State candidate v3: six separate 0–10 statements
Recall frame **right now / прямо сейчас**, exact endpoint anchors with no inferred medical cause:

| Measure | English question | Russian question |
| --- | --- | --- |
| Main difficulty | How strong is the main difficulty you want to reflect on right now? | Насколько сильна главная трудность, о которой вы хотите подумать сейчас? |
| Inner tension | How much inner tension do you feel right now? | Насколько сильное внутреннее напряжение вы сейчас ощущаете? |
| Body tiredness | How tired does your body feel right now? | Насколько ваше тело сейчас утомлено? |
| Usable energy | How much energy is available for one small activity right now? | Сколько сил сейчас есть для одного небольшого дела? |
| Felt support | How supported do you feel right now? | Насколько вы сейчас ощущаете поддержку? |
| Interference | How much does your main difficulty interfere with what you planned to do today? | Насколько главная трудность мешает вашим планам на сегодня? |

For the last item, **not applicable / не было такой ситуации** must be a valid *missing/not-assessed* answer, never numeric zero; skip should be optional rather than a fake low burden. This candidate is **not an approved new test**; response anchors and translation require qualified independent review and intended-user comprehension interviews.

### Weekly Wellbeing candidate v2: eleven independent 7-day items
Keep an eight-question short option **only if the construct and content review justify it**. Proposed independent components:

1. Emotional wellbeing / эмоциональное самочувствие
2. Inner tension / внутреннее напряжение
3. Difficult-to-control worry / трудноуправляемое беспокойство
4. Perceived demands/pressure / ощущение перегрузки
5. Restfulness after sleep / восстановленность после сна
6. Restfulness after waking breaks / восстановленность после отдыха
7. Available energy / доступные силы
8. Mental clarity / ясность мышления
9. Feeling connected / ощущение связи с людьми
10. Feeling supported / ощущение доступной поддержки
11. Everyday functioning / возможность заниматься повседневными делами

Every question must specify **during the past seven days / за последние семь дней**, not silently switch to today/yesterday. Add optional neutral context: *What made this week unusual? What supported you?* Make "did not have such a situation" available where appropriate, with no forced answer in sensitive interpersonal topics. Never sum 11 axes into a wellness index, calculate Cronbach alpha for the entire checklist or call a two-point change clinically meaningful.

### Two reading levels without changing evidence claims
- **Quick:** 3–5 short **standalone** ratings for lightweight self-observation. A few answers cannot claim to replace a multi-item validated instrument.
- **Detailed:** 6 current / 11 weekly candidate items with distinct fields for difficulty, resources, functioning and context. Show a specific measured observation and optional next-step question.
- **Concerning symptoms:** if clinically important complaints arise, offer a properly licensed and applicable published questionnaire or evaluation by a qualified professional; do not generate diagnoses, remedies, dosage or crisis-risk certainty from arbitrary authored cutoffs.
- **Tracking:** compare only exact scorer, item form, response language and recall period; retain raw scores, missingness, data date and optional situation. State **reported numeric change**, never "reliably improved" until measurement error and responsiveness are supported.

## 5. Safer immediate analysis (existing versions remain immutable)

Check-in summaries now choose the most strongly endorsed **difficulty separately from resources**, instead of comparing low resource and high burden as though they were one calibrated severity metric. If no difficulty was reported, they do not demand an invented problem. The reading mentions strongest available support, if separately measured, and everyday functioning. Questions remain non-leading, and every number is its actual source-rated 0–10 response.

**Illustrative report, not a real client:** "Inner tension: 8/10. Available support: 3/10. Impact on planned activities: 4/10. These are three separate experiences, not a diagnosis. When did the tension appear, and which conditions made it easier or harder to manage?" Do not infer tension was *caused* by low support.

For longitudinal reports, an observed answer difference needs the same verified instrument version, comparable recall and respondent language. If the latest attempt is invalid, never silently use an older good result to claim recent improvement.

## 6. Actual psychometric validation program (separate research work)

**Gate 1 — content:** define one construct per subscale, target users, language and use; map every question to construct/recall/response anchors; two or more qualified independent reviewers assess relevance, comprehensiveness and comprehensibility. Interview consenting people using EN/RU separately. Check double-barrelled wording, suggestive language, *not applicable*, literacy, accessibility and known contextual biases.

**Gate 2 — statistics when appropriate:** preregister hypotheses and sample precision. Reflective multi-item scales: examine dimensionality first; then reliability (omega/alpha with intervals), test–retest for appropriate stable constructs, differential item functioning and measurement invariance, convergent/discriminant relationships with licensed comparators. Single-item/formative check-ins: no fake alpha; focus on content, response process, repeatability under comparable conditions, measurement error, responsiveness and feasible burden.

**Gate 3 — outcome interpretation:** estimate meaningful change with an external anchor and measurement error for the exact edition/language/context. Never derive a general `validity %` or a clinical severity threshold from raw 0–10 numeric endpoints. Include limitations in every report. Optional pilot data require research consent; **never mine the private Client Cabinet without such consent**.

**Gate 4 — release:** new approved content is a new immutable edition, with new IDs/content hashes, source proof, individual scored domains, explicit missingness, bilingual QA, accessible mobile runner, PDF parity, isolated DB tests, license/safety review, verified production SHA and active monitor dashboards. Existing v1/v2 data and baselines stay unaltered/incomparable.

### External standards
- COSMIN guideline 2024, evaluation *per (sub)scale*: https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/
- COSMIN content validity relevance/completeness/clarity: https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/
- International Test Commission, translating/adapting tests: https://www.intestcom.org/page/14
- ITC/ATP digital assessment guidelines (updated 2025): https://www.intestcom.org/page/16

## 7. Tracking
- Code PR for grouping/discovery/check-in analysis: link to be added when opened
- Full independent validation research: https://github.com/andylitvinov-design/books/issues/1223
