# PR Monitor / verified CI error funnel, 2026-11-10

The original standalone PR Monitor is a separate, manually deployed Vercel project. Add this read-only first-screen panel to the original monitor; do not create a second dashboard, cron, worker, AI call, or public copy of owner data.

## Changes

- pr-error-funnel.js: nine-step incident funnel, on-demand reads, owner authentication, signed GitHub evidence.
- pr-error-funnel.css: compact responsive dark panel.
- pr-two-screen-boot.js: load both assets within the existing legacy monitor page.
- tests/pr-error-funnel.test.cjs: ten independent regression tests.

## Numerator and cohort

The selector supports 24 hours, 7 days, 14 days, 30 days. The cohort is defined by the recorded Core CI failure timestamp. Each PR is counted at most once per stage; repeated failures are counted as separate events in a caption.

Nine stages: CI failure; classification; task persisted; concrete executor assigned; workflow dispatch accepted; same-task GitHub Actions Worker CLAIMED; real runner started; signed final Worker response; real remotely verifiable GitHub commit. These are separate proofs, NOT interchangeable status labels. A model response is separately counted but never presented as a commit.

The owner-only stored incident endpoint is /api/commander-chats?action=ci_events&limit=100, backed by the existing private OIDC-verified Supabase store. Signed GitHub Actions app comments must match exact PR, HEAD, incident task, executor and worker run. A commit must appear in GitHub Git objects with the failed source HEAD as a parent and be tied to the trusted source-published stage receipt.

Incomplete coverage of the stored 100-event window, unavailable GitHub proof, or scan limits uses minimum-count ≥N, not fabricated totals or zero. Unauthorized users see sign-in instructions and no incident data.

## Tests and safe deployment

Node check: node --check ops/pr-monitor/pr-error-funnel.js
Node tests: node --test ops/pr-monitor/tests/pr-error-funnel.test.cjs

Verified the evidence parser against authentic GH Actions receipts in PR #4220, #4232, #4234, and #4247; each of these was a real Worker claim and signed outcome, but no source-commit success.

IMPORTANT: The archived ops/pr-monitor repository folder is NOT a complete deployable version of the current production monitor. The live Vercel project contains separate legacy.html and API files. Never deploy the archived folder alone. Integrate these files into the existing complete monitor source bundle, build a full preview, then promote only after verifying the canonical domain, private endpoint authentication, first-screen render and actual signed readback. Merging this repo PR alone does not prove the Vercel production page changed.
