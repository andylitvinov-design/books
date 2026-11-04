# Holistic House · publish one complete PR HEAD, zero redundant CI waves
**Contract:** HH_PR_REMOTE_ONE_PUBLISH_V1 · 2026-11-04. This is the executable workflow for the global [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md) and local [PR_AUTOMATION_CANONICAL_V1](PR_AUTOMATION_CANONICAL_V1.md).

## Why both unopened and open branches matter
A GitHub `push` event and hosting Git integration may launch checks and preview deployments **before any pull request exists**. `create_file` / `update_file` through a GitHub connector usually advances the remote ref once per file, producing an avoidable wave per file. Draft PRs are not necessarily free. The goal is to publish one *complete validated* remote HEAD, not merely one PR. This reduces avoidable runs without weakening required Core, Specialist, Guard, actionlint, domain tests or production LIVE proof.

## Mandatory pre-remote admission
1. Identify exact `owner/repo`, current default base, proposed head, target branch and **whether an open PR already targets the branch**. Read root `AGENTS.md`, global owner contract, local release rules and current task lease before any write. If someone else owns HEAD, do not overwrite their work.
2. Inspect existing GitHub Actions event filters for **push, create, pull_request, edited, synchronize**. Check actual Git integrations and deployment/preview settings and whether any runner/provider usage can incur extra charges. Do not assume a private repository or an existing Vercel Pro plan is free. Unknown cost => `HOLD_COST_UNVERIFIED`. No new external API billing, cron, runner or preview for this optimization.
3. Prepare **all** related code, tests, configuration and documentation in one local worktree or in memory, including focused validation. Do not publish one file to an existing remote ref while other files are unfinished.
4. Publish **one coherent commit/ref update**, then create one thematic PR. Only after the single immutable HEAD is published should the existing required checks begin. Observe CI, do not wake it again just to refresh status.
5. A new HEAD after opening requires a **verified failing current-head check or urgent security/correctness defect** and one validated repair batch. No no-op commit, incidental docs/formatting push, discretionary base update or PR-body rewrite during pending Core. Source-owner lease, mandatory final-HEAD checks, reviews and protected merges remain authoritative.

## Connector-safe atomic Git object sequence (no extra workflow)
**Do not use `create_file`/`update_file` sequentially on the remote source branch.** The following is an algorithm for existing GitHub connector operations, not an instruction to execute a synthetic CI run:
- Read current default-base commit `BASE_SHA` and its `BASE_TREE_SHA`, and check the desired branch/PR is not already owned or active.
- Create `blob` objects for the *complete validated contents* of all changed files. Blobs are immutable objects and do **not** move an advertised branch ref.
- Create **one tree** using `base_tree_sha=BASE_TREE_SHA` and a list of entries `{path,mode:"100644",type:"blob",sha}`. Handle deletions/renames only with separately proven project-specific safety. Never include secrets.
- Create **one commit** with that tree and `parent_sha=BASE_SHA`.
- Re-read the chosen branch's current HEAD. Perform **one non-force `update_ref`** with `sha=NEW_COMMIT` and `expected_sha=BASE_SHA` when the branch was created at that parent. If it has moved, stop and reconcile; do not force-update the branch or regenerate waves.
- Read back the exact HEAD SHA and changed-file list, **then** open one PR to the verified target base. Avoid modifying its title/body afterward: a `pull_request.edited` event may start Core on an unchanged source SHA. Progress belongs in existing issue/comment/Docs ledgers.

GitHub APIs may create a `create` event when a new branch ref is made: **verify** the repository's real `create` hooks and hosting behavior before even creating the branch. When the repo has costly branch-creation hooks, prepare an entire local git commit and publish the new branch once instead of creating an empty remote ref.

## Local git equivalent
Prepare in an isolated worktree, run the narrowest offline tests, commit all related files, then execute **one** initial `git push -u origin TASK_BRANCH` (only after checking triggers/cost). On a future real repair, rerun focused tests, then one deliberate update. Do not use force push to evade lease safety.

## Proof & monitoring — existing sources only
Record in normal task notes (not a new service): `project`, `repo`, `base_sha`, `pr_number`, `first_published_sha`, `local_test_result`, `remote_ref_updates_before_pr`, `post_open_source_updates`, `core_run_ids`, `same_sha_duplicate_runs`, `verified_failure_reason`, `merged_at`. Distinguish source HEAD from GitHub's synthetic PR test merge and exact `run_attempt`. Do not report metadata labels as stage timestamps or missing history as zero.
- **Target:** one initial applicable Core wave, optionally one verified repair wave. Three or more waves trigger diagnosis by the existing :20 optimizer, not a mandatory-check bypass.
- **Acceptance:** one branch-ref update for the prepared batch, one opened PR, required exact-HEAD checks not weakened, no unauthorised extra deployment/expense, no new workflow/cron. Compare actual post-adoption cohorts to a matched baseline; this runbook itself does not prove future speed gains.

**Owners:** the existing project PR-authoring agents and :20/:40 optimizer; this file introduces no new scheduler or runner. Documentation-only control-plane changes are not production LIVE.
