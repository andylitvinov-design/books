# Holistic House — IPIP-VIA-R completion: 14 missing strengths + three global core scales
Date: 2026-10-14. Integration: `codex/public-book-library` via feature PR. Deploy/DB status is separate from repository merge.

## Scope
- Existing product baseline: 110 distinct runnable questionnaire keys; the original source bank already supplied 10 of 24 four-item IPIP-VIA-R strengths.
- Added: 14 previously absent four-item research strengths (56 exact English items) plus the published three six-item global core strengths (18 items), for 17 new independent scored form IDs and 74 questionnaire items, 127 source-catalogue runnable keys after the merge.
- 24 complementary specific strengths now available in code; 3 six-item composites are derived from partly overlapping original items and **are not independent clinical batteries**. 27 is a count of runnable form keys, not unique constructs, normative scales or separate clinical diagnoses.
- Purpose by site topic: relationships (kindness, fairness, honesty, teamwork); business/money (leadership, prudence, dependability); effectiveness (self-regulation, judgment, learning, mastery); meaning/wellbeing (perspective, beauty, positivity, spirituality); confidence (bravery).
- Exact original EN only. RU navigation, titles, explanations and follow-up suggestions are present, but question wording remains EN until a controlled translated version is published and reviewed.
- Every item and answer range comes directly from the official keys, two positive + two reverse-scored for four-item forms; three positive + three reverse-scored for six-item forms, mean 1–5; no fake cutoffs, diagnoses or percentile claims.

## Rights / provenance
- Source short-scale key: https://ipip.ori.org/IPIP-VIA-R_Key.html — Bluemke, Partsch, Saucier & Lechner (2021).
- Source three core keys: https://ipip.ori.org/IPIP-VIA-R-core-strengths_Key.html — Partsch, Olaru & Lechner (2022).
- IPIP public-domain/for-profit permission: https://ipip.ori.org/newPermission.htm
- Not the copyrighted, commercial VIA Character Strengths Survey. Its scores do not justify treatment, prescriptions, or personality judgement. Core positivity and spirituality must never be interpreted as desirable obligation; values can differ.

## Integration contract
- Existing modules only: `ASSESSMENT_DEFINITIONS`, `MONITORING_CATALOG`, `INTERPRETATION_PLANS`, `DIMENSION_ROWS`, `TestExplorer`, `scoreAssessment`, Insights, PDF and private result storage. No parallel accounts or scoring engine.
- New immutable versioned source module: `data/assessments/ipip-via-r-completion-2026.js`.
- Additive migration: `supabase/migrations/20261014130000_hh_ipip_via_r_completion_2026.sql`.
- Stable unique IDs, canonical SHA256 content hashes, safe conflict detection, no overwriting of historical client results.
- Rights-gated clinical instruments (MMPI, WAI, IIP, YSQ, DES-II, etc.) remain **not startable** absent appropriate commercial publishing rights and qualified oversight.

## Publication gate
1. Exact feature-head `npm run test:app` plus new suite, `npm run lint`, `npx tsc --noEmit`, `npm run build` and database isolated tests.
2. Securely apply additive migration to **existing** HH Supabase, verify all 17 hash/IDs, RLS and no leakage with synthetic guest/client sessions.
3. Only then publish **latest merged integration SHA** via linked Vercel project if build quota allows; verify READY production alias and EN/RU original-language behavior, result, retake and PDF.
4. Do not label tests LIVE until DB and Vercel alias verification. Do not submit repeat builds while rate limited.
