# Agent Memory Digest · P0/P1 backend · Issue #4484

## Existing infrastructure, no duplicate brain
- Canonical project source: AI Projects Brain, public approved project context only.
- The *private* owner-scoped operational digest is a bounded JSON payload in the existing
  `business_brain.commander_chat_events` ledger (`kind='note'`, schema `HH_AGENT_MEMORY_DIGEST_V1`).
- No new database/table, queue, LLM, cron, API key, or separate Jobs service.
- The existing Supabase Commander private store v39 is the production-source baseline.
  Earlier GitHub source was stale: do not deploy it on its own.
- All read API actions require the existing Supabase JWT, `owner_access.can_read`,
  and owner-bound queries. Digest creation derives owner and chat from the verified DB,
  never from an arbitrary client-supplied owner ID.

## Event and proof semantics
- A run assignment is not agent execution. A completed OpenRouter run is considered
  verified only after the worker receipt matches run ID, reports zero-cost verified,
  agent started + execution verified, and contains an answer SHA.
- Signed GitHub Actions OIDC failed-CI events are bound to their run, attempt, PR, head SHA,
  and existing Commander task/chat association; they are not proof of a later patch or LIVE.
- Digest IDs are deterministic, conflicts are no-op, and only fixed statement templates
  plus allowlisted evidence URLs and reason codes are copied.
- No raw chat messages, client notes, medical data, passwords, bearer tokens, or provider
  completions are summarized. `source_verified=false` at the ledger envelope prevents
  confusing a digest with a standalone independently verified GitHub receipt.
- Final run records from the already-deployed OpenRouter worker are materialized on the
  next authenticated owner read/start (bounded recent window); signed CI is captured at webhook receipt.
- The existing chat timeline excludes Digest rows. The 400-event chat cap excludes these rows.

## Task Context Capsule
- `previousVerifiedActivity` is at most two same-owner, same-project and same-chat/task
  digest records, bounded by 1400 characters and labeled as source data only.
- The old instruction to verify current PR HEAD independently remains mandatory.
- A stale or missing receipt is never upgraded to a source patch, merge or LIVE.

## P2 gated learning
- `commander_agent_lesson_candidates` returns read-only candidates only for repeated
  independently evidenced blockers; reviewer uses existing Brain Save → Apply → Check → Prune.
- No automatic skill activation, no edits to the public Brain.

## Release instructions (fail-closed)
1. Review exact source SHA and run unit, integration and security tests.
2. Merge only when protected checks pass for the current head; record merge commit SHA.
3. Compare live Supabase function version and source against the P0 PR. Before deployment
   require the previous version as an explicit rollback target and full side-effect audit.
4. Deploy the entire Edge function bundle: `index.ts`, `agent-memory-digest.mjs`,
   `agent-memory-store.mjs`, `deno.json`. This is a live replacement, not a source sync alone.
5. Authenticate as approved owner; verify list, generated digest and capsule handoff,
   event retry/dedup, denied unauthenticated reader and 403 for non-owner.
6. Independently check existing Commander read, CI intake, OpenRouter worker and
   `holistichouse.vercel.app` production endpoint. A Vercel READY deployment is not LIVE.
7. Do not deploy the standalone PR Monitor from a partial GitHub bundle.
   See `ops/pr-monitor/README_RELEASE_GATE_20261112.md`; its public alias is pinned.
8. Roll back the *entire* Edge bundle to the saved previous version on any regression.
