# My Coach · experimental progressive iPhone MP3 / WebCodecs · 16 Nov 2026

## Goal
The authenticated My Coach TTS can return MP3 bytes progressively, but the iPhone player waits for a complete Blob. This opt-in WebCodecs MP3 frame decoder feeds the already-unlocked WebAudio context, preserving browser speech recognition, coaching director, language, consent, account auth, price gates and vendor requests.

## Test on production after protected merge and hourly publisher
- https://holistichouse.vercel.app/ru/coaching/sessions?coach=mira&coachStream=1
- Compare against the exact same route WITHOUT coachStream. Initial greeting already streams via HTMLAudioElement; progressive codec applies to subsequent dynamic replies.
- Enabled only by the explicit URL parameter, a user-unlocked AudioContext, and successful AudioDecoder.isConfigSupported for the MP3 codec. Unsupported browsers return to existing full-MP3 playback using the SAME TTS response; there is never a new provider request.
- Frames are reconstructed across HTTP boundaries and transformed into short PCM buffers. First audio can start after approximately 140ms of decoded material rather than waiting for the whole MP3. An early decoder failure drains and uses the same original MP3; a later failure cannot replay previously spoken words.
- End/Stop/navigation cancels the reader, decoder and scheduled audio. No new storage, telemetry, audio upload, recording, model or service.

## Physical-device acceptance REQUIRED before universal rollout
1. Real iPhone Safari 27.2, Play once; five Russian voice turns with audible responses; switch EN without stopping and speak another five turns. Verify short Да/No, Stop while speaking, Replay, iOS 27 microphone recovery, background/foreground and permissions.
2. Compare transcript-ready to first audible word for at least ten turns using default and opt-in URLs. Record p50/p95, missing syllables/glitches, and runtime AudioDecoder MP3 support.
3. No physical iPhone is connected to this session; synthetic decoder/CI and emulated WebKit cannot prove genuine audible hardware acceptance. Keep beta opt-in until owner-device listening passes.
4. Russian Mira voice remains licensing-gated; Fish free pilot retains Dec 1 2026 fail-closed cutoff and no automatic paid switch. No new GCP/FFmpeg/third-party billing.

Release only after protected CI and through existing hourly Vercel workflow; production READY SHA and canonical alias must be verified.
