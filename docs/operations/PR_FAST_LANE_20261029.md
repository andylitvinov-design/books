# Holistic House — PR Fast Lane (2026-10-29)

**Canonical release branch:** `codex/public-book-library` (not default `codex/bootstrap-books`). Verify active Vercel source, SHA and alias at release time. This document is the source of truth for Work, Chat and DOT cooperation.

## Observed blockers and correction

- 90 GitHub Actions workflow files; some heavy suites fire for every PR, even when unrelated. All **seven** previously unscoped PR workflows are now **path-scoped conservatively**: App R1, App Browser, Billing Isolated, Interpretation Database, OPORA, IA v2 and Public Services. Their jobs and assertions remain intact on relevant changes. `tests/pr-fast-lane.test.mjs` guards these triggers and the fail-closed core workflow contract.
- Add `.github/workflows/hh-pr-core-release.yml`, which runs on **every** production-targeted PR: explicit one-status `release-ready`, narrow documentation-only shortcut, otherwise changed-file ESLint, whole-project TypeScript and full production build (including prebuild tests).
- Scope job fails closed on unexpected inputs; merge_group and workflow_dispatch always run code checks. No skip for SQL, workflow, auth or application changes.
- This core gate is **necessary but not sufficient**: applicable specialist workflow jobs, security/privacy/auth/RLS/payment checks, unresolved reviews and actual E2E requirements still apply. Never consider a red, queued, canceled, unknown, or mismatched-head specialist result green.
- GitHub Actions concurrency should be by PR number/ref (cancel superseded commits only). Do not rerun unchanged failing jobs, edit tests just to turn status green, or push empty commits to restart queues.

## Critical administrator setup (requires GitHub repository administration)

The connected GitHub MCP exposes PR/file actions but **not** repository settings/branch-rule writes. These steps must be done in GitHub Settings by a repository administrator, **after confirming this new core gate is successful and stable**.

1. Settings → General → Pull Requests: enable **Allow auto-merge** and keep **Allow squash merging**. Do not enable merge without checks.
2. Settings → Rules → Rulesets → New branch ruleset (or Branch protection) → target `codex/public-book-library` **only**. Require pull request, require approvals for risky changes, dismiss stale reviews, require resolved conversations, disallow force-push and deletion; do not add unrestricted bypass.
3. Require the **stable** check `release-ready` from `HH PR core release gate` (confirm exact status/check name from successful live run). For security or code-specific cases, explicitly require corresponding applicable specialist checks or an equivalent protected aggregate gate; never silently ignore failing relevant workflows. Do not require path-filtered optional workflows globally (skips may remain pending).
4. Test ruleset using a safe temporary PR; confirm queue/approval and requested protections work before activating automatic merging for ordinary low-risk PRs.
5. Review GitHub General default branch; do **not** change it to production without checking integrations that depend on bootstrap. Any default-branch alignment is a separate planned migration.

## One-cycle operating contract

All agents operate on **existing** PRs; coordinate with a single owner for each `repo#PR`. If another agent owns it, pick a different PR; avoid simultaneous commits to the same branch. Track in PR comments or a compact shared ledger: `owner`, `run_id`, `head_sha`, `last_action`, `next_action`, `lease_expires`. Leases must be refreshed from GitHub; never rely solely on a stale summary.

1. **Work Repair (08:30–18:30):** choose up to two high-value unowned open PRs; inspect last exact-head failed/queued jobs; implement the smallest verified fix **in the same branch**; run focused local tests; commit once or as needed; hand off to release lane. Spend first 70–80% of cycle on code, not a 300-PR inventory.
2. **Work Merge Delivery (09:00–19:00):** inspect last ready candidate and check exact head/base, non-draft, mergeability, approvals, relevant specialist statuses and privacy/security. Squash-merge only truly green safe PRs; otherwise fix a concrete blocker or select another ready PR. If GitHub Auto-merge is enabled **and** all rules are enforced, enable it for approved low-risk PRs; otherwise do not bypass.
3. **Chat CI triage (24/7 hourly):** no duplicate full-portfolio inventory or second PR repair owner. Select up to three ready/blocked candidates, parse failed job **logs**, classify `CODE_FAIL`, `TEST_STALE`, `CI_INFRA`, `CROSS_SCOPE`, `REVIEW`, `QUEUE`; perform a focused repair only on unowned PRs, otherwise hand off one precise command/log reference.
4. **DOT (coordination/acceptance):** compare GH merged events to Work/Chat run receipts; verify Vercel READY/deployed SHA/domain and post-release smoke tests. DOT must not claim that someone else's merge is its own. DOT may fix distinct unowned PRs but must follow the same gate.
5. **Every report:** `run_id / PR numbers inspected / distinct PRs repaired / own commits / own merges with merge SHA / other merges observed / live verified / blocker class / next owner`. Merges count only on actual GitHub `merged_at`, not comments or declarations. For throughput analysis dedupe by `repo#PR`, attribute actor using audit trail, never infer actor from timestamp alone.

## Performance experiment and rollback

Track median time-to-first-fix, median green-to-merge minutes, scoped CI runs/PR, exact-head failures/PR, distinct merged PRs/hour, and live-verified PRs/day over **7 days**. No success targets should override security or functional acceptance. Watch for missing needed specialist checks, unsafe skipped tests, regressions, false-green merges or increased Vercel deploy failures. Roll back path filters in a new PR and restore broader coverage immediately if affected functionality is no longer exercised.


## Policy-only PR scoping and baseline failures — 29 Oct 2026

The seven heavy specialist suites are required for their **matching product/source/tests/harness paths**, not simply because the owner changed `AGENTS.md` or edited a workflow YAML file. The original fast-lane PR contains only workflows, `AGENTS.md`, operations docs, and the CI policy test. GitHub previously launched all seven full product suites on that CI-only diff, reproducing independent pre-existing failures (App R1 unit 22 names, IA 486, OPORA 5), creating a circular dependency for shipping scoped CI itself. This is not evidence that changed application code was safe.

The relevant validation for **CI-only** edits is the dedicated always-triggered `HH workflow syntax — actionlint` (all YAML syntax/expression validation plus strict changed-file shellcheck) and unconditional `HH PR core release gate` (exact-head `tests/pr-fast-lane.test.mjs`, targeted ESLint, full TypeScript, Next production build, and fail-closed `release-ready`). The narrow regression above checks that removing `AGENTS.md` and each workflow's own YAML from heavy `pull_request.paths` does not remove any other product, middleware, dependency, migration or security-sensitive path. For any change to actual app/API/DB/security/payment/test harness paths, all relevant specialist jobs still trigger and their failures remain blocking. No test commands, steps, service isolation, RLS, browser matrices or privacy assertions were deleted.

Important: **skipped workflow is never considered green**; GitHub branch protection must not require an optional path-filtered job globally, because filtered jobs can remain Pending. Before enabling native auto-merge, a protected unconditional aggregator must enforce successful *applicable* specialist checks, reviews and safety gates, and a read-back must confirm protected production branch. CI-only changes need review of the full YAML diff and green actionlint/core; changed production behavior requires green corresponding specialist suites. If this scoping proves unsafe, restore previous filters and quarantine auto-merge.
