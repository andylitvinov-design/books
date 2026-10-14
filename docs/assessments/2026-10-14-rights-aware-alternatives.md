# Holistic House — restricted professional tests: legal route and active alternatives

**2026-10-14 · Implementation branch:** `chatgpt/rights-aware-test-alternatives-20261014`. This is an assessment-licensing / product review, **not permission to publish licensed items**.

## Current state (source, not a production deployment certification)

- Current automated source audit documents **110 startable catalogue keys** and **154 research-registry rows** (some keys overlap). The registry is metadata, **not** a second set of 154 administered questionnaires.
- Source-catalogue `rightsStatus: 'cleared'` indicates a prior *internal* rights review, not a new independent legal audit of all 110 instruments or their Russian translations.
- `MIND_BODY_MONITOR_REGISTRY` keeps research entries disabled. `buildExplorerEntries` requires an active catalog entry, full versioned questionnaire definition, cleared rights, a valid scoring-key audit, and audience access before a client can select a test.
- No existing completed scoring definition, historic result, stored client data, database migration, or commercial licence status was changed in this branch.

## Evidence-driven rights triage

| Route | Examples | Decision |
|---|---|---|
| Public-domain source, exact scoring and versions | IPIP item pool / Big Five; CDC Healthy Days modules | Use official original items with source links. Keep own EN/RU versions distinct; an unvalidated translation is not called validated. |
| Express commercial-use permission with conditions | CBI personal, work, client burnout | Original source says commercial/noncommercial use allowed when citing Borritz et al. (2006). Do not combine the three subscales into an invented clinical aggregate. |
| PHQ/GAD family with publisher public-access permission | PHQ-2, PHQ-4, PHQ-8, GAD-2, GAD-7; account and safe-usage details vary | Review each exact form and scoring. Safety-sensitive forms require a genuine safety flow and must not be automatically recommended to every guest. |
| Commercial licence or explicit noncommercial restriction | WEMWBS/SWEMWBS, WHO-5, BDI-II/BAI, proprietary psychotherapeutic inventories | **Do not expose original questions, scoring or direct Start** until a licence specifically covers our commercial online and translation context. |
| Electronic administration permissions or jurisdiction-specific conditions | PROMIS/HealthMeasures, COPSOQ III, many third-party scales | Verify publisher's current digital/electronic instrument terms *and* the exact form and language. A freely readable PDF is not enough. |
| Practitioner-only / trauma / crisis instruments | MMPI-3, PAI, trauma/dissociation/risk screens | No casual public activation, equivalent-score claims or automatic substitution. Reassess qualifications, informed consent, privacy, support and delivery path first. |
| Our own new forms | HH-authored state, resource and relationship reflections | Allowed as **genuinely original**, non-diagnostic questionnaires. They do not inherit protected items, original names, standardized cutoffs, published reliability, validity or norms. |

Key official starting points:
- [IPIP — public domain, any purpose](https://www.ipip.ori.org/)
- [Danish National Research Centre — CBI reuse permission with citation](https://nfa.dk/vaerktoejer/spoergeskemaer/spoergeskema-til-maaling-af-udbraendthed-cbi/copenhagen-burnout-inventory-cbi)
- [Pfizer — PHQ/GAD release](https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care)
- [Warwick — WEMWBS licences](https://warwick.ac.uk/services/innovations/wemwbs/licenses/)
- [WHO — commercial use permissions](https://www.who.int/about/policies/publishing/copyright)
- [HealthMeasures — obtain/administer PROMIS](https://www.healthmeasures.net/explore-measurement-systems/promis/obtain-administer-measures)

## Implemented in this branch: related **existing** active questionnaires

When browsing all registered methods, a non-runnable research card can offer up to two **separately named, already-registered, already-scored and audience-selectable** questionnaires on nearby topics. For example:
- WHO-5 / WEMWBS → MHC-SF or an HH resource reflection.
- Beck BDI-II → PHQ-8; Beck BAI → GAD-7.
- MBI burnout → CBI work/personal.
- IIP interpersonal difficulties → HH relationship reflection.
- BFI-2 personality → IPIP Big Five.

The interface explicitly says these are **different** questionnaires, never psychometric substitutes. Selecting them is a deliberate user action, **not** automatic adoption of a third-party form or automatic prescription. If the current user has no right to start a candidate, it is not offered. No such alternative is offered for trauma, substances, clinician-only or managed-safety references.

Code: `lib/assessments/available-alternatives.js`, `lib/assessments/test-explorer.js`, `components/app/test-explorer.jsx` and associated CSS/tests. All old `startable: false` reference gates remain in place.

## Original Holistic House instrument route (NOT a lightly reworded protected test)

A new test may study the same **general construct** as an established method without copying its wording, item ordering, response layout, distinctive selection or scoring key. It needs independent creation from a construct brief and an item-writing review (including qualitative similarity review), explicit non-validation status, source notes, and pilot checks of comprehensibility and item behavior. For a validated professional label, independently gather suitable reliability/validity evidence; rewording alone never preserves original norms.

### Draft item bank for a genuinely original pilot: HH Session Clarity Pulse
**Status:** unregistered draft only; **not active**, not a WAI-SR or Session Rating Scale equivalent, not a therapy-outcome or clinical instrument.

**Purpose:** help a participant reflect on how practical and comfortable a recent support conversation felt. Suggested anchors 0=Not at all / Совсем нет to 4=Very much / Очень сильно, with an option to skip. The answer is personal feedback, not a clinician performance score. EN / RU review is needed before any release.

| No. | EN pilot statement | RU pilot statement |
|---|---|---|
| 1 | During our last conversation, I could bring up the question that mattered most to me. | Во время последнего разговора я смог(ла) поднять самый важный для меня вопрос. |
| 2 | I had room to say when something was unclear. | У меня была возможность сказать, когда что-то было непонятно. |
| 3 | I can name one useful detail I want to remember from that conversation. | Я могу назвать одну полезную мысль, которую хочу сохранить после разговора. |
| 4 | I felt comfortable asking for a slower pace when I needed it. | Мне было комфортно попросить замедлиться, когда это было необходимо. |
| 5 | I know what I want to try or explore before our next contact, if anything. | Я понимаю, что хочу попробовать или исследовать до следующего контакта, если такое желание есть. |
| 6 | I have a way to share feedback if a conversation did not feel helpful. | Я знаю, как дать обратную связь, если разговор оказался для меня бесполезным. |

**Scoring prototype:** show six independent 0–4 responses plus optional free-form feedback; **no** total clinical score, cutoff, standardized percentile, diagnosis, published benchmark, automatic referral or treatment effectiveness claim. On a repeat, compare the *same* question on two dates only with the participant's permission. Avoid showing these as other publishers' proprietary alliance ratings.

**Before activation:** review EN/RU wording and safety, check noninfringement, add immutable `id/version/contentHash` definitions, separate interpretation metadata, append-only `app.assessment_versions` migration, UX and RLS QA, test privacy and consent, then verify production version. Old result definitions must not change retroactively.

## Release gates

1. Run all targeted node tests, existing assessment/unit/DB integration, lint/typecheck and Next build against PR HEAD. Check guest/account startability, key count and no protected-item leakage.
2. Verify mobile RU/EN/ES full-database cards and deliberate click selection. Test result saving, later Insights and PDF without exposing health answers in URLs/analytics.
3. Re-review candidate instrument commercial/digital and translation rights before **any** future new original professional activation. A `ready_account` registry status alone does not create an approved full questionnaire or a deployment.
4. Merge to the actual production source branch and verify Vercel live route only after checks. This branch does not do a production release.
