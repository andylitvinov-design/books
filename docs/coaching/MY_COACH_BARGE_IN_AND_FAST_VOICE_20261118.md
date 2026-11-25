# My Coach · voice interruption / fast response · 2026-11-18

## Goal
After the initial Play, a visitor should be able to speak while Mira (or another
AI coach) is still talking. The outgoing audio is locally ducked when microphone
energy first suggests a user voice; after sustained speech, it is cancelled
immediately without waiting for the MP3 to end. The SAME captured microphone
track records the user's following utterance, and one consented existing free
Groq Whisper transcription sends confirmed text to the existing Coaching Director.
A confirmed false echo is discarded locally. No additional TTS call is made.

## Voice lifecycle
1. Coach begins voice output. If MediaRecorder, AudioContext and getUserMedia
   are available, the app starts a local energy monitor on the first-Play
   permission. No recording or upload during silence.
2. At two 100 ms loud samples, start candidate capture and duck only coach
   audio to 8% via dedicated WebAudio GainNode. The mic analyser stays live.
3. After three further sustained loud samples **while ducked**, cancel the
   speaker, abort its existing TTS fetch, retain client capture and show
   Listening. If the energy disappears, discard the candidate and restore
   speaker volume. Local transcript echo matching adds another check.
4. After roughly 900 ms silence on a confirmed interruption, finish the
   ephemeral candidate recording, call the already-present one-request
   /api/holistic-support/audio-storyboard bridge, then ask the original
   Coaching Director the next question. Speech does not wait for the old
   outgoing MP3 to complete.
5. If the coach finishes naturally first, reuse the existing mic track for
   the next reply rather than requesting a second mic capture.
6. The microphone button while the coach is speaking / TTS pending /
   thinking explicitly interrupts its output or pending model and re-arms
   listening without ending the session. The End button still ends it.
7. On iPhones with supported WebCodecs, the existing verified single-Play
   MP3 decoder becomes the default path. The safe escape hatch
   ?coachStream=0 disables the decoder. Unsupported MP3 WebCodecs reuses
   one already-downloaded MP3 with the original audio fallback.

## Fast model path
Voice-turn requests use the existing consented free Groq model with
reasoning_effort=low and bounded 1450-token structured JSON completion.
Typed turns keep their prior effort policy. Server Director chooses the
method, verifies the **complete** structured model reply, applies safety
and stage/evidence gates, then allows TTS. This is not a new AI or
unreviewed partial token-to-audio streaming. Answer brevity remains one
or two natural sentences (existing conversational prompt). Truly live
partial generation must not bypass Director validation.

## Safety and financial constraints
- No new keys, third-party services, recurring jobs, DB/storage, sockets,
  model calls, Vercel build/deploy workflow, or paid Fish/Google TTS.
- Recorder can only transcribe after confirmed speech. Echo and silent
  candidate segments are discarded. No audio stored by first-party site;
  the existing browser/Whisper consent and third-party privacy terms apply.
- An early interruption aborts TTS and keeps the active capture. A failed
  provider, unsupported browser, echo false positive, background tab or End
  never automatically repeats the chargeable TTS or LLM call.
- Fish pilot remains free-only, expiry is Dec 1 2026 as already coded.
  Mira's Russian native voice remains rights-gated; do NOT enable unlicensed
  voice candidates or paid providers.

## Acceptance and remaining hardware QA
- Existing and new synthetic tests: 10 consecutive voice turns, volume duck,
  echo restore, interruption, exactly one upload and model request, manual
  mic interruption, cancellation, unsupported device paths, EN/RU locale,
  single initial Play, private rate and safety gates.
- Real **iPhone Safari 27.2**, on the canonical Production URL: Play once;
  interrupt during the first spoken MP3, finish your statement, hear Mira's
  next answer without a second tap; try five EN and five RU turns. Test
  speaker vs headphones, false echo, very short Да/No, noisy rooms,
  manual interrupt, full End, foreground/background, denied permission.
- Compare end-of-user-speech to first audible response at p50 and p95
  over at least 10 turns. Verify no acoustic feedback, missing syllables
  or accidental extra requests. Mobile Safari's media-session handling
  varies across device versions; CI/WebKit mocks are **not** hardware proof.
- Protected exact-HEAD CI / specialist gates; merge via existing native
  mechanism and publish only through the existing hourly Vercel workflow;
  verify production READY commit ancestry and canonical site alias.

The fallback remains available. Never claim 0ms latency or true full
speech-to-speech duplex without measurements and a provider that supports it.
