# Holistic House — verified professional assessment expansion (2026-10-08)

## Status and boundaries

This review distinguishes **real published psychometric questionnaires**, **permission to reuse the complete questions commercially online**, and **a completed, scored questionnaire in the Holistic House runner**. Being a validated instrument alone does not make its items legally reusable or suitable for unsupervised clinical interpretation.

EN is the sole delivered language for these original professional instruments. Russian labels/navigation do **not** imply an officially validated Russian item translation. None of these scores are diagnostic or a claim for effectiveness of homeopathy, psychotherapy or any treatment.

### Runnable source-backed instruments

| Instrument | Original questions | Scoring | Rights/use basis | Eligibility |
|---|---:|---|---|---|
| [PHQ-8](https://pubmed.ncbi.nlm.nih.gov/18752852/) | 8 | Sum 0–24; depressive symptom burden over previous 2 weeks | [Pfizer PHQ/GAD no-copyright-restriction announcement (2010)](https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care); validated PHQ-8 by Kroenke et al. (2009) | Account-only |
| [CBI personal burnout](https://nfa.dk/media/a4wheblj/cbi-scales.pdf) | 6 | Average of item scores 0/25/50/75/100 | [Danish National Research Centre permission, commercial and noncommercial with citation](https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi) | Guest/account |
| [CBI work burnout](https://nfa.dk/media/a4wheblj/cbi-scales.pdf) | 7 | Same average; question 7 reverses the last energy item | Same as above | Guest/account; only relevant to people working |
| [CBI client-related burnout](https://nfa.dk/media/a4wheblj/cbi-scales.pdf) | 6 | Same average; first four questions use *degree* response anchors and final two use *frequency* anchors | Same as above | Guest/account; only for client/patient-facing roles |

CBI attribution required by NFA: **Borritz M et al. Burnout among employees in human service work: design and baseline findings of the PUMA study. Scandinavian Journal of Public Health. 2006;34:49–58.**

PHQ-8 citation: **Kroenke K et al. The PHQ-8 as a measure of current depression in the general population. Journal of Affective Disorders. 2009;114:163–173.**

Do not conflate these different CBI subscales: their scores describe distinct contexts, are **not** a single total or a diagnosis, and require appropriate interpretation. Work/client-specific questionnaires should not be offered as universal default recommendations. PHQ-8 does not contain the PHQ-9 self-harm question; it is **not** a suicide-risk assessment.

### Professionally validated instruments researched but intentionally metadata-only

| Key | Instrument | Reference / reason not publicly runnable |
|---|---|---|
| ders-16 | DERS-16 emotional-regulation difficulties | [Bjureberg et al. (2016)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4882111/); commercial online reproduction rights pending |
| wemwbs-14 | WEMWBS (14) mental well-being | [Warwick licensing](https://warwick.ac.uk/services/innovations/wemwbs/how/); licence required |
| swemwbs-7 | SWEMWBS (7) mental well-being | [Warwick licensing](https://warwick.ac.uk/services/innovations/wemwbs/how/); licence required |
| bdi-ii | Beck Depression Inventory II | [Pearson commercial assessment](https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Depression-Inventory/p/100000159); licensed and qualified administration |
| bai-21 | Beck Anxiety Inventory | [Pearson commercial assessment](https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Beck-Anxiety-Inventory/p/100000251); licensed and qualified administration |
| maas-15 | Mindful Attention Awareness Scale | [University of Pennsylvania](https://ppc.sas.upenn.edu/node/214); commercial reproduction rights pending |
| tas-20 | Toronto Alexithymia Scale | [Bagby et al. (1994)](https://doi.org/10.1016/0022-3999(94)90005-1); copyright permission required |
| panas-20 | Positive and Negative Affect Schedule | [Watson et al. (1988)](https://doi.org/10.1037/0022-3514.54.6.1063); digital-commercial rights review |
| gse-10 | General Self-Efficacy Scale | [Schwarzer & Jerusalem (1995)](https://userpage.fu-berlin.de/~health/selfscal.htm); free research use does not establish commercial permission |
| spane-12 | Scale of Positive and Negative Experience | [Diener official permissions](https://eddiener.com/scale-of-positive-and-negative-experience-spane/); noncommercial use granted, commercial rights not verified |

Other existing catalogue candidates such as WHO-5, PROMIS, PSS-10, PSQI, ISI, WEMWBS, and clinician-rated tests must retain their existing rights/access gate until authorized instruments, language versions, scoring and safety flow are confirmed.

### QA

- Every delivered definition carries a semantic content SHA-256 fingerprint, stable key/UUID, item wording, declared language, response anchors, timeframe and source citation.
- CBI scoring: 0..4 input choices mapped to the original 0..100 metric with ×25; the work-related energy question is reverse scored. The specific mixed *degree* and *frequency* anchors must be shown for the correct items.
- Run regression on all prior 66 instruments and on the new four, verifying account/guest access, encrypted result persistence, repeat/history, browser UI and no cross-account data leakage.
- Apply the append-only `20261008231100_hh_professional_phq8_cbi.sql` migration before production release; verify four new `app.assessment_versions` records and that all existing result rows remain intact.
- Do not claim Live before the exact merged version is deployed to the correct Vercel project and production links are checked.
