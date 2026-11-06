# Holistic Voice Companion v1.0 — Implementation & release evidence

Status: implementation candidate, **NOT LIVE** until the gates at the bottom are independently verified.

## Architecture inventory (production, 2026-11-06)

- Web and iHelp use the **same** `HolisticAgentChat` in `components/holistic-agent-chat.tsx` / `components/sitewide-ihelp.tsx`; authenticated client messages embed that same component in `components/app/messages-orders-clients.jsx`. `/api/holistic-agent/turn` remains the authoritative AI decision and history source.
- Telegram inbound OGG/Opus → Gemini STT already exists in `lib/app/subscriber-ai-voice.mjs` and uses a separate `voice_consent_at`, protected Telegram subscriber sessions, original `subscriber_ai_outbox`, stable webhook and existing housekeeping.
- Voice Studio already has `voiceStudioKey` and `requestStudioAudio` with a separate confirmed-free gate; its optional **paid** OpenRouter backup must **never** be invoked by Companion. `ffmpeg-static` is already a production dependency, not a new service.
- There are existing overlapping but functionally distinct PRs #3647 (Telegram three lanes; Draft), #3434 (TTS sample test; Draft), #3609 (real speaker voice sharing), #3734 (video storyboard STT). Do not duplicate their queues, STT, transport, secrets or media workflow.

## Components and feature flags

1. `lib/voice-companion/browser-voice.mjs`: safe speech-text prep/chunks, RU/EN/ES locales and policy routing. No network provider.
2. `components/voice-companion-controls.tsx`: reused `createDeviceSpeech` from the existing Emotional Avatar adapter (single speech owner; no competing system audio), Web SpeechSynthesis text-to-speech, Web SpeechRecognition dictation when supported, per-turn play, greeting, replay, cancel, system voice, rate and language selector. Initial playback, STT and auto-read are all **OFF**; separate opt-ins. Browser vendors **may** process media in their cloud — tell users before consent, and never promise offline processing.
3. One existing `HolisticAgentChat` and its newly merged `EmotionalAvatar` now share one voice hook and typed device speech adapter (non-Companion flag-off fallback remains unchanged). The chat is still the only AI decision engine. Dictation fills its existing unsent text composer for review; narration never creates a second AI turn. `NEXT_PUBLIC_HH_VOICE_COMPANION_WEB=false` disables new UI. If unset, browser UI is available but audio remains opt-in.
4. `lib/app/subscriber-ai-tts.mjs` adds public-template-only Gemini Free adapter and real OGG/Opus/Telegram `sendVoice`, with existing FFmpeg. New Telegram commands `/speak`, `/speak_off` use their **own** consent; `/voice`/`/voice_off` still govern **incoming** STT. New `/speak` consent is not inferred from AI consent or STT consent.
5. Existing private outbox gets one new job kind `tts_output`, no new queue, cron, worker, host, GPU or TTS paid service. A small private bot-specific `file_id` cache prevents repeated template synthesis. Initial global cap 8 TTS/day, 2/minute; no unbounded retries. On quota/provider/codec failure, a human-readable text fallback is sent. Unknown Telegram sends are never replayed automatically.

### Server free-only activation (all required)

- `HH_SUBSCRIBER_AI_TTS_SCHEMA_READY=true` **only after** verified Supabase migration `20261106203000_hh_subscriber_ai_tts_consent_cache.sql`.
- `HH_SUBSCRIBER_AI_TTS_ENABLED=true` only after operator tests a real Telegram bot and confirms migration.
- `HH_SUBSCRIBER_AI_TTS_FREE_CONFIRMED=true` **only after** operator inspects the actual Gemini project, model and API-key billing policy and establishes a non-billable quota. If credits or any request can bill, leave disabled.
- Existing free Voice Studio gating remains required: `HH_VOICE_STUDIO_ENABLED=true`, `HH_VOICE_STUDIO_FREE_TIER_CONFIRMED=true` and dedicated `HH_VOICE_STUDIO_GEMINI_API_KEY` or separately approved reuse flag. These must not be assumed active just because variable *names* exist.
- **Do not** turn on `HH_VOICE_STUDIO_PAID_BACKUP_APPROVED`, allocate paid infrastructure, raise Vercel/Supabase tier or add scheduled workers for this release.

