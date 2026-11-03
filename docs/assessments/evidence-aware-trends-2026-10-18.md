# Holistic House — measurement honesty & longitudinal interpretation QA
*18 October 2026 — evidence-aware report release*

## Observed defect and correction

Previously `gaugeChange` returned `improved` or `worsened` for any nonzero directionally favorable/unfavorable difference in otherwise compatible self-report scores (e.g. CBI 75 → 50, BRCS 8 → 17). That was an **unjustified psychometric inference**. A compatible score difference alone does not establish reliable change (RCI), clinically meaningful change (MIC), a person's improvement, or causation. No general minimum-difference constant may be invented for all questionnaires.

**Implemented**:
1. Preserve exact historical raw values, provenance/locale/version/account matching, chronology, band boundaries, and all scoring algorithms. `gaugeChange` now returns `changed` for every nonzero *comparable* difference and `unchanged` for identical values; `baseline` still signifies no valid comparable predecessor. No false clinical improvement state is emitted.
2. UI names the **reported direction** in EN/RU: fewer/more difficulties, more/fewer reported resources, or neutral numeric increase/decrease for trait/bias-neutral scores. Arrows reflect the sign of the raw change, not a pseudoclinical good/bad judgement. A clearly visible note says this is **not proof of improvement/deterioration**. A same numerical score need not mean unchanged item responses or circumstances.
3. Results Dynamics labels the difference explicitly as arithmetic. Its notes distinguish comparability from statistical reliability.
4. Report pages display **evidence class** as one of: original Holistic House self-reflection (not independently psychometrically validated), published screening ranges, published descriptive reference ranges, descriptive position without population norms, or invalid provenance. Report version integrity is kept separate from independent validity.
5. The compact result picker spells out **both minimum and maximum** when a scale is nonzero-based (e.g. BRCS: 14 · 4–20), instead of the misleading `14/20` shorthand. The stored score is untouched.
6. Expanded methodology warns that unvalidated translated questionnaires and absence of SEM/MIC limit change interpretation.

## What these changes *do not* establish

- A value crossing a screening threshold does not prove recovery, onset of illness, or treatment benefit.
- Original HH measures (including symbolic/Tantric/typological tools) remain exploratory reflections, not tests with established clinical norms or reliability.
- Valid source identity and mathematically correct scoring are necessary but **not sufficient** for construct validity. No automated diagnosis, medication/treatment instruction, clinical probability, normative percentile, arbitrary positive/negative trait hierarchy, or cross-instrument mental-health score is added.
- Authors need separate consent-based, appropriate-population research for content validity, structural validity, reliability, test-retest stability, measurement error, responsiveness and cross-language equivalence. Independent expert sign-off is still required before stronger marketing claims.

## Primary scientific references

- AERA/APA/NCME, *Standards for Educational and Psychological Testing* (open-access official): https://www.apa.org/science/programs/testing/standards.html
- APA, *Guidelines for Psychological Assessment and Evaluation*: https://www.apa.org/about/policy/guidelines-psychological-assessment-evaluation.pdf
- COSMIN systematic-review methodology version 2.0, including separate assessment of reliability, measurement error and responsiveness: https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/
- COSMIN guidance on interpretability and smallest detectable change vs minimal important change: https://pmc.ncbi.nlm.nih.gov/articles/PMC5891568/

## Release acceptance

- Unit tests preserve existing score/report provenance and reject altered definitions.
- Regression checks distinguish raw score movement from clinical improvement for an actual difficulty instrument (CBI), published descriptive resource measure (BRCS) and non-normative personality traits.
- Original methods show correct nonvalidated status; published thresholds retain the correct screening/reference distinction; invalid saved scores have no interpreted evidence.
- EN/RU methodology copy and accessibility survive mobile/desktop layout checks. Nonzero-baseline score ranges show their true minimum and maximum.
- TypeScript/build, GitHub Actions, optional isolated Chromium/WebKit report flows, and Vercel READY exact commit readback must be checked before calling live. The work modifies only analysis/UI/tests/docs, not Supabase or user records.

## Next scientific work (not a software-only claim)

A separate protocol for **original Holistic House questionnaires** should first establish the intended construct, explicit behavioural anchors, intended audience and use, transparent item wording, response-process cognitive interviews and content-validity expert review; only then evaluate consistency/test-retest, measurement error and responsiveness. Norms and clinical cutoffs must not be inferred from arbitrary equal-width score bands or a small convenience sample.
