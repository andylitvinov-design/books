# Control-branch PR orchestration: remove old diagnostic fan-out

This is the control-plane counterpart to production PR #4896. The goal is to stop old diagnostic GitHub Actions from taking capacity needed for exact-head PR repair, protected merge and LIVE.

## Measured baseline

Of the latest 100 GitHub `push` workflow runs retrieved on 2026-11-17:
- 28 were `HH PR 10-minute watchdog` triggered by changes on `codex/bootstrap-books`.
- 13 were `HH PR Control Tower queue dispatcher` on the same branch.

These are a **41/100 cohort**, not proof of 10× total reduction. Most of these control pushes launch a read-only observer or redundant reconciliation; a scheduled reconciler already exists.

## Change

1. Remove the deprecated **push trigger** from the read-only queue observer. Its `pull_request` contract check and `workflow_dispatch` read-only audit remain.
2. Narrow Watchdog push `paths` from **29 to 9**, removing tests and monitoring-only code as triggers. Keep owner workflow changes, event/PM handoff and production routing changes immediately observable.
3. Do **not** alter cron `7,27,47 * * * *`, Worker-completion `workflow_run`, manual signed `workflow_dispatch`, shared writer lease, admission/security decisions, branch controls, or HTTP/generation costs.
4. Preserve the special `reactivate-schedules` fallback for trusted workflow-source pushes.

## Acceptance

- Run `tests/ci-pr-control-tower.test.cjs` in the control PR and preserve all direct-handoff policy tests.
- Do not see new queue-observer runs on ordinary `codex/bootstrap-books` merges.
- Verify the Watchdog still operates on schedule and completed Worker events.
- Compare a later matching 100-run sample before claiming any actual 10× total reduction.

No new cron, Vercel deployments, paid services, secret changes or bypasses.
