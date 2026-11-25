# First-party Agents Director — GitHub App source publisher v1

This is code **inside the existing Holistic House application**, not an external
Hermes service or a second job queue.

## Source publication contract

The server-only module at lib/agent-director/github-app-source-publisher.mjs:

- Mints a short-lived GitHub App installation token, restricted to the Books
  repository and minimum required Contents/Pull Requests permissions.
- Requires independently owner-verified task authorization, per-run explicit
  GitHub write consent, and server-side proof that the existing CI/preview
  budget is acceptable. These must NEVER be supplied by an LLM response.
- Accepts only bounded allowlisted text patches with exact base commit SHA
  and original blob SHAs. Sensitive, hidden, migration, auth, payment and
  secret paths fail closed.
- Creates one new job-scoped branch, one commit, and a Draft PR; reads the
  remote branch and Draft PR back before reporting a verified publication.
- Does not merge, deploy, edit protected branches, workflows, credentials,
  environments or production data. CI and LIVE remain separate proof levels.
- Is disabled when credentials or write flag are absent. No fallback PAT,
  generic token or paid provider is attempted.

## Required protected Production config

All values must be configured directly in the Vercel production environment
of the existing codex-public-book-library project, never in chat, tasks,
browser JavaScript, logs or GitHub source:

- HH_AGENT_GITHUB_WRITE_ENABLED=true
- HH_AGENT_GITHUB_APP_ID=... (numeric app ID)
- HH_AGENT_GITHUB_APP_INSTALLATION_ID=... (numeric installation ID)
- HH_AGENT_GITHUB_APP_PRIVATE_KEY=... (GitHub App PEM private key)

No credentials are configured automatically by publishing this source code.
A connected ChatGPT GitHub app installation cannot delegate its private key
or installation bearer to this independent first-party runtime.

## Integration boundary

This module is not an HTTP endpoint. Call it only from the owner-authenticated,
idempotent, private-store-bound first-party Director service after checking the
current task, owner, chat, exact PR/HEAD, active lease, spend/CI budget and
write consent. Model-produced candidate patches are untrusted data.

This source-only milestone does NOT make the Commander → source commit flow
LIVE. Production needs the own-model runtime, an authorized GitHub App, and an
independent observed Draft PR/commit/readback, then required CI, merge and
deployment acceptance. Keep existing zero-additional-spend restrictions.
