# AI Council 2.1 · Hourly Video Scout / Automation Control Tower

**Status:** CODE / migration required before enabling, not automatically LIVE by merging a PR.  
**Repository:** `andylitvinov-design/books` · **release:** `codex/public-book-library`.

## Purpose and boundaries

- Scheduled `GET /api/internal/video-scout-hourly` at `17 * * * *` UTC, with the existing `CRON_SECRET` bearer. Only Vercel Production is allowed.
- Owner dashboard: `/admin/automations`, API `GET/POST /api/admin/automations`, backed by existing `requireAdminRequest`, same-origin JSON controls and `consumeRate`.
- Metadata-only Wikimedia Commons file search; ≤2 official API requests and ≤20 research candidates per run. **No MP4 download, commercial-use approval, R2 upload, YouTube publication, or paid model.**
- Isolation: current repo-owned L0 executor is the only enabled adapter. Hermes/OpenClaw are intentionally disabled until a separately authorized and sandboxed runtime exists.
- Candidate count != approved footage != usable Video Studio footage. Legal permission and source video identity must be confirmed independently.

## Database rollout (one-time)

Read and review `sql/ai-council-automations-v2-20261106.sql`; apply using the authorized Holistic House Supabase migration workflow, not via a public endpoint. It creates private `app_private` tables, no `anon`/`authenticated` grants, forced RLS, and grants only to `hh_app_backend`. The migration seeds the Hourly Scout and two future tasks **DISABLED**. Owner must enable Hourly Scout using `/admin/automations` after verifying readback.

Required readback after migration:

```sql
select task_id,enabled,schedule_cron from app_private.ai_automation_tasks_v2 order by task_id;
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema='app_private' and table_name in ('ai_automation_tasks_v2',
'ai_automation_runs_v2','ai_automation_events_v2','video_source_candidates_v2')
order by table_name,grantee;
select tablename,policyname,roles,cmd from pg_policies
where schemaname='app_private' and tablename like 'ai_automation_%_v2';
```

Confirm direct `anon`/`authenticated` SELECT is blocked, forced RLS active, `hh_app_backend` can safely claim/insert using existing `transaction(...,{server:true})`. Do not weaken any established Vault policies.

## Execution and idempotency

1. `latestScoutSlot(now)` computes the most recent `hh:17` UTC occurrence; `UNIQUE(task_id,slot_utc)` prevents duplicates.
2. Backend transaction takes durable `claim_generation=1`, bounded 135s lease and `run_claim` audit. Expired prior leases are marked `LEASE_EXPIRED`, not success.
3. The worker reads the existing public Video Library coverage queue; chooses two search terms from a closed English dictionary, never from arbitrary user/AI text.
4. Wikimedia API JSON is size-limited, schema-checked and reduced to metadata. No redirects; no arbitrary fetch URLs and no following media URLs from the response.
5. A second transaction locks the task, validates current lease/generation, inserts research-only candidates with `ON CONFLICT DO NOTHING`, then settles run state and appends an event **in the same DB transaction**.
6. Existing candidate rows remain immutable; a repeated file ID counts as duplicate, not new material.
7. `succeeded`, `no_change`, `partial`, `failed`, `quota_paused`, `running`, `missing` and `expired` are distinct. If a DB write cannot be verified, report `unconfirmed`; never assume success from HTTP status or agent prose.

The owner's `pause` operation immediately revokes the task's authority for new commits. Manual `run_now` uses the **same hourly slot lock**; if that slot already ran, it safely returns `already_claimed_or_disabled` rather than generating duplicated work. Another refresh/new tab cannot bypass DB uniqueness.

## Cost and safe operation

There are no new services, new GitHub Actions workflows, paid model calls, or always-on agents. The existing Vercel Pro plan hosts the short hourly function, but its existing usage and overage must still be monitored. Wikimedia search terms and API call counts are bounded. Kill switch: `HH_VIDEO_SCOUT_ENABLED=false` stops requests; the private task's `enabled=false` stops claims and new writes. Neither flag bypasses a preexisting claim already in flight, but the database rechecks enabled before settlement.

Existing Council provider keys remain server-side. AI classification, 4+1 planning, Telegram delivery and external harness execution are **not yet activated in this P0 rollout**; do not display their unexecuted tasks as live.

## Operational acceptance

- Unit tests: `node --test tests/video-scout-automations.test.mjs`.
- Exact-head `hh-merge-check` plus applicable Core/Specialist, protected squash merge, Vercel READY and deployed SHA.
- DB RLS/grant checks, real cron readback and a genuine Wikimedia API response after enabling. At least one idempotent repeated invocation, no duplicated candidates and no Vault modifications.
- Count observed/expected UTC slots after activation. Seven-day pilot only complete after 168 actual expected slots; absent candidates may be a valid `no_change`.
- Owner UI smoke tests at 320/390/430 px and RU/EN/ES, including rejected guest and CSRF attempts. Do not claim browser acceptance from unit tests alone.

## Next phases

- **P1:** server-only confirmed-free model classifier, quota ledger, weekly Council proposal with explicit owner approval; never autorate legal permission.
- **P2:** existing owner-reviewed Video Vault ingestion, actual source MP4 proof and R2 readback; no auto-import from source-page metadata.
- **P3:** optional Hermes/OpenClaw capability broker only after real sandbox/host/cost validation and owner authorization.

**Release policy:** [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md) and `docs/operations/CI_RELEASE_POLICY.md`. No redundant check waves, no bypass/force merge, no false production completion claims.
