# My Coach Basic — voice pipeline, 26 Nov 2026

Basic remains Groq; Pro remains Gemini Live. No new provider, paid service, quota expansion, permanent raw audio or speculative paid model calls.

References (public documentation):
- https://console.groq.com/docs/speech-to-text — Whisper Turbo, 16 kHz mono WAV, language hint, 10s minimum billed audio.
- https://docs.livekit.io/agents/logic/turns/tuning/ — adaptive endpointing, interruption, preemptive generation tradeoffs.
- https://docs.livekit.io/agents/integrations/groq/ — modular Groq pipeline.
- https://docs.vapi.ai/providers/model/groq — GPT-OSS 20B/120B.
- https://www.hume.ai/blog/case-study-hume-groq — separate responsive speech layer; vendor's latency is not comparable to our end-to-end.
- https://github.com/pipecat-ai/docs/blob/main/pipecat/learn/speech-to-text.mdx — local VAD, segmented HTTP STT, trailing silence.
- https://app.voicethere.dev/docs/benchmarks — small English-only example, not our benchmark.

Implemented in #5714: adaptive 750/1050ms local endpoint, 50ms VAD, capability-checked duplex and cancel fencing, authenticated one-shot text STT, short 16k mono WAV with local 400ms pre-roll using existing worklet; fallback same recording M4A/WebM if unavailable, long or discontinuous; one network request only. 120ms coalescing of early approved TTS prefix with final answer, ordinary spoken narrative low reasoning; long/explicit deeper queries medium. Preserve Director, fact verification, consent, free tier/ZDR and persona voices. Numeric timing only (STT, endpoint-to-text, model, TTS headers/first play). No change to default MP3 WebCodecs opt-in.

Release checklist (targets, not measurements): real RU/EN/ES iPhone Safari and desktop; 20-minute sessions; p50/p95 endpoint-to-text and end-to-first-audio; quick turns, long reflections, first-syllable capture, interruption while thinking/speaking, echo/backchannels, no-signal, media route, pause/end, quota. Target p50 end-to-audible response <=2.5s; interruption <=400ms where supported. Do not claim native full-duplex or guarantee time. Verify budget against request limits and minimum audio charge; keep alternate provider and codec changes gated. Further adaptive semantic turn detection and false-interruption resume require device evidence; do not replay stale or unreviewed content.
