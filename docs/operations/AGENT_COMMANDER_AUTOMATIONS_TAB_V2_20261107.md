# Agent Commander · Automations / Cron Jobs v2
2026-11-07 · Owner request implementation.

## Goal
One recognizable **Автоматизации** tab in standalone Agent Commander, with an actual owner-authenticated editor for existing Cron Skills and new automations: name, full instruction text, schedule, selected skill IDs (max 8), project memory/AI Council context and intended agent role. Do not invent remote execution or expose private job prompts publicly.

## Surfaces
- Public existing app https://holistic-house-pr-monitor.vercel.app/automations.html: sixth bottom-nav destination (added to existing nav via wrapper that loads the prior verified nav file intact). Shows protected connection state before any owner data.
- Existing owner application https://holistichouse.vercel.app/admin/command-center/automations: full edit and creation UI after current owner login.
- Bridge https://holistichouse.vercel.app/admin/command-center/automations/bridge: opt-in, authenticated popup message relay using exact trusted origin, opener identity, random 128-bit nonce, UUID request correlation and same-origin owner API. No cookies, admin tokens or secrets sent to public domain. Fallback direct editor works when popups are blocked or iOS opener is unavailable.
- Existing protected `/api/admin/command-center/skills`: extend GET with current stored instructions, selected brain and skills, seven known Vercel/system cron descriptions marked read-only. Extend POST with `update_job` (optimistic revision lease) and `create_custom_job` (safe draft). Retains owner authorization, same-origin CSRF, rate limits and UUID idempotency.
- Existing stored Cron Skill jobs (4) are updated additively with descriptive instruction text; no reset of enabled state, current schedule, scheduler slots or confirmed run history.

## Security & honesty
- Existing four built-in jobs execute deterministic SQL read-only code **regardless of any textual instruction edits**. The instruction is for human intention/context only.
- New free-text automations are saved as disabled `custom.*` drafts with `blocked_no_runner`. DB CHECK prevents enabling them until a separately authorized, capability-checked background AI runtime actually exists. Merely attaching a SKILL.md or AI Projects Brain memory is not a new execution permission. No invented Codex/ChatGPT autonomous availability.
- `ai-projects-brain` means trusted memory reference assigned for a future approved executor; not automatic outbound context transfer. `agent-council` currently flagged offline.
- Seven existing Vercel cron entries are **read-only** in the UI. They are owned by deployment/source code and cannot be edited as ordinary user-written prompts. ChatGPT Automations cannot be edited via this application without a separate supported API integration.
- No new Vercel/GitHub Cron, AI provider, paid plan, API key, broad public endpoint, bearer token persistence, third-party cookies or direct Supabase write from standalone.
- Message relay only from https://holistic-house-pr-monitor.vercel.app to authenticated Holistic House popup; no iframe cookie dependence. No on-page automatic marketing opt-in or unrequested overlay.
- 320/390/430 px mobile screen and existing dark violet Agent Commander palette; no bottom dock regression or missing chart/library assets.

## Proof requirements
1. Existing source files remain staged locally/Git objects; one atomic remote HEAD publication; protected exact-head CI including tests.
2. Additive SQL migration to actual Holistic House private database, verify FORCE RLS and no client grants.
3. Verify owner GET/POST status after production deploy, smoke with owner session and verify 4 original jobs and one saved custom draft (if no live owner auth, mark not verified).
4. Standalone deployment must include **every current source asset** from latest Vercel manifest including existing serverless API, charts, old monitor and skills library. Only five assets added/overridden: `automations.html`, `commander-automations.css`, `commander-automations.js`, `project-management-nav.js` with old nav renamed to `project-management-nav-legacy.js`. Do not deploy a partial file bundle.
5. After deployment ensure custom prompt remains disabled; verify Vercel aliases and physical mobile nav, guest cannot read job instructions.
6. Current PR Controls retain their existing schedule/ownership and remain the single PR merge/CI path.

## Operator controls
- Existing owner global Pause All remains authoritative for scheduled execution; standalone does not bypass it.
- A stale revision produces conflict; refresh and retry a deliberate edit.
- A new custom task is stored, not executed until headless agent adapter reviewed/connected and costs checked.

Canonical: [GLOBAL_PR_ONE_PUBLISH_V1](https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md).


## 2026-11-08 · Quick 🤖 agent selection per automation

Each owned job gets a mobile-sized agent icon and selection of the five existing persisted roles. Selection saves through new same-origin owner-only `assign_agent` (CAS revision, active-lease guard, request UUID, existing rate limits and RLS). The standalone page reuses its nonce/origin checked owner popup bridge, not guest credentials. Agent assignment cannot change the schedule, instruction, enabled flag, or execution mode.

The verified four SQL jobs may separately request a new run via the **existing** `control_job/queue_now` API, if enabled. `queued` is NOT evidence of actual execution. New custom jobs remain `blocked_no_runner` and cannot be queued. Seven system Vercel cron schedules remain readonly. The role identifier is NOT a live external AI agent; a future connector would require verified execution adaptation and authorization. No migration, new cron, external provider, or additional service.
