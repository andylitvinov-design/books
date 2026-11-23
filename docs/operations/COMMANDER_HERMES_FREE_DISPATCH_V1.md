# Agents Commander → Hermes protected execution v1

**Owner objective:** [books #4046](https://github.com/andylitvinov-design/books/issues/4046). This is the protected Commander Edge Function side of the existing Hermes server-to-server bridge ([hermes-cloud PR #47](https://github.com/andylitvinov-design/hermes-cloud/pull/47)).

## Behavior

The established Supabase owner JWT and `business_brain.owner_access.can_write` gates remain mandatory. The caller creates an execution request with `runId`, `idempotencyKey`, `executor` (`hermes` or `openrouter`), `modelId` (an explicit free `:free` model), `message`, and separately opted-in `confirmGitHubWrite` boolean. The backend binds it to the authenticated owner and existing private chat.

1. The request is recorded exactly once in the private `commander_execution_runs` table, pinned to chat revision and request hash. A duplicate key returns the original result without starting another model.
2. If Hermes HTTPS+shared secret and model ID are unavailable, the request records `BLOCKED` with an explicit reason. **No generated text or plan is represented as execution proof.**
3. When configured, the Edge Function calls owner-protected Hermes `POST /commander/runs` and validates the signed-secret response against the exact run, verified model, and job identifier. The Hermes server then uses existing JobService and the protected OpenRouter free MCP executor. Initial `STARTING` is not an agent-start receipt.
4. On an owner-driven chat read or execution-run lookup, the backend reconciles at most one nonterminal job with `GET /commander/runs/{runId}`. It updates private run status and adds one idempotent terminal event to that same chat. An unconfirmed timeout is retained as `BLOCKED` pending reconciliation rather than re-dispatching blindly.
5. A source-change report is accepted only with `verified:true`, exact 40-character commit SHA and a matching GitHub books Draft PR URL/number. This is **not** CI-green, merge, deployment, or production LIVE.

**Database compatibility:** the live `commander_chat_events.kind` CHECK only allows `owner`, `assistant_unverified`, `note`, and `github_report`. Custom event types (`execution_requested`, `execution_blocked`, `agent_final`) are stored inside the JSON `payload.kind` with physical SQL `kind='note'`, retaining existing RLS/constraints. No DB migration or direct browser table grants.

## Production configuration (server only)

- On persistent Hermes Node service: `HERMES_SHARED_SECRET`, existing authorized `OPENROUTER_API_KEY` or `HH_PM_OPENROUTER_API_KEY`, `OPENROUTER_FREE_EXECUTOR_ENABLED=true`; for opt-in source writes, scoped `GITHUB_TOKEN` and `GITHUB_WRITE_ENABLED=true`.
- On **Supabase Edge Function**: `HERMES_ORIGIN_URL` (validated HTTPS origin) and the same strong `HERMES_SHARED_SECRET`. Do not put either secret into Vercel public JavaScript, URL query, task payload or GitHub source.
- Model ID must be explicitly selected from free-only catalog. The actual Hermes executor independently verifies current catalog and response usage `cost=0`, rejecting paid, fallback or unknown-price models.

Nothing here authorizes a new paid server, a public localhost tunnel, unscoped GitHub permissions, merging, production deployment, RLS changes, extra CI schedules or a new queue.

## Release/acceptance

Protected merge of this code is **not** Supabase Edge deployment. Keep production Commander source and deployed Edge Function in sync after checks. Verify real owner sign-in, a test read-only free execution, a separately approved safe test patch and verified Draft PR, saved chat result after reload, revoked/expired permission denial, no accidental paid usage, required exact-HEAD CI and final production route. If Hermes is not reachable or GitHub source credential unavailable, report the precise blocker rather than pretending FULL LIVE.
