# P0: evidence of real PR coding work (free OpenRouter and optional budgeted Qwen)

**Scope:** existing HH PR Repair Worker on protected control branch `codex/bootstrap-books`. The change adds evidence only; no provider activation, additional schedule, owner-token exposure, source-write permission, CI bypass, automatic merge, or Vercel deployment.

## Four independent facts

| Fact | Proof and data | What it does NOT prove |
| --- | --- | --- |
| Executor assigned | Exact PR/HEAD/lease `CLAIMED` and separately configured free/budgeted adapter | GitHub `RUNNER_CONFIRMED` only concerns claim runner; model may never run |
| Model invoked and answered | `code_fix` / `paid_fix` real GitHub job start, exact PR/HEAD/task/run attempt, response timestamp and actual model identity; free OpenRouter resolves `openrouter/free` to an observed `:free` model with verified zero billing; paid Qwen requires guarded response, cost and settled ledger | Configuration, model catalog lookup or inference request *attempt* alone are not proof of a response |
| Patch received and verified | AI proposal plus separate successful clean `code_verify` on matching exact HEAD and allowed paths | Source commit has not yet been published |
| Commit published | Trusted publisher rereads the original PR remote ref, validates the new SHA and parent (original HEAD); reporter emits `source_published_sha`, and `model_patch_published_sha` only for a model-proven, verified model repair | Exact-head required CI, protected MERGED, and Vercel `LIVE_VERIFIED` remain distinct gates |

## Signed final receipt

Existing `HH_PR_TASK_V1` final outcome comment gains `ai_execution` (`HH_PR_AI_EXECUTION_EVIDENCE_V1`): `executor_assignment_status`, `executor_started_at`, `model_request_attempted`, `model_response_confirmed`, `model_response_at`, `actual_provider`, `actual_model`, `patch_received`, `patch_verified`, `source_published_sha`, `model_patch_published_sha`, `stage`, `completion_status`. Separate `code_provider_configured` / `budgeted_provider_configured` show provider eligibility independently from `code_provider` (confirmed actual response only). Absence of evidence is **null / not confirmed**, never zero or success.

Existing `HH_PR_STAGE_V1` receives `code_executor_started` and `model_response_observed` timestamps, scoped to authenticated job, exact run/HEAD/task. `repair_started` remains a deterministic-fix step; do not convert its time into the model-invocation time.

The $0 free provider audit keeps the virtual router's **selected alias** and separately stores the **actual response model**, only after the provider reply passed live free catalog and cost verification. Attempts and responses remain separate. The optional paid job emits metadata only after the existing bounded $0.02-per-call response validation and ledger settlement, then the finalizer checks its PR/HEAD/task/run identity; no raw prompt, response text, credentials, or payment data is logged.

## Failure semantics and acceptance

A claim, hosted runner, configured API key, patch proposal, successful GitHub workflow, and source commit are all **different** states. No operation is complete from `CLAIMED` alone. `PUBLISHED` means only verified source SHA; for a website change, require protected CI, protected merge and served Vercel SHA with functional smoke before `LIVE_VERIFIED`. Failed code runners, missing audit, stale HEAD, unknown model identity, incorrect cost, unsupported source paths, and missing code-verifier evidence must remain incomplete with diagnostic next action. No blind retries or duplicate CI waves.

Focused regression suite: `node --test tests/ci-pr-repair-execution-evidence.test.cjs tests/ci-pr-repair-worker.test.cjs tests/ci-pr-repair-openrouter-free.test.cjs tests/ci-pr-repair-budgeted-coder.test.cjs tests/ci-pr-runner-evidence.test.cjs`. Use a synthetic dry-run receipt and then a real eligible PR only after separately verified current HEAD, lease, provider access and budget. Do not mark any existing failed-PR cohort as repaired from these tests or backfill unknown historical model invocations.
