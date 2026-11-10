# Agents Director — Supabase OpenRouter Cloud Worker v1

## Goal

Run the primary Agents Director executor in Supabase Edge Functions using OpenRouter Free. A local Mac is optional and must not be required for availability.

## Components

- `agent-commander-private-store-v1`: owner-authenticated task/chat API. Verifies owner and writes a durable run row.
- `business_brain.commander_execution_runs`: the single durable task ledger and queue-of-record.
- `agent-commander-openrouter-worker`: internal scheduled worker. Claims one queued run, performs one bounded OpenRouter request, verifies zero cost, and persists the answer in the original chat.
- `pg_cron` + `pg_net`: invokes the worker every minute.
- Supabase Vault: stores the worker bearer separately from application code and logs.

No Hermes Node server, local Mac, Vercel serverless filesystem store, second queue, or additional paid hosting is required for this read-only worker.

## Run lifecycle

1. The owner submits a task from Commander.
2. Private Store verifies the owner, chat, request ID and idempotency key.
3. When a server-side OpenRouter key exists and GitHub Write has not been requested, the run is stored as `QUEUED`.
4. Cron invokes the worker. The worker authenticates with `x-agent-commander-worker`, whose value is read from Vault.
5. A transaction claims one run with `FOR UPDATE SKIP LOCKED`, a random lease token and an expiry.
6. The worker calls OpenRouter `openrouter/free` with provider maximum price zero and paid fallbacks disabled.
7. The worker requires numeric `usage.cost === 0`, no BYOK billing and a valid response.
8. It writes the final answer, actual model, zero cost, SHA-256 receipt, completed status and chat event only while the lease token still matches.
9. Commander reads the same ledger and chat event; after reload it can recover the result.
10. Expired leases are re-queued; transient provider failures have bounded retries (maximum three).

## Required server-only secret

Configure one of the following in **Supabase Dashboard → Edge Functions → Secrets**:

- `HH_PM_OPENROUTER_API_KEY` (preferred), or
- `OPENROUTER_API_KEY`.

Never put this key in browser code, GitHub, a chat message or the worker queue.

The worker token is generated and stored automatically in Vault by migration `20261110150548`. The cron job is named `agent_commander_openrouter_worker_1m`.

## Fail-closed behaviour

- Without an OpenRouter key, the worker responds `NEEDS_AUTH / OPENROUTER_API_KEY_NOT_CONFIGURED`; no inference is attempted.
- A paid or unverifiable response is not marked completed.
- No GitHub file writes, branch creation, PR, merge or deployment are performed by this read-only v1 worker.
- GitHub Write remains a separate owner-approved operation and is not implied by an assistant answer.
- Repeated request IDs do not create duplicate runs.
- Stale workers cannot commit after lease replacement.

## Production status at initial deployment

- Supabase Private Store: version 25.
- Supabase OpenRouter worker: version 1.
- Durable lease/checkpoint migration: `20261110144812`.
- Vault/cron migration: `20261110150548`.
- Cron: active, every minute.
- Internal worker HTTP call: verified HTTP 200.
- Worker response at deployment: `NEEDS_AUTH / OPENROUTER_API_KEY_NOT_CONFIGURED`.
- No model request or billable inference was made.

## Acceptance after adding the key

1. Owner status returns `openRouterConfigured: true`.
2. Start one read-only test in the existing Commander chat.
3. Run appears as `QUEUED`, then `RUNNING`, then `COMPLETED`.
4. Receipt records actual model, `costUsd: 0`, answer SHA and proof level.
5. The final answer appears in the same chat and survives reload.
6. Duplicate idempotency key does not re-run the model.
7. Missing key, invalid cost, worker timeout and expired lease all fail closed.

A successful read-only inference proves the OpenRouter runtime only. It does not prove GitHub Write, CI repair, merge, deployment or total Agents Director LIVE.
