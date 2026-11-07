# Holistic House Agent Studio — Mobile v1 · 2026-11-07

Antigravity-inspired mobile workspace inside the EXISTING Holistic House PWA (scope /), not a clone of Google's proprietary UI, license, runtimes, or a new paid mobile app.

## Release scope
- Owner-protected /admin/command-center/mobile, available from Command Center navigation.
- Russian, English, Spanish; mobile 320–430px, larger desktop layout; single fixed bottom nav.
- Four views: overview/task composer, tasks, agents/readiness, evidence/run history.
- Voice dictation only when browser SpeechRecognition exists; iPhone keyboard dictation fallback. User gesture starts audio; no first-load permission popup.
- Reuse /api/admin/command-center POST with owner auth, same-origin CSRF, rate limits, UUID requestId. No extra API keys, services or scheduled functions.
- A GitHub PR/Issue URL is accepted only from andylitvinov-design/books, and auto execution is read-only metadata auditing. Code, research, spec tasks persist as needs_spec until an authorized worker exists.
- Read existing app_private.cc_* via existing server transaction. Missing migration/DB is UNKNOWN, not zero. No client data is sent to an external AI.
- Disabled agent names are explicitly NOT CONNECTED. verified GitHub metadata is not completed_live.

## Truthful limitations / next engineering stages
1. Private threaded agent conversations: session/message schema, user permission and durable RLS.
2. Real code agents: connect reviewed headless Codex/other providers using isolated ephemeral worktrees, quotas, tool allowlisting and an approval chain.
3. Artifacts: structured plan/diff/screenshots/logs, independent reviewer and evidence provenance.
4. Sandbox browser agent: Chromium/WebKit screenshot and functional verification of same route/auth state.
5. Trusted CI/PR and Vercel serving SHA verifier; production acceptance must not be self-asserted.
6. Scheduler: reuse existing five-minute wake and deduplicated ten-minute slots; stop/pause/reconcile and no unbounded retries.
7. Voice and remote mobile sync: test actual Safari capabilities; optional consent-based push, no new costs before approval.

## Controlled launch
Protected Ready PR -> existing Core/Specialist/Guard -> protected merge -> Vercel READY serving SHA -> reviewed existing SQL migration (if unapplied) -> HH_CC_TICK_ENABLED production flag and owner opt-in -> 2 real scheduler slots -> iPhone Safari authenticated task submission readback. Never claim LIVE from CI or UI code alone.

Follow GLOBAL_PR_ONE_PUBLISH_V1 and books/docs/operations/CI_RELEASE_POLICY.md. Stage all files before PR; one atomic remote Git tree/commit/branch publication only. No new workflows, billing, remote polling or independent merge writer.
