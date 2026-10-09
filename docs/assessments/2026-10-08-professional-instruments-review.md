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

## Second expansion — CDC Healthy Days professional population measures

Two **source-backed original English** modules from CDC's validated HRQOL–14 suite are now fully runnable: [Healthy Days Core HRQOL–4](https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm) and [Healthy Days Symptoms Module (five items)](https://archive.cdc.gov/www_cdc_gov/hrqol/hrqol14_measure.htm). Their U.S.-government source and methodology are [published as public domain by CDC](https://stacks.cdc.gov/view/cdc/154521). Public-domain reuse is distinct from claimed clinical suitability: these are population-level self-reports, not diagnosis, treatment planning or an "ideal psychic health" percentage.

**Core four** has a five-category general health ordinal rating (1 excellent to 5 poor), counts of physically/mentally unhealthy days (each 0–30), activity-limitation days (0–30), and **two derived CDC summary measures only**: unhealthy days `min(30, physicalDays + mentalDays)`, and healthy days `30 - unhealthyDays`. The CDC default skip rule when both physical and mental unhealthy days are zero is enforced by accepting activity days of zero only. No fake overall clinical score exists.

**Symptoms five** has independent 0–30-day measures for days with pain-limited activity, depressed/sad mood, worry/anxiety, insufficient rest/sleep, and healthy/full-of-energy days. Do not sum symptoms into one invented psychometric score. The vitality item is positively oriented; the other four record difficulty.

The original 0–30 response range is rendered as an accessible compact numeric dropdown, **not thirty-one adjacent buttons**, in both guest and authenticated questionnaires. The catalogue has new topic/axis metadata so `cdc-hrqol-4` and `cdc-healthy-days-symptoms` remain discoverable and report real coverage.

### Further rights-gated reference methods

The research-only registry now includes `cdc-healthy-days-activity` and complete `cdc-hrqol-14` as **non-runnable** references, because they require different response formats or would duplicate completed core/symptom questions. It also indexes [COPSOQ III](https://www.copsoq-network.org/licence-guidelines-and-questionnaire) (conditional commercial use under country/language-specific guidelines), PROMIS Pain Interference, Emotional Support, Sleep-Related Impairment, Companionship, and Neuro-QoL Cognitive Function. These HealthMeasures tools **must not be inserted into the proprietary site without electronic administration permissions**. The official [HealthMeasures electronic-administration instructions](https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures) and [September 2026 licensing guide](https://healthmeasures.net/implement/steps-to-license/) govern.

WHO-5 remains **non-runnable** for commercial Holistic House use: the [WHO 2024 official PDF](https://cdn.who.int/media/docs/default-source/mental-health/five-well-being-index-%28who-5%29/who-5_english-original.pdf) is CC BY-NC-SA 3.0 IGO, and [WHO commercial licensing policy](https://www.who.int/about/policies/publishing/copyright) requires permission. Do not silently convert a noncommercial license into a free commercial one.

### Updated rollout gate

- Before production release, the append-only `20261008234000_hh_cdc_healthy_days.sql` migration must register the two new immutable definition records with their exact semantic hashes, in addition to PHQ-8/CBI from the preceding PR branch.
- Unit QA must confirm 72 unique runnable questionnaires including all 6 new professional additions; database test must complete a synthetic run for every one, and browser QA must validate both selectable 0–30-day input and sources.
- Never turn commercial-rights-gated metadata into a runnable item until permission is actually obtained.
