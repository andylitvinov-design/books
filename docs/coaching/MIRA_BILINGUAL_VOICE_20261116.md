# Mira · bilingual voice and recognition · 2026-11-16

## Root cause
Web Speech `recognition.lang` is a **single BCP-47 language**, not multilingual audio language identification. The original Auto pinned each new recognition to the device language or last decoded transcript, so English spoken after Russian could be decoded into Cyrillic and misrouted to a Russian coach turn. The RU/EN select was disabled throughout an active voice session. Mira's existing Fish voice is the English Sarah voice even for Russian.

## Fix
- The existing compact transcript language select now works *during* voice sessions: Auto / Русский / English (plus Spanish on ES UI). It changes the next recognizer immediately only when it has not heard any words; otherwise the ongoing utterance ends naturally and the next recognizer uses the new language. This preserves iOS 27's single-Play recovery cue.
- Speech locale comes from the recognizer and the explicit manual selection, not the model text or UI locale. The server's `locale` and the coach's next answer/TTS receive the corrected spoken-turn locale; typed turns still use text detection.
- Auto remains **best effort** using device/previous recognized language and script; it does **not** identify language from raw audio. Genuine RU↔EN spontaneous switching without manual selection requires a vetted multilingual ASR path, separate audio data protection consent, verified zero-extra-cost budget, and physical device QA. Do not mislabel this Web Speech solution as multilingual audio ASR.
- For Russian Mira, prepare the public library *mur* adult clear professional RU female voice reference (`a2e5329824cf499bb23f05d3df98a983`), scoped to RU Mira for **both** the initial streamed greeting and ongoing personal TTS. English Sarah remains for EN. The candidate is **not enabled** by default: set server-only `HH_MY_COACH_MIRA_RU_VOICE_RIGHTS_APPROVED=true` only **after** verified commercial/reuse permissions. Fish's public pricing FAQ says free output may be non-commercial. Never assume the source voice's public availability conveys reuse rights.

## Acceptance
1. Real iPhone Safari: one Play, RU manually set, three spoken Russian turns, coach replies and audible Russian TTS.
2. Without ending session set EN, say “I want to talk about my mother”; transcript **must use English words**, answer and TTS in English, then switch back RU. Only the current silent recognizer may restart; do not restart recognized iOS speech before natural end.
3. Auto on English-device and Russian-device setups: verify initial routing and later transcript-script hint. Record real failure rates; do not claim perfect mixed-language audio detection.
4. Check selection never duplicates composer transcript or sends audio beyond the existing Web Speech provider. Check privacy, auth, rate limits, no new TTS service, no new spend.
5. Before RU voice goes LIVE: rights approval, approved account license, verified RU female source clip, real Fish API voice synthesis / accented speech assessment and physical iPhone listening. If flag is absent, existing voice remains.
6. Protected exact-head Core + Coach Specialist + mobile WebKit tests, native protected merge. Production only through the already existing **hourly Vercel publisher**. `MERGED != LIVE != physical voice E2E`.

No mic recording/storage, external ASR request, additional model, workflow, schedule, billable provider or immediate production deployment is introduced.

Owner's latest voice selection (16 Nov): prior Arisha and Sasha are rejected. The only proposed Mira RU option is **mur**, a middle-aged clear, calm professional Russian female from https://fish.audio/m/a2e5329824cf499bb23f05d3df98a983/. Still OFF unless commercial voice rights are verified and the existing approval flag is explicitly configured. A standalone identical Merlin/voice identity change is owned by #4748.
