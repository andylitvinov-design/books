# AI Council 2.1 — evidence-based task health

This is an owner-only, **read-only operational status view** of existing private task/run records. No new cron, worker, paid model, service, migration, secret, notification or billing setting.

## Contract

- `enabled` only means a task is scheduled, **not** that the provider or delivery works.
- Compute the expected UTC occurrence from one of the four fixed task IDs + exact cron expression; do not execute arbitrary cron definitions or trust task descriptions as code.
- `verified`: a current-due-slot DB receipt with `succeeded`, `no_change` or `partial` (partial remains visibly distinguishable in the last-result text). `quota_paused`: actual free-model limit, not healthy. `missed`: expected UTC slot has no recorded execution five minutes after its due time and the task was already enabled when it was due.
- `awaiting_first_slot`: task was switched on after the last possible due slot. `due_soon`: no receipt but due only recently; avoid premature errors.
- Show the *most recent actual* event per task, independently of the last 40 events belonging predominantly to Video Scout, using `DISTINCT ON(task_id)`.
- The dashboard shows the number of verified hourly slots out of the 24 due slots, not a hardcoded success counter.
- Do not expose client records, provider credentials, external URLs, detailed model requests or bearer tokens. Server-side owner authorization and private RLS are unchanged.
- Dashboard statuses describe database evidence; Telegram accepted by provider is not a read receipt, and a queued Council proposal is not an approved production action.

## Acceptance

- Existing operational controls, owner-only access, RU/EN/ES, candidate pagination and rights gate unaffected.
- Pure UTC schedule/overdue/quota tests must pass; source integration test checks actual owner snapshot and status construction.
- Verify exact-head Core, Specialist and `hh-merge-check`, protected merge, and production Vercel `READY` + alias SHA independently.
- Verify first post-release DB readback of the affected panel, including the real `MODEL_HTTP_429` quota-paused run and successful Scout run; do not claim private authenticated browser E2E without that session.
