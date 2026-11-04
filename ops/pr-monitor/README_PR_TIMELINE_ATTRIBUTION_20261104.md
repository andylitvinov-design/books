# Holistic House — PR attribution timeline (2026-11-04)

This is a **read-only patch** for the existing independent `holistic-house-pr-monitor` Vercel project and the control repository `andylitvinov-design/books`.

## Status and scope

- The source code and offline contract tests are ready. **This archive is not a LIVE deployment.**
- The source-controlled controller's existing aggregate KPI collector and the Vercel production monitor are separate deploy targets. Do not call the change production until *both* are verified.
- Current Vercel deployment (inspected before preparation): `dpl_7D1hM43TXHtWAVoefvgabE5z9MQh`, `READY` at `holistic-house-pr-monitor.vercel.app`. Its deployment source has many existing assets. **Do not replace the deployment with only the files in this archive.** Apply these as additive files to the complete existing project source.

## Contents and installation

| Patch file | Destination in existing repository/deployment | Description |
| --- | --- | --- |
| `scripts/ci-pr-timeline-audit.cjs` | `scripts/ci-pr-timeline-audit.cjs` on `codex/bootstrap-books` control branch | Shared deterministic, no-network interval calculator and optional created+merged-in-period comparison. |
| `tests/ci-pr-timeline-audit.test.cjs` | `tests/ci-pr-timeline-audit.test.cjs` on control branch | Per-PR and cohort attribution contracts. |
| `tests/pr-attribution-api.test.cjs` | `tests/pr-attribution-api.test.cjs` on control branch | Mocked REST API tests for authentication, synthetic HEAD and source gaps. |
| `monitor/ci-pr-timeline-audit.cjs` | Existing independent Vercel monitor project root `ci-pr-timeline-audit.cjs` | The same pure calculator under the API's relative require path. |
| `monitor/api/pr-attribution.js` | Existing monitor project root `api/pr-attribution.js` | On-demand read-only endpoint `/api/pr-attribution?pr=3390`. |
| `monitor/pr-attribution-ui.js` | Existing monitor project root `pr-attribution-ui.js` | Per-PR timeline and expandable evidence stages. |
| `monitor/pr-attribution-ui.css` | Existing monitor project root `pr-attribution-ui.css` | Mobile-friendly display consistent with monitor style. |

In the EXISTING monitor `index.html`, add the following without removing current CSS, JS or sections:

```html
<link rel="stylesheet" href="/pr-attribution-ui.css" />
<script defer src="/pr-attribution-ui.js"></script>
```

The injected component anchors after `#pr-stage-panel` when present, otherwise after `#pr-drilldown` or `main`. For Vercel, the API's relative CommonJS require must resolve to the module at project root. No new scheduled jobs, webhooks, checks, runners, paid subscriptions or background workers are added.

## Data contract

The response `HH_PR_ATTRIBUTION_V1` partitions each PR's actual wall-clock interval into **disjoint** (non-overlapping) spans:

- `created_to_first_ci`: PR created → first verified Core workflow queued.
- `runner_wait`: first Core run queued → first job actual `started_at`.
- `checks`: measured wall-clock active initial jobs (parallel jobs are merged, not summed).
- `repair_after_failure`: authenticated exact-task `repair_started → source_published`, with prior failed Core job or authenticated Core failure triage.
- `conflict_resolution`: authenticated exact-task `conflict claimed → source committed` **when the collector supplies these events**. A GitHub conflict label alone does **not** measure elapsed repair.
- `repeat_ci`: later run/attempts' confirmed queue and jobs only, not all silence between retries.
- `waiting_merge`: final exact-HEAD completed Core/Specialist/Merge Gate → GitHub `merged_at`.
- `unattributed`: missing event pairs, overlapping contradictory data, waiting after failure before repair, unmeasured delays, incomplete API history.

Invariant: `sum(stage_totals_ms) == elapsed_ms`; duration is assigned to precisely one bucket, and uncertain seconds remain `unattributed`. Each interval has `start_at`, `end_at` UTC, `duration_ms`, `reason`, and `evidence_urls`. The UI formats dates in `America/Toronto` and links to GitHub run, job, PR, comment or conflict-label events. A missing category is displayed as **"Нет подтверждения"**, not as a measured 0.

By default the endpoint accepts PRs only for the actual production merge branch `codex/public-book-library`. It uses no GitHub access token on the client. Server-side credentials `GITHUB_TOKEN`/`GH_TOKEN` are optional and are inherited from the original monitor's secure server environment; never embed credentials in static JS. If the API cannot verify source or GitHub rate reserve, it reports an error or stale cached data, not fabricated metrics.

Each requested PR triggers at most 15 GitHub REST GETs, with 15-minute local cache, max six CI runs, max 100 jobs/run, and max 100 recent PR comments or issue timeline events per request. The `history_partial` flag exposes gaps; use it before treating an early event as the absolute first. Historical run/log retention and rate limits may keep some periods unallocated. This is not a full archival backfill.

For same-day cohorts, `compareCreatedMergedCohorts` includes ONLY PRs created and merged inside the same period; nothing that remained open or crossed a day boundary enters the comparison.

## Tests

From patch root (Node 18 or newer):

```sh
node --test tests/*.test.cjs
node --check monitor/api/pr-attribution.js
node --check monitor/pr-attribution-ui.js
```

Then after applying to **full** existing Vercel source, test the preview deployment's API (success, wrong PR, missing records, quota fallback), inspect the page on iPhone widths and check real PRs with rich and sparse evidence. Only then promote/deploy into production and confirm the canonical monitor alias, deployment ID and native endpoint.

## Operational limitations and important follow-up

1. Controller `scripts/ci-pr-kpi-*` currently aggregates source events separately from the Vercel monitor. For a durable central KPI, join this per-PR source at the controller's existing KPI report point; **do not add redundant CI**. Currently the new per-PR on-demand endpoint is independent of the existing aggregates.
2. Conflict *durations* require safe plumbing of the already-authenticated `HH_PR_TASK_V1` conflict receipts into `analyzePrTimeline` as `kind:'claimed'/'source_committed'`, `lane:'conflict'`, exact `task`+`head`+`newHead`, `verified:true`. Do not infer this duration from labels or conflict appearance.
3. Published hourly KPI report and on-demand PR view can have different evidence coverage; expose this difference rather than comparing unsupported totals.
4. Avoid filling `created → first CI` unless the earliest relevant workflow is known; when the workflow run inventory is truncated, the interval must remain unattributed.
5. User requested NO extra paid usage. The patch is zero-schedule and runs only when a PR number is requested; existing Vercel/Actions standard request usage is still subject to the user's current plan.
