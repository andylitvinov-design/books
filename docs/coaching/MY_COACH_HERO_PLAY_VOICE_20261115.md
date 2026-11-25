# AI Coach · portrait Play, female persona voice, and immediate mic permission

## Screen identity and screenshot reference

- Owner's screenshot **IMG_0485.jpeg**, 706×1536 physical px, iPhone portrait screenshot. Selected fictional **Mira** coach, public `/{en,ru,es}/coaching/sessions?coach=mira` with English UI and a live transcript containing recent Mira/user turns.
- This is NOT a human practitioner video page and NOT a recorded-audio editor. Existing photo, transcript, language chooser, typed Send, privacy disclosure, and End remain in place.
- Visual change: only the **pre-session portrait** receives a clearly visible 83–92px translucent, focusable Play overlay over the right photo. After Play, it disappears on voice playback; while loading it shows a spinner. On error/idle before introduction completes, it becomes a retry Play. The single bottom microphone stays visible, and can interrupt an active session.
- Screenshot target: iPhone width 320, 354, 390, 430 CSS px and actual iOS visual viewport/keyboard. Hero stays `clamp(155px,25dvh,222px)`, feed scrolls inside its card, real Send always reachable. Do not fit by shrinking Mira's face.

## One deliberate gesture (no recording)

1. The user taps big portrait Play (or the existing microphone Play).
2. In **that same gesture** the page unlocks audio, starts `HTMLAudioElement.play()` with the fixed public natural MP3 URL, and requests microphone permission using `getUserMedia({audio:true})`. A granted, temporary MediaStream is stopped immediately, **without MediaRecorder, uploaded microphone file or stored audio**.
3. Audio is played by the browser's progressive MediaElement. The UI changes to Speaking only on `audio.onplaying`, never merely on an LLM string or synthesis request. The user sees a compact status while loading; if playback fails, the status clearly says that natural voice is unavailable. There is no silently substituted Apple/device TTS.
4. Once Mira has finished speaking (`onended`), the existing browser Web Speech recognition is activated **automatically** to capture the user's answer. It is deliberately not listening during Mira's introduction to avoid self-transcription/echo. The browser may independently ask for speech-recognition permission even after getUserMedia; we cannot override browser permission policy.
5. User answers flow to the existing Coaching Brain and authorized private TTS. The 20-minute session/timebox, multi-turn, crisis/safety, auth/consent, English/Russian/Spanish and text controls remain unchanged.

## Fixed voice identity, latency, and cost

- Fish Audio `s2.1-pro-free` was already configured. Previously both first introduction and private replies omitted `reference_id`: Fish's default generic voice could sound male for Mira.
- `lib/coaching/my-coach-fish-voice.mjs` now resolves **server-side** IDs from eight curated public Fish voice examples. Mira uses **Sarah**, the published female Fish Audio developer-demo ID `933563129e564b19a115bedd57b7406a`. Other named personas receive stable styles/voices. This does not allow clients to submit arbitrary `reference_id`.
- Introduction URL is **path-based**, e.g. `GET /api/coaching/intro/en/mira`, validated as 8×3 fixed authored texts. This replaces the fragile old `GET /api/coaching/intro?coach=mira&locale=en` and preserves compatibility through an input-validated redirect only. Voice, language and script are determined entirely on the server. No user conversation or microphone bytes reach this public endpoint.
- Successful MP3 responses are streamed immediately and cacheable for 24 hours on CDN, reducing repeat load and provider calls. Atomic origin budget still caps misses at 12/min and 40/day.
- Using MediaElement on the initial Play avoids a full `response.blob()` and MP3 decoding step before the first sound. **Free Fish does not guarantee sub-second performance**; cold first synthesis and subsequent dynamically generated replies may still take seconds. We do not enable a paid tier, create GCP projects or bypass Fish's 1-Dec-2026 free expiration guard.
- After a signed-in model response, private `/api/app/my-coach/voice/synthesize` uses the **same server-selected persona voice ID** and existing free/ZDR/quota, with no client-controlled voice ID. It remains private and cannot be exposed as a public arbitrary-TTS proxy.
- The voice gallery IDs are public examples, not claims that every voice is independently rights-cleared for commercial use. Usage remains subject to Fish Audio terms; use only a licensed/approved voice for any monetized release.

## Acceptance and limitations

- Exact-head source tests and pure mocked `HTMLAudioElement`: immediate `play()`, one response, event-led Speaking/End, cancellation, failed autoplay, 8×3 URL validation, never MediaRecorder, no male default for Mira. Core/TypeScript/Next plus applicable Specialist and protected merge check must pass.
- Vercel production alias READY at verified descendant SHA and public EN/RU/ES HTTP 200. Verify **actual** `GET /api/coaching/intro/en/mira` returns `audio/mpeg`, not JSON 400/503.
- Physical Safari on owner's iPhone: allow mic on portrait Play, hear Mira's feminine natural opening, see playback → Listening, speak 3 turns and hear the same female voice, Replay, tap End; test keyboard not hiding the mic/Send. A green build or HTML 200 does not establish audible device sound.
- No new subscriptions, paid APIs, media recorder, model, DB migration, webhooks, cron, or repeated release waves.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=syntactic_and_static_contracts; post_open_head_updates=0; no_new_spend=yes
