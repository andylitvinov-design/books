# P1 — Verified PR time-loss telemetry (4 November 2026)

This release is **operational CI telemetry**, not a public webpage or a new scheduled agent.
It extends the existing trusted production-push runner in
`.github/workflows/hh-ci-stale-run-prune.yml` and the existing PR Sweep
lease tool (with a separate CI-only repair-start receipt helper). Nothing is allowed to bypass branch protections, change required
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
  `HH_PR_LOSS_COHORT_HOURS=24 HH_PR_LOSS_PR_LIMIT=6 HH_PR_LOSS_RUN_LIMIT=12 node scripts/ci-pr-loss-report.mjs`.
  `HH_PR_LOSS_OFFSET_DAYS=14` selects an equal-length historical
  24-hour *created* cohort ending fourteen days before the observation;
  never compare different cohort definitions or present sample metrics as a
  complete population estimate.
- At the first actual source Repair activity after claiming the
  exact-HEAD single-writer lease:
  `node scripts/ci-pr-repair-start.mjs andylitvinov-design/books <PR_NUMBER> <AGENT_OWNER> <FAILED_RUN_ID>`.
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

**Vercel Pro credit guard:** All changes in this PR must remain in the existing
`scripts/vercel-ignore-build.mjs` exact non-runtime whitelist. The source
files for this telemetry are `scripts/ci-*`, `lib/ci/*`, `tests/ci-*`,
`.github/workflows/*` and this `README.PR-LOSS-TELEMETRY.md`.
The real diff must be revalidated against latest production before squash
merge; if a non-whitelisted path appears, this is a cost-risk HOLD.
No extra Vercel site build or preview is required for CI-only telemetry.

Source acceptance: deterministic Node tests
`tests/ci-pr-loss-metrics.test.mjs`, `tests/ci-pr-repair-start.test.mjs`, existing prune/PR Sweep tests, workflow
syntax/actionlint, exact-head protected `hh-merge-check`. After merge,
verify the production branch SHA and that the next real production-push
prune job emits a **non-synthetic** P1 report. Do not call the report LIVE
merely because code was committed or tests passed. Vercel READY/SHA
verification is separate; CI telemetry does not add public application UI.

## Exact-HEAD Repair cycle — individual observed intervals (6 November 2026)

The existing read-only production-push CI report now attaches `HH_PR_REPAIR_CYCLE_V1` to each sampled PR. The GitHub Actions summary includes a separate **Repair cycle** table and minute-by-minute interval table; the machine-readable `HH_PR_LOSS_P1` JSON retains full commit SHAs, exact UTC timestamps, failed job IDs and links.

**Failure → owner claim:** a real completed failing Core job and an *unchanged* GitHub `HH_PR_SWEEP_LEASE_V1` comment created for its exact failed HEAD. The lease establishes an owner claim, not that an agent read or received a task. Heartbeat-edited/released comments cannot provide immutable historical claim timing.

**Claim → Repair declaration:** an existing `HH_PR_REPAIR_STARTED_V1` comment for the same failed run and failed SHA. The timestamp is a declared repair start; real local editing time remains unknown. A missing declaration does not imply the agent was idle or that work was zero.

**Repair declaration → new HEAD commit event:** a bounded, complete GitHub PR `committed` timeline event for the SHA used by the next verified Core run. This is a GitHub PR event timestamp, *not* independent evidence of the exact remote push time. If the event is missing, misordered, or timeline truncated, this interval is unknown.

**New HEAD event → Core workflow creation → first job created → runner started:** independent run `created_at`, job `created_at`, and job `started_at` timestamps show three different waits. GitHub scheduling, `needs` and concurrency may contribute; do not present runner scarcity as proven. The failed job/step is the *failure location* and links to the job log, not a confirmed root cause unless its log is inspected.

The helper stays inside `lib/ci`; the same `scripts/ci-pr-loss-report.mjs` reader and existing `hh-ci-stale-run-prune.yml` runner execute it. No extra schedule, workflow, privileged token, runner, API provider, synthetic CI wake or Vercel runtime deployment. All missing evidence stays null; report `n/a`, not 0, and do not allocate inferred agent idle/work minutes.

## P1 — Why each repeated Core CI wave happened (6 November 2026)

The existing production-push P1 GitHub Actions report now includes **one row per
observed consecutive Core workflow pair** (up to the bounded selected history):
PR, previous/new GitHub workflow run links, old/new PR HEAD, observed pause,
explanation, initiating GitHub event actor when available and evidence level.
The JSON receipt also contains structured \`core_waves.gaps[].cause\` fields
(\`code\`, \`label\`, \`confidence\`, \`initiator\`, \`initiator_source\`,
\`event\`, \`event_at\`, \`prior_sha\`, \`next_sha\`). A separate section
reports runs with \`run_attempt > 1\` and the latest verified
\`triggering_actor\`; prior attempt job histories are **not** invented.

- **confirmed_technical:** the linked Core runs demonstrably used different
  commit SHAs. GitHub \`run.actor\` identifies the *workflow initiator*,
  not independently the commit author or the person responsible for a delay.
- **correlated:** precisely one nearby timeline event (\`edited\`,
  \`ready_for_review\`, \`convert_to_draft\` or \`reopened\`) may explain a
  same-HEAD run. The Core workflow \`pull_request\` run API omits the original
  action: proximity alone is never proof of causation.
- **unknown:** no supporting event, multiple events, mismatched actors,
  overlapping/unverified run clocks, partial timeline or unavailable job
  history. Unknown is not zero time and not evidence of fault.

The report remains advisory, read-only, bounded and uses the **same existing
production-push workflow/runner**. No new cron, paid API, scheduled poller,
database, Vercel preview build, CI bypass or workflow rerun is introduced.


## Per-wave cause visibility (6 November 2026)

The existing P1 GitHub Actions job summary now contains **Each subsequent Core wave**:
PR, previous/new run IDs, same/new HEAD, observed gap minutes, triggering
event category, observed actor, evidence confidence, explanation and a GitHub
run/commit link. The structured `HH_PR_LOSS_P1` JSON carries the same fields
in `rows[].core_waves.gaps[]`.

**Attribution guard:** a commit author is not necessarily the person who
requested or caused the CI delay. A workflow triggering actor is not proof of
why the workflow was requested. GitHub's bounded workflow-runs API does not
prove the exact `pull_request` webhook action for same-HEAD repeats. The
report therefore states the observed trigger category and leaves underlying
root cause unconfirmed. Incomplete timeline or overlapping gaps remain
unknown, not zero. No new polling, workflow, runner, Vercel deployment or
paid provider is introduced.
