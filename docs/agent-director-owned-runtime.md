# First-party Agent Director runtime

## Architecture

The Commander execution path is owned by the Holistic House application. It does not require a separate Hermes Cloud service or a locally running Ollama host.

- The Supabase Edge Function authenticates the owner, enforces the private-store ACL, creates the idempotent execution ledger row, and persists the final receipt in the same chat.
- The Edge Function calls the first-party Next.js route at `/api/agent-director/commander-run`, forwarding the owner's existing Supabase JWT.
- The route verifies that JWT with Supabase Auth and rechecks owner access through the existing private store.
- The first-party read-only runtime calls the official OpenRouter Chat Completions API using the `openrouter/free` router.
- The runtime accepts a response only when OpenRouter reports an actual model ID ending in `:free` **and** the response usage reports `cost: 0`. Missing or non-zero cost is a BLOCKED result.
- OpenRouter provider fallback is disabled and no paid model fallback list is sent. A failed free request stays BLOCKED; it is not retried through a paid model.
- GitHub source writing remains a separate protected GitHub App operation. The model does not receive an App private key or installation token.

## Production configuration

Add one server-side Vercel Production variable to the canonical `codex-public-book-library` project:

- `HH_AGENT_OPENROUTER_API_KEY` — an OpenRouter API key, stored as a Sensitive/Encrypted secret.

No Ollama endpoint, model, token, tunnel, or MacBook availability is required.

The Director uses the official `openrouter/free` router. It chooses a currently available free model automatically; the runtime verifies the actual returned model suffix and zero reported cost for each response.

Do not expose the API key to browser JavaScript, the Commander UI, chat events, logs, or model prompts. Do not reuse the GitHub App private key or the Commander bridge secret as an OpenRouter key.

## Honest status rules

- Missing API key: `BLOCKED / OPENROUTER_API_KEY_NOT_CONFIGURED`.
- OpenRouter authentication failure: `BLOCKED / OPENROUTER_AUTH_FAILED`.
- Free daily/minute limit: `BLOCKED / OPENROUTER_FREE_LIMIT_REACHED`.
- Actual returned model is not a `:free` model: `BLOCKED / OPENROUTER_NON_FREE_MODEL_REJECTED`.
- OpenRouter does not report exactly zero cost: `BLOCKED / OPENROUTER_COST_NOT_VERIFIED_ZERO`.
- GitHub write request without the separately approved writer path: `BLOCKED / AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED`.
- A model answer is read-only analysis, not proof of source changes, tests, CI, merge or LIVE.
- Timeouts and transport failures become durable BLOCKED receipts; the same idempotency key is not blindly retried.
- The execution ledger and chat event use the existing private Supabase tables and CHECK/RLS constraints. No schema widening is introduced.

## OpenRouter free-tier limits

The OpenRouter free router is subject to OpenRouter's published free-tier rate limits. Treat rate-limit responses as BLOCKED and do not automatically upgrade, purchase credits, or fall back to a paid model.

## GitHub writer boundary

A separate first-party GitHub App installation and the already implemented protected Draft PR publisher are responsible for any source change. The model can only provide read-only analysis in this runtime. The deterministic writer must independently validate repository, allowlisted paths, exact base/head SHA, diff limits, explicit owner confirmation and CI-cost budget before creating a Draft PR. It may not push to the protected production branch, merge or deploy.
