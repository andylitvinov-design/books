# Holistic Voice Companion — Web-first Release Candidate (7 Nov 2026)

## Scope / honest status
This existing PR has been *narrowed to Web / iHelp / My House device voice only* as a safety and release dependency split. NOT LIVE until protected merge + Vercel canonical deployment + real supported mobile speaker/microphone acceptance. The earlier Telegram static-template TTS work remains in immutable Git history but must NOT be included in the production tree by this PR.

## User-visible behavior
- Existing HolisticAgentChat remains the ONLY dialogue engine; /api/holistic-agent/turn is unchanged.
- Opt-in browser speech synthesis, RU/EN/ES locale, actually installed system voice picker and public system-voice preview, speed control, per-turn listen/replay/stop and optional auto-read.
- Optional SpeechRecognition (when supported and allowed) transcribes **into the editable unsent composer**. A human taps Send; no invisible auto-send or duplicate AI turn.
- STT generation/instance fence rejects late, duplicated or cancelled results after Stop, route change and New Chat. No private transcript is cached in voice preferences; only system voice ID and rate are local.
- Existing EmotionalAvatar and Voice Companion share one device speech owner; controls hidden if NEXT_PUBLIC_HH_VOICE_COMPANION_WEB=false. Browser vendors may process speech in their cloud; explicit separate consent is required for playback and microphone/STT.

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
