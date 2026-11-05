# Holistic House — OpenRouter selection for meditation and affirmations

## Actual wiring
In PR #2676, both the meditation preview and the Hypnoaffirmations video editor offer **Auto / Gemini / OpenRouter** in RU, EN and ES.
The browser sends `providerPreference` (`auto`, `gemini`, `openrouter`) with the same authenticated, same-origin, explicit opt-in POST request already used for the text draft.

- `auto`: tries enabled verified-free Gemini, then enabled verified-free OpenRouter.
- `gemini`: attempts Gemini alone. It cannot secretly use OpenRouter.
- `openrouter`: attempts OpenRouter alone. It cannot secretly use Gemini.
- No compatible configured free provider, quota, bad output or rejected editorial review: use existing local/template suggestions, not a fabricated AI draft.
- The response records the provider **actually used**, never the preference as proof of generation.

OpenRouter uses server-only `HH_COUNCIL_OPENROUTER_API_KEY`, `https://openrouter.ai/api/v1/chat/completions`, and model `openrouter/free`.
Requests require JSON and route to providers with `data_collection: deny`. Only generic enum-derived creative directions are transmitted, never patient histories, private free text, profiles, diagnoses, test scores, client identity, or voice recordings. No direct browser request and no user OpenRouter registration.

## Runtime controls
Production must explicitly configure:
- `HH_MEDITATION_WRITER_BRIEF_ENABLED=true`
- `HH_MEDITATION_WRITER_PRODUCTION_APPROVED=true` (after full release gates)
- `HH_MEDITATION_WRITER_OPENROUTER_FREE_ENABLED=true`
- `HH_MEDITATION_WRITER_OPENROUTER_FREE_TIER_CONFIRMED=true`
- `HH_COUNCIL_OPENROUTER_API_KEY` (secret, server-only)

The two OpenRouter flags are operator attestations, not evidence of zero billing or verified provider privacy; inspect the linked account, free quota and data-policy settings before enabling. Existing Gemini flags are independent.

## QA gates
1. Unit: `node --test tests/meditation-writer-free-providers.test.mjs` and existing writer suites.
2. Static: Next TypeScript check and scoped ESLint.
3. Authenticated mobile RU/EN/ES: choose OpenRouter and confirm only OpenRouter is requested; choose Gemini and confirm only Gemini; Auto may try both; verify no client secret in the network traffic.
4. Verify local fallback on missing key, exhausted free quota, incompatible JSON and rejected unsafe text; no false provider labels.
5. Run full Next build and signed-in end-to-end tests on the final PR SHA; resolve #2528 -> #2532 dependencies and verify production branch and deployed SHA before claiming live.

Generated drafts require human editorial review. No automatic clinical claims or publication.
