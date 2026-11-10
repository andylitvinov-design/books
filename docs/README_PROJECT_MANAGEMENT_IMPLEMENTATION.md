# Holistic House — PR Monitor × Project Management v1

## Architecture and authentic boundaries

- Standalone Vercel monitor remains a public, read-only status dashboard. Add `project-management-nav.js/css` to its complete deployed bundle and source `pr-two-screen-boot.js`. Do not expose private JSON here.
- Project Management lives at `https://holistichouse.vercel.app/admin/project-management` behind the **existing owner-only authentication**, not an unauthenticated API on the PR monitor origin.
- Reuse `app_private.cc_projects`, `cc_tasks`, `cc_milestones`, `cc_task_dependencies`; private additive `cc_pm_*` tables hold Epic, mutually exclusive Plan Options, task mapping, PR links and idempotent audit.
- Three free, **deterministic template** plan options are offered, not a paid LLM, and no AI runner/source-writing capability is claimed. Approved plan creates non-automatable `planned` tasks, never new CI or PR.
- Owner can explicitly link an existing production-branch PR; the backend offers on-demand inspection using the existing `inspectCommandTaskDelivery` (verified current HEAD, exact checks, merge SHA and serving SHA). Code-on-production is **not** `LIVE_VERIFIED` without independent functional acceptance.
- The two surfaces cross Vercel origins. No session cookies, PII, secrets or tokens flow through the public monitor.

## Local validation

`node --test tests/project-management*.test.mjs`

`node --check lib/project-management/plans.mjs lib/project-management/store.mjs app/api/admin/project-management/route.js ops/pr-monitor/project-management-nav.js`

React/Next build and physical iPhone/WebKit must run after integrating into the full repository. No new CI required; keep the existing required Core/Specialist/Guard gates.

## Release sequence

1. Before remote push: read `AGENTS.md`, `GLOBAL_PR_ONE_PUBLISH_V1`, local canonical PR policy; verify same-root PR/lease, complete source, production branch, quota/cost guard. This is one coherent product PR for `codex/public-book-library`; monitor source patch is a separate control-plane PR for `codex/bootstrap-books`.
2. Deploy or apply reviewed **additive** migration `20261107150000_hh_command_center_project_management_v1.sql` via the existing database channel (not a new provider). Verify table/schema RLS, operations idempotency and owner-only API.
3. Required existing exact-HEAD CI and protected merge; independently verify actual served SHA/alias, owner login, create Epic, propose plans, choose one, link PR, inspect current CI, and no false LIVE.
4. Standalone PR Monitor has a separate **manual** Vercel deployment with more than 100 existing source assets. NEVER deploy only the partial `ops/pr-monitor` archive. Reconstruct complete current deployment manifest with source refs; preserve `legacy.html`, all APIs, browser scripts and CSP; add 2 nav files + updated boot asset. Verify fingerprint, 320/390px, private login route and rollback.
5. LIVE is complete only after BOTH the protected owner page and standalone top nav have been independently verified at the actual canonical domains. Documentation/control-plane merge is not the monitor deployment.

## Rollback

For website product: protected revert of route and schema-dependent client; migration is additive and should not be destructively rolled back while records exist.
For standalone monitor: re-promote exact last known READY production deployment `dpl_7vmGjbGtDmQEzQ5RK1Z74U7yokno` if it remains the verified last-known-good deployment at time of release; otherwise discover the current verified predecessor. Do not assume any fixed deployment ID is automatically current.

## Known scope and non-claims

- The proposal engine is a deterministic free template, not headless AI orchestration.
- Existing Command Center coding adapters are not enabled by this feature. A Task/PR link does not start a code-writing agent, CI, merge or deploy.
- A server-side on-demand inspection is not a daily ongoing scanner.
- No LIVE claim without functional acceptance, deployment ancestry and owner E2E.