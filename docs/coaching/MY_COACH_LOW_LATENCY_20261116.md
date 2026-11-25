# My Coach · safer low-latency voice handoff · 2026-11-16

## Verified root cause

The iPhone photo shows an EN UI with automatic bilingual turns and a long speech wait. In code, dynamic audio is sequential: Web Speech → full validated Groq GPT-OSS 120B reply → Fish free TTS → full MP3 Blob and WebAudio decode on Safari. The player cannot claim true streaming on iPhone. SpeechRecognition on iOS 27 cannot be aborted as soon as words appear without risking loss of the next turn; keep natural `onend` and the silent speech-synthesis recovery cue.

## Changes in this PR

- Keep the **existing** Fish `s2.1-pro-free` route, identity, TTS quota, privacy consent, once-only request, timeout, voice profile mapping and CDN policy; pass Fish `latency:'low', chunk_length:100` to accelerate provider-generated first chunks. No vendor retry, added billing or new services.
- Reduce the silence settle **outside iOS 27** from 1700/2300 to 900/1900 ms. Do not fast-abort any recognized iOS 27 utterance. Shorten the inaudible iOS recovery cue (OK/Да/Sí) and its failure timeout to 3.2 seconds; keep its `onend` gate.
- Add **ephemeral DevTools performance measures**: `hh-coach-ai-turn`, `hh-coach-tts-headers`, `hh-coach-tts-first-play`. Measures contain numeric intervals only, no texts, mic samples, user/session IDs, logs or external telemetry. They distinguish thinking, provider wait and iPhone MP3 decode delay.
- Existing user-selected RU voice candidate `mur` is **already** wired to `HH_MY_COACH_MIRA_RU_VOICE_RIGHTS_APPROVED`. Production flag absent as reviewed Nov 16; do **not** flip before verified rights, a real Russian pronunciation listening test and explicit owner approval. EN remains Sarah. Google Chirp is not enabled without independent billing/privacy consent.

## Acceptance and limitation

- Run exact-head Node tests and coaching specialists, normal protected merge, existing hourly production publish only, no immediate manual Vercel build.
- On a real iPhone Safari 27: explicit RU, 5+ consecutive voice turns without re-tapping; switch EN, make 5 more turns; listen for actual voice, not just displayed text. Check one Fish request per eligible coach response; verify safety/stop/hidden tabs and no robotic fallback.
- With a browser performance recording (no mic content), note p50/p95 for final transcript → model completion, model completion → TTS response headers, and TTS start → actual first audible frame (manual device observation). **Never claim instant/duplex voice from this change.**
- On iPhone, full MP3 download + WebAudio decode is still the bottleneck because Mobile Safari MSE support is partial and delayed HTMLMediaElement.play can be blocked. Next stage needs an approved low-latency audio transport with a tested WebAudio streaming decoder or full-duplex voice model, including contractual privacy/cost review. Do not switch off the verified one-Play fallback without real-device proof.
- Fish free offer documented through Nov 30 2026; current fail-closed cutoff remains Dec 1. User-generated speech is never uploaded by our app, but the browser speech recognizer may use an outside provider.

No new external spend, API credentials, workflows, DB tables, cron, logs or Production deploy is included.
