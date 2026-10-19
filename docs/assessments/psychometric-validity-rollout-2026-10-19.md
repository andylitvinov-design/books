# Holistic House — psychometric validity & rights rollout, 19 October 2026

## What this draft changes
- Adds 2,925 **source and edition metadata records** from the canonical Google Sheets \`10_Research_Master\` to a read-only, paginated Full database reference catalogue. These are studies, forms, translations and cohorts — **not 2,925 independent runnable tests**.
- Keeps the legacy research registry and existing runnable catalogue intact; links source references by stable keys, suppressing duplicates in the supplementary display. Pages are 12 records, no question wording, answers, clinical cutoffs, or scoring.
- Adds cautious original-author download/landing-page links for an explicit whitelist (UCSF MAIA-2 PDF, WHO WHO-5 landing page, NYU ASRS-6 download page). **No third-party PDFs are copied to our server, embedded, proxied or rebranded**. Other links are strictly publications, NOT buttons labelled "Download questionnaire". Public accessibility of material does not transfer copyrights or permit commercial electronic administration.
- Adds a structured **edition-language-population** evidence readiness check to every existing product catalogue record. A source reference is *documented*; it is not itself an independent validation. Holistic House originals are flagged \`development\`. An A–D grade requires manually reviewed evidence for all rating domains and may remain ungraded/pending.
- Gives an *evidence provenance* preference in discovery rankings while retaining the exact public match-percent display order. Formal A–D grades are not fabricated, and ranking is never a clinical probability. Clinical/publisher gates remain in force.
- Does **not** add active clinical tests, DB rows, translations, protected content, or trigger production deployment. No change to user responses or scoring.

## Two independent gates
1. **Quality & fit**: Exact item edition and language administered, target population, published content/structural validity, internal consistency, reliability, measurement error, construct validity, cross-cultural invariance and, when applicable, responsiveness and interpretation. A journal DOI alone is insufficient.
2. **Law & safety**: Test-owner commercial online reproduction/translation/scoring rights, permitted use context, age and clinician qualifications, and high-risk escalation protocol. An open-access article or publicly downloadable PDF is NOT a license to host the questions.

No item may be unlocked unless both gates pass and existing versioned content/scoring implementation is independently verified. **Do not use code status \`cleared\` by itself as a new authorization**: historical runnable items require separate retrospective review.

## Tier rubric
Each domain has 0=missing/negative support, 1=partial/mixed support, 2=strong replicated study support. Weighting totals 100:
- Content validity 18; structural validity 16; internal consistency 14; construct validity 14; reliability 12; cross-cultural validity 10; responsiveness 6; score interpretation 10.
- A 85–100, B 70–84, C 50–69, D 0–49 **only after all factors, exact edition/language, population, primary sources and an independent human review are recorded**.
- Otherwise ungraded: \`source_documented\`, \`unreviewed\`, or \`development\`. The grade is epistemic evidence for that specific population, not test-diagnostic accuracy, a patient score, or use authorization. Clinical use requires extra appraisal.

## Priority remediation program: original Holistic House tests
1. Register each instrument's exact construct, intended claims, question IDs and response language. Freeze baseline versions and audit reverse-scoring/branch logic; remove unsupported diagnoses.
2. Panel review with qualified, independent psychologists and cultural advisers. Report item-level content validity indices and a transparent revision log.
3. Cognitive interviews and comprehension checks for EN, RU, ES separately; back-translation alone is not validity.
4. Preregister hypotheses and sample-size plan; pilot response distributions and dropout/missing-data mechanisms; verify accessibility.
5. Distinct development and confirmatory samples for EFA/CFA or IRT. Examine measurement invariance across languages, age and relevant groups.
6. Internal consistency (prefer omega with confidence intervals), reproducibility/test-retest and measurement error. For dynamic state measures, do NOT force stability criteria unsuitable for changing constructs.
7. Hypothesis-based convergent/discriminant/known-groups checks using **authorized** comparator instruments; for longitudinal checks estimate responsiveness, reliable change and minimal important change.
8. External replication and independent statistical audit. Publish limitations and evidence passport for each *exact* edition. Only after rights/safety review can a fully specified version be considered for release.

Priority order: (1) current state and weekly check-in, (2) stress, resources and boundary check-ins, (3) original relationship/self-support questionnaires, (4) original personality/typology measures, (5) Bach/Dao/Wu Xing and nonstandard systems **as self-reflection only**, without clinical or medicinal-claim validation. A high Cronbach alpha alone cannot rescue an invalid construct or treatment claim.

## Language validation
Show the interface in EN/RU/ES, but display the **actual respondent questionnaire locale**. For \`dynamic\` definitions, treat each language as an independent edition until a respondent-language psychometric study matches exact wording and scoring. Never infer Spanish validation from UI labels.

## Rules before merge
- Run \`node --conditions=react-server --test tests/psychometric-validity-directory.test.mjs tests/public-test-match-paging.test.mjs tests/assessment-methodology.test.mjs tests/test-kinds-catalog-audit.test.mjs\`
- Run relevant existing assessment and privacy suites, \`npm run lint\`, \`npm run build\`, and synthetic guest/account mobile QA.
- Confirm static research reference data remains paginated and does not bloat the home page, browser bundle or quota-heavy KV.
- Review per-source commercial rights especially WHO-5 (non-commercial attribution/sharealike), publisher test kits and clinical inventories; obtain documented written clearance before any hosted forms.
- Confirm untrusted external URLs are HTTPS and open with \`noopener noreferrer\`; no remote PDF mirroring or unsafe downloads.
- Do not auto-merge or publish to holistichouse.vercel.app. Review deployment status and old PR #495 to avoid parallel version overwrites.
- Google Sheets remains the authoritative archive. MySpace location is not determined.

## Audit command
\`node --conditions=react-server scripts/audit-psychometric-quality-2026.mjs\` displays pending evidence queues and counts without accessing client answers or writing to the production database.

Source archive: https://docs.google.com/spreadsheets/d/13tKxFlypfuaEWh0Vy0NeYasCZ-iItRkmZTEx7eB9E5k/edit