## Privacy decisions and limitations

- Gemini Free may use input for provider improvement. Thus **only a finite, fixed, reviewed, public greeting** is eligible for Telegram synthesis. No private exchanges, test results, personal names or clinical data are submitted to this provider. Consent allows the static public voice; it does not permit private free-cloud synthesis.
- Browser `SpeechSynthesis`/`SpeechRecognition` may be vendor-cloud-backed; these are optional **separate** user choices, not an offline guarantee. Client must explicitly send the recognized transcript after reviewing it.
- Telegram voice only works in a consented existing bot/chat. `tts_consent_at` is independent of STT, can be withdrawn, is rechecked after synthesis before delivery, and is erased on `/ai_off` or `/stop`.
- Private Telegram replies remain **text-only** until a private, legally cleared and proven non-billable outgoing voice provider is available. The current static-phrase feature does not fulfill the requirement to speak every private Telegram reply; do not market it as such.
- Piper WASM or server fallback is **not activated**: voice model redistribution licenses, memory/cpu budget, RU/EN/ES quality, and real iPhone compatibility require a separate technical test. Browser text is the default fail-closed fallback.

## Security and operational tests

- Run `node --test tests/voice-companion-browser.test.mjs tests/subscriber-ai-tts.test.mjs tests/voice-companion-integration.test.mjs`, existing `tests/subscriber-ai-voice.test.mjs`, `tests/holistic-agent-chat-first.test.mjs`, `tests/holistic-light-design-qa.test.mjs` and changed-path syntax/type/build.
- Confirm one exact-HEAD Core + BASE-trusted Specialist + `hh-merge-check`, and that provider calls **never** run until attestations, time-bound consent and rate limits pass. Test 429, network error, invalid MIME, failed Opus codec, duplicate update_id, cache hit, `/ai_off`, `/speak_off`, `/stop` and stale leased job.
- Test real Safari **on a physical iPhone**: RU, EN, ES, gesture-triggered greeting, new answer, repeat/cancel, dictation→composer→send, language and voice, focus/keyboard and background/close behavior.
- Test **real Telegram** from authorized test subscriber: signed webhook, `/ai`, `/voice` (STT) and `/speak` (TTS) separate consent, one real Gemini Free fixed greeting, playable OGG/Opus, cache reuse, revoke and text fallback. Test **without** private content in provider request.
- Release checklist: (a) PR exact-HEAD CI passes, (b) protected merge receipt, (c) Vercel canonical project READY serving SHA equal to or descended from merge SHA, (d) real physical iPhone + Telegram provider end-to-end receipts, (e) no added charges. **An HTTP 200, passing unit test or preview is not LIVE proof.**

Roll back without spend: `NEXT_PUBLIC_HH_VOICE_COMPANION_WEB=false`, `HH_SUBSCRIBER_AI_TTS_ENABLED=false`, then revoke Telegram outgoing consent. Private database schema is additive and may stay harmlessly unused. Feature flags do not bypass production security reviews.

## Browser microphone policy finding — 6 November 2026

The public site deliberately defaults to `Permissions-Policy: microphone=()`, so an exposed `SpeechRecognition` constructor **does not prove** microphone availability in Chromium. This PR preserves that global protection and permits `microphone=(self)` **only** for the existing `/ru/app/messages`, `/en/app/messages`, `/es/app/messages` document routes. Dictation still requires a user click, browser permission and separate STT consent; other iHelp routes have speech playback and text input but may not have dictation. The control checks the policy API where available and disables unavailable speech input instead of offering a false success. Real iPhone/Chrome permission and transcription acceptance remains mandatory; the presence of the header is not E2E proof.
