# My Coach · Play → spoken coach introduction → free live dialogue

Status: one pending, protected production release. This document is not proof of working iPhone audio or LIVE deployment.

## Owner-approved UX

- Selected page `/{en,ru,es}/coaching/sessions?coach=<personaId>`: single Play icon in the central control. The selected original fictional coach introduces themselves, their role, approach, and style in that locale using their existing distinct registry. No automatically generated recording, no consent modal, no 18-second timer, no on/off Fish choice.
- The live loop is **coach speech → browser SpeechRecognition → in-tab transcript → existing guarded AI turn or identified local fallback → coach speech**. Recognition commits after a short silence or natural recognizer end; subsequent turns restart automatically and retries are bounded.
- Browser speech recognition is *not* a guaranteed on-device transcription service: the browser/OS may send raw microphone audio to its STT provider. The site itself no longer creates or uploads audio files in this coaching path. No claim that the browser's provider retains nothing.
- The first Play gesture authorizes only the scope disclosed in the compact Voice privacy details. For eligible authenticated sessions, the existing server-probed provider is selected automatically (Google Chirp 3 HD where explicitly configured/approved; otherwise existing approved free Fish pilot). Do not synthesize without the Play gesture; Fish training terms are disclosed; the server retains strict `voiceConsent`, `cloudVoiceConsent`, `trainingUseConsent`, same-origin auth, provider/locale/persona validation and rate limits.
- No Google Cloud billing or new paid provider configuration is enabled by the UX change. The existing Fish free pilot ends on 2026-12-01; no paid/expired fallback. When natural TTS is absent or fails, use browser speechSynthesis, if available, instead of silent playback. Apple/Safari may block async MP3 autoplay; the existing buffered Replay/Resume recovers it without repeating synthesis. Do not claim audio is audible until verified on a real device.
- Speech is never routed into the unrelated `audio-storyboard`/Groq Whisper audio-file upload. The video/audio editor's separate transcription tools are unchanged. In-tab text conversation is still used for the AI brain; this is not an audio-file transcription pipeline.
- Mobile portrait and controls stay visible; conversation transcript independently scrolls in the remaining bounded viewport; the editable text composer stays below it and cannot fall beyond the device viewport, including Safari keyboard and reduced screen heights.
- Automatic processing after Play is a single session and can be stopped immediately. Existing session cleanup, abort and safety/stop protections remain. No new storage, account linkage, recording, daemon, CI workflow, model, key, paid service, or background job.

## Acceptance required before calling it LIVE

1. Exact-HEAD Core/required Specialist/Guard plus native protected merge into `codex/public-book-library`.
2. Vercel Production deployment for the merged SHA must be READY and serve `holistichouse.vercel.app`; verify actual app route, not only an HTTP 200.
3. On physical iPhone Safari RU and EN with real authenticated provider approval: one Play really speaks a **distinct** 8-persona presentation; follows with mic recognition over at least 3 spoken user turns with no second tap or file upload; after each turn voice playback is audible, cancel/replay works, no double-charging and no queue loops.
4. Check browser permission denied, STT unavailable, provider expired, provider latency/error, no microphone, small viewport + keyboard, rotation, reduced motion, safety/stop, hidden tab and offline fallback. Do not assert audio capability from mocks or source-level tests alone.

**GLOBAL_PR_ONE_PUBLISH_V1:** prepare all affected source/tests/docs, one remote HEAD, protected merge, independently verify LIVE; no new services or scheduled CI.
