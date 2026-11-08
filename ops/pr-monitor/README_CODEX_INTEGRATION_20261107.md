# Agent Commander → Codex: owner-approved GitHub bridge (2026-11-07)

## Scope and honest status

The protected task editor (`/task-editor.html`) and task chats (`/chats.html`) use a **shared explicit Codex handoff card**. The same-origin, owner-authenticated `/api/commander-codex` bridges to existing GitHub primitives. No OpenAI API key, new workflow, cron, paid service, or automatically started session. The UI always distinguishes GitHub acceptance/assignment from *actual Codex execution*, PR, merge, and LIVE.

GitHub supports third-party OpenAI Codex as a coding agent through its **paid GitHub Copilot plans**. Agent sessions consume GitHub Actions minutes and AI credits; any free included quotas and overage ceilings must be verified by the owner before enabling. A ChatGPT subscription alone does not establish eligibility for GitHub's agent. See https://docs.github.com/en/copilot/concepts/agent-capabilities/about-agents/about-third-party-coding-agents.

## Setup: opt-in, no additional vendor

1. In GitHub account Copilot policy enable **Codex coding agent** for `andylitvinov-design/books`. Confirm the exact assignee bot login through the GitHub issue assignee picker/REST API (the code **does not assume** a hardcoded bot name). Verify existing included AI credits/Actions minutes, and disable any overage. If not eligible, leave the integration disabled and use the copy handoff to Codex CLI (ChatGPT login) manually. The private Supabase task queue remains a review queue and does not dispatch an executor.
2. Reuse only the existing protected `HH_PM_GITHUB_WRITE_TOKEN` with minimum GitHub repository `issues:write` and PR comments permissions. This variable is absent in the checked standalone Vercel Production environment; do not create or copy an unrelated token merely to enable the bridge. It must not be exposed to the browser or stored in public source. Do not create a second token/provider to bypass the owner no-spend policy.
3. After verifying both the plan *and hard spend cap* and permissions, deliberately enable:
   - `HH_PM_CODEX_GITHUB_ENABLED=true`
   - `HH_PM_CODEX_BUDGET_VERIFIED=true`
   - `HH_PM_CODEX_ASSIGNEE=<verified-codex-bot-login>` (must be a real assignable `[bot]` login)
   - `HH_PM_CODEX_PR_MENTION=<verified-codex-mention>` (e.g. `@codex` only if your installation handles that mention)
   These are switches/metadata, not secrets. **Never set them without verifying the external eligibility/cost gates.**
4. Visit the protected chat/editor and select **Проверить подключение**. Read/repair existing PRs and lease before dispatch. Approve public technical prompt, budget, and repo policy check on each request. Chat content/private conversations remain private unless the owner explicitly reviews text and publishes that part to the public `books` repository.

## Modes

- **New task:** validates current control branch SHA and bot assignability, performs a best-effort duplicate search by immutable handoff UUID, creates a public GitHub issue once with `agent_assignment` and Codex bot assignment. The server checks the returned assignee. *An issue without confirmed assignee is not execution*. Idempotency against concurrent requests is best-effort only; on uncertain network failure, check GitHub before retrying.
- **Existing PR:** checks that the PR is open, not Draft, points at `codex/bootstrap-books`, has a readable current HEAD, and has no active check run; searches existing comments to avoid duplicate posting; then submits a single, reviewed Codex mention. It is **not** a lease oracle and cannot authorize other writers to override a protected active lease. If the agent cannot be shown to own the PR, do not use this mode.
- **Verify:** read-only GitHub metadata proof for issue/PR. No speculative `working`, `merged` or `live_verified` state. A launch/assignment receipt is not independent evidence that Codex accepted or executed a task.

## Safety and limitations

- `GLOBAL_PR_ONE_PUBLISH_V1` is included in every task. No source edits are allowed during a mandatory CI wave; no uncontrolled retry, force merge, paid fallback, hidden automation, or production deploy.
- Only `andylitvinov-design/books`, current control branch `codex/bootstrap-books`, and known Commander/Video/Holistic House project types are accepted. Other repos require separate explicit allowlist and permissions review.
- Owner identity is validated against the current Supabase session cookie `hh_commander_supabase_auth` through the existing private-store Edge Function. HTTPS same-origin POST, bounded bodies, secret-pattern refusal, per-request public-text consent and no client-side GitHub token are enforced server-side.
- Live Vercel standalone monitor was manually deployed with a **larger complete prior manifest**. A merged source PR does not activate this card in production. After required exact-head CI + protected merge, overlay the changed assets and API on the prior COMPLETE ready deployment; verify old APIs/assets, mobile behavior and a real test submission with zero-spend quota proof. Do not deploy partial sources or claim LIVE prematurely.

## Acceptance tests

`node --test ops/pr-monitor/tests/commander-codex.test.mjs`

Test owner authentication, secret refusal, same-origin and consent guard, readiness, current exact-HEAD PR CI guard, no duplicate writes, real GitHub receipt vs phantom Codex status, source content and mobile routes. The current Supabase-authenticated manual handoff remains usable even while direct Codex credentials are absent. The direct GitHub Codex session and PR-to-LIVE acceptance remain gated by account entitlement, assignable bot identity, a verified zero-overage budget and the existing dedicated GitHub token. A GitHub assignment is not proof of a Codex session.
