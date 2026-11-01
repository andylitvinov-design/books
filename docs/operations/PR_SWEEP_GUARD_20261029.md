# PR Sweep Guard — technical reference (2026-10-29)

Current release policy: [CI_RELEASE_POLICY.md](CI_RELEASE_POLICY.md). This document describes the guard implementation, not merge authorization.

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

Use agent-specific owner IDs (`work-repair`, `work-merge`, `chat-triage`, `merge-sentinel`, `dot-acceptance`), not an undifferentiated `agent`. **Before altering a branch**, every agent must acquire and re-read an active GitHub comment lease. A competing active lease means pick another PR. The oldest active comment ID wins concurrent claims; non-winning writers must stop. Heartbeat every 6–10 minutes of substantial work; release at handoff. The lease has a maximum duration of 30 minutes, expires automatically, and cannot guarantee atomic exclusion against a client that ignores the protocol. The lease is advisory; clients that ignore it are not excluded.

## Reuse evidence instead of repeating work

The inspect report includes `head_sha`, `base_sha`, `evidence_key`, `evidence_unchanged`, `checks`, and `lease`. `record` stores a 24-hex-character SHA256-derived fingerprint plus blocker signatures in the existing claim comment. If `evidence_unchanged=true` and the last known blocker is still present, do **not** download the same job logs again or rerun failing tests; act on a previously identified fix, a changed SHA, a different check outcome, or move to another unowned PR. The fingerprint changes with the exact PR head, target base, changed paths, observed check and commit statuses, **or GitHub workflow-run status**. GitHub comments are the shared ledger; local, chat or automation memory is advisory only.

## Inspector and historical compatibility

The inspector reads GitHub checks, commit statuses and workflow runs and re-reads PR identity. Its result is CI readiness, not merge authorization; it neither merges nor reruns workflows. The specialist path map is not a complete workflow inventory. Repeated check names require inspection rather than guessing which run supersedes another.

The implementation includes a historical compatibility path for a base without the core workflow: an explicit API 404 yields `NOT_DEPLOYED_MANUAL_REVIEW_ONLY`; other API errors fail closed. An empty evidence set yields `NO_POSITIVE_EXACT_HEAD_CI`. This describes compatibility behavior, not the present production configuration or a policy exception.

Lease parsing accepts the historical comment format with one fenced JSON block after the marker; malformed blocks and arbitrary prose are rejected. Never paste secrets into comments.
