# Holistic House — Project Management Execution Gateway 3.0

## Scope and truth boundaries
Extends existing owner-only Project Management (PR #3831), Command Center delivery proof (PR #3814), and PM reports. It does not create a second task graph, public write API, new cron, new paid model or new Repair Worker. The public PR Monitor stays read-only.

**Execution path:** approved existing Command Center code task + linked PR → owner prepare → exact-HEAD authenticated Core failure and Watchdog bot proof → persisted one PR:HEAD execution claim → owner confirms → server sends official GitHub `workflow_dispatch` to **existing** trusted `hh-pr-ten-minute-watchdog.yml` on `codex/bootstrap-books` → Watchdog addresses the one PR → existing dispatcher rechecks lease, capacity, scope and bot proof → signed reservation with task_key and reservation_run_id → existing Repair Worker → guarded publisher → exact-HEAD Core/Specialist/hh-merge-check → native auto-merge → deployment ancestry and functional LIVE smoke.

**Hard invariant:** PM never dispatches `hh-pr-repair-worker.yml` directly. `OWNER_APPROVED`, `DISPATCH_ACCEPTED` and Watchdog run ID are not proof of runner start, patch, commit, CI green, merge or LIVE. Existing Watchdog and worker remain source of truth.

## Required production configuration
Existing owner-only auth, Origin/CSRF and rate limit are reused. Backend role `hh_app_backend` needs the additive migration `20261107180000_hh_pm_execution_gateway_v3.sql`. No `anon`/`authenticated` access, no Data API grants. A least-privilege GitHub fine-grained PAT or GitHub App installation token for `andylitvinov-design/books` with **Actions:write** and **Actions:read** must be configured as server-only `HH_PR_CRON_DISPATCH_TOKEN` on the existing Vercel project, only after owner authorizes the credential. Never send token to client, AI inference, logs or PR comments. Token must be held in a Vercel secret, not `NEXT_PUBLIC_`. The trusted GitHub Actions `GITHUB_TOKEN` continues to own signed reservations and dispatch the existing worker. Do not reuse the GitHub write token for the model.

**GitHub token readiness:** presence alone is insufficient; the gateway checks the existing trusted workflow and reports explicit 401/403/422. A true capability probe can be added with an explicit authenticated GitHub permission readback, but must not create a workflow run or extra billable event just to test a token.

**No new paid services:** only existing GitHub Actions standard runner quota; existing OpenRouter `:free` adapter verifies zero prices and forbids paid fallback. Existing worker remains responsible for deterministic first, independent validation and guarded publication. If provider unavailable, hold.

## API operations
`POST /api/admin/project-management` actions:
- `prepare_execution`: owner-approved code task, linked PR, exact HEAD, current Core failure and signed Watchdog source diagnosis, token readiness. Creates one expiring execution receipt per PR:HEAD.
- `launch_execution`: requires explicit browser confirmation and fresh PR/HEAD/failure check. Transactional `PREPARED → DISPATCHING` claim before remote call. No retry on ambiguous dispatch. Returns workflow run ID only if GitHub actually returns one.
- `prepare_chatgpt_handoff`: copyable complete task for ChatGPT Work, not a launched agent.
- `execution_status`: read-only actual receipt, Watchdog run and independently inspected PR/CI/serving SHA. Does not infer source commit attribution.
- `retry_execution`: requires previous terminal/blocked state and a **new** current SHA with new verified failure; same HEAD is rejected.
- `cancel_future_attempts`: cancels future PM retries only; never cancels an active GitHub run, required CI or protected merge.

Codex Host remains explicitly blocked pending verified OAuth, supported SDK/app-server runtime, actual inference and authorization. No undocumented ChatGPT API or assumption of free unlimited inference.

## Stages and evidence requirements
`OWNER_APPROVED` (owner timestamp + PR SHA) → `DISPATCH_ACCEPTED` (GitHub run ID + URL) → `RUNNER_STARTED` (trusted Worker job ID) → `PATCH_VERIFIED` (independent candidate verifier + changed files) → `COMMIT_PUBLISHED` (old/new SHA, commit URL and PR HEAD readback) → `CI_RUNNING` (real run ID for new SHA) → `CI_GREEN` (Core, Specialist, hh-merge-check all on same SHA) → `MERGED` (protected merge SHA) → `DEPLOYED_SHA_VERIFIED` (READY and ancestry) → `LIVE_VERIFIED` (functional browser smoke).

Only the first two events are currently persisted by the new PM API. Other stages are deliberately **not synthesized** from a Watchdog run or mere PR HEAD movement. The existing Release Proof reports independently observed CI/merge/deployed SHA; additional verified Worker-to-PM receipt correlation and functional smoke are required for full attribution.

## Known release blockers / acceptance
- The Vercel project inspected on 2026-11-07 had no server-only GitHub Actions write token among its listed 100 environment records; a new permanent credential requires explicit owner authorization.
- Current Repair-labeled PR #3748 and #1705 also carry `hh:repair-manual`; do not use either as an unattended automatic repair acceptance candidate.
- Migration and both PRs must be merged; protected control workflow inputs must be deployed before live dispatch. One safe, current, non-held PR with a signed Watchdog Core failure is required.
- Functional LIVE needs real production alias and user-flow smoke. Vercel READY is not enough.
- Source code, CI tests, and migration changes are **not** LIVE until deployed, with exact evidence.

## Local validation
`node --test tests/project-management*.test.mjs`
`node --check lib/project-management/execution-gateway.mjs lib/project-management/execution-store.mjs app/api/admin/project-management/route.js`
Control branch: `node --test tests/ci-pr-control-tower.test.cjs`; `node --check scripts/ci-pr-queue-dispatcher.cjs`; required existing Watchdog contract CI.

## Rollback
Disable `HH_PR_CRON_DISPATCH_TOKEN` in Vercel to fail closed without changing the public monitor or protected CI. Revert product PR via protected release policy. Control branch revert requires trusted CI and leases. Keep additive execution evidence tables intact for audit; no destructive migration.
