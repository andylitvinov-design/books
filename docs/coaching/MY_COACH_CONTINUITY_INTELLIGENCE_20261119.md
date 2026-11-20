# My Coach continuous interruption + deeper reasoning (19 Nov 2026)

Scope: same consented My Coach, same server Coaching Director and validated Groq Strict JSON, same free/approved TTS/STT. No new provider or API credentials, no new data store or persistent audio, no Vercel manual deployment and no new recurring work.

## Fixed
1. Local microphone monitoring now arms from the original Play and each model turn, including while thinking, TTS loading and playing. Upon confirmed human speech during AI thinking, the outgoing model request is aborted; the same captured microphone recording is preserved with an updated generation marker. During loading/speaking, output is cancelled and the prior assistant reply is marked interrupted. False echo does not upload silence. Mic tap stays as manual fallback.
2. Interrupted assistant text stays visibly in transcript but is not falsely treated as heard: subsequent Coach Director context uses only non-interrupted assistant turns and user's original words.
3. A new spoken user turn is no longer dropped by stale busy state; request epochs reject late superseded inference/errors, while text sends remain guarded.
4. Spoken Groq thinking defaults to low for greetings/simple exchanges and medium for substantive questions; typed behavior unchanged. Still one model call, one strict checked JSON output, all Director/safety gates intact.

## Hardware and product acceptance
Protected Core / iPhone/WebKit / hh-merge-check required. iPhone Safari 30 turns across RU/EN/ES, AirPods/speaker, acoustic echo, interruption before first sound, while thinking, TTS pending, and during playback; End/hidden tab; zero ghost audio or duplicate model calls. Evaluate natural dialogue and stage correctness against annotated scenarios.

IMPORTANT: This is NOT full speech-to-speech WebRTC Realtime. The current Groq Strict Structured Outputs mode is still nonstreaming; true Realtime needs separately approved pricing, privacy, new API credentials and hardware QA. Use current cost-protected hourly Vercel publisher, verify served commit on canonical URL before claiming LIVE.
