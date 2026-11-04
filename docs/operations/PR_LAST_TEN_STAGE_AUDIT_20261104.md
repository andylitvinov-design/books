# HH PR stage completeness — last 10 created PRs, 2026-11-04 (UTC)
**Snapshot scope:** PR #3500–#3509, repository \`andylitvinov-design/books\`. These are the last ten by creation timestamp when this audit started. **Frozen creation cohort** — do not silently substitute subsequent PRs. All ten have since merged. This report distinguishes event timestamps from informational labels and does **not** claim deployment/LIVE acceptance.

## Root causes & repair
1. The old \`HH PR direction watcher\` only enumerates **open** PRs and writes at most 18 classifications per run. Fast merges can occur before selection, so historical \`hh:merge-stage:*\` and direction labels never appear. Its configured ten-minute GitHub schedule was not observed consistently on 2026-11-04: the latest discovered scheduled execution before the cohort was [41879058923](https://github.com/andylitvinov-design/books/actions/runs/41879058923) at 17:37 UTC, while manual \`workflow_dispatch\` runs at 20:20–20:25 UTC did classify several cohort PRs. A configured cron is not a guarantee of delivery.
2. **Remediated missing classification**: PRs #3501, #3504 and #3508 received additive \`hh:direction:platform\`, \`hh:priority:1\`, \`hh:merge-priority:01\`; #3509 additionally received \`hh:merge-stage:inspect\` while it was open. No misleading \`hh:merge-stage:inspect\` was backdated onto already merged #3501/#3504/#3508. All other PRs already had a queue-stage label at first inspection.
3. **Prevent recurrence for open production PRs**: the already-existing trusted \`conflict-event-handoff\` job on \`pull_request_target\` now calls \`ci-pr-direction-event-label.cjs\` for \`opened/reopened/synchronize/ready_for_review\`. It re-reads exact HEAD, adds at most four metadata-only labels once, refuses conflicts and stale/closed/foreign PRs, then continues the existing conflict handoff. **No extra workflow, job, cron, CI dispatch, paid service, or independent queue scanner.** The scheduled Direction Watcher remains the sole owner of *reclassification/removing obsolete labels*; the event adapter only fills absent labels.
4. Control-plane PRs targeting \`codex/bootstrap-books\` are not covered by the production-only event seed. They can still merge before the Direction Watcher runs. Their authoritative timestamps are always native PR/Actions records, not \`hh:merge-stage\` labels. Current \`/api/pr-attribution\` is production-only; do not conflate unsupported control-plane histories with zero delay.
5. \`hh:merge-stage:*\` reflects the last observed queue state, **not** a phase clock and **not** final merge status. The authoritative merge state is \`merged_at\`. For failure/repair timing require a real job failure + signed actual \`HH_PR_STAGE_V1 repair_started\` event; otherwise mark \`UNKNOWN\` / verified \`N/A\`, never zero or the time of a label write.

## Exact UTC PR boundaries and first applicable CI
\`first run\` means first observed applicable \`pull_request\` workflow run on the PR's unique head branch, NOT the start of its job. \`Core waves\` applies to production; \`Watchdog waves\` to control. Waves include cancelled and failed revisions; they are not a count of all jobs or a proven count of retries against the *same* HEAD. Branch inventory was checked against the created/merged window.

| PR | Base | Created UTC | First workflow UTC | First observed wait | Waves | Merged UTC | Total wall clock |
|---|---|---|---|---:|---:|---|---:|
| [#3500](https://github.com/andylitvinov-design/books/pull/3500) | production | 20:08:37 | [20:08:42](https://github.com/andylitvinov-design/books/actions/runs/41903760850) | 5s | 3 Core | 20:29:09 | 20m32s |
| [#3501](https://github.com/andylitvinov-design/books/pull/3501) | control | 20:10:06 | [20:10:09](https://github.com/andylitvinov-design/books/actions/runs/41903994557) | 3s | 4 Watchdog | 20:20:20 | 10m14s |
| [#3502](https://github.com/andylitvinov-design/books/pull/3502) | production | 20:13:11 | [20:13:14](https://github.com/andylitvinov-design/books/actions/runs/41904502080) | 3s | 11 Core | 21:00:08 | **46m57s** |
| [#3503](https://github.com/andylitvinov-design/books/pull/3503) | control | 20:13:53 | [20:13:58](https://github.com/andylitvinov-design/books/actions/runs/41904617779) | 5s | 2 Watchdog | 20:25:01 | 11m08s |
| [#3504](https://github.com/andylitvinov-design/books/pull/3504) | control | 20:14:26 | [20:14:30](https://github.com/andylitvinov-design/books/actions/runs/41904707391) | 4s | 1 Watchdog | 20:17:04 | 2m38s |
| [#3505](https://github.com/andylitvinov-design/books/pull/3505) | control | 20:14:46 | [20:14:50](https://github.com/andylitvinov-design/books/actions/runs/41904762502) | 4s | 2 Watchdog | 20:28:49 | 14m03s |
| [#3506](https://github.com/andylitvinov-design/books/pull/3506) | control | 20:22:14 | [20:22:18](https://github.com/andylitvinov-design/books/actions/runs/41905957687) | 4s | 1 Watchdog | 20:24:08 | 1m54s |
| [#3507](https://github.com/andylitvinov-design/books/pull/3507) | production | 20:24:09 | [20:24:13](https://github.com/andylitvinov-design/books/actions/runs/41906264565) | 4s | 1 Core | 20:25:44 | 1m35s |
| [#3508](https://github.com/andylitvinov-design/books/pull/3508) | production | 20:29:05 | [20:29:10](https://github.com/andylitvinov-design/books/actions/runs/41907040970) | 5s | 2 Core | 20:38:28 | 9m23s |
| [#3509](https://github.com/andylitvinov-design/books/pull/3509) | production | 20:30:31 | [20:30:35](https://github.com/andylitvinov-design/books/actions/runs/41907267416) | 4s | 4 Core | 20:58:03 | 27m32s |

**The highest confirmed created→merge wall time is #3502 at 46m57s**; the first CI wake itself was only 3s. Its 11 distinct Core waves span 20:13:14–20:49:03 (35m49 between first and final wave's enqueue time), but these minutes are **not** automatically attributable to one cause: HEAD edits, cancelled runs, failure and developer work are interleaved. Do not call that number wasted runner time.

## Exact-HEAD required Core PASS → merge (production only)
Use only the successful final Core run whose required jobs completed on the final source HEAD. \`hh-merge-check.completed_at\` is the green boundary, not the time the whole workflow was created.

| PR | Final Core workflow | Core runner start → finish | Specialist start → finish | Final hh-merge-check PASS | GitHub merged | **Green→Merge** |
|---|---|---|---|---|---|---:|
| #3500 | [41906695382](https://github.com/andylitvinov-design/books/actions/runs/41906695382) | 20:27:00–20:27:48 | 20:27:52–20:28:52 | 20:29:01 | 20:29:09 | 8s |
| #3502 | [41910178947](https://github.com/andylitvinov-design/books/actions/runs/41910178947) | 20:50:01–20:54:52 | 20:55:03–20:55:26 | 20:56:14 | 21:00:08 | **3m54s** |
| #3507 | [41906264565](https://github.com/andylitvinov-design/books/actions/runs/41906264565) | 20:24:20–20:25:02 | 20:25:06–20:25:29 | 20:25:36 | 20:25:44 | 8s |
| #3508 | [41907667705](https://github.com/andylitvinov-design/books/actions/runs/41907667705) | 20:35:14–20:35:55 | 20:36:36–20:37:27 | 20:37:46 | 20:38:28 | 42s |
| #3509 | [41909531723](https://github.com/andylitvinov-design/books/actions/runs/41909531723) | 20:48:02–20:53:07 | 20:55:21–20:57:07 | 20:57:43 | 20:58:03 | 20s |

The largest **verified Green→Merge interval** is #3502 (3m54s). The time boundaries are certain; *why* GitHub merged 3m54s later is not proven from these timestamps alone.

## Runner queue and control-plane limitations
- #3503 [initial Watchdog job](https://github.com/andylitvinov-design/books/actions/runs/41904617779): queued 20:13:58, started 20:16:42 (**2m44s wait**).
- #3508 [final Core run](https://github.com/andylitvinov-design/books/actions/runs/41907667705): core job created 20:33:05, runner started 20:35:14 (**2m09s wait**); specialist created 20:35:55, started 20:36:36 (**41s wait**).
- #3509 [final Core run](https://github.com/andylitvinov-design/books/actions/runs/41909531723): core created 20:45:14, started 20:48:02 (**2m48s wait**); specialist created 20:53:07, started 20:55:21 (**2m14s wait**).
- Control #3501, #3503, #3504 and #3506 have successful final Watchdog Contract jobs, but that job's \`completed_at\` must not be called a production \`hh-merge-check\` or assumed to be the last required branch-protection PASS.
- Control #3505 has [Watchdog Contract success on a previous SHA](https://github.com/andylitvinov-design/books/actions/runs/41905093693), and **no verified workflow run linked to final PR source HEAD \`6584b5be450b2717a33780535fd283564c0207a0\`** in the inspected branch workflow inventory. This is a final-head evidence gap, not evidence that no CI ever ran.
- \`Error→Repair\`, actual \`Triage→Claimed\` and \`Merge→LIVE\` require separately authenticated stage receipts and/or actual served-deployment functional smoke. No such complete pairs were independently validated for this 10-PR audit. **UNKNOWN**, not zero.

## Long-term metric contract
For each PR and immutable HEAD store or derive \`created_at\`, \`first_applicable_workflow.created_at\`, \`first_required_job.created_at/started_at/completed_at\`, \`first_causal_failure_at\`, \`repair_started_at\` (only signed actual work receipt), \`last_required_check_completed_at\`, \`merged_at\`, and separately \`production_served_sha\` + \`functional_smoke_at\`. For each measured interval report \`n\`, missing/partial coverage, mean/p50/p95 on the **same cohort**. Label arrival time is for routing-latency diagnostics only and must never be substituted for a CI/repair transition.

This change is metadata-only in an **existing event job**, does not relax required checks or merge protection and does not add financial spend. Historical event gaps remain explicit.

## 2026-11-04 follow-up — why Core waves repeat and the no-extra-cost mitigation

A workflow created by `pull_request.synchronize` is not itself a bug: it is required to test a changed HEAD. The waste comes from **publishing unfinished changes after PR opening**. Existing Core concurrency cancels superseded runs but does not undo the creation or earlier runner work of those runs. The Core workflow also subscribes to `pull_request.edited` for legitimate metadata-only missing-Core recovery; unnecessary description/title rewrites can create a same-HEAD run without a new code revision.

**Exact observed correlation:**
- [#3502](https://github.com/andylitvinov-design/books/pull/3502): GitHub lists **17 commits**, including **10 commits dated after the PR's 20:13:11Z creation**. The same head branch recorded **11 Core workflow runs** (first plus ten subsequent source revisions). These include cancellations and failures. Attribution to each event is based on chronological SHA matching; this does **not** identify the exact billing impact of each cancelled run.
- [#3509](https://github.com/andylitvinov-design/books/pull/3509): GitHub lists **8 commits**, including **2 after the PR's 20:30:31Z creation**. Four Core runs were observed, of which two different run IDs ([41907708520](https://github.com/andylitvinov-design/books/actions/runs/41907708520) and [41909399405](https://github.com/andylitvinov-design/books/actions/runs/41909399405)) used the same source SHA `325485b167abc1fd67790f376144d3875d2d053f`. Their exact webhook action is not proven from the retrieved run inventory; an `edited`, `ready_for_review`, or another PR event is possible. Do not label the cause more narrowly without the actual event payload.

**Chosen improvement:** the [single canonical PR automation regulation](PR_AUTOMATION_CANONICAL_V1.md) now requires **stage before PR**, **publish once after relevant checks**, **freeze HEAD while running required CI**, and a **single verified repair batch** when necessary. An open PR is a CI admission boundary, not a workspace for file-by-file publishing. Using one final branch-ref update can combine many source changes without a sequence of `synchronize` events. On an already open PR, individual `create_file/update_file` calls that each advance HEAD can fan out CI repeatedly: plan and publish one complete change instead. PR comments can convey progress without changing the PR body.

**Prediction, not an observed gain:** In a similar case with ten *avoidable* post-opening intermediate commits, one coherent initial publication could turn eleven initial/rework waves into one; a verified corrective batch would make two. This is not guaranteed: real failed checks, urgent correctness fixes and mandatory final-HEAD verification may still require further waves.

**No additional cost or reduced coverage:** The change modifies control-plane agent instructions only. It does not remove or weaken Core/Specialist/Guard, introduce delays, cron, runners, storage, paid APIs or Vercel deployments. Verify eventual impact using existing :20 run evidence and comparable PR cohorts; do not claim success from a documentation merge alone.
