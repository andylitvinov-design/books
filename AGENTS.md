# Holistic House agent rules

Scope: `andylitvinov-design/books`, Holistic House site and connected
GitHub, Vercel, Supabase and provider integrations. More detailed task-specific
requirements and runtime safety/confirmation rules take precedence. This file
does not grant new permissions. See `docs/integrations/AGENT_SECRET_AUTOMATION.md`.

## Before changing anything

- Verify the live Vercel project, production Git branch, commit SHA and domain
  instead of assuming the GitHub default branch is production.
- The Holistic House Vercel project is `codex-public-book-library`
  (`prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, team
  `team_OSf690d0nxRHWVMXCElA8i95`), serving
  `holistichouse.vercel.app`. GitHub default `codex/bootstrap-books` is
  NOT the production branch; re-check the current deployment source.
- Do not trust a local `.vercel/project.json` without matching the IDs above.
  In particular, `~/projects/books/.vercel` has pointed to a different project.
- Preserve unrelated files and changes; reuse existing modules and integrations.

## Agent-first credential policy (owner wants minimal manual input)

1. Search existing **authorized** app connectors, provider OAuth, environment
   variable **names and targets only**, integration configuration and linked
   services before asking the owner to configure anything.
2. Prefer existing GitHub/Vercel/Supabase/provider connectors or provider-issued
   short-lived, scoped credentials. An authorized connector/account establishes
   access, not consent for every action. Before creating persistent credentials
   or transmitting a secret to a destination, obtain explicit owner confirmation
   for that specific action whenever required by the runtime. Identify provider,
   destination project, secret name, target and scope without exposing its value.
   A general automation request, issue/PR URL, token possession or `--apply` is
   not that confirmation. After approval, use the official provider API or a
   CSPRNG for application-owned HMAC/webhook secrets; coordinate both ends.
3. Only after the action is authorized, create new Vercel secrets using the
   connected project tool with
   `upsert=false`, `type=sensitive` (Secret) and the smallest appropriate
   environment/branch. Never accidentally replace an existing value, use
   Production credentials in Preview, or assign secret values to
   `NEXT_PUBLIC_*`, `VITE_*` or any other client-visible variable.
4. Do not retrieve/decrypt working secret values for convenience. Never expose
   secrets, API tokens, session cookies or personal data in chat, source code,
   issues, logs, screenshots or command-line arguments. Prefer process stdin
   or protected app-to-app calls over plaintext files or shell history.
5. Before a rotation, verify the provider supports overlap/rollback; update
   both ends, redeploy, run authorized real E2E, and only then revoke the old
   value. Avoid unnecessary rotations. Environment-variable write != deployed
   feature != proven external delivery/payment.
6. One-time provider OAuth, MFA/passkey, legal/financial consent, account
   verification, permissions not already granted and enabling paid services
   still require explicit owner action, in addition to any per-action credential
   confirmation above. First complete independent work and
   provide one exact link + minimal click instructions; never ask for a raw
   password/token pasted into ChatGPT.
7. No spending, mass sends, unapproved integrations, permission escalation or
   privacy hold bypass. Medical/test results remain in protected channels; no
   sensitive payloads in Telegram/SMS/push or advertising pixels.
8. Record only secret *names*, environment, provenance class (existing,
   generated or provider-issued), outcome, tests, PR/commit, CI, production
   deployment/SHA and any remaining owner-only blocker in the linked issue.

## Delivery

- Run narrow tests plus relevant lint/typecheck/build/CI, review diffs, and
  merge safe PRs into the verified production branch under the existing safe
  merge gate. Never equate a successful merge with a live verified feature.
- For any credential task, follow the runbook above; the optional local bridge
  is `scripts/agent-secret-bridge.mjs`. In ChatGPT, prefer the already
  connected Vercel app to a new Vercel CLI login or permanent API token.
