# 17 November 2026 · GitHub legacy queue / zero-job incident

## Observed directly from GitHub REST

- A fully paginated queued inventory showed **143** workflow-run records.
- **101/143** were older than 24 hours, mostly from the 11 November GitHub Actions incident.
- On two independent 11 November records (run **43096206661** Core and **43096206450** IA) GitHub returned `status=queued`, unchanged created/updated timestamps and **zero jobs**.
- The same branch's PR #4364 had already merged on 12 November. A stale historical workflow must not be reclassified as a fresh CI failure or merged-source proof.
- Samples include control-plane `issue_comment` records from a subscription already removed in the trusted Watchdog.
- Backend-persisted zero-job runs may be un-cancellable (REST 409); never retry them indefinitely or create another CI wave to "clear" them.

Supporting GitHub URLs:
- https://github.com/andylitvinov-design/books/actions/runs/43096206661
- https://github.com/andylitvinov-design/books/actions/runs/43096206450
- https://github.com/andylitvinov-design/books/pull/4364

## Implemented evidence policy

The existing **read-only** `/api/ci-verified-load` census fetches at most **one additional oldest queued page** only when `100 < total_count <= 500`. The exact count/page combination, status, identity, uniqueness and ordering must agree. A changing/incomplete API response is **UNVERIFIED**.

The existing sampling budget is unchanged; one extra GitHub GET is used instead of starting a runner, Workflow, schedule, background service or Vercel preview. The oldest samples are separately checked against the real GitHub `/jobs` endpoint. Zero jobs means **not a running CI job**. It does *not* authorize skipping any current-HEAD Core, Specialist, protected merge, or independent LIVE SHA proof.

Production PR #4896 was deliberately **closed without merge** because broad removal of postmerge specialist browser coverage was unsafe. Do not reopen that blanket retirement.

## What remains outside repository authority

If GitHub's `cancel`, `force-cancel`, and `delete` endpoints refuse these orphaned records, only GitHub's service team can purge them. Open a GitHub Actions support ticket with the run URLs and exact API responses. This issue is distinct from genuinely queued recent Core jobs or real source failures.

## Release acceptance

1. Existing contract CI proves both latest and oldest pages, job-level evidence, and incomplete-page fail-closed behavior.
2. Merge to trusted default branch under genuine CI; no branch-protection bypass.
3. Independently verify monitor deployment before calling it LIVE. No new paid deployments.
4. Reduce obsolete **launches**, not security checks; measure 10× on comparable cohorts before claiming it.
