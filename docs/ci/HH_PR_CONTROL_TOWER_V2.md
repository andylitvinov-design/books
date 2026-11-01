# HH PR Control Tower 2.0 — operational contract

## Status and branches

- Trusted source of dispatcher code: `codex/bootstrap-books` (GitHub default branch).
- Product release target: `codex/public-book-library`. A GitHub merge is **not** evidence that Vercel production is READY.
- Source of directional priorities: `.github/hh-pr-directions.json` (merged PR #2967).
- Existing source workers and exact-HEAD protected Native AutoMerge remain authoritative; the new dispatcher does not bypass any check or merge directly.

## Primary admission contract

The dispatcher is one trusted, concurrency-serialized writer. Each event reads the complete open production PR inventory, computes directional priority P1–P5, selects up to 16 candidates (3 high-priority + rotating rest), and verifies a fresh PR HEAD and owner before doing anything.

Only known durable queue labels enable work: `hh:repair-needed`, `hh:ci-needed`, `hh:conflict-repair-needed`. Draft, external PRs, held/claimed/manual tasks and stacked parents cannot be touched. Source repair additionally needs a trusted exact-HEAD Watchdog diagnostic receipt. Genuine conflicts require a fresh `mergeable=false/dirty` check.

The task identity `HH_PR_TASK_V1` is SHA256 of repo, PR, HEAD, lane and reason; a first-party issue-comment reservation prevents a second automated dispatch of the same HEAD. The marker is **not** permission for any worker to change code: each worker revalidates owner, branch, lease, SHA and evidence.

Capacity reads GitHub Actions workflow *and job* inventory (not just total runs). When capacity data is missing or incomplete, the dispatcher fails closed and does not schedule a worker. It runs at most two dispatches in one cycle and never dispatches two jobs to the same worker. CI and Repair have independent lane budgets. The first cap is intentionally conservative, to avoid saturating GitHub-hosted runners.

## Triggers and exact statuses

- Event-driven: completed Watchdog, CI Worker and Repair Worker, using trusted `workflow_run` metadata.
- Reconciliation: cron `7,17,27,37,47,57` UTC, subject to GitHub's actual scheduler delivery. Manual `workflow_dispatch` defaults to dry-run.
- On code pushes to default: audit only. Do not generate another full event storm.
- `DISPATCH_ACCEPTED` means the GitHub API accepted an exact-HEAD workflow dispatch, **not** that the repair was performed. `RESERVED` without a verified worker should not be retried blindly after TTL. Inspect the assigned task and worker history first.
- `NO_ACTIONABLE_PR` is valid (no empty worker runs). `SOURCE_PROOF_MISSING`, `OWNER_LEASE_ACTIVE`, `RESERVED_REQUIRES_REVIEW`, `WORKER_BUSY_OR_COOLDOWN`, `CAPACITY_UNVERIFIED`, `DISPATCH_DENIED` and `STALE_SHA_OR_STATE` are explicit stop reasons.

## Incident and rollback

- GitHub schedule event health is tracked separately under issue #2965; **manual or event success is not cron health**. Re-enable workflow with a repository owner if scheduling remains absent; escalate to GitHub Support. Require two actual scheduled runs before closing #2965.
- Direction Watcher must use verified metadata-write permission. If GitHub rejects writing labels, do not claim the queue has been classified; leave current priority inference active and fix least-privilege token scope.
- Rollback: disable the new Queue Dispatcher workflow and retain existing validated CI, Repair, Watchdog and Native AutoMerge. Never disable required branch protection or force-merge.

## Metrics and targets

Every dispatch run emits a JSON Actions step summary with count of actionable candidates, reservations, accepted dispatches, exact-head rejections, blocked reasons and observed runner-job load. Successful workflow completion alone is not an outcome. Track worker claim, source commit SHA, final CI and Native AutoMerge plus separately confirmed production deployment SHA.

Initial service-level goals: eligible-to-dispatch p95 <= 2 min when the job capacity and reliable scheduling exist; zero duplicate source writes; zero merge bypasses. These are **targets**, not measured outcomes. Any metrics requiring deploy-provider authentication or missing telemetry must display `UNKNOWN` rather than fabricated success.

## Acceptance gates

`node --test tests/ci-pr-control-tower.test.cjs` exercises exact-HEAD identity, deterministic priority, idempotent reservations, safe refusal on stale SHA, no empty runs, independent CI/Repair caps, active worker cooldown, dry-run, conflict guard, and stacked-parent protection. The GitHub watchdog contract must also pass on the final SHA. Canary: one verified test PR receives a worker claim and a real fix commit, then protected green CI, native merge and independently verified deployment. A successful simulated dispatch does not meet the full acceptance gate.