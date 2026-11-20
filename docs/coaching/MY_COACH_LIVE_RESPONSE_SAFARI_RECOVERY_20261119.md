# My Coach live responsiveness and iPhone Safari cue recovery — 19 November 2026

Scope: one existing My Coach UI + existing Coaching Director and consented recorded-STT fallback; zero new services, keys, storage, paid calls, Vercel previews or deployments.

## Concrete failure fixed
When the iOS-27 SpeechSynthesis reset cue stalls or errors after multiple turns, its fail path previously called `silence()` and switched to `idle`, destroying the one-Play session. This change detaches the unstarted recognizer and switches to `ready` instead, preserving the conversation and giving the existing mic retry another opportunity with recorded STT. It also forbids cue-recursion after a jam while the recorder is unavailable.

## Low-risk latency improvements
For browsers with reliable Web Speech, a final transcript settles after 500ms instead of 900ms; interim fragments still wait 1900ms to avoid prematurely cutting users off. The server-owned voice-turn directive now asks for one or two direct short spoken sentences, minimizing model output and TTS duration without weakening the validated coaching stage, safety and user-evidence gates.

## Acceptance
- Existing My Coach duplex, WebKit, and core tests; focused regression tests in my-coach-duplex-barge.
- Physical iPhone Safari: 20 RU/EN turns, cue stall and free STT failure, End, tab hide, manual mic retry, AirPods and speaker, false echo and cancellation.
- Verify output is audible after interruption; client text and context remain intact after temporary mic failure.
- The older free Groq Strict Structured Outputs is not token-streamable; do not fake sub-second speech-to-speech or switch to unvalidated model output. Native full-duplex would require a separately approved realtime provider/budget and hardware proof.
- Protected merge and existing hourly production publisher only; do not claim LIVE until canonical site serves the merge.
