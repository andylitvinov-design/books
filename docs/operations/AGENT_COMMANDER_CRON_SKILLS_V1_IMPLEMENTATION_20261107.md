# Agent Commander Cron Skills — implementation + production release v1
2026-11-07 · Holistic House / andylitvinov-design/books

## Scope shipped in this branch
- **29 versioned skills** in `lib/command-center/cron-skills.mjs`, classified by delivery/operations/product/governance and named in RU/EN/ES.
- **Four deterministic SQL-only skills** actually executable: `task.stall-watchdog`, `agents.health-lease`, `cost.budget-guard`, `report.morning-brief`. No access to user messages or personal data; aggregate counts only.
- **Private owner controls** `/admin/command-center/skills` and `/api/admin/command-center/skills`, linked from existing Agents tab: schedule, enable, pause, resume, request immediate *next-tick* execution, read last 25 real run receipts.
- **Existing 10-minute wakeup only**: one due read-only skill after the current task auditor and PR Watch; no new cron, GitHub workflow, model call, preview fan-out, dispatch daemon or second merge-owner.
- Additive, FORCE-RLS private Supabase migration; no access for `anon` or `authenticated`. Unique owner action UUIDs and atomic job lease; global Pause all and shared daily budget still take precedence.
- Run state `completed_verified` means **database aggregate receipt**, not PR merge, CI PASS or production LIVE.

## Deliberately not claimed as implemented
The 25 skills marked `external` or `event` are catalog **only**. They require a verified execution adapter, trust boundary, bounded quota and proof path. In particular `pr.repair-execute`, `pr.merge-guardian`, `release.live-proof`, `video.render-incident`, `media.video-scout` and the Telegram event skills do not get a new execution right from being in the catalog. The already present PR Control Tower remains the one controller for PR delivery.

This v1 supports five safe schedule presets (10/30/60 minutes; 09:00 America/Toronto daily; Monday 09:00 America/Toronto). Full arbitrary cron expressions, per-project custom execution and adaptive skill acquisition are **not** enabled because unbounded arbitrary expressions/runtimes are not justified by existing provider contracts. User-visible schedules indicate the actual presets, not a fictitious 24/7 guarantee.

## Deploy and verify
1. Review `GLOBAL_PR_ONE_PUBLISH_V1`, `PR_AUTOMATION_CANONICAL_V1`, the effective Vercel `deploymentEnabled`, and current protected GitHub branch/CI. Prepare one atomic PR publish.
2. Run `node --test tests/command-center-cron-skills.test.mjs tests/command-center-core.test.mjs tests/command-center-mobile.test.mjs`, plus actual existing Next/Core/Guard/Specialist CI for exact final HEAD. Do not weaken checks to force a merge.
3. Apply `sql/hh-command-center-cron-skills-v1-20261107.sql` on the real Supabase project `holistichouse` and query `pg_class` and `pg_policies`. Confirm FORCE RLS and no guest grants, and private principal connectivity. An un-applied schema must show a real 503 in the owner UI.
4. Protected merge into production branch `codex/public-book-library`, then verify the actual Vercel production deployment SHA and mobile authenticated UI at `/admin/command-center/skills`. The existing `HH_CC_TICK_ENABLED` and `cc_settings.enabled` gate must both remain on, with no new subscriptions or extra cron.
5. Activate **only after deployment and quota check**, initially one safe `report.morning-brief` job at 09:00 Toronto. Verify `cc_skill_jobs` and `cc_skill_runs` receipts after one actual tick; do not fabricate green or LIVE from code review.
6. Confirm 320/390/430 px iPhone widths, owner/guest denial, RU/EN/ES, Pause all, repeated UUID idempotency, double claim rejection, exhausted-budget stop, nonretry of unconfirmed lease and an attempted external skill being rejected.
7. After 7 days of real production observations, consider activating other SQL-only skills inside daily budget. Expand adapter support in separate reviewed PRs without duplicating the old PR Watchdog.

## Acceptance evidence queries (read-only)
```sql
SELECT scope,enabled,max_runs_per_day FROM app_private.cc_settings;
SELECT skill_id,schedule,enabled,next_due_at,last_state,last_error
FROM app_private.cc_skill_jobs ORDER BY skill_id;
SELECT skill_id,state,error_code,started_at,finished_at,receipt
FROM app_private.cc_skill_runs ORDER BY started_at DESC LIMIT 12;
SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity
FROM pg_class c WHERE c.relnamespace='app_private'::regnamespace
AND c.relname IN('cc_skill_jobs','cc_skill_runs','cc_skill_events');
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='app_private' AND table_name LIKE 'cc_skill_%'
ORDER BY table_name,grantee;
```

## Recovery
- Owner `Pause all` blocks new claims through `cc_settings`; individual Pause disables one job.
- A stale skill-run lease is recorded as `unconfirmed` and **disables its job**. The owner must inspect and resume. An uncertain external write must never be retried automatically.
- Missing migration, quota exhaustion, SQL error and unsupported runtime are shown as blocked/unavailable, not silently completed.
- If the new component misbehaves, turn off the new jobs; do not disable customer direct-message push or protected CI.
- The manifest defines capability only; it never promotes third-party prompt text to code execution authorization.

## Key sources
- [Command Center 3.2](HOLISTIC_HOUSE_COMMAND_CENTER_3_2_RFC.md)
- [Current CC activation runbook](COMMAND_CENTER_3_2_IMPLEMENTATION_20261107.md)
- [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md)
