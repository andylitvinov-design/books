# Agents Director · PR repair and CI-wave liveness (P0)

Status: implementation proposal + first guarded control-plane fix, 17 November 2026. This document is an acceptance specification, not evidence of LIVE deployment.

## Problem and evidence

- PR #4748 (Holistic House) had Core failure on head `03b59ab`, a later `2779aa3` source head, and a verified dirty production conflict. Its latest conflict event ended with `BLOCKED_EXISTING_OWNER_OR_POLICY`, `dispatchAccepted=0`.
- The observer displayed between-Core-wave gap 25.2 min, HEAD/preparation 23.2 min (maximum 41.4 min). These are **not necessarily additive** and are not Core job runtime.
- The trusted queue can set `hh:repair-manual` as a terminal semantic conflict handoff. That is **not** a worker start, AI call, patch, source SHA or successful merge.
- The exact owner/PAT, source-lease and protected Core rules must remain intact.

## P0 acceptance contract

1. Intake must classify the exact Core run, PR, source HEAD, base HEAD, error category and whether a source writer is permitted. Capture `run_id`, `job_id`, `failure_at` and an explicit `reason_code`.
2. A DIRTY conflict marked `hh:repair-manual` may enter **read-only conflict triage only** if exact PR/head/base and owner are verified. Never interpret this as permission for automated source writes, CI bypass, merge, or Vercel deployment.
3. Explicit `hh:hold`, `hh:blocked`, `hh:worker-claimed` and invalid direction overrides must preserve fail-closed behavior. Report the exact blocking label and next required action.
4. A manual semantic handoff with its conflict queue hint already retired must not be re-enqueued by each subsequent `synchronize` or `ready_for_review` event. No duplicate conflict comments, labels, or CI runs.
5. Distinguish **task requested**, **dispatch accepted**, **runner started**, **model called**, **patch verified**, **remote HEAD published**, **Core executed**, **merged**, and **LIVE**. Never infer downstream proof from an upstream receipt.
6. Route safe, validated syntax/TypeScript changes through the existing approved Repair Worker. Route semantic conflicts/sensitive changes to an authorized semantic source owner; if no such writer is available, return an honest actionable `SEMANTIC_OWNER_REPAIR_AND_EXACT_HEAD_CI` hold, not a false success.
7. Publish one reviewed final HEAD per repair batch; run only the mandatory exact-head protected Core/Specialist/merge gates. Deduplicate GitHub event deliveries by PR, HEAD, base and task; do not dispatch new CI simply to check worker progress.
8. Preserve narrow source-owner leases and compare-and-swap branch updates. A stale/ambiguous lease may require escalation; TTL alone never grants conflicting source write access.
9. Preserve existing hourly production publisher and Vercel cost ceiling. No new paid services, workflows, build waves or deployments for control-plane observability.

## Monitoring schema and SLO targets

Record unique intervals `error_detected→classified`, `classified→owner_claimed`, `owner_claimed→model_invoked`, `model_invoked→patch_verified`, `patch_verified→source_published`, `source_published→core_queued`, `core_queued→runner_started`, `runner_started→core_complete`, `core_green→merge`, `merge→production_READY`.

- Unknown spans stay UNKNOWN with missing event IDs listed; never count them as worker, Core CPU, or zero time.
- Distinguish actual GitHub runner queue from time between finished runs and newly created run records; do not double count.
- Targets (subject to available capacity): p50 error→eligible assignment <2 min, p50 controllable between-wave delay <5 min; reduce redundant Core waves by >=50%. These are goals, not achieved numbers.

## Rollout sequence

1. **Now:** fix conflict-intake manual/explicit-hold distinction and loop, preserve read-only semantics, add regressions.
2. Link authorized semantic source repair writer to a verified exact-head task; require worker-start/model/patch/remote SHA receipts before progression. Never auto-mark manual handoff as repaired.
3. Coalesce edits and base-sync behind one final HEAD and one necessary protected CI wave; ensure source lease and single-writer accounting remain exact.
4. Upgrade PR-monitor reason attribution from authenticated event receipts; show step-specific blocked state, time, responsible actor, and GitHub run URL.
5. Run safe failing-PR E2E: failing test → classified → assigned → verified patch → published SHA → Core/Specialist green → merge → verified LIVE. Separately audit #4748 without forcing an unsafe merge.

## Regression cases

- Manual DIRTY with existing conflict label: read-only triage allowed, no source permission.
- Manual status after conflict handoff is terminal: no label oscillation or duplicate CI.
- Explicit owner/policy holds and claimed source lease: report exact blockers and do not dispatch.
- Stale event/head/base: no task/CI/merge.
- Successful CI or merge without LIVE: never reported as published.
- Every counted delay maps to two real timestamps and an evidence source; unmatched interval remains UNKNOWN.


## P0 follow-up · stale bot/manual on a new already-tested source HEAD

A generated `hh:repair-manual` label can outlive the HEAD that triggered the
original unsafely scoped free-AI repair. It must **not** become an eternal block
once an authorized source owner has published a different fully tested HEAD.

The read-only Control Tower may retire only its own obsolete metadata label
when **all** are proven independently:

- Exact current same-repo PR / source HEAD / production base, open,
  mergeable and non-DIRTY; no explicit owner hold, policy block, claimed
  source-owner lease, or pending current source repair.
- Full authenticated history establishes the original
  `HH_CONTROL_SCOPE_OWNER_V1` + `HH_PR_TASK_V1(MANUAL)` receipt for a
  **different** old HEAD. The last observed manual-label transition was
  issued by GitHub Actions, not an owner.
- Old vs current HEAD are demonstrably different under GitHub compare,
  including explicit fail-closed handling of owner-rebuilt/diverged branches.
- A real **current** `HH PR core release gate` run is associated with
  exact PR/source SHA/base SHA, its `core-lint-types-build` job passed,
  its protected `hh-merge-check` failed, and an authenticated GitHub
  Actions error task for that **same run** states
  `BASE_ADVANCED / EXPLICIT_BASE_FAILURE / RELEASE_GATE_ONLY`.
  Source failures, missing checks, unknown attempts, unrelated evidence
  or failed Core are never sufficient.
- Immediately before modifying labels, compare HEAD+base and all hard
  holds again, inspect complete signed comments, confirm no active
  owner lease and recheck the last manual-label event.

The allowed mutation removes only the stale machine `hh:repair-manual`
and, if the current HEAD is still verifiably non-DIRTY, the obsolete
`hh:conflict-repair-needed` hint. Preserve `hh:release-gate-review`,
all required CI, versioned base revalidation, source-owner authority,
merge protection and LIVE verification. **Never** claim the source was
repaired or that a successful Core build authorizes merge.

Validation: prove all fail-closed branches in the existing Watchdog
contract suite; check #4854 only against its exact current HEAD. No
new workflow, provider spend or Vercel deployment is permitted.
