# Holistic House: self-service secrets for authorized agents

Updated: 2026-10-26. Tracking issue:
https://github.com/andylitvinov-design/books/issues/2185

**Goal:** Avoid owner copy/paste of secrets and repeat setup. A permissioned
agent should do the setup whenever the provider and destination are already
connected. Never bypass owner consent for a first login, MFA, a new provider
account, legal or paid obligations.

## Connected path (preferred for ChatGPT / Work / Codex with apps)

1. Verify the Vercel project by ID before any write:
   `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b` in
   `team_OSf690d0nxRHWVMXCElA8i95`.
   Site: `https://holistichouse.vercel.app`. Confirm the active production
   Git branch using deployment metadata; **not** the repository default.
2. Use the **connected Vercel app** to list environment variable **keys,
   type and target** (`decrypt=false`). Check for a current provider-native
   integration/shared secret before adding a duplicate.
3. For a missing value, obtain it through an already-authorized provider
   connector/API, if permitted. For an application-owned signing secret, use
   cryptographically secure randomness and coordinate setup at both the
   sender and receiver. A third-party OAuth client secret or API key cannot be
   guessed or locally generated as a substitute for provider issuance.
4. Call the destination's **create**, not upsert, method: Vercel's
   `create_project_env` with `upsert=false`, `type=sensitive` (Secret),
   target `production` only when required, or branch-scoped Preview using
   different test credentials. Avoid `NEXT_PUBLIC_*` / client-side exposure.
   Inspect the tool response without quoting secret values.
5. For an existing key, **do not overwrite automatically just because it
   exists**. A rotation requires a provider-supported two-sided plan, overlap
   where possible, rollback, new deployment, approved E2E and delayed revoke.
6. Write only non-secret evidence to the issue: variable *name*, target,
   provider state, reason, PR/commit, CI, Vercel deployment SHA, verified test
   result and any owner's single remaining action. An environment write alone
   is not a verified production delivery.

The ChatGPT Vercel connector was verified to read the project's metadata
(81 environment entries) on 2026-10-26 without decrypting values. That
confirms read access and the existence of write actions, **not** a live
provider-to-Vercel secret write or a delivered notification.

## Optional CLI / headless agent bridge

`scripts/agent-secret-bridge.mjs` uses the official Vercel REST API directly
when a **separately authorized** execution context already contains
`VERCEL_TOKEN`. It is **not a request** for the owner to paste/create a token
when the Vercel ChatGPT app already provides access. In this chat, use the app
instead of attempting a new CLI login.

- `plan` is read-only, does not fetch secrets or require a token.
- `create --apply` accepts a new secret via protected stdin or an existing
  private environment variable. It never takes a secret value on the command
  line, never writes one to a file or outputs its contents.
- Only the known project/team IDs are addressable. A conflicting local
  `.vercel/project.json` makes creation fail closed.
- It lists metadata, rejects duplicate names, then uses
  `POST /v10/projects/{project}/env?upsert=false` with
  `type=sensitive` for the specified target. API errors are reported
  without printing response bodies.
- Preview requires a named Git branch; Production requires a linked GitHub
  issue/PR and a provider-issued value (no blind generated replacement).
- There is deliberately **no rotation/delete/production redeploy** command.
  Those need a provider-specific safe plan and real delivery tests.

### Examples (no values in commands)

```bash
node scripts/agent-secret-bridge.mjs plan \
  --key=HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET \
  --target=preview --branch=codex/hh-telegram-secret-test

# The provider/orchestrator has already safely populated TOKEN_FROM_PROVIDER.
node scripts/agent-secret-bridge.mjs create \
  --key=HH_CRM_MSG_TELEGRAM_TOKEN --target=production \
  --source=env --from-env=TOKEN_FROM_PROVIDER \
  --issue=https://github.com/andylitvinov-design/books/issues/2185 --apply

# Equivalent direct pipe from a provider tool; do not echo token in logs.
provider-command-outputting-token | node scripts/agent-secret-bridge.mjs create \
  --key=HH_EXAMPLE_PROVIDER_TOKEN --target=preview \
  --branch=codex/provider-test --source=stdin --apply
```

The CLI examples require a real provider setup and an already authorized
Vercel API token in the execution environment; they are **not** live
configuration instructions for an unissued token. Do not use a production
provider token in Preview.

## Provider-specific decision order

| Provider type | Preferred agent action | Owner-only blocker |
| --- | --- | --- |
| Vercel / GitHub / Supabase | Reuse connected app or scoped OAuth; inspect names and scopes, set server-only secret through connector | First account authorization, privileged permission change |
| Telegram | Reuse currently authorized bot and webhook; generate *app-owned webhook HMAC* only if re-synchronizing Telegram and Vercel safely | BotFather bot creation/recovery when no provider authorization exists |
| Google / YouTube | Reuse verified OAuth and encrypted refresh tokens; do not expose or invent client secrets | Consent screen, first OAuth consent, account verification |
| WhatsApp / Meta | Provider-issued Cloud API token and webhook challenge via approved Meta app | Business verification/Meta authorization; no personal session scraping |
| Resend / Twilio / HeyGen | Provider API creates scoped token only if the provider account is already authorized | Provider account signup, paid plan, owner consent |
| Payments | Do not fabricate a business payment account or enable live charges | Identity/financial account and explicit charge approval |

## Safe release checklist

- [ ] Correct owner / team / project / deployment branch and environment.
- [ ] Provider credentials are legitimately issued, consented and least-scope.
- [ ] Existing values are not overwritten, or approved rotation has a rollback.
- [ ] No plaintext secret in any repo, PR, issue, log, browser env or artifact.
- [ ] Deployment READY on the correct SHA and live domain.
- [ ] Real provider delivery or exchange proven with positive and negative
      cases; privacy and opt-in/STOP gates verified where applicable.
- [ ] Secret name/scope only in non-secret audit log; owner contacted only
      if no authorized agent path remains.

Historical configuration inventory: `docs/integrations/ENV_REGISTRY.md`.
It is a dated snapshot, not proof of today's absent/present values.
