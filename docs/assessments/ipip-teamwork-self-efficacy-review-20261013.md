# Two IPIP candidates: isolated draft review

## Release boundary
This draft adds only source-pinned English Teamwork and Self-Efficacy definitions, inactive catalogue entries, scoring fixtures and this evidence record. Both entries remain `startable: false`, `guestEligible: false`, `starterEligible: false`, with `releaseStatus: prepared-not-published`. No SQL, migration, deployment configuration, production activation or existing stopped assessment work is included. No clinical or client records were used.

The clean branch starts at canonical production commit `7d7f084d07cafe9cb80a42deffec89f1440feb26`. No old feature branch or intermediate history is imported.

## Sources and rights
IPIP explicitly permits copying and commercial/non-commercial use of its public-domain items: https://ipip.ori.org/newPermission.htm . Response scoring source: https://ipip.ori.org/newScoringInstructions.htm . This permission does not imply population-specific validity, Russian validation or equivalence to proprietary instruments.

### IPIP-VIA-R Citizenship/Teamwork, original English four-item form
- Key: `ipip-via-r-teamwork-4`, definition/scorer/result `v1`, translation `original-en-2021-v1`.
- Exact key and order: https://ipip.ori.org/IPIP-VIA-R_Key.html (CIT, renamed TEA).
- Evidence table: https://ipip.ori.org/IPIP-VIA-R_Table.html . Table reports omega .68/.74 and retest .63/.66 for Germany/UK. These are not local norms or a clinical threshold.
- Research citation: Bluemke, Partsch, Saucier & Lechner, Human Character in the IPIP (2021 preprint), doi:10.31234/osf.io/k79qf. Author institution record: https://research-portal.uu.nl/en/publications/human-character-in-the-ipip-towards-shorter-more-content-valid-an/ . English/German work does not validate a Russian questionnaire.
- Integer responses 1–5; positions 1–2 positive, 3–4 reversed by `6 - response`; sum 4–20. General self-description, no imposed retrospective window. This sum uses general IPIP scoring instructions; it is not silently substituted for a mean score.
- All four answers required; no imputation. This is a conservative product policy, not an author-specified missing-data rule.
- No bands, percentiles, diagnosis, moral-worth or employment-selection judgment. Not the proprietary VIA-IS.

Prepared original report wording, EN: This score summarizes how you described loyalty and cooperation in groups. A higher total reflects more endorsement of that content after reversing two items. It is not a percentile or a measure of personal worth. Consider a group setting where collaboration feels comfortable and another where you prefer independence; neither preference is inherently wrong.

RU: Сумма описывает вашу самооценку лояльности и сотрудничества в группе. Более высокий результат означает большее согласие с этой темой после обратного подсчёта двух пунктов. Это не процентиль и не оценка ценности человека. Вспомните ситуацию, где совместная работа комфортна, и ситуацию, где вы предпочитаете самостоятельность; ни одно предпочтение само по себе не является недостатком.

### IPIP NEO C1 Self-Efficacy, preliminary ten-item original English form
- Key: `ipip-neo-self-efficacy-10`, definition/scorer/result `v1`.
- Exact form/key: https://ipip.ori.org/newNEOKey.htm (C1).
- Facet evidence: https://ipip.ori.org/newNEO_FacetsTable.htm . Official table reports alpha .78 and correlation .66 with NEO Competence (.89 corrected). These do not make this an equivalent replacement for NEO-PI-R, objective ability test or clinical instrument.
- Form distinction: https://ipip.ori.org/newMultipleconstructs.htm . This is the Goldberg 1999 preliminary ten-item IPIP form, not Johnson's four-item form and not Schwarzer/Jerusalem General Self-Efficacy Scale.
- Integer responses 1–5; positions 1–6 positive, 7–10 reverse by `6 - response`; sum 10–50. General self-description. All ten required, no imputation, explicitly a conservative product policy rather than an author missingness rule.
- No population-matched Canadian/Russian norms, standalone app validation, validated Russian items or diagnostic cutoffs established. Proposed audience: consenting adults; do not infer validity for minors.

Prepared original report wording, EN: This total summarizes how you described your confidence in handling tasks and finding workable solutions. Higher totals reflect greater endorsement of that content after reversing four items. The score is not a percentile, an objective ability test, or a clinical judgment. Answers can depend on recent experiences and the tasks you had in mind. Consider a task you handled well and a situation where support or practice would help.

RU: Сумма описывает, насколько уверенно вы оцениваете своё умение справляться с задачами и находить рабочие решения. Более высокая сумма означает большее согласие с этой темой после обратного подсчёта четырёх пунктов. Это не процентиль, объективный тест способностей или клиническое заключение. Ответы могут зависеть от недавнего опыта и задач, которые вы представляли. Вспомните задачу, с которой справились, и ситуацию, где пригодились бы поддержка или практика.

## Verification
Thirteen focused tests passed against the freshly fetched canonical scorer and definitions, with both candidates integrated in one local snapshot. Teamwork covers all 625 complete patterns. Self-Efficacy covers 1,024 extreme patterns, 2,500 deterministic mixed patterns and 50 per-item response values. Both cover invalid/missing responses, exact identity, independent reverse lookup, immutable content hash and forged provenance. The focused files are appended to `test:app` so normal PR CI executes them. Passing computation tests does not establish psychometric validity.

## Remaining release gates
Full CI results belong to the PR, not an assumed local full-project pass. Before any activation: review the exact forms and interpretations, integrate explicit report/guide handling, verify non-diagnostic trait semantics and absence of automatic deficit/treatment mapping, perform isolated account save/report journeys, obtain separate publication/DB approval and verify exact registry versions/hashes. No database-only insertion is proposed. English items must not be relabelled as a validated Russian form.
