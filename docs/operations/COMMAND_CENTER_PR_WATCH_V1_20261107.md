# Agent Commander PR Watch v1 — implementation & operational contract
Date: 2026-11-07 (America/Toronto)
Repository: andylitvinov-design/books
Production source: codex/public-book-library
Canonical owner UI: /admin/command-center → Agents
Owner decision: no new paid services, no new GitHub/Vercel workflow, no new cron.
Related merged foundation: PR #3831 (PM), #3847 (execution), #3857 (evidence), #3860 (batch).

## Scope
An owner assigns an existing Command Center task with a linked first-party GitHub PR to the Agent Commander observer. The watcher reads ONLY the GitHub repository's public, immutable PR/HEAD/CI metadata via the existing server proof adapter and persists a safe, per-task snapshot and an append-only status-change ledger in private app_private tables. It does NOT launch a code-writing agent, post a GitHub comment, modify a PR, retry CI, merge or claim functional LIVE.

The dashboard Agents tab displays:
- Assigned PRs + task titles, independent CI/deployment-derived stage, last observed time, next eligible check time, and canonical PR link.
- Assign/Pause/Resume and a task-specific “Check now” button.
- Recent status changes: old vs new state is represented by append-only records (event type + current state); changed HEAD, check conclusion or serving identity also generates a receipt without inventing source commits.
- No new bottom navigation; 5-tab mobile PWA remains unchanged. RU/EN/ES copy.

## Stages (strictly observer-side)
unknown; in_progress; ci_running; needs_fix; ready_for_merge (CI green, not a GitHub mergeability guarantee); closed_without_merge; merged_waiting_live; merged_control (default/control branch, not product LIVE); on_live_unverified (serving SHA is merge/descendant, functional user flow still unverified). The original cc_tasks.state and all PM approvals stay authoritative. A source or merged PR must never unilaterally move a cc_task to completed_verified or completed_live.

## Frequency and bounded budget
Existing /api/internal/command-center-tick is invoked by the currently active existing scheduler (cc_scheduler_slots shows prior executions). On each already-authorized 10-minute tick, at most 2 watched PRs are checked. Each PR has a 15-minute minimum automatic cooldown (a best-effort target, NOT a delivery SLA). Owner may request one targeted manual check, constrained by existing owner endpoint rate limit, DB row lease and 60-second per-task cooldown. At most 3 PR watches active in v1. GitHub public REST reads are capped to PR + check-runs (+ optional compare only after merge), with no changed-files download on periodic watch. Treat rate limits and any HTTP errors as unknown, never success.

## Privacy and security
- Existing ownerMaterialRequest, same-origin POST and consumeRate are mandatory.
- Strict regex for task UUID and GitHub repo PR URL, no untrusted arbitrary fetch paths.
- Private tables FORCE RLS; only hh_app_backend grants, no anonymous/authenticated/public access.
- Double-tap and cron/manual concurrency protected by DB lock/lease/generation. No arbitrary external agent instructions are followed.
- Failed API/DB/check readback is UNKNOWN; retain previous evidence and show error, never false completion.
- Existing protected CI Release Policy and GLOBAL_PR_ONE_PUBLISH_V1 remain in charge of code/PR release. No extra automation, token, workflow, paid provider or new cron.

## Rollout & verification
1. Apply the additive SQL migration in supabase/migrations/20261107191000_hh_command_center_pr_watcher_v1.sql; inspect table grants, FORCE RLS and policies.
2. Run new pure/status/API/static regression tests with existing command-center and release-proof test suite; exact-head Core/Specialist/Guard always required. Validate real owner session, guest denied and iPhone 320/390/430 widths.
3. Assign one owner-linked code task, trigger Check now, inspect cc_pr_watch and cc_pr_watch_events readback, and ensure GitHub PR/HEAD stages match; check last_checked_at and per-task cooldown without synthetic success.
4. Let two existing scheduler slots pass, verify next_check_at, no duplicate claims, no automatic code writes/extra GitHub Actions runs. Test GitHub 403/429 and missing required check as unknown.
5. After protected squash merge, verify Vercel production READY + canonical alias serves merged SHA/descendant and full signed-in task flow; merged status alone is not LIVE acceptance.
6. Rollback: disable active watch rows (enabled=false), deploy rollback if needed, leave history and original tasks intact. No destructive migration needed.

## Limitations
15-minute cadence is minimum per PR and aspirational best-effort; the scheduler currently operates in 10-minute slots and limited observations are spread over slots. Watch up to 3 PRs, not all 28 linked tasks. More than 3 or a strict 15-minute SLA requires explicit cost/API rate-limit analysis and an authorized scheduler; don't silently increase polling. LIVE functional verification is separate.
