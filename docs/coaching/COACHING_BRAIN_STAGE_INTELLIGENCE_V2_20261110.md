# Coaching Brain stage intelligence v2 — 2026-11-10

Status: implementation candidate; deterministic stage-selection improvement. This does not activate a model provider or claim a complete CIE 2.0 release.

## Problem corrected

The previous controller advanced by the count of user messages (clarify → explore → options → decision → review). Message count is not evidence of client readiness and could advance the client toward options or closure while they were still describing the situation.

## New contract

The controller selects one of eight dialogue navigation hints from explicit client wording:

1. clarify
2. explore
3. awareness
4. reframe
5. choice
6. planning
7. commitment
8. integration

No message-count progression. If the client introduces uncertainty, the controller may move back to clarification. If no explicit progression signal exists, it remains in exploration. Commitment requires positive first-person action wording plus a time cue; negated plans are not commitments. These are heuristic navigation cues, not psychological assessment or proof of readiness.

## Safety and privacy

- Existing account-bound active-session checks remain in the server gateway.
- Existing per-turn consent remains mandatory before provider processing.
- Existing separate production feature gate and verified zero-price OpenRouter route are unchanged.
- No previous-session memory, transcript persistence, database schema, new table, external provider, or new secret is added.
- Offline fallback remains explicit; model outage never appears as a successful AI answer.
- A client-confirmed action remains the only thing written to the existing encrypted session.

## Verification

The focused test contract covers message-count independence, all eight stages, regression to clarification, positive timed commitment, rejection of negated commitment, multilingual signals, and all-stage offline fallback. Full coaching release, protected exact-HEAD CI, production deployment and signed-in mobile E2E remain required before calling the feature LIVE.
