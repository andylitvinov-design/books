# First-party Agent Director — OpenRouter Free

## Existing protected flow

The Agent Commander owner-authenticated chat and its run/event ledger remain in existing Supabase private tables.
The Supabase Edge Function verifies the owner's JWT and ACL, creates the idempotent STARTING run and forwards the bounded request to the first-party Holistic House API route at `app/api/agent-director/commander-run/route.js`.
The route rechecks owner identity, write permission, chat and run provenance before invoking a model.

**Inference is now via OpenRouter `:free`, not Ollama.** No separate Hermes service, database or new user login is required.

## Vercel production configuration

Project: `codex-public-book-library` (the canonical `holistichouse.vercel.app` application).

- `HH_AGENT_OPENROUTER_ENABLED=true` — opt in to the read-only provider adapter.
- `HH_AGENT_OPENROUTER_API_KEY` — required, sensitive server-side secret. Enter this **directly in Vercel**, never in GitHub, the chat, a URL or client JavaScript.
- `HH_AGENT_OPENROUTER_MODEL=vendor/model:free` — optional. If omitted, the adapter selects one verified zero-price text model deterministically from the current catalog.

The standalone PR Monitor does not need the key for the first-party Director path; it sends only the owner-scoped request to the existing private store. The former Commander Ollama environment settings are not used.

## Zero-cost and privacy gates

1. Retrieve the current OpenRouter model catalog, select only a `:free` model with text input and output and zero values for every published pricing field.
2. Make only one POST to `https://openrouter.ai/api/v1/chat/completions` with explicit model ID, `provider.max_price={prompt:0,completion:0}`, `allow_fallbacks=false`, `usage.include=true`, `stream=false` and at most 500 output tokens.
3. Accept a saved COMPLETED receipt only if the returned model is exactly the selected ID, reported `usage.cost` is numeric zero, and the output is safe bounded plain text without tool calls.
4. Never retry automatically after a network timeout or 429; never switch to a paid model, invoke web search plugins or create a paid request.
5. Reject likely credentials before sending content outside the first-party service. Do not send private client data.

OpenRouter free variants are rate limited, and the account may still need a valid API key. The code does not use purchased credits or auto top-up.

## Truthful execution states

- Missing flag or key, or invalid paid model configuration: `BLOCKED / OWNED_MODEL_RUNTIME_NOT_CONFIGURED`.
- No verified free text model: `BLOCKED / OWNED_MODEL_NO_VERIFIED_FREE_MODELS`.
- 401, 429, unavailable provider, missing cost, positive cost or response model mismatch: explicit `BLOCKED` reason.
- Verified response: `COMPLETED`, `agentStarted=true`, `executionVerified=true`, `sourceWrite=null`, `proofLevel=AGENT_DIRECTOR_READ_ONLY_RESPONSE`.
- Request for GitHub writing: blocked until a separate owner-approved GitHub App publisher is verified. An answer is not evidence of source changes, CI, merge or LIVE.

## Release acceptance

1. Run the exact HEAD Node regression suite and all protected CI checks.
2. Verify production Vercel READY and the exact deployed SHA.
3. Verify the OpenRouter key is present **by name only** in Vercel Production without reading or logging its value.
4. Complete one authenticated owner chat → real zero-cost model completion → persisted Supabase reply → reload → follow-up.
5. Until step 4 passes, report the precise remaining blocker rather than claiming that real AI completion is LIVE.

No schema or RLS changes and no new paid service.
