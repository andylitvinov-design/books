# Agents Commander PR-number Completion · Implementation and acceptance

First-party owner entry: **https://holistichouse.vercel.app/commander/pr**. The same PR-number intent is supported by the existing \`/chats.html\` owner chat source (requires its independent standalone monitor deployment to be updated; GitHub control-branch merges do not update that manually packaged legacy site).

## Security and data flow

1. Owner signs in via existing Holistic House Google/Supabase session. Same-origin API uses \`createRequestAuth().verified()\`, forwards only the owner's access JWT to the existing Supabase project; no GitHub credential is ever available to the browser.
2. \`agent-commander-pr-completion-v1\` checks owner_access(can_write), resolves GitHub PR in the canonical repository on \`codex/public-book-library\`, inserts one active request with exact HEAD. Re-submission to the same live PR reuses it.
3. Existing default-branch \`HH PR 10-minute watchdog\`, not a new cron/runner, requests an OIDC token with audience \`hh-commander-pr\`. The Edge Function verifies issuer, audience, JWKS signature, exact workflow_ref and branch, event type and repository. It grants one leased work item.
4. Trusted Watchdog reads GitHub PR. On first eligible signed **current-HEAD Core source failure**, the existing source Repair Worker path is invoked through owner-only token and signed one-writer reservations. No alternate cost-bearing model, no unsafe retries or source write bypass.
5. Independent GitHub merge is checked by Watchdog and *again by Supabase Edge* before \`MERGED\`; OIDC-supported terminal receipt is appended to the owner chat with \`sourceVerified\`. No false inference of OpenRouter inference or source patch from runner assignment.
6. \`MERGED\` is **NOT** \`LIVE\`. Exact Vercel production alias + deployed SHA ancestor + PR-specific functional smoke remain separate acceptance steps. Existing ChatGPT hourly LIVE Acceptance automation can notify owners without a new task.

## Known blockers / what to test

- If a PR has \`hh:repair-manual\`, dirty conflicts, unsigned old-HEAD errors or required gates red, it remains \`BLOCKED\` / \`WATCHING\` with reason. The gateway does **not** promise autonomous semantic fixes outside allowlisted source scope.
- Test actual owner submission in Google-signed-in browser, durable Supabase queue, signed Watchdog claim + finish, deduped alert in chat. Test safely with already merged PR first, then a reproducibly broken current-HEAD, allowlisted source PR to prove model call → patch → commit → exact-HEAD Core success → merge. Record run IDs, timestamps and SHA. No fake fixture status qualifies.
- The older \`holistic-house-pr-monitor.vercel.app\` is manually deployed and requires a complete archive-preserving release for the chat UI; never deploy a partial file set. The first-party \`/commander/pr\` route avoids that dependency.
- All external dispatches are at most once per owner request and never produce additional CI on an unchanged HEAD.
- No new paid service, no Vercel force deploy, no model API fallback, no personal client content in GitHub comments.

## Production checklist

- Confirm \`business_brain.commander_pr_completions\` exists, RLS is enabled, anon/authenticated cannot access the table.
- Confirm new Supabase Edge Function is ACTIVE with \`verify_jwt=false\` (it performs its own Supabase JWT and GitHub OIDC checks).
- Confirm merged protected control-branch Watchdog and successful exact-head \`watchdog-contract\`.
- Confirm production Next page and API route are serving from correct Vercel SHA with an authenticated browser.
- Confirm signed GH merge notice. Until production URL, authenticated intake and real broken-PR patch proof, report **PARTIAL**, not blanket fully autonomous LIVE.
