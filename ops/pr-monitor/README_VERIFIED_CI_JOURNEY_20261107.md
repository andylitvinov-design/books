# Holistic House — verified GitHub CI and PR delivery journey

**Scope:** standalone Vercel PR Monitor (`holistic-house-pr-monitor`), source archive on `andylitvinov-design/books` / `codex/bootstrap-books`; not the public Next.js site. Owner requirement 2026-11-07. No new runner, GitHub workflow/cron, token, service, agent, CI dispatch, or background polling.

## Verified-load model

New read-only on-demand API `/api/ci-verified-load` requests at most five active workflow statuses, at most 8 anonymous / 16 authenticated current-run job pages, one recent Actions list, one scheduled Actions list. A 55-second in-memory cache and 45-second CDN cache bound repeat reads. This uses only existing GitHub Actions REST endpoints and optional existing `GITHUB_TOKEN` or `GH_TOKEN` already available to the monitor; it does not expose the token to the browser. Unknown or partial API evidence is never displayed as zero.

- **CI jobs running**: verified `in_progress` jobs started no more than 90 minutes ago, names classified CI, `completed` excluded always.
- **CI jobs queued**: verified unstarted jobs no more than 90 minutes old, separate from active workflow registrations.
- **Other GitHub work**: verified running jobs from watchdog / auto-merge / dispatcher / repair / non-CI workflows. This is NOT a count of running ChatGPT manual chats or Codex/Work tasks.
- **Stale CI (red)**: active/queued CI workflow older than 45 minutes with no fresh queued/running job, and evidence of finished/aged jobs or unstarted queued workflow. List the specific GitHub run and evidence reason; never conclude GitHub infrastructure itself failed merely from the status mismatch.
- **Coverage**: fully enumerated statuses and all latest job pages => exact count; otherwise prefix `≥` and report checked/total; source errors => unknown `—`.
- **Graph**: six 10-minute bins of *non-skipped workflow registrations* over the preceding 60 minutes; CI vs other GitHub Actions separate. It is intentionally **not** a graph of job count, and cannot observe external ChatGPT/Work sessions. The original PR New/Merge chart is preserved. Partial `per_page=100` window is marked lower bound.
- **Schedule health**: last event=`schedule` times for existing Direction Watcher, CI Worker and Watchdog. Highlight missed 35-minute observation windows, preserve existing event-driven handoff and existing Direction Watcher → Watchdog stale-cron backstop. GitHub cron remains best-effort; do not solve this by adding billable schedules or fanning out new workflows.

## One PR — Commit → CI → Fix → Green → Merge → LIVE

Extend the existing `/api/pr-attribution` detail **without extra GitHub fetches**. `pr-lifecycle-ribbon.js` renders six checkpoints and pairwise durations only when both recorded events are verified and chronological. Intermediate absence or partial history remains unknown, not 0; Fix can be N/A when no verified failure in a complete history. Source change after first CI is not mislabeled as the initial commit. Green from incomplete history is not presented as a current exact-HEAD gate. LIVE needs the existing verified production receipt and functional smoke, not Vercel READY alone. Each stage includes the best available verified event URL and notes about unknown blockers. Existing richer repair-cycle interval and conflict evidence panels stay intact.

## Release guard — absolutely mandatory

The Vercel monitor production is a manual full-source deployment, **not** automatically updated by control-plane GitHub merge. The GitHub `ops/pr-monitor` archive is partial; current Vercel deployment contains 100+ sources, including `/legacy.html`, `/api/ci-queue-detail`, other reports and original CSS/JS. Never deploy the partial archive as a standalone project. To release, copy every deployed file byte-for-byte, replace only the changed paths from this patch, add new files, preserve runtime project/alias/config/secrets and run regression smoke. Check Vercel billing before initiating any deployment; latest FOCUS billing endpoint returns `404 Plan not found` so cost is **UNVERIFIED**. Do not deploy while strict zero-extra-spend guard remains unverified.

**Acceptance before claiming LIVE**: node --check on all new/patched JS, Node regression tests, git current protected HEAD/checks, Vercel full-bundle source digest continuity, `/api/ci-verified-load` HTTP 200 with known GitHub jobs and stale examples, iPhone Safari (320/390/430) no horizontal overflow, PR stages including unknown/partial LIVE, protected control-plane merge and independent production alias readback. No CI skip or force merge.

**Event-driven schedule proof (2026-11-07)**: schedule delivery is irregular. `HH PR direction watcher` at 11:57:22 UTC logged `HH_WATCHDOG_CRON_BACKSTOP decision=EVENT_WATCHDOG_WAKE_ACCEPTED`, `cronAgeMinutes=119`; its event-driven backstop dispatched the existing Watchdog, whose 11:57+ UTC run succeeded. Thus no new cron is required to recover work after this particular gap. This does NOT establish a guaranteed 10-minute watchdog schedule. Monitor explicitly shows schedule age, and service recovery uses existing handoff.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=verified (focused Node tests and syntax); post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
