# Holistic Voice Companion — Web-first Release Candidate (7 Nov 2026)

## Scope / honest status
This existing PR has been *narrowed to Web / iHelp / My House device voice only* as a safety and release dependency split. NOT LIVE until protected merge + Vercel canonical deployment + real supported mobile speaker/microphone acceptance. The earlier Telegram static-template TTS work remains in immutable Git history but must NOT be included in the production tree by this PR.

## User-visible behavior
- Existing HolisticAgentChat remains the ONLY dialogue engine; /api/holistic-agent/turn is unchanged.
- Opt-in browser speech synthesis, RU/EN/ES locale, actually installed system voice picker and public system-voice preview, speed control, per-turn listen/replay/stop and optional auto-read.
- Optional SpeechRecognition (when supported and allowed) transcribes **into the editable unsent composer**. A human taps Send; no invisible auto-send or duplicate AI turn.
- STT generation/instance fence rejects late, duplicated or cancelled results after Stop, route change and New Chat. No private transcript is cached in voice preferences; only system voice ID and rate are local.
- Existing EmotionalAvatar and Voice Companion share one device speech owner; controls are hidden by default; an explicit, reviewed NEXT_PUBLIC_HH_VOICE_COMPANION_WEB=true build flag is necessary to enable them. Browser vendors may process speech in their cloud; explicit separate consent is required for playback and microphone/STT.

## Exclusions / safety requirements
- NO new Telegram bot, sendVoice, subscriber tables, RLS/migration, new server endpoint, cloud TTS of private chat, paid provider, GPU, cron or background worker in this PR.
- Voice Studio's named Gemini voices mark/alexander/leon/sofia/maya/alisa are identified as **Video Studio only**. They are not fake choices for Web private chat; browser voices are actual OS voices.
- Existing sitewide microphone=() remains denied; the approved /{ru,en,es}/app/messages routes are already included in current production liveAudioHostSources; do not duplicate header rules or widen to global. iHelp on other pages may be speech-output-only.
- Never pass private user discussions to Gemini Free TTS, which may be used for provider improvement. Do not auto-enable paid fallbacks. Telegram consent/migration integration remains separate Draft and OFF.

## Release gates
1. Exact-head Core, BASE-trusted Specialist, hh-merge-check, applicable auth/privacy/browser/Design QA. No synthetic skipped-as-success claims or changes to branch protection.
2. Real device verification: physical iPhone Safari RU/EN/ES, start/stop mic, editable transcript, Send, chosen voice, switch while speaking, per-turn replay, no stale transcript after abort/new chat; audio with Bluetooth, backgrounding, muted browser. Test Chrome/Android and desktop where available. Do not claim iPhone QA from WebKit simulation.
3. Protected native merge; Vercel canonical project READY serving merged SHA or descendant; actual production guest/signed-in replay with permissions, no extra spend. Verify Rollback by NEXT_PUBLIC_HH_VOICE_COMPANION_WEB=false, which requires controlled redeploy if a compiled NEXT_PUBLIC build is used.

## Out-of-scope future gates
- Telegram original TTS Draft: migration subscriber_ai_tts_file_cache and consent columns absent in live Supabase as of 7 Nov; any static template TTS needs schema+verified Free project/quota, real OGG/Opus send, explicit subscriber, STOP and revoke-before-send. Do not enable now.
- Dynamic private TTS, natural OpenAI/Gemini realtime, Piper/Kokoro ownership/redistribution and hands-free automation require separate provider, privacy, budget and physical testing. No misleading LIVE/paid capabilities.

## References
- GLOBAL_PR_ONE_PUBLISH_V1 https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md
- Production CI policy docs/operations/CI_RELEASE_POLICY.md
- Technical specification https://docs.google.com/document/d/1wbsUKGVmbIKdGaCG3FTbvqrkTqB3KafijD6elkjRT50/edit
- PR #3740 https://github.com/andylitvinov-design/books/pull/3740

No new spend / flags / migrations / provider keys have been changed by this branch.


## Hands-free voice conversation implementation candidate — 7 Nov 2026

Existing browser voice control adds a distinct explicit **Voice conversation** start/stop.
Only users who separately consent to browser playback and browser recognition can
activate it. The same editable text chat/AI decision engine handles every final
speech-to-text utterance, automatically sends it only while this visibly active mode
is selected and narrates the displayed assistant reply with the current browser voice.
The microphone attempts to rearm 450ms after playback ends; rejected browser
rearm/silent speech ends the conversation with text fallback. Nothing records in the
background, and visibility loss, page close, explicit Stop, provider errors and
revocation cancel the active mode. Browser vendors may send dictated audio to their
services: do not promise local-only speech recognition.

Actual Safari iPhone auto-rearm and browser permissions are not yet verified; do
not advertise always-on or full-duplex interruption, and do NOT release by merely
turning Draft into Ready. The user can still do manual one-turn dictation when
auto-rearm is unavailable. No paid provider or new worker is introduced.

Exact-HEAD Core/Specialist/hh-merge-check, real iPhone RU/EN/ES mic→reply→speech→
next mic, Stop, tab hide, consent revocation and Vercel READY/serving SHA remain
mandatory LIVE gates.

## Pre-activation gate: code may merge without exposing browser voice
The production project had no NEXT_PUBLIC_HH_VOICE_COMPANION_WEB variable at readback on 7 November 2026. The client now requires an exact `true` build-time flag; an absent, empty or `false` value keeps Voice Companion OFF. Do not set this flag for production before required physical iPhone Safari E2E, authorization, privacy and provider/voice review. Because NEXT_PUBLIC_* is baked into the Next build, activation/deactivation requires a verified deployment; do not assume that toggling an env variable changes a serving deployment. A safe source-only merge is not functional LIVE acceptance.


## Reconcile with authenticated encrypted text archive

Protected backend PR #3818 and Messenger UI PR #3821 are separate from
Web Voice. When source history is reconciled, the SAME `HolisticAgentChat` must keep:
- one AI message array and authoritative reply engine, no parallel chat;
- separate, explicit, server-authenticated archive opt-in;
- a completed voice turn saved as the identical user/assistant text pair
  only after server consent (not the microphone recording);
- historical chat restore stopping the voice loop and setting the last
  spoken turn ref to the restored final message, so old replies do not
  auto-play or reopen the microphone;
- default-OFF feature flags for BOTH Web Voice and encrypted archive;
- user-accessible erasure even after history writes are disabled.

Voice QA and exact-head Core/Specialist/merge-check remain mandatory before
a protected Web Voice release. Archive schema and privacy checks do NOT prove
Safari speech-recognition or live browser audio works. Telegram private
speech remains a distinct, not-yet-enabled provider/consent lane.

## Disabled-state no-observation guard (2026-11-07)
The Web Voice feature's explicit build flag defaults OFF. Its React hook now also skips browser SpeechSynthesis/Recognition discovery, event listener registration and localStorage read/write in the OFF state; public site visitors do not initialize a hidden Voice Companion or write its preferences. The existing Emotional Avatar's separate user-triggered fallback remains independent. No new service or provider is called. Enable only after approved physical device/browser QA and exact-HEAD protected release gate.
