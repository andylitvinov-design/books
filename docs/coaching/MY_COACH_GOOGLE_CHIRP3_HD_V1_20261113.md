# Holistic House · My Coach · Google Chirp 3 HD (primary natural voice)

Status: candidate source implementation. This document does **not** assert enabled billing, deployed feature, real Google response, verified free quota, or iPhone E2E.

## Product and topology

Existing My Coach only; no second chat, AI model, database, cron, GPU or voice selector. Speech input remains browser SpeechRecognition and editable transcript. Coach replies come from the *existing* guarded AI or clearly labeled offline authored prompts. With separate cloud speech consent, the existing `/api/app/my-coach/voice/synthesize` endpoint selects **Google Chirp 3 HD first**. The time-limited original Fish free pilot remains available only when Google has not been configured and the Fish opt-in terms are separately displayed. Never switch providers after an already-consented request.

The client UI shows the provider name and disclosure in RU/EN/ES and never calls Google directly; only server-side, authenticated, same-origin, short plain-text requests reach Google. The server returns validated MP3 bytes. Existing iPhone Blob fallback and MSE playback manage Stop, page hide and cancellation. A cloud request that fails does **not** silently downgrade to robotic device speech; the coach's question remains visible.

Personas are mapped to immutable voice IDs, not an arbitrary client-supplied Google voice. Mira/Sofia/Lea/Iris: Aoede; Max/Alex/Noah/Ray: Charon; language prefixes ru-RU, en-US, es-ES. Changing approved voices must be reviewed against Google's actual voices list and local listening tests.

## Real cost and privacy boundary

Google pricing reviewed 2026-11-13: Chirp 3 HD first **1,000,000 characters per month free**, then **$30 / 1M**. Cloud Text-to-Speech requires a **billing-enabled** Google Cloud project; it is NOT automatically $0 without controls. The app limits individual spoken requests to 500 JS string units / 1600 UTF-8 bytes; a DB-atomic global limiter permits at most 40 TTS requests per rolling day and 4 per actor-minute / 18 per actor-day. Even in a 31-day month, this API route can request no more than `40*500*31 = 620,000` characters. Other Cloud projects/keys/services can incur costs; **reuse an existing owner-controlled GCP project only after auditing all other Cloud TTS consumption; otherwise use an isolated project**, check its monthly usage and set GCP billing alerts. Google Cloud budget alerts are NOT a guaranteed hard billing stop. Exceeding the limit must fail closed without auto-switch to paid voices. No client messages, audio bytes or credentials are persisted or sent to analytics by this route.

Opt-in control should remain OFF until client separately authorizes transfer of **coach-generated text** to Google. No private user audio is sent to Google Cloud TTS. Browser recognition itself may still use a browser provider; this independent disclosure must remain. Crisis/safety/boundary turns never go through cloud synthesis.

## Secure Google Cloud setup (operator action required)

Existing Google/YouTube OAuth or Gemini API keys are NOT Cloud Text-to-Speech credentials. Never copy those keys into the TTS configuration. Do not create a new billable GCP resource or enable billing in an unrelated project without explicit permission and an independently verified quota/cost plan.

1. In **Google Cloud Console**, select an existing owner-controlled GCP project if its TTS usage is isolated, or use a dedicated project only where required. Enabling billing must be separately authorized and verified. Review Google's free-tier pricing and data terms. Enable **Cloud Text-to-Speech API** and restrict its API requests/permissions to this service.
2. Configure a minimal-permission Google Cloud service account permitted to call Cloud TTS (NOT Owner/Editor). Longer-term prefer federated identity rather than a permanent service-account key. For the first release, only if the key policy permits, store the full one-line JSON credentials as a **sensitive server-side Vercel Production environment variable**; never post the key in a chat, repo, PR, browser, or logs.
3. Set the following **server-only** variables in the existing Vercel Project `codex-public-book-library`. Keep feature flags OFF until the Google service account, approved, reviewed billing project, usage quota, and explicit privacy/financial acknowledgement are verified:
   - `HH_GOOGLE_TTS_PROJECT_ID` = approved Google Cloud project ID
   - `HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON` = secure service-account JSON secret (not `NEXT_PUBLIC`)
   - `HH_MY_COACH_GOOGLE_CHIRP_ENABLED=true`
   - `HH_MY_COACH_GOOGLE_CHIRP_APPROVED=true`
   - `HH_MY_COACH_GOOGLE_CHIRP_COST_APPROVED=true`
4. Release through the existing GLOBAL_PR_ONE_PUBLISH_V1 → exact HEAD Core/Specialist/Guard/Browser → protected merge → Vercel READY exact SHA and alias, with no bypass and no paid new infra.
5. In authenticated real iPhone Safari and desktop, confirm consent checkbox, first RU/EN AI coach question, Spanish optional, selected persona's actual Chirp MP3, background/Stop/Replay/consent withdrawal, microphone transcription, and no robotic fallback on Google failure. Test model unavailable and Cloud billing/config disabled. Use a synthetic test phrase (no private client content), inspect actual provider usage and errors. Record latency, data retention and account rate limit.
6. Do NOT mark voice LIVE because the status API says `available`, a PR merged, or a generic route returns HTTP 200.

## API and security detail

- `GET /api/app/my-coach/voice/synthesize`: authenticated capability only: `{available,provider,model,requiresSeparateConsent}`.
- `POST`: require same-origin + signed-in user + exact `provider` matching capability + `voiceConsent` + `cloudVoiceConsent` + bounded `locale/personaId/text`. Sends only text to Google via fixed `oauth2.googleapis.com/token` and `texttospeech.googleapis.com/v1/text:synthesize` endpoints. OAuth signed JWT on server; no Google API key returned to browser. The route validates base64 MP3 and responds with private/no-store audio/mpeg.
- No SSML, arbitrary Google voice name or URL from client, cross-role data, new RLS table, background voice capture, implicit paid upgrade, clone ID or automatic escalation.
- The OAuth bearer token remains in memory for the provider call and is never logged.

Google references:
- https://cloud.google.com/text-to-speech/pricing
- https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- https://docs.cloud.google.com/text-to-speech/docs/authentication
- https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
- https://docs.cloud.google.com/text-to-speech/quotas

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
