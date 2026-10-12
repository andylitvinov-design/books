# Holistic House — Personality Types & Professional Personality Assessments
**Implementation date:** 2026-10-11. **Existing app:** `andylitvinov-design/books` / `codex/public-book-library`.

## Purpose
Add useful, non-diagnostic ways to reflect on personality patterns while keeping proprietary clinical psychometrics and unvalidated popular typologies clearly separated.

## Four new startable *original* EN/RU self-reflection questionnaires
All in the **existing Test Explorer → My Tests → Account/Insights/PDF** pipeline:
- **Socionics preferences (32 items)**: 4 dichotomies (E/I, N/S, Logic/Ethics, Rationality/Irrationality), 8 score dimensions, working hypothesis mapped to 16 classic three-letter sociotypes. Near or tied axes are surfaced and no definitive type is invented on ties. Socionics J/P is not MBTI J/P.
- **Enneagram motivations (36 items)**: 9 motivations, 4 original questions each; highest reported pattern with close alternatives; no unsupported wings or clinical validity claims.
- **D/I/S/C behavioral styles (20 items)**: original 4 communication/work-style scales, 5 questions each, **NOT** an official or licensed DISC test.
- **Four classical temperaments (16 items)**: original reflection on expressive, decisive, steady, reflective tendencies. Historical model, NOT a validated health diagnosis.

All eight immutable locale definitions have stable internal version IDs + canonical SHA-256, exact question sets, declared 1–5 choices, separate 4–20/5–25 raw subscale sums (non-normative), no clinical cutoffs and no repeated-cooldown push. They use the existing authenticated guest/start/save/RLS and per-test report paths. No new backend, provider, client data export or account system.

### Psychological integrity
Scores are descriptive agreement with original questions, not population percentiles, IQ, diagnoses, predictive relationship matching, medically meaningful severities or stable objective personality identities. Socionics and Enneagram categorical models lack robust psychometric support; the user must see uncertainty and alternatives. The scientifically better-supported trait approach continues to be the previously added IPIP Big Five (20/50 items). Do not merge typology with Wu Xing, homeopathic claims, resource diagnosis or auto-selected therapy goals.

## Protected/reference-only clinical assessments
Existing **MMPI-3** remains unstartable, clinician-only. Add research metadata, but **zero proprietary questionnaire items, scores, norms or public-start links**, for:
MMPI-2, MMPI-2-RF, official MBTI Step I/II, NEO-PI-3, NEO-FFI-3, HEXACO-60/100, 16PF-5, MCMI-IV, CPI 260.
- Official MMPI protected, Level C: https://www.upress.umn.edu/test-division/mmpi-2-rf/
- Pearson MMPI: https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Personality-%26-Biopsychosocial/Minnesota-Multiphasic-Personality-Inventory-3/p/P100000004
- MBTI reproduction and qualification: https://www.themyersbriggs.com/en-US/Support/Copyright-and-Permissions
- HEXACO commercial/public online restrictions: https://hexaco.org/hexaco-inventory
- Socionics type coding (note lower-case j/p): https://wikisocion.github.io/content/type_names.html
- Enneagram systematic review: https://pubmed.ncbi.nlm.nih.gov/33332604/

## Expected catalog
Startable catalogue: **104 → 108** (four original bilingual instruments = 8 immutable localized definitions).
Rights-gated research reference registry: **143 → 154** (11 more; reference entries overlap with product where applicable and are not added to the executable count).

## QA and deployment contract
1. Run exact PR SHA unit tests, `tests/personality-types-original-2026.test.mjs`, lint, typecheck, production build, isolated PostgreSQL data/RLS tests, Chromium+WebKit guest/account flows.
2. Verify provenance SHA, scores min/max, **all 16 socionics codes** and ties, licence-gating of MMPI/MBTI/HEXACO, full per-test EN/RU Insights and PDF, snapshot uniqueness alongside Mini-IPIP/IPIP-50.
3. Additive migration `20261011230000_hh_personality_types_original.sql` prepared for the **existing** Holistic House Supabase; not applied by this recovery. Require separate explicit authorization before production registration. A bounded read-only technical check on 2026-10-12 at approximately 05:26 UTC returned no rows for these eight IDs or four keys. After authorized registration verify exactly eight matching ID/hash/body rows, rather than treating database version counts as the number of runnable tests. Do not alter customer answers or prior score versions.
4. Merge source only with all QA checks green. Production is **not live** until Vercel builds and exposes an exact tested GitHub SHA on `holistichouse.vercel.app`, and key UX is read back. Vercel Hobby build-rate-limit may prevent publishing; never claim live solely from GitHub merge.

Recovery baseline: canonical `2ddf275f60cb12c0d4de1e3d08ce1b95a73497a2`. The resulting inventory contains 41 professional and 67 original/reflection instruments, with 177 immutable definitions (169 existing + 8 localized originals). BFAS and MHC-SF are separate unmerged work and are not counted. All four added instruments are engaging/original, not professional psychometric tests.

Canonical reconciliation preserves the complete relationship release and explicit opt-in starter selection, including all 27 relationship browser cases. All eight typology definitions and the guarded SQL remain byte-identical to the prior PR head; tests pin canonical 169-definition and earlier 153-definition digests. Necessary common browser fixes are carried separately: exact-plan read completion, single-script JSON-LD nonce handling with four strict document checks, native status-disclosure state with four EN/RU keyboard cases, and completed history-material reads before navigation. Typology diagnostics retain the unfiltered final page-error assertion. BFAS and MHC-SF definitions are not imported. No production registration or merge is performed.
