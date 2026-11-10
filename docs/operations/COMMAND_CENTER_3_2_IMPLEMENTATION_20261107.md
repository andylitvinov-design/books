# Holistic House Command Center 3.2 — Implementation & Activation Runbook

**Source RFC:** Holistic House Command Center 3.2 / Strategy-to-Execution OS, 2026-11-06.  
**Repo:** `andylitvinov-design/books`; **production:** `codex/public-book-library`; **GitHub default:** `codex/bootstrap-books`.

## Exact scope of this first implementation

Real, source-controlled components:

- `/admin/command-center`: owner-only strategy dashboard, objectives, projects, task board, agent registry, runs, independent evidence, daily brief. RU/EN/ES mobile layout; missing DB is a visible **unknown**, not zero/green.
- `/api/admin/command-center`: owner-protected read and bounded commands. Mutations require same-origin JSON, admin session and rate limits.
- `/api/internal/command-center-tick`: CRON_SECRET/private production-only manual reconciler path; does **not** grant an external agent public access.
- The **existing** `/api/internal/direct-message-push` Vercel cron is the optional wakeup; it already runs every five minutes. The Command Center uses a unique ten-minute UTC slot. No new cron entry, GitHub Actions workflow, provider bill, model API, or second PR controller.
- PostgreSQL `app_private.cc_*`: additive RLS + revoke/allowlist migration, priority ordering, FK ownership, DAG cycle rejection, capped runs, lease/generation, immutable events/evidence, daily reports, scheduler slots and a blocked-policy outbox.
- The first **actual executable worker** is a deterministic, bounded **GitHub PUBLIC metadata reader**. It can read a single explicitly allowlisted `books` PR/Issue and store the reduced readback. It cannot inspect private data, push code, merge PR, change release policy, create costs through model calls, or declare LIVE.
- Agent registry explicitly distinguishes `github-public-reader` (available after activation) vs Codex CLI, Hermes, OpenClaw (NOT CONNECTED) vs ordinary ChatGPT (MANUAL). Unsupported tasks remain `needs_spec` and cannot reach the execution lane.

**Not delivered by this slice:** a connected headless coding model, automated source repairs, deployment verification, GitHub webhook registration, Linear bidirectional sync, Google analytics ingestion, automatic Telegram brief delivery, browser E2E, completed seven-day operations soak, or a LIVE deployment. Those cannot be declared completed by code review or a green CI alone.

## Activation / release order (fail closed)

1. Verify this PR's local tests, Next.js TypeScript, Core, Guard, Specialist and policy checks. Publish once, preserve exact HEAD while CI runs. Review source-level access and run cost impact, especially existing `direct-message-push` behaviour.
2. Review `sql/hh-command-center-v1-20261107.sql` with `hh_app_backend` and RLS/security reviewers. Apply using the authorized Supabase migration flow to **the actual Holistic House project**. Check `anon`/`authenticated` have no access, `FORCE ROW LEVEL SECURITY` on every `cc_*` table, and `cc_settings.enabled=false`.
3. Only after protected merge, successful production deployment and verified SHA, enable `HH_CC_TICK_ENABLED=true` in existing Vercel **production server environment** after checking plan quotas and live billing. No new paid API or workspace. This flag only permits short read-only DB/GitHub work.
4. Owner signs into `/admin/command-center`, creates one objective, one project and one `repo_pr_audit` task using a real public GitHub PR URL; selects **Enable safe tasks**. No write-capable worker is available.
5. Observe two consecutive real 10-minute slots in `cc_scheduler_slots`, `cc_runs` exact IDs, `cc_evidence` external readback and no double claims. Revisit a GitHub metadata change and confirm new task handling manually until signed intake exists.
6. Confirm `completed_verified` means **GitHub metadata was read**. There is intentionally NO `completed_live` transition until independent Vercel SHA and browser E2E evidence are implemented and tested.
7. Run iPhone Safari and desktop UI smoke at widths 320/390/430; validate RU/EN/ES, owner/guest denial, CSRF, rate limit, safe display for no migration, and disabled external adapters. Then run seven-day observation before declaring the scheduler healthy.

### Read-only SQL readback

```sql
select scope,enabled,max_runs_per_day,updated_at from app_private.cc_settings;
select slot_utc,state,last_error from app_private.cc_scheduler_slots order by slot_utc desc limit 12;
select id,kind,title,state,attempt_count from app_private.cc_tasks order by created_at desc limit 20;
select id,task_id,worker_id,state,started_at,finished_at,error_code from app_private.cc_runs order by started_at desc limit 20;
select id,task_id,evidence_kind,verifier,source_url from app_private.cc_evidence order by created_at desc limit 20;
select schemaname,tablename,policyname,roles,cmd from pg_policies
where schemaname='app_private' and tablename like 'cc_%' order by tablename;
select relname,relrowsecurity,relforcerowsecurity from pg_class
where relnamespace='app_private'::regnamespace and relname like 'cc_%';
```

### Incident / emergency stop

- Owner `Pause all`: updates `cc_settings.enabled=false`, prevents new claims. Existing bounded read-only GitHub requests may complete; no code-write runner is present.
- Emergency server kill: set `HH_CC_TICK_ENABLED=false`, redeploy the existing Vercel project. Avoid deleting data or disabling customer push notifications.
- Stale run: lease is marked `unconfirmed` and retried at most once because the worker is read-only. No write-capable runner may copy this retry policy without external effect reconciliation.
- `dead_letter`, invalid source, unavailable GitHub, or budget pause: report cause. Never skip evidence checks or force production/PR status.

## Next engineering packages, ordered

| Package | Engineering work still required | Gate |
|---|---|---|
| CC-A | Complete objective/KR/initiative/milestone CRUD, dependencies UI, project cycle planning, optimistic versioning | DB migration, owner actions, tests |
| CC-B | Signed GitHub intake + event dedupe, exact-HEAD updates, backlog sync, project health from trusted sources | webhook secret, origin/TTL replay tests |
| CC-C | Codex CLI/SDK executor with trusted host, approved credentials, sandbox, budget, process monitor, result schema | actual approved runner + cost proof |
| CC-D | Hermes and OpenClaw adapters with capability broker and negative permission tests | sandbox/identity audit, no unrestricted shell |
| CC-E | Independent PR exact-head CI and Vercel production verifier, mobile E2E, `completed_live` gating | existing PR Control Tower remains single writer |
| CC-F | AI strategy advisor, KR trend analysis, reporting and Telegram brief with dedupe | safe data scope, provider quota, explicit opt-in |
| CC-G | Linear optional sync, workload/velocity/critical-path analytics, weekly planning | no new subscription by default |
| CC-H | 7-day soak, failure injection, 30+ acceptance contracts, owner signoff | genuine production readback |

Do not infer paid-model budget or background ChatGPT API access from a personal subscription. `GLOBAL_PR_ONE_PUBLISH_V1` remains mandatory: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md
