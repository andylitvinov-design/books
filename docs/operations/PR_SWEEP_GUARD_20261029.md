# PR Sweep Guard — exact-head evidence and shared lease (2026-10-29)

This is a **complement** to existing PR #2526 (Fast Lane); it does not modify that owned branch, any release workflow, a production endpoint, or repository settings. It fixes the observed failure mode where `release-ready` is green while other applicable checks are red, and reduces Work/Chat/DOT repeated analysis of an unchanged pull request.

## Commands (Node 22+, GitHub repository access)

```bash
# Read-only inspection: returns 0 only if CI policy passes; exit 3 when blocked.
node scripts/pr-sweep-guard.mjs inspect andylitvinov-design/books 2526

# GITHUB_TOKEN or GH_TOKEN with read PR/check permissions and write issue-comment permission:
node scripts/pr-sweep-guard.mjs claim andylitvinov-design/books 2526 work-repair
node scripts/pr-sweep-guard.mjs record andylitvinov-design/books 2526 work-repair
node scripts/pr-sweep-guard.mjs heartbeat andylitvinov-design/books 2526 work-repair
node scripts/pr-sweep-guard.mjs release andylitvinov-design/books 2526 work-repair

node --test tests/pr-sweep-guard.test.mjs
```

Use agent-specific owner IDs (`work-repair`, `work-merge`, `chat-triage`, `merge-sentinel`, `dot-acceptance`), not an undifferentiated `agent`. **Before altering a branch**, every agent must acquire and re-read an active GitHub comment lease. A competing active lease means pick another PR. The oldest active comment ID wins concurrent claims; non-winning writers must stop. Heartbeat every 6–10 minutes of substantial work; release at handoff. The lease has a maximum duration of 30 minutes, expires automatically, and cannot guarantee atomic exclusion against a client that ignores the protocol. Enforce GitHub's optimistic head-SHA checks on final writes and merges too.

## Reuse evidence instead of repeating work

The inspect report includes `head_sha`, `base_sha`, `evidence_key`, `evidence_unchanged`, `checks`, and `lease`. `record` stores a 24-hex-character SHA256-derived fingerprint plus blocker signatures in the existing claim comment. If `evidence_unchanged=true` and the last known blocker is still present, do **not** download the same job logs again or rerun failing tests; act on a previously identified fix, a changed SHA, a different check outcome, or move to another unowned PR. The fingerprint changes with the exact PR head, target base, changed paths, observed check and commit statuses, **or GitHub workflow-run status**. GitHub comments are the shared ledger; local, chat or automation memory is advisory only.

## Fail closed before any merge

The CI inspector requires the production base, non-draft/open PR, exact-head `release-ready` check, no failed/cancelled/pending check-run or commit-status context, and matching targeted specialist checks for changed application, billing, interpretation, courses/OPORA, authentication/security, public services and browsers. Missing specialists cannot be treated as green just because a path-filtered workflow did not start. Workflow runs are also fetched by the exact SHA: jobs=0 workflow-startup/validation failures and queued workflows block CI readiness, even when no check-run exists. A second PR read rejects HEAD/base changes during inspection. Changed workflow YAML requires actionlint and changes to the guard require its own unit gate. A repeated check name is ambiguous and requires inspection; the tool deliberately does **not** guess which successful rerun supersedes an unrelated failed workflow.

**Important limitation:** The script returns **CI readiness**, not permission or ability to merge. It never merges or reruns workflows. Work Merge Delivery must additionally verify the latest SHA with GitHub, no conflicts, branch rules/reviews, no active foreign lease, security/privacy/RLS/payments, and Vercel release smoke checks. Do not use `release-ready` alone as branch protection until a fail-closed specialist aggregate or equivalent approved required checks is active. PR #2526 is the owner of the central CI fast-lane rollout; this guard should not be conflated with its green result. Keep native GitHub auto-merge off until that enforcement is demonstrated and repo administrator settings are explicitly enabled.

## Roles

- **Work Repair:** claim one actionable unowned PR, inspect existing evidence, patch the demonstrated cause, test locally, then record and hand off. Avoid serial no-op pushes and retries.
- **Work Merge Delivery:** use `inspect` and the GitHub PR/checks/reviews data; merge only after independent full authorization, then release the lease and verify exact deployed SHA.
- **Chat CI Triage:** prefer previously unclaimed PRs with *new* failure signatures or stale incomplete evidence; do not rediagnose unchanged `evidence_key`.
- **Merge Sentinel:** inspect only near-ready unowned PRs and verify the exact-head authorization; never turn a pending/failed specialist into an approval.
- **DOT:** reconcile commits and live deployment receipts, and report own merges separately from other agents' actions.

## Performance and deployment

Track median queue time, runs/PR, retries on unchanged head, distinct PRs fixed/hour, green-to-merge time, safety violations, and verified production releases for at least seven days. The guard itself is low-cost (API calls, no runner by default), but first rollout requires a GitHub token with suitable permissions or existing connector-equivalent operations. The CLI is intended for Codex/terminal-capable agents; chat-only agents can read/write the identical GitHub comment marker via their connected GitHub tool. Never paste secrets into PR comments.

## Safe staging before core release-gate deployment (29 October addendum)

PR #2526 is not yet merged; therefore the current production baseline does not
contain `.github/workflows/hh-pr-core-release.yml`. Previously the read-only
PR guard always required `release-ready`, even for unrelated PRs, making
agent-driven *independent manual review* impossible to mark as CI-ready.

The guard now reads that exact workflow path at the PR's **base commit**.
An explicit GitHub 404 is interpreted as `NOT_DEPLOYED_MANUAL_REVIEW_ONLY`;
all other API errors fail closed. If the PR introduces the core workflow, or
the base already contains it, `release-ready` remains mandatory. Regardless
of phase, no pending, cancelled, failed, missing specialist or zero-job
workflow can be treated as green, and `merge_authorized` always remains
`false`. This phase does **not** enable GitHub native auto-merge and is not
permission to merge without independent PR review, required specialist jobs
or production risk assessment.

Lease parsing also accepts the historical GitHub comment format containing a
single fenced ```json block after the marker; arbitrary prose and malformed
blocks are rejected. This restores mutual exclusion with already posted
Work/Chat/DOT lease comments.

## Minimum positive CI evidence (not complete coverage)

When core is not installed on the exact base, an empty list of failures is not
CI readiness. NO_POSITIVE_EXACT_HEAD_CI blocks a report with no successful
exact-head check, relevant workflow run, or explicitly SHA-bound commit status.
Legacy status objects lacking a SHA do not independently prove exact-head
execution. Installed or PR-introduced core gates still require release-ready.

This fixes the zero-evidence false-ready case only. The specialist path map is
NOT a complete workflow inventory: missing suites can still be overlooked when
an unrelated job succeeds. That separate P1 remains unresolved, including mixed
known/unknown paths. A positive CI-ready result therefore must not be used as a
complete specialist aggregate or merge authorization. Preserve independent
inspection of all applicable exact-head checks/workflow runs and existing
review/branch rules. No CLI override, receipt input or lease behavior changes.
