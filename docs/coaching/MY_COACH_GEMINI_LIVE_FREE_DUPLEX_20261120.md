# My Coach: Gemini Live Free — streaming duplex audio with interruption
20 November 2026. Staged implementation; NOT a claim of proven real-phone acceptance.

## Architecture
- Direct browser WSS to Google's constrained Gemini Live endpoint, not text-then-WAV.
- 16kHz signed PCM mono input via iOS-safe AudioWorklet (ScriptProcessor fallback).
- 24kHz signed PCM output scheduled in WebAudio as it arrives, with at most
  2.5 seconds buffered and immediate local cancellation on incoming speech.
- Browser resumes/gets a one-use server-generated ephemeral Google token, not
  a permanent API key. Same-origin authenticated token issuance, 2 sessions
  per actor/hour, 4/day, 20 across site/day. One bounded reconnection.
- Strict CSP limits Google wss://generativelanguage.googleapis.com to the
  six-coach session page in RU/EN/ES only. All other pages keep original CSP.
- 10 existing persona profiles with server-owned method/style, 4 voice
  candidates each; no model selection from the client. This includes 6
  public fictional personas plus 4 hidden legacy session links.
- New Free Live voice engine is entirely separate from Free/Paid turn-based
  Gemini TTS and old Groq streaming. Existing coaches and reports stay intact.
- Original Coach Director produces the authoritative evidence-based
  method/phase/stage checkpoint WITHOUT a second Google inference call.
  Model speech is not itself a checked, client-approved outcome. Streaming
  spoken replies inherently cannot be fully filtered by a final server
  response validator before audio is heard: never represent Live voice as
  equivalent to final-validated text turns.
- When audio or websocket fails: microphone and speakers stop; user sees
  error and can use text. NEVER silently switch to Gemini Paid or start a
  new provider charge. No raw audio or client transcript is persisted by
  the new transport in Supabase, logs or localStorage.

## Consent & billing gates
Google Gemini Free can use input audio/transcripts to improve its models.
The user must explicitly check a Live-specific consent box. Play triggers
microphone and one-use token request only after consent. Settings:
  HH_GEMINI_FREE_API_KEY                     (existing Sensitive, Production)
  HH_MY_COACH_GEMINI_FREE_ENABLED           true (existing)
  HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED    true (existing, owner asserted)
  HH_MY_COACH_GEMINI_FREE_DATA_APPROVED     true (existing, owner asserted)
  HH_COACHING_BRAIN_ENABLED                 true (existing)
  HH_COACHING_LIVE_VOICE_ENABLED            true (existing)
  HH_COACHING_LIVE_VOICE_APPROVED           true (existing)
  HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED      false by default (new independent flag)
No new Paid key, billing account, workflow, cron, Vercel project or new DB.
If Google Free billing tier is not independently confirmed, retain OFF.
Activation requires a new READY production deployment AND evidence below.

## Release acceptance: REAL, not fake
1. Required exact-head CI, package prebuild, Node unit, Safari/WebKit routes,
   client UI, model-lock/auth/quota/consent, no-lint/type errors.
2. Legitimately authorized Google AI Studio Free project: create a bounded
   short-lived token from a synthetic, non-client prompt; handshake against
   real Gemini 3.1 Flash Live Preview; receive a real 24kHz audio chunk.
3. Physical iPhone Safari with RU/EN persona voices, AirPods and speakers,
   explicit microphone permission, repeated 2-way turns, natural barge-in,
   ongoing audio/context after the connection limit, 20-minute timebox,
   typed interruption, profile/end/background/disconnect cleanup.
   Log only timing/status/latency, never private words or credential URLs.
4. Verify that Direct Gemini Live shows model provenance and that
   voice-transcript checkpoints remain evidence-authoritative. Never
   certify complete goals/actions from untrusted model speech.
5. If audio Free Tier, actual Google model availability, CSP, Safari
   WebAudio/AudioWorklet, privacy consent or budget limits fail,
   disable the one new Live flag and leave previous stable voices usable.

Official docs:
- https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket
- https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens
- https://ai.google.dev/gemini-api/docs/live-api/capabilities
- https://ai.google.dev/gemini-api/docs/live-api/session-management
- https://ai.google.dev/gemini-api/docs/pricing
