# Holistic House — PR merge priority (10-level index)

This policy extends the existing trusted `hh-pr-direction-watcher.yml`; there is **one label writer**.
The default-branch watcher scans the full open PR inventory every ten minutes (the hourly requirement
is therefore exceeded). It never edits source branches or merges PRs. It handles PRs against
`codex/public-book-library` and `codex/bootstrap-books` with same-repository heads.

## Strategic vs operational priority

Strategic `hh:direction:<id>` and `hh:priority:1..5` are inherited from
`.github/hh-pr-directions.json`. The owner changes a **direction's** level, never
an individual PR rank. A validated `hh:direction-override:<id>` can correct an
incorrect direction without bypassing this policy.

Operational `hh:merge-priority:01..10` derives from the five strategic levels:

| Strategic | Urgent fix/performance/security/incident | Planned feature |
| --- | --- | --- |
| P1 | 01 | 02 |
| P2 | 03 | 04 |
| P3 | 05 | 06 |
| P4 | 07 | 08 |
| P5 | 09 | 10 |

Lower number means earlier service. Oldest eligible work earns a small capped
age bonus; repair/CI queue labels earn smaller bonuses *within the same rank*.
A label claiming a different rank is ignored and reconciled by the watcher.

## Status is not merge approval

Exactly one informational `hh:merge-stage:<stage>` label is maintained:
`inspect` (awaiting actual preflight), `ci`, `repair`, `claimed`,
`conflict`, `manual`, `draft`, or `armed` (native auto-merge was requested).
The watcher recalculates both rank and stage; unchanged labels cost **zero writes**.
Conflicting manual direction overrides are reported and left untouched.

Watchdog, CI Worker, and Repair Worker compute their ranking from the same
trusted module `scripts/ci-pr-priority.cjs` at run time, so even if metadata
labels lag, the decision does not. A fair ten-minute rotating audit lane prevents
lower levels being starved. Existing exact-HEAD leases, real CI, required branch
protection, and GitHub native auto-merge remain independently mandatory.
No rank or stage label constitutes evidence of green CI.

Actions job summary emits `byLevel`, `byMergePriority`, `byStage`, the
backlog of labels awaiting sync, and write/API counts. Workflow dispatch with
`dry_run=true` previews the queue without metadata changes.


## Event-driven backup during GitHub cron outage

GitHub may fail to deliver scheduled events even when the cron workflow is
registered and active (tracked in issue #2965). The existing trusted
`HH PR Control Tower queue dispatcher` therefore checks Direction Watcher
history on actual completed Watchdog/CI/Repair events. It wakes the same
single-writer Direction Watcher via `workflow_dispatch` only when:
- the most recent run is over 11 minutes old (or no history exists);
- no watcher run is queued, in progress or pending;
- a fresh per-status GitHub Actions API read confirms no hidden active run;
- the event is trusted and is not a dry-run.

This is a best-effort **event-driven** fallback, not a guarantee of 10-minute
wall-clock cadence when the repository is idle. The existing hourly Chat
observer provides an independent slow fallback. Real `event=schedule` success
is still required to resolve issue #2965; a successful event wake does not
count as cron recovery. No external provider, PAT, source-branch push,
new PR CI or branch-protection changes are required.


## Partial API failure recovery

The bootstrap label backfill is a bounded chain (up to 12 dispatch runs, at most
18 metadata updates per run). A single malformed or transient GitHub PR
response no longer blocks the **entire** queue while other PR updates succeed.
Every error remains counted and visible in the job summary. The chain stops
if a batch made zero confirmed updates, on API rate exhaustion, or at the
hard dispatch limit; stale per-PR writes are still guarded by fresh PR reads.
