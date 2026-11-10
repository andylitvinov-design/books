# First-party Agent Director runtime

## Architecture

The Commander execution path is owned by the Holistic House application. It does not require a separate Hermes Cloud HTTP server.

- The Supabase Edge Function authenticates the owner, enforces the private-store ACL, creates the idempotent execution ledger row, and persists the final receipt in the same chat.
- The Edge Function calls the first-party Next.js route at `/api/agent-director/commander-run`, forwarding the owner's existing Supabase JWT.
- The route verifies that JWT with Supabase Auth and rechecks owner access through the existing private store.
- The runtime uses the existing `owned-ollama` adapter. It is read-only; it cannot publish source changes.
- GitHub source writes require a separate protected GitHub App writer and explicit confirmation. Until that writer and its credentials are verified, requests that confirm GitHub write return `BLOCKED / AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED`.

## Runtime configuration

The runtime remains disabled unless all of these server-side Vercel Production variables are supplied:

- `HH_AGENT_OLLAMA_ENABLED=true`
- `HH_AGENT_OLLAMA_ENDPOINT=https://<owner-operated-host>/api/chat`
- `HH_AGENT_OLLAMA_MODEL=<installed-model-id>`
- `HH_AGENT_OLLAMA_TOKEN=<protected-bearer-token>`

The endpoint must be HTTPS in production. Do not point it at a public model provider or an untrusted host. The token is stored only as a sensitive server-side environment variable and is never returned to the client.

## Honest status rules

- Missing endpoint/model/token: `BLOCKED / OWNED_MODEL_RUNTIME_NOT_CONFIGURED`.
- GitHub write request without the protected App writer: `BLOCKED / AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED`.
- A model answer is a read-only response, not proof of a source change, CI pass, merge or LIVE deployment.
- A transport timeout is stored as `BLOCKED`; the same idempotency key is not blindly retried.
- The execution ledger and chat event use the existing private Supabase tables and the existing CHECK/RLS constraints. No schema widening is introduced.

## Future GitHub writer

A dedicated first-party GitHub App installation is still required for source reads and Draft PR publication. The model must only produce a candidate; a separate deterministic publisher will validate repository, allowlisted paths, exact base/head SHA, diff limits and explicit owner approval before any write. The model must never receive App private key or installation token.
