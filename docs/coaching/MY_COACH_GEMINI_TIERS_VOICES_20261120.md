# My Coach — Gemini Free, Gemini Paid, RU/EN voices
20 November 2026. Stacked on PR #5193. This is an implementation of turn-based Gemini TEXT + TTS, not yet true full-duplex Gemini Live. Preserve existing Groq, Coach Director methods, iPhone interruption, and validated session progress.

## Provider modes and models
- Groq streaming/strict: original paths, no hidden Gemini provider.
- Gemini Free text: gemini-3.1-flash-lite; server-owned persona and Coach Director messages; one request per submitted turn; final original schema and evidence gate.
- Gemini Paid text: gemini-3.8-flash; same Director; no paid fallback on quota/network failures.
- Gemini TTS Free: gemini-3.8-flash-lite-tts; separately chosen 24 kHz WAV delivery.
- Gemini TTS Paid: gemini-3.8-flash-tts; separately chosen 24 kHz WAV delivery.
- Gemini Live: existing gated adapter only; no browser duplex or Director-authoritative tool bridge yet. Keep disabled.

## Configuration: server-only, OFF by default
Create two independent Google AI Studio projects for tier separation, one genuinely free and another paid only if approved. Confirm Free billing cannot fall through to paid. No keys are stored in this PR.

Free tier: HH_GEMINI_FREE_API_KEY, HH_MY_COACH_GEMINI_FREE_ENABLED=true, HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED=true, HH_MY_COACH_GEMINI_FREE_DATA_APPROVED=true. Optional separate TTS: HH_MY_COACH_GEMINI_TTS_FREE_ENABLED=true.

Paid tier: HH_GEMINI_PAID_API_KEY, HH_MY_COACH_GEMINI_PAID_ENABLED=true, HH_MY_COACH_GEMINI_PAID_PRIVACY_APPROVED=true, HH_MY_COACH_GEMINI_SPEND_APPROVED=true. Optional separate TTS: HH_MY_COACH_GEMINI_TTS_PAID_ENABLED=true.

Do not prefix secret variables with NEXT_PUBLIC_. Free and Paid MUST use different keys; server rejects identical key values. TTS uses `store:false` in the Google Interactions API, which otherwise stores requests by default. Google Free tier inputs may be used to improve models; Paid does not use inputs for model improvement per official pricing. The customer must explicitly opt in for the chosen tier and, separately, for Gemini TTS. A typed or voice reply never silently switches to another vendor.

## Budget and release
TTS explicitly requests RU/EN/ES via BCP-47 language hints and caps output at 1,250 audio tokens (roughly 50 seconds) to limit runaway repeated speech and provider charges. This cap may return an incomplete response for unexpectedly long text; do not retry automatically. Text retains My Coach 40 calls/account/hour plus global 30 Free / 12 Paid calls/day; per account 16 Free / 6 Paid/day. TTS global 24 Free / 12 Paid/day and per account 12 Free / 6 Paid/day. Preview is not preloaded and consumes one call when clicked. These are CALL caps, not a guaranteed USD billing cap: Google AI Studio/Cloud billing must be separately bounded by the owner. No new Vercel project, cron, database table or deployment is created.

Each of ten registered personas has four original Google prebuilt voice candidates, selectable independently for RU and EN. Accent and gender presentation are audition hypotheses, NOT verified listening results. Preview contains only a fixed, fictional persona phrase; no real client history.

Before release: node --test tests/my-coach-gemini-tiers-tts.test.mjs; full protected CI, Coach Director semantic regression, WebKit/Safari iPhone voice, listening of 20+ RU and EN turns, interrupter and offline fallback; actual credential and privacy confirmation; exact production alias SHA. A PR or synthetic smoke is not LIVE.

Official Google docs:
https://aistudio.google.com/docs/pricing
https://aistudio.google.com/docs/speech-generation
https://aistudio.google.com/docs/live-api
