# My Coach — one-shot iPhone audio health recovery (2026-11-19)
Canonical My Coach only. The existing user-consented MediaRecorder/Whisper STT may receive an authorized but muted, ended, suspended, or permanently flat microphone from Safari. Previously the UI could indicate Listening while uploading nothing indefinitely.
- Detect track.muted/ended and non-running WebAudio during recorded listening; let brief mutes self-resolve for 550 ms.
- Release and reacquire once, locally, with a fresh AudioContext. 4.2s digitally neutral PCM permits one retry, but a second flatline alone does not fail quiet users.
- Persistent muted/ended after one retry returns MIC_NO_SIGNAL, closes the recorder and leaves original coach session in READY with a localized retry-or-type message. No silent cloud uploads or new provider call.
- Fix Error.name masking Error.message, including AUDIO_STT_429 and MIC_NO_SIGNAL.
- Does not monitor or reacquire during speaker playback unless already listening, preserving echo and barge-in protections.
- Exact-HEAD CI, consent/voice tests, protected PR merge and normal existing hourly Vercel publisher; real iPhone acoustic test needed for LIVE acceptance.
- No extra paid service, new scheduled task, provider config, persisted audio, or manual production deploy.
