# Coaching Methodology Engine v2

Status: implementation candidate on PR #4195 branch; not production until focused CI, integration, merge and canonical deployment are verified.

## Runtime contract
- The engine is pure and deterministic. It contains no provider calls, storage, telemetry or client transcript persistence.
- It classifies the current coaching task, never a personality, mental-health condition or hidden motive.
- Explicit method preference wins over heuristic routing.
- A stage advances only when a stage-specific exit contract is explicitly confirmed by the session controller.
- One turn yields one primary intervention and one question.
- Pattern/meaning exploration requires explicit consent, relevance to the agreed goal and no safety hold.
- Safety, stop, pause, correction and skip signals take precedence over ordinary method selection.
- Plans require a concrete action, first step, timing, obstacle, fallback and explicit client approval.
- Confidence below 7/10 returns a request to reduce scope or revisit choice. It never raises pressure.

## Tests
Run:
`node --test tests/coaching-methodology.test.mjs tests/coaching-brain.test.mjs`
Then:
`npm run test:coaching:release`, lint, typecheck and build.

## Integration required before LIVE
Wire `selectNextBestAction`, `assessStageReadiness`, `resolveDepth` and `evaluateCoachingPlan` into the authenticated session controller and existing encrypted session record. Preserve GROW 20-minute flow, legacy answer/report compatibility, user confirmation, opt-out and fallback. No second chat, database, storage path or provider.
