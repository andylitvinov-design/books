# Holistic Native AI v1 — first-party secretary model (11 November 2026)

## Decision and boundaries
The existing authenticated Holistic House AI Messenger gains a **first-party trainable statistical intent model**, not another bot/persona and not a general LLM. It uses 364 authored, synthetic RU/EN/ES example utterances to fit a deterministic, fixed-weight multinomial logistic classifier on Node.js server startup. It recognizes 15 basic administrative/social intents; responses come from a bounded reviewed trilingual reply policy, NOT open-ended language generation. It makes no claim of human-level conversation, learning from visitors, personalized clinical advice, booking, payments, successful contact, or real-time order status.

**IP/infrastructure:** No third-party AI SDK, remote inference, externally trained weights, model download, new paid provider, client-side inference or new database. All classifier source, features, training data, learned coefficients and answer policy are produced from the first-party repository code. The site itself continues to depend on its existing hosting/runtime (Vercel/Next.js); this is not a physically independent hosting deployment.

## Runtime path
- Authenticated, same-origin, rate-limited `/api/holistic-agent/turn` in the existing `rules` mode.
- Existing safety preflight runs BEFORE the native model. A user-provided historical or current unsafe turn bypasses native AI and follows the existing safety handling.
- Existing signed Judgment choices, operational media/video intents, payments, bookings and specific tracked orders retain existing verified routes. Native handles only non-sensitive, high-confidence secretarial utterances.
- Low-confidence and unrecognized turns abstain and use current answer/judgment fallback. No new storage or auto-training from client text.
- The model does not execute calls or access external resources; output has `modelUsed:false`, source `hh-native-secretary-v1` and no false inference-provider claim. Persona styling can be layered later but must not change the classifier or trust boundaries.

## What is trained
`data/holistic-support/native-secretary-examples.mjs` contains 364 first-party examples for 15 intents × three languages. Features are hashed word/character n-grams. A pure-JS multinomial logistic classifier trains deterministically once per warm server process (78 epochs); zero dependencies and no external checkpoints. Training samples are constants; public queries NEVER change model weights. Confidence is an uncalibrated class score used only for abstention, not a probability of factual correctness.

## Validation
`node --test tests/native-secretary.test.mjs`. Synthetic held-out phrasing, unknown questions, direct operations, privacy/sensitive cases, route guard ordering and absence of external AI inference. Local isolated core tests were 4/4 before the route integration. Full protected Core, Messenger specialist, real authenticated browser, guest behavior and LIVE availability must be validated separately by CI and production checks. Non-hardened self-training for open-ended chat is out of scope.

## Future v2
Add reviewed multi-turn task state, grounded factual lookup of approved public catalog and independent multi-turn evaluation. A fully neural freely-generating model trained from scratch would require new consent-safe datasets, separate GPU compute, extensive training and validation, and cannot be claimed from this intent model. Preserve one common intelligence core; personas must remain style-only.
