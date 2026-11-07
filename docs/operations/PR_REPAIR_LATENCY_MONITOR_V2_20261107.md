# HH PR Repair latency monitor V2 — 2026-11-07

Scope: existing control branch codex/bootstrap-books and separate standalone Vercel PR Monitor. This document is an implementation contract; a protected control-plane merge alone is NOT a Vercel LIVE deployment.

## Owner goal

Break down verified failed Core CI job → next Core workflow created on a different verified PR source HEAD into five exclusive subintervals and an unattributed remainder. Do not mix this with Created→Merged or the existing archived CI wave cohort.

1. wait_assignment: failed Core job completion → authenticated worker claim. Includes triage/routing and possible capacity wait. A claim is NOT proof that an AI model received the task.
2. wait_execution: worker claim → actual trusted fix-step started_at. Includes checkout, dependency installation, scheduling/runner wait, not necessarily AI idle.
3. repair_and_validation: trusted fix-step started_at → verified successful patch candidate or independent code verification completed_at. Includes editing AND validation, not inferred pure typing/inference time.
4. wait_publication: successful patch verification completed_at → verified remote-ref source_published stage. The stage timestamp is recorded after the GitHub remote SHA and parent are independently read back; it is a GitHub Actions observation, not a server-native Git ref timestamp.
5. wait_new_ci: source_published stage → new exact-HEAD Core workflow created_at. Does not include GitHub runner execution.
6. unattributed_minutes: every unverified or inconsistent interval. Unknown is NOT zero.

## Data and safety

Reuse existing HH_PR_STAGE_V1 signed GitHub Actions PR comment receipts. The new patch_verified source is github_actions_patch_verification_step, restricted to exact PR, failed HEAD, task key, original worker workflow run ID and successful verified step on that same GITHUB_RUN_ATTEMPT. Do not introduce new GitHub Actions workflows, jobs, tokens, crons, paid models, background polling or unrelated deployments. No weakening of CORE, Specialist, Guard, branch protection, privacy, payment, consent or LIVE checks.

Publication stage source_published is generated only after the existing guarded writer verifies the remote branch ref and commit parent. A verified patch without a published source HEAD remains an unfinished dependency, NOT a successful repair. An open PR on the unchanged failed HEAD can show elapsed unresolved time only when current HEAD and observation timestamp are proven. If another task or run owns the HEAD, attribution remains unknown.

The on-demand /api/pr-attribution?pr=N handler reuses its previously fetched GitHub runs, jobs, comments, issue timeline and signed stage events. It returns repair_cycles.cycles[].latency (HH_PR_REPAIR_LATENCY_V2) and a sample-only latency_summary. Client renders five phase rows, source links and explicit unknown time, without summing them again into the overall PR journey.

CI Journey's expanded PR row offers a manual button to navigate to the existing exact PR attribution form; overview must not fan out an API call per PR. Mobile phone widths must not horizontally overflow.

## Acceptance

- Run narrow Node 22 CJS tests for the pure model and trusted signed stage receipts.
- Run existing pr-repair-worker, pr-repair-cycle-model and pr-attribution-api tests in the full repository checkout.
- Check JavaScript syntax, current HEAD and task ownership, exact signed stages and zero-overlap arithmetic.
- Source publication: one complete prepared HEAD; no intermediate per-file pushes or PR metadata updates that create redundant waves.
- GitHub merge follows existing control-plane checks. The standalone Vercel monitor has its own full manual bundle and must not be redeployed from the incomplete ops/pr-monitor archive. Independently verify deployed source digest, /api fields, phone UI and alias. HOLD if new Vercel spend is unverified.
