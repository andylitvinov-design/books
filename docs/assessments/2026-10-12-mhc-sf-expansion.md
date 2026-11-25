# Adult MHC-SF — bounded implementation review

Canonical base: `2ddf275f60cb12c0d4de1e3d08ce1b95a73497a2`, branch `codex/public-book-library`. The compassion batch (#382) and relationship hub (#364), including opt-in starter behavior, are already merged. All 10 open PRs were checked again; none implements MHC-SF. The existing `mhc-sf` research registry entry has no runnable definition at this base. No AGENTS.md or .agents/skills instructions were present in this checkout.

Adds **one** complete adult professional research measure. Runnable catalog keys move **104 → 105**, professional entries **41 → 42**. These counts include the existing mixed catalog and are not a claim of 105 independent validated professional tests. Language versions, subscales and IPIP facets are not new instruments. DASS-21, protected instruments, unrelated PRs, auth/cabinet selection handoff and advertising/UX plans are outside scope.

All 169 pre-existing immutable definitions are preserved exactly; the source definition inventory becomes 170. Tests pin both the canonical 169-definition digest and the earlier 153-definition digest.

## Source specification

See the [complete bilingual guide](guides/mhc-sf.md). Author sheet: https://peplab.web.unc.edu/wp-content/uploads/sites/18901/2018/11/MHC-SFoverview.pdf (permission with attribution p.1; adult form p.4; scoring p.6), re-read 2026-10-12. The printed December 2011 adult English form uses revised item 6. The sheet's bibliographic citation says 2009; this does not mean the earlier item 6 is substituted. Adults 18+, past month, six original responses 0–5, no reverse items. Preserve the paper instruction and common stem. Russian navigation explicitly says EN; there is no purported validated Russian questionnaire.

Total sum of 1–14: 0–70; emotional 1–3: 0–15; social 4–8: 0–25; psychological 9–14: 0–30. All 14 responses required as product policy; zero valid, missing distinct, no imputation. Continuous sums only. No clinical norms, cutoffs, 10-point bands, categorical diagnoses, or claim that wellbeing rules out illness. Attribution and source-form limits appear in reports. Social interpretation includes PHAC's population-specific caution; validation literature is not represented as validation of this site's exact delivery/population.

The account runner now recognizes `past-month` in its timeframe label. The existing guest/account, selection, save, history, Insights and PDF architecture is retained; the Google-to-Cabinet handoff is unchanged.

## Registration boundary

`supabase/migrations/20261012041529_hh_mhc_sf_adult_dec2011.sql` is a one-definition append-only transaction with ID, key/version/language, hash and full-definition guards. It follows the previous isolated-tested registration convention. `supabase migration new` was attempted but the installed CLI failed at `/home/agent/.supabase` with EROFS; the file was prepared locally without changing access or reading secrets.

ID: `fe2feb75-6428-52a1-a9a6-ea45f0e43242`.

Hash: `sha256:c70b5b61ad92d2daad15dbaf4e145d27262abe94cc9f2a64eda275c257b6a853`.

The user's standing approval covers technical additions, but **this batch stops at draft PR and independent review**. No production SQL is run in this batch; no client data, auth, RLS, schema, secrets or access settings are touched. Following independent review and exact-head checks, registration must match the identities above before the runner is released. A collision is a stop condition, never permission to overwrite an existing version.

## Verification scope

Independent synthetic fixtures pin all 14 source items, response anchors, edition, ID/hash, keyed membership, all-zero/all-five/mixed sums and each item's contribution. Missing/null/fractional/out-of-range responses cannot score; zero saves as a real response. Tests cover bilingual source-specific reports, version mismatch, filters/deduplication, guide axes, registration correspondence/idempotency/collisions, confidentiality, and repeated-measure PDF/history models.

Isolated PostgreSQL and Chromium/WebKit journeys exercise account EN Quick and RU Guided, guest RU Quick and EN Guided, save/reload, the four source sums, original wording, history, Insights and EN/RU PDF downloads. Auth is the existing isolated provider protocol double, not live Google. Final command outcomes and exact-head CI evidence are recorded in the draft PR; software tests do not establish psychometric validity.

Integration retains all 27 relationship browser cases and their successful exact-plan GET readiness checks. The verified common fixes from BFAS review are carried separately: single-script JSON-LD nonce hydration handling with four exact-document checks, and native status-filter disclosure state with four EN/RU keyboard cases. No BFAS definition, report or migration is included. The MHC-SF history journey completes every started materials read before leaving the page; diagnostics preserve strict unfiltered page-error assertions. The full browser union is 94 cases per engine. Production registration remains paused under the earlier automatic-review denial; this integration does not retry it.
