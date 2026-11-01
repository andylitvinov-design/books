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
