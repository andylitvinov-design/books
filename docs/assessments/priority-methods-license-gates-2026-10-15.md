# Holistic House — 15 priority method cards (2026-10-15)

**Status: implementation candidate, research catalogue only; not a production release or instrument licence.**
Tracking: [books #626](https://github.com/andylitvinov-design/books/issues/626), planned source-cleared CFPB 5-item [PR #633](https://github.com/andylitvinov-design/books/pull/633).

## One existing page, no competing scoring engine

The existing public **My Tests → Full database** explorer (same EN/RU/ES page) now includes one compact, independently collapsible section listing **15 methods**. It provides an inline search, topic filter, rights filter, readable mobile cards, the number of questions, approximate time, measured scales, source where available, and an explicitly **commercial digital use** rights notice.

Files:
- `data/assessments/priority-methods-2026.js` — display-only evidence registry.
- `components/app/priority-methods-review.jsx` / `.module.css` — bilingual interface with ES fallback.
- `components/app/test-explorer.jsx` — one minimal insertion in the existing Full database tab.
- `tests/assessment-priority-methods-review.test.mjs` — registry and safety contract.

**Not performed:** publishing copyrighted test items, unlocking protected forms, implementing protected scoring, adding duplicate scored definitions, copying official translations, altering client histories, Supabase migrations, provider/publish actions, or automatically including any new item in a course. The existing 137 runnable and 154 research-reference records remain unchanged at branch creation.

## Permissions and rollout inventory

This deliberately conservative metadata inventory classifies commercial website **reuse** of the original questionnaire (not article access) by the evidence currently on hand. It is **not legal advice** and is not a legal determination:

| Instrument | Items | Rights gate | Site theme |
| --- | ---: | --- | --- |
| WHO-5 | 5 | WHO commercial/translation permission | Mood and wellbeing |
| PSS-10 | 10 | Obtain licence via CMU/Mapi for commercial electronic use; submission is free, quote varies | Stress |
| ISI | 7 | Morin/Mapi permission | Sleep and recovery |
| ECR-S / ECR-12 (Wei 2007) | 12 | Edition and digital/translation rights to verify | Relationships and closeness |
| UCLA-3 | 3 | Commercial electronic and translation rights to verify | Loneliness / relationships |
| AUDIT | 10 | WHO non-commercial materials; obtain commercial permission and safeguarding review | Alcohol use |
| DAST-10 | 10 | Rights and safeguarding review, pending commercial permission | Drug use |
| SCOFF | 5 | Exact rights, translation and sensitive-screen safety review | Eating concerns |
| CFPB FWBS **full** | 10 + **2 scoring qualifiers** | Open reuse under CFPB terms; original scoring and display **not implemented** | Financial wellbeing |
| UWES-3 | 3 | Commercial electronic agreement / data-handling terms | Work engagement |
| MLQ | 10 | Written permission for commercial digital use | Meaning |
| GSE | 10 | Exact version and licence / translation evidence | Self-efficacy |
| IPS | 9 | Specific edition, permission, scoring key | Procrastination |
| GQ-6 | 6 | Exact commercial electronic / translation terms | Gratitude |
| FFMQ-15 | 15 | Version-specific rights/psychometric review | Mindfulness |

Current status counts: **1 source openly reusable** (CFPB), **8 permission-required** and **6 rights-review**. These are governance buckets, not a claim that all non-CFPB versions are definitively forbidden. Existing `gse` / `gse-10` and related entries are not silently renamed or unlocked.

**CFPB version rule:** the original full form measures 10 statements, plus age and self-administered/assisted qualifiers to get the published calibrated 0–100 scale. [PR #633](https://github.com/andylitvinov-design/books/pull/633) builds the **different** short form (5 scored statements + those two qualifiers), not the full 10-item form. This panel does not claim the full form has a runnable frontend. If/when a matching short definition is actually available in the underlying existing catalogue, a button can search for that version; no direct execution is invoked.

## Primary materials and rights pointers
- WHO-5 2024 measure: https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01
- WHO rights/commercial reuse: https://www.who.int/about/policies/publishing/permissions
- PSS via CMU/Mapi: https://www.cmu.edu/dietrich/psychology/stress-immunity-disease-lab/scales/index.html
- ISI Mapi distributor: https://eprovide.mapi-trust.org/isi-insomnia-severity-index/
- ECR-S (not ECR-RS): https://pubmed.ncbi.nlm.nih.gov/17437384/
- UCLA-3 original study: https://pubmed.ncbi.nlm.nih.gov/18504506/
- AUDIT official manual: https://apps.who.int/iris/bitstream/10665/67205/1/WHO_MSD_MSB_01.6a.pdf
- SCOFF original study: https://pubmed.ncbi.nlm.nih.gov/10582927/
- CFPB permission: https://www.consumerfinance.gov/consumer-tools/financial-well-being/about/
- CFPB short scoring reference: https://files.consumerfinance.gov/f/documents/bcfp_fin-well-being_short-scorecard.pdf
- GSE author resource: https://userpage.fu-berlin.de/~health/selfscal.htm

**Source-link warning:** a research-paper link is neither proof of questionnaire reproduction rights nor official permission. Null source pointers are intentionally displayed without invented citations.

## Required gates for eventual runnable instruments

1. Record original copyright holder, edition/item wording, scoring source, locale/translation approval, written **commercial electronic** rights grant or verified public-domain policy, confirmation of terms on a paid/subscription service, reviewer and dated primary evidence.
2. Run clinically reviewed and age-appropriate user consent plus signposting for AUDIT, DAST, SCOFF (including escalation outside the app). Never infer diagnosis, prescriptions, treatment changes, medication guidance or homeopathic remedy from scores.
3. Create separate versioned instrument definitions + scoring/unit tests + validated locale rules. Verify reverse scores, missing items, official score transformations and recall/cooldowns.
4. Connect the actual cleared form to existing `MONITORING_CATALOG`, runner, source/scale guides, account privacy and persistence. Do not directly flip a research reference to startable.
5. For courses, bind only approved repeated **outcome** scales, record baseline and follow-up dates, enforce recall periods; personality and typology are not health-outcome goals.
6. QA exact commit: focused tests, `npm run test:app`, `npm run build`, lint, RLS/DB and EN/RU mobile guest/account; verify hosted preview, then reviewed merge to **codex/public-book-library**, and READY deployed SHA before calling the site LIVE.

## Rollback

Revert the reference module, UI component/CSS, one conditional insertion in `components/app/test-explorer.jsx`, and the focused test. No database migration or client data is involved in this PR.
