# Coaching Brain · implementation slice 1

This branch provides the deterministic, pure controller for a real conversational coach. It is **not** a live model conversation yet. It is designed to be integrated into the existing authenticated Personal Coaching runner and its owner-encrypted session record, rather than introducing a second chat or data store.

## Contract
- User message → safety interrupt → method choice → stage-specific next question → evidence registry → user-confirmed decision.
- Stages: goal → reality → resources → options → action → review. A turn cannot jump stages because a model suggests it.
- Reviewed methods: GROW, WOOP, OSKAR, solution-focused, motivational interviewing. Explicit client preference takes precedence over heuristic routing.
- EN/RU/ES prompts, no model call, no raw text in telemetry, no diagnosis or invented action.
- Structured model response is **untrusted**: validate stage and reply bounds before rendering; fail closed to authored next question.
- Client chooses/edits/accepts action before Report v2 and My Coaching Plan import.

## Remaining to reach LIVE
1. Integrate authenticated, owner-scoped POST turn API into existing `app/api/app/[...path]/route.js` and `components/app/personal-coaching.jsx`. Use existing auth, origin guard, account header, per-user rate limits, session revision and idempotency; no browser provider credentials.
2. Add explicit per-session consent for sending the current bounded text to an approved server-side model. Confirm provider retention, data region, privacy agreement and pricing; default provider OFF. Never silently reuse the Agent Director OpenRouter key or assume a free tier permits private health data.
3. Persist only bounded, necessary client-confirmed state in existing encrypted session envelope; do not persist a transcript by default. Ensure revision-safe concurrency, resumability, deletion and opt-out.
4. Generate a model draft with bounded JSON, stage-specific system policy and strict response validation. Do not allow model to self-approve evidence, claim client decisions, select unauthorized methods or override safety interrupt. On timeout/provider refusal/cost cap, return deterministic prompt.
5. Integrate final decision with Report v2 and My Coaching Plan only after explicit client confirmation. Preserve existing 20-minute GROW flow, legacy exports and all locale routes.
6. Run `node --test tests/coaching-brain.test.mjs`, `npm run test:coaching:release`, lint/typecheck/build, account-isolation tests, 30+ synthetic conversations and iPhone Safari E2E.
7. Verify protected checks, reviewed merge, Vercel READY for exact production SHA and authenticated production smoke. Only then mark LIVE.

## Privacy / quality gates
Never treat self-report as clinical diagnosis; do not create therapeutic interpretation. If immediate self-harm danger is expressed, suspend ordinary coaching and provide urgent support options. This first-pass lexical safety guard is insufficient for live deployment; the server must use a reviewed broader safety pipeline with human escalation and negative tests.
