# CI cancellation reasons and runner-minute sampling

Control-plane reporting: scripts/ci-pr-kpi-run.cjs on codex/bootstrap-books.
The existing KPI workflow (hh-pr-full-inventory.yml) runs its read-only
collector. No new scheduled workflow, paid model, or production application
deployment is required.

## Outcome buckets

The bounded Actions sample adds six *mutually exclusive* categories to
windows.{1h,24h,7d}.cancellation_reasons.{current,previous}:

- **EXPECTED_STALE** — a newer run of the same workflow/event/PR was created
  before cancellation, with a different PR HEAD; for push workflows only,
  branch + workflow + event and changed SHA are accepted.
- **CLOSED_UNMERGED** — GitHub PR metadata confirms a PR was closed without
  merge **no later than the cancellation**.
- **BASE_MOVED** — same PR/HEAD/workflow/event, but a newer run created before
  cancellation records a different base SHA. This is observable supersession
  by a changed base, **not proof** of the exact worker error code.
- **DUPLICATE** — a newer run of the same workflow/PR, head SHA, base SHA and
  event was created before the older cancellation.
- **SUSPICIOUS_CANCEL** — cancelled but no supported causal evidence was
  available. It means *triage required*, not wrongdoing or a confirmed bug.
- **REAL_FAILURE** — a completed workflow with a failure, timed_out, or
  startup_failure conclusion. A failure is **not counted as cancelled**;
  only explicit workflow conclusions enter this bucket. The presence of a
  PRODUCTION_BASE_CHANGED guard in an individual failed job's logs cannot be
  inferred from the top-level conclusion and requires manual log inspection.

Priority is: explicit failure (separate) → closed-unmerged with observed
closure time → newer PR HEAD → changed base → same-head duplicate → unresolved.
A moved *current* base alone is deliberately insufficient for BASE_MOVED.

## Runner minutes

For each sampled terminal workflow, retrieve all GitHub jobs for the run.
**Observed runner minutes** sum per-job (completed_at - started_at)/60,
not (workflow.updated_at - workflow.created_at)/60. Queue-only jobs with
null started_at, conclusion=cancelled, and null runner_name count **zero**.
Any unverified, truncated, mismatched, or malformed job inventory has
runner_minutes=null, **never zero**. Completed jobs preceding the cancellation
may be counted because that run's result was abandoned; this is *potentially
discarded execution time*, not GitHub billing units or a claim that no prior
step can be reused.

cancelled_runner_minutes_observed excludes REAL_FAILURE.
failed_runner_minutes_observed contains REAL_FAILURE separately.
runner_minutes_observed is a per-bucket breakdown.

## Coverage, guardrails, and usage

The dedicated collector uses bounded, read-only GitHub Actions queries and one
optional batched GraphQL query for PR closed/merged metadata. It caps selected
workflows, counts reads, stops at rate-limit reserve, and marks
label=SAMPLE_NOT_TOTAL, complete=false **even if** all selected jobs were
verified: the source uses a recent *created-at* slice and may miss older runs
that completed in the window. unverified_job_inventories,
verified_job_inventories, cancelled_before_runner, and truncated disclose
the confidence of the minute sample.

The 1h/24h/7d buckets use **completed-run update time**. A job can start
before the window and have its full elapsed execution attributed to the
window of the run's terminal update; this is consistent with the existing KPI
job-completion convention, not wall-clock utilization.

If there are many cancellations, the bounded sample may cover only the most
recent ones; it must never be extrapolated to totals or costs. Follow
examples[].run_id into GitHub Actions to investigate SUSPICIOUS_CANCEL,
or inspect job logs for explicit base freshness failures. The existing
HH_CONTROL_KPI log marker and JSON summary retain the full report; the
HH_CANCELLATION_MONITOR log marker exposes a short, grep-friendly 1h breakdown.
