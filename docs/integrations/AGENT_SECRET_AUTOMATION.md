# Holistic House: self-service secrets for authorized agents

Updated: 2026-10-26. Tracking issue:
https://github.com/andylitvinov-design/books/issues/2185

**Goal:** Avoid owner copy/paste of secrets and repeat setup. A permissioned
agent should prepare setup through connected tools rather than request raw
token copy/paste. Connected-account access is not approval for every action.
Runtime safety and confirmation rules always take precedence over this runbook.
Before creating persistent credentials or transmitting a secret, obtain explicit
owner confirmation for that specific action when required by the runtime:
provider, destination project, secret name, target and scope, never the value.
A general automation request, issue/PR URL, possession of `VERCEL_TOKEN` or
`--apply` is not owner confirmation. Never bypass consent for a first login,
MFA, a new provider account, permissions, legal or paid obligations.

## Connected path (preferred for ChatGPT / Work / Codex with apps)

1. Verify the Vercel project by ID before any write:
   `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b` in
   `team_OSf690d0nxRHWVMXCElA8i95`.
   Site: `https://holistichouse.vercel.app`. Confirm the active production
   Git branch using deployment metadata; **not** the repository default.
2. Use the **connected Vercel app** to list environment variable **keys,
   type and target** (`decrypt=false`). Check for a current provider-native
   integration/shared secret before adding a duplicate.
3. For a missing value, establish the required per-action owner confirmation
   before issuance or transmission, then obtain it through the authorized
   provider connector/API. For an application-owned signing secret, use
   cryptographically secure randomness and coordinate setup at both the
   sender and receiver. A third-party OAuth client secret or API key cannot be
   guessed or locally generated as a substitute for provider issuance.
4. Call the destination's **create**, not upsert, method: Vercel's
   `create_project_env` with `upsert=false`, `type=sensitive` (Secret),
   target `production` only when required, or branch-scoped Preview using
   different test credentials. Avoid `NEXT_PUBLIC_*` / client-side exposure.
   Validate exactly one matching created-record receipt (ID, key, Secret type,
   target and branch), no failed entries, and matching metadata-only readback.
   Never inspect or quote secret value fields. Unknown, malformed or interrupted
   writes are **unverified**, not a reason to retry the POST. Reconcile metadata
   and provider audit evidence before any separately authorized next action.
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

The bridge is a transport helper, not an approval system. Its calling agent or
orchestrator must enforce runtime owner-confirmation rules before invoking a
write. Neither command flags nor a tracking issue prove consent or prove that
an input value was actually issued by a provider.

- `plan` is read-only, does not fetch secrets or require a token.
- `create --apply` accepts a new secret via protected stdin or an existing
  private environment variable. It never takes a secret value on the command
  line, never writes one to a file or outputs its contents.
- Only the known project/team IDs are addressable. A conflicting local
  `.vercel/project.json` makes creation fail closed.
- It lists metadata with `decrypt=false`, rejects duplicate names and hidden or
  incomplete inventories. Completeness requires an explicit
  `hiddenProductionEnvCount: 0`, or a pagination object with matching item count
  and explicit terminal `next: null` / `prev: null`; malformed present markers
  are rejected even if another marker looks complete. It then uses
  `POST /v10/projects/{project}/env?upsert=false` with
  `type=sensitive` for the specified target. Success requires exactly one matching
  receipt, an empty `failed` array and same-ID metadata readback with the requested
  key/type/target/branch. Secret values are not read back. API/network/JSON errors
  are sanitized without printing bodies or original exception text. An unknown
  POST outcome requires reconciliation, never a blind retry or upsert.
- Preview requires a named Git branch; Production requires a linked GitHub
  issue/PR and an externally supplied value (no blind generated replacement).
  Provider provenance and owner approval must be established outside the CLI.
- There is deliberately **no rotation/delete/production redeploy** command.
  Those need a provider-specific safe plan and real delivery tests.

### Examples (no values in commands)

```bash
node scripts/agent-secret-bridge.mjs plan \
  --key=HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET \
  --target=preview --branch=codex/hh-telegram-secret-test

# Required action-specific owner confirmation was obtained by the caller.
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
| Vercel / GitHub / Supabase | Reuse connected app or scoped OAuth; inspect names/scopes; set server-only secrets only after required action-specific approval | First account authorization, privileged permission change; credential confirmation when required |
| Telegram | Reuse currently authorized bot and webhook; generate *app-owned webhook HMAC* only if re-synchronizing Telegram and Vercel safely | BotFather bot creation/recovery when no provider authorization exists |
| Google / YouTube | Reuse verified OAuth and encrypted refresh tokens; do not expose or invent client secrets | Consent screen, first OAuth consent, account verification |
| WhatsApp / Meta | Provider-issued Cloud API token and webhook challenge via approved Meta app | Business verification/Meta authorization; no personal session scraping |
| Resend / Twilio / HeyGen | Provider API creates scoped token only with account access and required action-specific owner confirmation | Provider account signup, paid plan, owner consent |
| Payments | Do not fabricate a business payment account or enable live charges | Identity/financial account and explicit charge approval |

## Safe release checklist

- [ ] Correct owner / team / project / deployment branch and environment.
- [ ] Required owner confirmation covers this specific credential creation and/or
      transmission; connector access, issue links and flags are not approval.
- [ ] Provider credentials are legitimately issued, consented and least-scope.
- [ ] Matching creation receipt and metadata readback; unknown POST outcomes
      reconciled before any retry, without reading decrypted secret values.
- [ ] Existing values are not overwritten, or approved rotation has a rollback.
- [ ] No plaintext secret in any repo, PR, issue, log, browser env or artifact.
- [ ] Deployment READY on the correct SHA and live domain.
- [ ] Real provider delivery or exchange proven with positive and negative
      cases; privacy and opt-in/STOP gates verified where applicable.
- [ ] Secret name/scope only in non-secret audit log; owner contacted for required
      confirmation or an owner-only blocker, never for raw token copy/paste.

REST contracts: [create environment variables](https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables),
[read metadata](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name),
and [official OpenAPI schema](https://vercel.com/openapi.json). A validated
receipt/readback proves configuration metadata, not deployment or provider E2E.

Historical configuration inventory: `docs/integrations/ENV_REGISTRY.md`.
It is a dated snapshot, not proof of today's absent/present values.
