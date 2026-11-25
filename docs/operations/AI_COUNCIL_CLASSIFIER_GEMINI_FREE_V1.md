# Video Scout AI enrichment — strictly gated Gemini Free Tier alternative

This additive adapter helps the existing Free AI Classifier survive OpenRouter's **verified HTTP 429 account quota**. It does not change Hourly L0 Scout or add a cron, new API credential, provider, subscription or external agent.

## Exact operational gate

- Existing owner-issued `HH_COUNCIL_GEMINI_API_KEY` **and** existing owner-confirmed `HH_FIRST_VIDEO_GEMINI_FREE_CONFIRMED=true` are both mandatory. This is the SAME account-specific free-usage attestation used by Video Studio. Missing or ambiguous gate: **0 Gemini requests**.
- Only after OpenRouter returns the exact explicit `MODEL_HTTP_429` (a rejected, not an ambiguous timeout) may one direct `gemini-3.5-flash-lite` generateContent request be made. No retries, no automatic switching to paid, no new key or model discovery.
- Public Wikimedia metadata only, six candidates maximum, UUIDs strictly matched. No private client information, licences, physical video, source download, R2, payment, or other protected data.
- Verify an exact response model version, `STOP`, response token-usage evidence, and bounded schema. Gemini has **no exact $0 cost field in a generation response**. The persisted receipt must distinguish owner-attested Free Tier from a provider-calculated $0 cost and must not claim a precise zero-dollar transaction.
- If the Google free quota is also exceeded (429), or any response is incomplete, retain a `quota_paused` or `failed` status. Do not repeatedly retry provider limits or claim AI tags exist.
- AI suggestions require owner review and cannot change existing `research_only`, `unverified` rights or generator admissions.

## Sources and cost guard

The public Google AI for Developers pricing page documents Gemini 3.5 Flash-Lite with free input/output tokens **on its Free Tier** and separate charged Paid Tier rates. This does *not* prove this specific project's billing state, hence the explicit existing owner attestation gate. Free-tier input may be used to improve the provider's products; only Wikimedia public clip metadata is ever sent.

- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite

## Completion checks

1. Pure tests verify strict attestation, exactly one request, no retries, response/provenance validation, unknown UUID rejection, and 429 safety.
2. Existing classifier-runner attempts direct Gemini only after explicit 429. All other errors leave the original no-paid result unchanged.
3. Source records preserve total number of API requests even when the fallback was attempted, without exaggerating price verification.
4. Existing protected Core, Specialist, `hh-merge-check`; merge only on exact passing HEAD. Confirm LIVE by Vercel production READY/SHA/alias and first genuine classification DB receipt at a due four-hour UTC slot.

One minimal private model-id CHECK migration permits only the literal Gemini model alongside the existing OpenRouter `:free` ids; RLS, grants and original rows are preserved. No paid services, new cron, authorization bypass or auto-media publication.

## Evidence as of 2026-11-07 04:17 UTC

The actual `video-classifier-batch` execution received OpenRouter `MODEL_HTTP_429`, persisted as `quota_paused`, with no annotations written. This change is a bounded alternative, **not** evidence that Gemini has already replied. Its first real classification remains subject to a future due slot and a provider response.
