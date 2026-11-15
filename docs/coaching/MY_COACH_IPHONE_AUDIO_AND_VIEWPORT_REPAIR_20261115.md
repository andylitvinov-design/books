# My Coach · visible iPhone microphone + genuinely started audio · 2026-11-15

## User screenshot / exact view identity

- Reference: owner-supplied iPhone screenshot 1206×2622 physical pixels (approximately 402×874 CSS px at DPR 3), English UI, Mira chosen, Russian user text in the current conversation; canonical route `/{en,ru,es}/coaching/sessions?coach=mira`.
- Role: selected AI coach in an already active session; signed-in state **not independently established by the screenshot**. Not a human specialist screen, transcription editor, voice recorder, or catalog.
- Visible defects: green center action contains a speaker instead of an identifiable microphone, its top is visually cropped and its status breaks into a second tall row; conversation and composer compete with portrait height; the app displays "Coach is speaking…" although the owner hears no audio.
- Owner's accepted flow: one Play starts an **audible** persona welcome; microphone remains visible even while the coach speaks; normal browser speech recognition and the model alternate automatically, without MediaRecorder, uploaded audio tracks, 18-second caps, repeat-tap or voice vendor checkbox.

## Fixed UI hierarchy

1. Keep first-party brand and "Choose another coach" navigation at the top.
2. Keep the selected coach's original portrait and 2-line approach; reduce its height responsively.
3. Keep one single five-action control row (CC, Text, **microphone/Play**, Replay, End). No negative overlap with the portrait. When coach speech is active, show a **small** speaker badge on the microphone, never replace the mic icon. Use the stable `data-coach-voice-status` hook to position the localized live status *absolutely* inside the control row; CSS Modules do not expose a literal `.status` class.
4. Keep existing browser speech transcript within an independently scrolling central feed. Keep the editable textarea and real Send button in the same visible card, below the feed, never outside the visible viewport. Preserve optional privacy and guided-session actions behind a compact collapsed "More options" disclosure. Preserve one Voice privacy disclosure.
5. Use the actual `window.visualViewport.height` on iOS, not only `100dvh`, so keyboard appearance / browser chrome does not move Send offscreen. Fallback to 100dvh without VisualViewport.
6. Source layout targets 320, 354, 390 and 430 CSS px. No client data or screenshots are uploaded to compare geometry.

## Actual audio changes / failure root

- Old live voice fetched a cloud MP3 after the initiating gesture. Safari could restrict the later HTMLAudio playback. `primeCoachingAudioGesture` reused an HTMLAudioElement but was not sufficient to guarantee that source replacement after an async fetch was audible; the device fallback also ran asynchronously without a gesture.
- The initial Play now invokes persona-specific **device** speech synchronously in that user gesture. Use the existing EN/RU/ES eight-persona voice selection, no second recorded greeting, no separate provider or fee.
- The same Play also unlocks a browser `AudioContext` with an inaudible buffer (no recording or upload). Later permitted cloud TTS replies are decoded from the **single** downloaded MP3 and played through the already running AudioContext. If Web Audio is unsupported, retain the current HTMLAudioElement path. A failure never calls a second vendor for an unauthorized charge.
- Text Send during a live voice session pauses recognition but **preserves the already unlocked audio output**, then speaks the AI reply and resumes listening. Previously it called `stop()` and destroyed the audio session before waiting for AI. Text-only Send prepares output on its click gesture before awaiting the model.
- The UI uses actual playback `onStart/onEnd/onError` events; no recordings are created by My Coach. Browser speech recognition may use the operating system's own speech provider; cloud TTS may process the authored coach reply under the Play disclosure, with Fish training implications disclosed. Keep server-side auth, quota, free/ZDR and safety controls unchanged.

## Scoped code / acceptance

- `components/my-coach-speech-loop.jsx` — one Play/voice lifecycle, typed-turn continuation, mic identity and status hook.
- `components/my-coach-live-dialogue.jsx` — visual viewport, preserved audio through typed turns, compact optional disclosures.
- `components/my-coach-live-dialogue.module.css` — no offscreen controls or growing status row.
- `lib/personal-coaching/streamed-mp3-playback.mjs` — unlock/reuse of Web Audio context, fallback without re-fetch.
- Existing focused tests cover the status anchor, visible composer, context startup, one MP3 read, no MediaRecorder, voice fallback and locale parity.

**Required evidence:** focused Node tests, exact-source TypeScript/Next build, protected `core-lint-types-build` + applicable Specialist + `hh-merge-check`, protected merge, Vercel READY alias on merge SHA and public EN/RU/ES smoke. A real signed-in **physical iPhone Safari** must still confirm audible initial introduction and three consecutive Russian/English turns, sound volume/Bluetooth route, Replay, text Send, and 320–430 px / keyboard geometry. Source checks and server logs **cannot prove physical speaker output**. Do not claim that until independently observed.

**No extra infrastructure:** no new vendor, cron, browser recorder, voice upload, paid API, new workflows or DB migration. Keep original user data local to the existing consented processing paths.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=source_contract_partial; post_open_head_updates=0; cost_new_spend=NO_NEW_SERVICES
