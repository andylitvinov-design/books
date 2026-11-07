# Holistic House · PR Monitor Agent Chat v1 — live guardrails

## Shipped scope
- Same-origin Project Management panel beneath existing selection controls. Public tasks/PR graphs stay available without Google login.
- Private agent dialog uses existing `hh_seo_owner` 14-day signed owner cookie and existing `/api/seo-auth` password login. No new password or public token grant.
- `Local PM Advisor` gives deterministic task triage. It is *not* a code-writing agent.
- `OpenRouter Free` sends requests only if a server-side `HH_PM_OPENROUTER_API_KEY` is configured; live model catalog must confirm `:free` and zero for all quoted pricing fields. No paid model or cross-model fallback. Server truncates input/context and returns explicit 429/unknown-price/unauthorized blockers.
- Owner-only Reports panel reads authenticated GitHub public issues #1419 (ChatGPT connector) and #3128 (Github Actions) on demand. Each item carries exact source URL and actor provenance; reports do not prove a source commit or LIVE. No new cron or speculative agent messages.
- Task IDs are copied from actual selected checkboxes (up to 8); no private client records from main Holistic House are fetched. Do not paste secrets or private client data in third-party models.
- Conversation history is held only in the open tab; export it as TXT when desired. No cross-device synchronization or private server persistence is claimed without separately approved storage.
- Existing ChatGPT Work / GitHub issue / manual signed Worker handoff in PM selection stays intact.

## Activation
`HH_PM_OPENROUTER_API_KEY` must be added by the owner as an encrypted **production** Vercel environment variable for the existing `holistic-house-pr-monitor` project. This connection is intentionally disabled without the key. It must never appear in browser JS, repository or chat logs. No paid fallback, no copying main-site credentials without explicit permission. Validate 0-cost model catalog and an actual response before declaring OpenRouter connected.

GitHub source-writing gateway requires separate approved Actions-write credential, existing trusted Watchdog eligibility and exact PR:HEAD lease. This panel does not perform source edits or job dispatch. The owner must distinguish handoff, dispatch accepted, worker start, patch, commit, CI, merge and independently proved LIVE.

## Release validation
1. Keep all files from current full standalone Vercel deployment and override only PM HTML/JS plus add the three chat assets and one serverless read-only/chat API.
2. Test no-auth GET -> 401, existing SEO owner cookie -> status, verify local assistant, reports link provenance and model-key missing -> disabled. Authenticated model test requires a real key (do not fabricate).
3. Preserve 29 API routes, original PR monitor, CSP, `legacy.html`, 63-task snapshot and existing search/proof module.
4. 320/390px responsive, no direct third-party browser key, no private data through a public endpoint, no new Actions/cron/provider spend.
5. Release = control-plane PR + separately verified READY, canonical alias and functional user path. An HTTP 200 alone is not authenticated chat E2E.
