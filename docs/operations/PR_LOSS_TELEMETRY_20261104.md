# P1 — Verified PR time-loss telemetry (4 November 2026)

This release is **operational CI telemetry**, not a public webpage or a new scheduled agent.
It extends the existing trusted production-push runner in
`.github/workflows/hh-ci-stale-run-prune.yml` and the existing PR Sweep
lease tool. Nothing is allowed to bypass branch protections, change required
checks, cancel a current HEAD, modify PR source or dispatch paid services.

## What is measured

**Cohort:** PRs **created** in the same UTC window and targeting
`codex/public-book-library`. The built-in production-push sample covers a
24-hour created-at window, up to six newest matching PRs and twelve verified
workflow runs per selected PR. Reporting includes `sampled_prs`, matching
search candidates, explicit `partial` and read errors. **Sampled TOP-3 is not
a claim about the whole repository.** Older comparisons use the same cohort
length and sampling limits, not all open PRs vs all merged PRs.

**Evidence and metric contract:**

| Stage | Start | End | Conditions |
| --- | --- | --- | --- |
| Repeated CI on one HEAD | start of actually started jobs on the second/later workflow run | actual completed jobs | Same linked PR, same SHA and workflow ID/path; previous workflow run finished before new run started. `run_attempt>1` without first-attempt job data increases count but NOT minutes. |
| Job start wait | GitHub Actions `job.created_at` | `job.started_at` | Both real timestamps available. Could include scheduling, workflow `needs` and concurrency; do **not** call it proven lack of GitHub runners. |
| Dependency timeout | actual `hh-specialist.started_at` | `completed_at` | Explicit timed-out specialist dependency step plus timed-out job. Ordinary failure or an in-progress wait is **not** a confirmed dependency timeout. |
| Error → Repair | completed real failed job in the exact failed PR run | immutable `HH_PR_REPAIR_STARTED_V1` GitHub comment `created_at` | Only when a verified matching failed run and a same-HEAD declaration are both available. The marker records the agent's declared start, not proof of the next code edit; missing markers stay N/A. |
| Green → Merge | latest successful real `hh-merge-check` job on the merged PR HEAD | `PR.merged_at` | Only after the full verified protected gate. Do not substitute success of an individual Core test, an old HEAD, or a zero-job workflow. |

**Unit separation:** `PR-min` counts *observed non-overlapping clock
intervals* per PR, not sum of concurrent workflow or billable runner minutes.
When intervals overlap, the deterministic priority is Green → Merge,
Error → Repair, confirmed dependency timeout, repeated CI wave,
then job start wait. An interval belongs to **one** stage only.
`unattributed_minutes` remains visible; absence of evidence is not zero
delay. The TOP-3 ranks confirmed measured exposure in the bounded cohort,
**not hypothetical causal savings**.

**Coverage:** Stage mean, p50 and p95 are calculated on the PRs that actually
have measured intervals; the measured PR count accompanies each statistic.
Results do not invent source edit start, unobserved historical attempts,
unavailable check runs, missing/queued job completions, end-to-end tests,
Vercel deployment timestamps, or exact GitHub billing.

## How to use

- Automatic after a production merge: open the GitHub Actions
  **HH CI prune superseded queued runs** *production push* workflow and expand
  **P1 PR-minute loss report — verified time stamps and TOP-3 sample**. Its
  job summary and `HH_PR_LOSS_P1` JSON line include evidence run/job IDs.
  The P1 reporting step is **advisory**, with a three-minute timeout; a
  diagnostic failure does not turn correctly passing CI cleanup RED.
- Offline/manual read-only command on a trusted checkout with a
  GitHub Actions-read token:
  `HH_PR_LOSS_COHORT_HOURS=24 HH_PR_LOSS_PR_LIMIT=6 HH_PR_LOSS_RUN_LIMIT=12 node scripts/pr-loss-report.mjs`.
  `HH_PR_LOSS_OFFSET_DAYS=14` selects an equal-length historical
  24-hour *created* cohort ending fourteen days before the observation;
  never compare different cohort definitions or present sample metrics as a
  complete population estimate.
- At the first actual source Repair activity after claiming the
  exact-HEAD single-writer lease:
  `node scripts/pr-sweep-guard.mjs repair-start andylitvinov-design/books <PR_NUMBER> <AGENT_OWNER> <FAILED_RUN_ID>`.
  It refuses a noncurrent HEAD, unrelated PR, no failed real job, or missing
  owner lease; it creates at most one immutable marker per failed run+SHA,
  using GitHub's server `created_at`. It does **not** claim the source was
  fixed or that the next commit has passed CI. Readonly observers never
  create repair markers.
- A no-data result must be reported as **insufficient evidence**; never
  rank estimated waiting as a confirmed measured top offender.

## Operational limits and release acceptance

No additional scheduled job, no new runner type, no external API provider,
no database migration, no Vercel cron, no billing upgrade. The report uses
the already-running trusted push job and read-only GitHub REST queries,
bounded at 6 PRs and 12 runs per PR by default. All new scripts run with the
standard GitHub token, and no secret values are logged.

Source acceptance: deterministic Node tests
`tests/pr-loss-metrics.test.mjs`, existing prune/PR Sweep tests, workflow
syntax/actionlint, exact-head protected `hh-merge-check`. After merge,
verify the production branch SHA and that the next real production-push
prune job emits a **non-synthetic** P1 report. Do not call the report LIVE
merely because code was committed or tests passed. Vercel READY/SHA
verification is separate; CI telemetry does not add public application UI.
