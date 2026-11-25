# Two compassion research measures — implementation and release review

Base: `codex/public-book-library` at `b55ebd654ef8ba2057fc7543b9123b3d43410afc` (fetched again during implementation). No matching open SCS-SF/CS implementation was found; unrelated/stale assessment PRs were not reused. No AGENTS.md or .agents/skills files were present in this checkout.

The canonical code inventory moves from **94 to 96 runnable instrument keys** (39 to 41 professional entries). SCS-SF replaces the existing disabled catalog placeholder; the 16-item Compassion Scale is a separate new key. They are distinct from the IPIP compassion personality aspect. Language versions and CS subscales are not counted as additional tests. All 151 pre-existing immutable source definitions were compared with the base and preserved exactly; two English definitions are added. Database registration totals are not runnable-test counts.

## Source and scoring specification

Primary author index: https://self-compassion.org/self-compassion-scales-for-researchers/

- SCS-SF official sheet: https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf
- CS official sheet: https://self-compassion.org/wp-content/uploads/2021/03/CS-information.pdf

Both re-read on 2026-10-12: page 1 contains the author grant for use for any purpose; page 2 contains the original English instructions, exact items and 1–5 endpoint anchors; page 3 supplies scoring and limitations. Preserve the numeric-only intermediate anchor points. Russian titles explicitly say EN. Russian guidance is original explanatory text, not a validated questionnaire translation.

SCS-SF: reverse 1, 4, 8, 9, 11, 12; average the corrected 12 answers (equivalent to the average of six two-item means). Report only the total because the author warns against unreliable short-form subscale scores. CS: reverse 3, 7, 11, 15 in the total and in the displayed indifference subscale. All five reported values are means; higher reversed indifference means **less indifference / more compassion**. Complete answers are required as a conservative product rule, with no imputation. Final means use the unchanged scorer's two-decimal rounding.

No clinical norms, diagnoses, invented cutoffs, tercile categories or SCS-SF ad hoc categories are assigned. These are research measures, not diagnostic screeners. Version-specific interpretation is connected to the shared account/guest report, Insights, history and PDF model. The full SCS and rights-gated SWLS, Flourishing, SPANE and GSE are outside this batch.

Detailed bilingual source and scale guides: [SCS-SF](guides/scs-sf.md), [CS](guides/compassion-scale.md).

## Registration boundary

Migration: `supabase/migrations/20261012033100_hh_compassion_research_measures.sql`.

This is an append-only technical registration of two definitions, guarded against mismatching ID, key/version/locale, hash or full definition content. Repeated application must be a no-op. It changes no schema, permissions, auth, RLS, existing definitions or client results. The Supabase CLI could not create a migration in this sandbox (read-only home; an older CLI download also failed); the SQL follows the existing repository registration convention and is exercised directly against isolated PostgreSQL.

**Do not apply to production as part of this PR.** After exact-head review/CI and separate production authorization, register the two exact IDs and hashes below before production runners use them. If an identity already exists with different content, investigate and stop; never overwrite it.

| Key | ID | SHA-256 content hash |
| --- | --- | --- |
| scs-sf | c2506513-5f3c-599f-a790-506411bc2c05 | 3275b6aaaa19c8f52a2f892ac94384626984d50f561f404fda9cbee3d912503f |
| compassion-scale | a5cb84ed-75bd-59e0-adba-64bfa1626cca | 0b77d1eb4e39a6a91eb461447dbec57c4b879ecff2c20e80eec36dd2e04578bb |

## Verification

- `tests/compassion-assessments.test.mjs`: independent item maps, pinned IDs/hashes, keyed minima/maxima, uniform and mixed fixtures, every individual item's scoring sign/membership, invalid/missing answers, bilingual continuous interpretations, catalog selection/deduplication, exact SQL correspondence and confidential PDF report model.
- Existing broad unit and app suites exercise the complete inventory and preserve prior scoring, rights gates and safety flows.
- Isolated PostgreSQL: all runnable tests save and read through the actual restricted repository role; the new registration is idempotent, rejects changed IDs/hashes/content, and private guest results preserve source means and deny a different guest.
- `scripts/verify-compassion-assessments.mjs`: loopback-only real application with synthetic provider protocol double; mobile account/guest, both languages, Quick/Guided, original instructions/items, results, reload, history, Insights and EN/RU PDF downloads. Included in the existing Chromium/WebKit CI matrix after the full regression journey.

Exact command outcomes and final-head CI status belong in the draft PR. No production database, client data, Google authorization settings, Vercel settings or paid services were accessed or changed. Isolated provider tests do not constitute live Google login verification. Code is not a live publication.
