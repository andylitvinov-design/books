# PR Monitor — exact-HEAD Repair cycle drilldown (7 November 2026)

Status: implementation staged for `codex/bootstrap-books`, standalone Vercel LIVE requires **a separate complete-bundle deployment and verified alias**.

## User flow
The existing `/api/pr-attribution?pr=NUMBER` and `pr-attribution-ui.js` show a new collapsed, mobile-friendly "Цепочка исправления" section after the existing PR checkpoints. Each confirmed failed Core head can expose: completed failing CI job and step/link; unchanged exact-head owner lease; explicitly declared repair start; exact next GitHub PR `committed` event for the next linked Core HEAD; next Core run creation; first job creation; actual runner start. Each intermediate elapsed time has its own field; missing timestamps render "—", not 0.

**Evidence grades:** a GitHub owner lease does not prove task delivery or agent reading. A repair-start comment does not prove local editing, and edits/heartbeats to lease comments cannot reconstruct historical claim time. The GitHub committed timeline event is not necessarily the remote push instant. Job pre-start delays may include workflow `needs`, concurrency and scheduling; no runner-shortage claim. The first failing job/step is an observed location, **not** a verified log-level root cause. Existing total PR elapsed and exclusive interval attribution do not add these overlapping diagnostics a second time.

## Implementation
- `ops/pr-monitor/pr-repair-cycle-model.cjs`: pure synchronous read-only evaluator; fail-closed PR number, repo, workflow, base, SHA, job and chronology validation.
- `ops/pr-monitor/api/pr-attribution.js`: calls evaluator on the **same** PR, six bounded runs and jobs, comments and optional timeline already fetched for the existing endpoint; no new request.
- `ops/pr-monitor/pr-attribution-ui.js` and CSS: supplemental accessible details/ordered steps with verified links and phone-width wrapping; no popup or timer.
- `ops/pr-monitor/tests/pr-repair-cycle-model.test.cjs`: four fixture tests (sequential intervals, missing/edited/truncated evidence, foreign PR and parallel jobs).
- `tests/pr-attribution-api.test.cjs`: existing endpoint tests verify the non-breaking extra field and preserve existing six-call fixture.

**Cost/capability:** No GitHub schedule, Actions workflow, runner, token, polling loop, paid provider or new Vercel project. This change does not request a standalone monitor deployment by itself. The production website `holistichouse.vercel.app` is a different Vercel project and branch.

## Release safeguards
This repo's `ops/pr-monitor` folder is a **partial** archive. The actual standalone Vercel project `holistic-house-pr-monitor` has a separately deployed source bundle (116 files inspected on deployment `dpl_7vmGjbGtDmQEzQ5RK1Z74U7yokno`). Never replace it with this archive alone. Preserve all currently served pages, `legacy.html`, assets, existing APIs and authentication. Before any LIVE deployment, verify (1) full source manifest integrity against current READY alias, (2) the allowed incremental Vercel cost is bounded to existing included allowance, (3) optional runtime handler requires the new model module and deployment includes it, (4) deployment READY + canonical alias and real `/api/pr-attribution?pr=NUMBER` field readback, (5) actual narrow-screen render at 320/390px. GitHub control-plane merge without these checks is **not LIVE**.

Reproducible read-only test intent: `node --test ops/pr-monitor/tests/pr-repair-cycle-model.test.cjs tests/pr-attribution-api.test.cjs`. The existing client remains unchanged if no failures are found; no new CI run is created for this feature.
