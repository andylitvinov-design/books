# Holistic House — timestamp completeness for EVERY open PR (2026-11-04)

## Verified one-time REST inventory (read-only)

Repository: `andylitvinov-design/books`. The complete paginated GitHub `pulls?state=open` inventory contained **162** unique PRs, with 162/162 valid `created_at`, `updated_at`, and exact 40-character HEAD SHA. Of these, **152** target `codex/public-book-library`, **10** target other branches, **57** are Draft, and **105** are non-Draft at observation time.

These are **GitHub metadata coverage counts**, **NOT** evidence that all PRs have a complete CI/Triage/Repair/Gate history.

## Sources and types of timestamps

| Phase | Exact source (where applicable) | Status when absent |
| --- | --- | --- |
| PR created | GitHub pull request `created_at` | `MISSING` (must never be 0) |
| Last activity | GitHub PR `updated_at`; NOT a stage transition | `MISSING` |
| Current source revision | PR `head.sha` + first time seen in existing Watchdog inventory | `NOT_OBSERVED` |
| Ready | Native `ready_for_review` timeline or authenticated `HH_PR_STAGE_V1 ready` | Draft: `NOT_APPLICABLE_YET`; old non-Draft without receipt: `UNVERIFIED_HISTORIC_READY` |
| Triage | Native labeled event or authenticated `triage` receipt | Not routed: `NOT_APPLICABLE`; otherwise `UNVERIFIED` |
| Worker claim | Authenticated task `CLAIMED`, verified runner receipt | No worker: `NOT_APPLICABLE`; accepted dispatch is **not** started |
| Repair started | Authenticated `repair_started` receipt | No repair: `NOT_APPLICABLE` |
| Source published | Verified exact HEAD-to-new-SHA receipt and GitHub ref | No source change: `NOT_APPLICABLE` |
| CI queued | Actual Core workflow-run `created_at` on exact PR HEAD | CI not started: `PENDING`; truncated archive: `UNVERIFIED` |
| Runner started | Actual job `started_at` | Not started: `PENDING`; missing job inventory: `UNVERIFIED` |
| CI complete | Actual job `completed_at` with conclusion | Running: `PENDING`; incomplete history: `UNVERIFIED` |
| Merge Gate | Actual `hh-merge-check` completion + required-check confirmation | Pending: `PENDING` |
| GitHub merge | PR `merged_at` | Open PR: `NOT_APPLICABLE_YET` |
| Vercel READY → LIVE | Independently verified deployment and LIVE receipt bound to merge commit | Not verified: `UNVERIFIED`; do not infer from merge |

## Ongoing zero-extra-schedule implementation

- The existing **10-minute Watchdog** already obtains the full `pulls.list` inventory. No duplicate GitHub read, no new scheduled task, token, provider, runner, or CI rerun is added.
- Its existing single-writer publication to issue [#3128](https://github.com/andylitvinov-design/books/issues/3128) now embeds `HH_PR_TIMESTAMP_INVENTORY_V1`: one record per PR, exact `created_at` and `updated_at`, current exact SHA, first observation time of current HEAD, and **first observed** status/labels (Ready, Triage, Worker-claimed, Repair hint, CI-needed hint, Gate hint, Conflict hint, Manual, Hold).
- First-observed times are clearly marked `FIRST_SEEN_IN_EXISTING_WATCHDOG_SCAN_NOT_ACTUAL_TRANSITION_TIME`. A historical state seen for the first time **cannot** be backdated as the time the event happened.
- The first-observed timestamp for a given HEAD is sticky across complete scans. A new HEAD resets the HEAD-scoped observations without changing the original PR creation date.
- A one-PR event never overwrites the last **complete** full-PR inventory. Malformed, duplicate, partial or mismatched inventories are rejected. The issue body is bounded to 58,000 characters.
- Existing Core completion archives, PR task receipts and on-demand attribution endpoints remain authoritative for exact job and repair timestamps. The new coverage panel reads the **same existing** `/api/control-tower-stats` backend. It makes one read on entering view (plus explicit user refresh) and no polling.
- The monitoring UI shows one record for each open PR and links to exact PR history. Non-production PRs link directly to GitHub since the production-only attribution endpoint does not support them.

## Limitations and verification

The source-only census does not prove that old PRs have Ready, Triage, Worker, CI or Merge Gate events. Backfilling exact stages requires authenticated original GitHub event/commit/job records; **never** invent these times or assign zero. Stage categories that have not occurred are `PENDING` or `NOT_APPLICABLE`, not failures.

**Financial guard:** only the existing Watchdog's already-fetched PR list and already-issued monitor snapshot update are reused. Normal GitHub Actions and Vercel plan quotas may still apply to ordinary existing runs or releases; no new recurring workload is introduced.
