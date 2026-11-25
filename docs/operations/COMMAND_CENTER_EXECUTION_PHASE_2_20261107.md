# Holistic House Command Center — Agent Studio Phase 2 / delivery proof and optional dictation (2026-11-07)

## Actual implementation
- Extends the **one canonical owner-only** mobile PWA at `/admin/command-center`. Retains approved navy/violet five-tab interface and existing PostgreSQL `cc_*` records.
- Owner action `inspect_delivery` reads the stored task ID and **only** public GitHub PR evidence. Validates repo + PR identity, exact PR HEAD, complete Core/Specialist/merge check-run names, merged commit and cryptographic commit ancestry against the responding Vercel production build's `VERCEL_GIT_COMMIT_SHA`. No app secrets or additional provider credentials.
- Server-side inspection is bounded, fail-closed (unknown on missing GitHub/CI/Vercel evidence), with existing session, origin check, rate limit and a trusted repository allowlist.
- The UI exposes `CI: passed/failed/pending/unknown` and separately `code on production: confirmed/unconfirmed`. **Functional browser acceptance remains separate and cannot be self-certified.** No DB transition to `completed_live`.
- Optional browser Web Speech dictation in the existing task composer. Starts only on a user tap and releases recognition on unmount; iPhone keyboard dictation is the fallback. Browser speech processing may use its provider; never describe as guaranteed offline or private audio.
- Reuses current Vercel app, GitHub Actions, RLS tables, scheduling and API. No paid AI API, new cron, workflow, independent PR merge writer, new tables or token creation.

## Verification plan
1. Run focused `node --test tests/command-center-release-proof.test.mjs tests/command-center-voice-ui.test.mjs` and existing Command Center suites. Use Next.js core typecheck/build.
2. Protected exact-head Core, trusted Specialist and `hh-merge-check`. Existing native squash-merge only, respecting the single-writer PR lease.
3. Vercel production READY and matching/descendant deployed SHA on the canonical alias, then authenticated mobile web workflow and guest 302/401 denial. iPhone Safari 320/354/390/430 and live dictation require owner-device session and explicit mic permission.
4. Confirm a real PR previously merged into production returns a code-on-production result from `inspect_delivery` (if Vercel system git env vars are exposed). If not, the UI must return **unconfirmed** rather than fabricate proof.

## Next phase: actual headless coding agents — still blocked until connected
- **CC-C:** A trusted **existing** code-capable agent host, reviewed credentials and sandbox. No arbitrary shell/URL, web prompt injection, fork writes or code execution from customer tasks. Run coding in independent worktrees with per-task path ownership.
- **CC-D:** Adapter/broker contract for Codex/Antigravity/Hermes/OpenClaw, per-capability allowlist, bounded quotas and explicit task-specific owner approval. A provider name in the UI is never a connected worker.
- **CC-E:** Independent CI + serving-SHA + private browser acceptance receipts, verified LIVE state migration once real evidence exists.
- **CC-F:** Signed events / idempotent exact-HEAD task intake, cross-PR dedupe, lease and retry/backoff. Reuse existing PR Control Tower; never create a second CI scheduler.
- **CC-G:** Optional task-conversation history with private RLS and user-controlled retention; only after threat model and schema review.

Do not claim full Antigravity equivalence, connected autonomous code editing, remote agents, successful iPhone microphone E2E or verified end-user LIVE without independent proof. Global standard: `GLOBAL_PR_ONE_PUBLISH_V1`.
