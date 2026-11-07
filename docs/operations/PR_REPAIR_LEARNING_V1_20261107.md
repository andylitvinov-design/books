# HH PR Repair Learning V1 — implementation and acceptance

**Goal:** implement the first honest case-memory and versioned skills layer without Hermes, new providers, cron, extra runner or a parallel GitHub writer.

**Source:** `scripts/ci-pr-repair-learning.cjs` / `tests/ci-pr-repair-learning.test.cjs` / `docs/agent-skills/`.

## Live data contract

The existing Repair Worker finalizer verifies the new commit's parent is the original PR HEAD and rereads the exact source branch ref. **Only for `state=PUBLISHED`, `source_published=true` and `verified_source_fix=true`** it attaches a `learning_case` to the same already-created `HH_PR_TASK_V1` PR comment. Nothing is stored for PREPARED, MANUAL or stale HEAD as a successful case. The case contains **no raw source, logs or private client data**, just metadata and real GitHub URLs.

The case deliberately reports `ci_proof=NOT_VERIFIED`, `merge_proof=NOT_VERIFIED`, `live_proof=NOT_VERIFIED`, `auto_reuse=false`. The optional read-only parser accepts only the verified GitHub Actions App origin and an outcome marker that matches the actual recorded HEAD and run ID. External PR text is untrusted data.

`verifyCaseCi` accepts only independently authenticated exact-new-HEAD Core/Specialist/`hh-merge-check` success. `suggestVerifiedCases` provides at most three **manual review** suggestions from cases whose verification has been explicitly supplied. No automatic source edits or LLM tool calls are performed; no claim of cross-project retrieval without a caller that provides trusted histories.

`diagnosticDelta` is a cheap, bounded comparison of *already collected* TypeScript/ESLint diagnostics. It is not yet wired into the isolated patch proposer; existing required CI remains unchanged. `curateSkill` identifies stale/regressed recipes but does not update an active skill without owner review.

## Future integration — explicit outstanding steps

1. Feed attested recent PR histories and independently checked exact-head CI to the owner Project Management view using its existing authenticated read boundary; implement an owner-reviewed persistent searchable case/skill index. Avoid a second root/task database or extra polling.
2. Wire the cheap diagnostic delta into the existing isolated Repair Worker verification before publication without changing security/privacy/tests.
3. Implement `candidate → reviewed → active/retired` backend records with immutable versions and owner actions; do not auto-promote recorded cases.
4. Pilot an actually admissible current RED PR with a verified free provider, owner permissions and a real remote source SHA; only after protected merge, served deployment and browser functional smoke mark LIVE.

## Checks

`node --test tests/ci-pr-repair-learning.test.cjs` and `node --check scripts/ci-pr-repair-learning.cjs` should pass locally, plus existing `tests/ci-pr-repair-worker.test.cjs` in the control branch's normal contract CI. No new CI workflow is created. No GitHub source writes until branch merge and mandatory CI; no deployment proof from a code change alone.

**Policy:** root `AGENTS.md` → `GLOBAL_PR_ONE_PUBLISH_V1` → `docs/operations/PR_AUTOMATION_CANONICAL_V1.md`, and production `docs/operations/CI_RELEASE_POLICY.md`.
