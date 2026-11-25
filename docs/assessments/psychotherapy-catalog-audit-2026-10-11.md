# Holistic House — professional psychology & psychotherapy assessment audit
**Date:** 2026-10-11  
**Repository / integration:** `andylitvinov-design/books`, `codex/public-book-library`  
**Production:** https://holistichouse.vercel.app

## Inventory at audit baseline
- **74** registered runnable instruments in the source catalogue, including custom non-diagnostic Holistic House check-ins, generic screening questionnaires and professional measures. "Runnable" in code is **not** proof that the exact production deployment and corresponding Supabase migration are live.
- **111** separate rights-gated research registry rows, not a second database of available tests. Some overlap with runnable catalogue by key; never add the totals to claim distinct questionnaires.
- The previous 2026-10-11 merged PR #302 added RSES-10 and CES-D-20. PHQ-2, GAD-2, K10, PHQ-15 and several others were already present; don't duplicate them.
- Key professional areas in the registry: depression/anxiety, stress, wellbeing, resilience, sleep, burnout, trauma, attention, personality, functioning, outcome tracking, addiction and health-related quality of life.
- Crucial psychotherapy-specific gaps: interpersonal circumplex problems, therapeutic alliance, schema modes, reflective functioning, attachment structures, dissociation and satisfaction with therapy.

## Implementation in this branch
### Ready-to-run (after migration and release gates)
**IPIP Big Five Factor Markers — 50 items**, official original EN, entirely public domain for commercial use.
- Official source/wording: https://ipip.ori.org/new_ipip-50-item-scale.htm
- Scoring/signs: https://ipip.ori.org/newBigFive5broadKey.htm
- Permission: https://ipip.ori.org/newPermission.htm
- 50 complete original items, 5 factors × 10, 5 response anchors, separate reverse-coded sums 10–50; no diagnosis/cutoffs, no single whole-person mental-health grade.
- Full raw results/Insights/PDF/history use the existing versioned assessment pipeline.
- Unique `ipip-big-five-50:v1:en` with immutable content hash; add one append-only `app.assessment_versions` migration. Never overwrite an existing completed version. English original only; Russian UI displays explicitly EN.
- Optional, 9-minute comprehensive choice; no default short-battery insertion or repeating trait scores as daily progress.
- New anticipated code inventory **75 runnable**.

### Reference only (do not administer)
Add 17 professional/research method entries, all with `enabled:false` and explicitly blocked `rightsStatus`: IIP-32, IIP-64, WAI-SR, PCOMS Session Rating Scale, Young Schema Questionnaire–S3, Schema Mode Inventory–Short, Reflective Functioning Questionnaire–8, DES-II, ECR-RS, CSQ-8, HADS, Adult Attachment Scale, ACE-10, BEAQ, IUS-12, PTGI, McMaster FAD General Functioning. **Anticipated registry 128 entries**, with no duplicates.

Rights examples:
- IIP-32/64: https://shop.mindgarden.info/113-inventory-of-interpersonal-problems — commercial / digital per-administration rights required.
- WAI-SR: https://www.psychotherapyresearch.org/store/viewproduct.aspx?id=24834231 — paid clinical licence.
- Other `rights_review` instruments: research/published scoring or questionnaire visibility does not grant commercial site reproduction or validated RU translation.
- Trauma/dissociation/childhood adversity and clinical risk tools need clinician-appropriate consent, safety support and privacy; no unsupervised public diagnostic quizzes.

## Product rules
1. Preserve the existing single `MONITORING_CATALOG`, `MIND_BODY_MONITOR_REGISTRY`, `TestExplorer`, `ASSESSMENT_DEFINITIONS`, and `scoreAssessment` integrations; don't replace Cabinet/Insights, auth, or assessment storage.
2. The customer-facing test explorer must dedupe matching registry/product keys, show availability, topic and problem filters; never offer **Start** on research/rights/clinician-only entries.
3. Each source-cleared professional instrument must have full original items, stable ID/hash, answer schema, correct (including reverse-coded) scoring, declared construct and scoring direction, non-diagnostic explanation, full per-test report and safe practical recommendations.
4. Distinguish psychological measurement from homeopathy / Wu Xing and Holistic House original reflections. Avoid translating clinician scales without controlled validation.
5. Clinical scores are personal health information: maintain RLS, private guest/account scoping, owner-controlled sharing, expiry, audit restrictions and no analytics or URL leaking answers.
6. Do not automatically propose a goal of changing Big Five traits through `My Growth`; traits are descriptive baselines, unlike coping skills.
7. High-risk or crisis disclosures must use existing safeguards and appropriate support/referral, not automated diagnoses or professional monitoring claims.

## Release QA (required before marking complete/live)
- Run `node --test tests/ipip-big-five-50.test.mjs`, full unit tests, lint, typecheck and production build on PR HEAD.
- Run existing isolated loopback PostgreSQL integration with new additive migration; ensure 75 distinct runnable definitions, 128 distinct research registry keys, correct 50 questions and 5 scores, exact content hash.
- Run signed-in and guest Chromium + WebKit journeys: test search/filters/one-screen guided runner/quick format, resume/save, detailed Insights report, PDF and next-test actions. Confirm RU navigation clearly labels EN questionnaire.
- Apply verified migration to **the existing dedicated production Supabase**, without resetting data; verify stored `assessment_versions` row/definition hash before enabling the new runner.
- Observe GitHub/Vercel deployment readiness, compare production commit and route readback. No production-live claim until the exact production version is confirmed.
- If CI/deployment/DB migration are unavailable, leave change in PR with truthful release blocker. **Never publish copyrighted clinician forms as a workaround.**

## Follow-up priorities
1. Obtain rights/licences and clinically approved administration plans for IIP-32 and WAI-SR; both are core psychotherapy progress/relationship instruments.
2. Approve source wording, languages and scoring for schema, attachment and mentalization tools (research-only until then).
3. Review psychometric accuracy, accessibility, normative references and client suitability for every existing *professional* measure, not just whether a card appears.
4. Version every result interpretation in Insights and explain scale direction and practical recommendations without inventing norms or causal treatment claims.
5. Treat "all psychological tests" as an open-ended global universe, not a finite one-click database. Maintain a reviewed prioritization and coverage map and never misrepresent counts as exhaustive.
