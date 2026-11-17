# PR CI: reduce redundant production checks (2026-11-17)

## Objective

Remove obsolete repeated GitHub Actions without reducing real PR, security, browser or independently verified LIVE coverage. This is a measurable first phase toward the requested 10× cut, **not** proof that total checks are already 10× lower.

## Measured baseline

Among 100 recent GitHub `push` runs (snapshot on 2026-11-17):
- **12** were Reports Development Programme; the exact report assertions are independently run on matching production PRs. Their nonproduction feature-branch smoke remains.
- **1** was the Benchmark programme; its full test job already runs on matching production PRs.
- Assessment quality also had duplicate `pull_request`/`push` execution but did not appear in this snapshot.

These **13/100 observed pushes** are the confirmed removable duplicate cohort; do not extrapolate to all branches or all PRs.

## Changes

1. Report QA: `push` now only targets the legacy feature branch `codex/reports-development-program-20261017`; all source PR checks and manual workflow remain.
2. Benchmark and Assessment: remove production `push` duplicates; PR checks and `workflow_dispatch` remain.
3. Scope public performance and Assessment PR owners to the canonical `codex/public-book-library` target branch.
4. Preserve the **unique** postmerge browser/visual acceptance of Site Video, Home locale switch, Home Conversation and Practice visual. Their PR checks deliberately skip portions of the browser matrix, so deleting their `push` trigger would silently remove quality evidence.
5. Preserve private audio, progress, Messenger, Core `hh-merge-check`, tested-BASE specialist aggregator, protected merge and independent LIVE SHA verification.

## Verification

- Core `pr-fast-lane` tests explicitly assert Reports nonproduction-only push and full report contract on PR.
- Selective-workflow regressions prove specialist PR ownership, retained unique postmerge browser suites, manual recovery and Core release gate.
- Guard and actionlint confirm changed YAML on exact HEAD.
- No new schedules, paid Vercel previews, tokens, deployment POST or branch bypass.

## Acceptance

After the protected merge and next normal production push, verify the retired report/benchmark/assessment duplicate cohort does not rerun. Re-measure latest 100 `push`/PR workflows and queue-to-merge timings. Never claim 10× overall unless observed on comparable cohorts.
