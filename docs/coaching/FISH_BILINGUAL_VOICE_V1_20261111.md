# Holistic House · Bilingual character voices for existing Coaching Live Voice
Date: 2026-11-11
Base: codex/public-book-library
Scope: Fish Audio speech only; keep the existing Coaching Brain, signed-in session, provider safety gates and device voice fallback.

## What is included
- Additional RU and EN **original licensed** character voice slots in the existing Live Voice modal. Spanish stays on device voice.
- Device voice is always the default and remains free. Voice selector and cloud vendor disclosure are shown only when the build-time opt-in flag is enabled.
- An account-bound server-side POST streams Fish MP3; no external TTS credentials or client response text are placed in query strings. Client playback is progressive where the browser supports MSE MP3, with a Blob fallback on iPhone and other browsers that lack it.
- Cloud requests require active owned coaching session, verified actor, exact account header, same origin, current dialogue consent, separate cloud voice consent, bounded input and two account rate buckets.
- Cloud voice failure returns to the existing local voice. Interrupt, pause, route change and tab backgrounding abort audio fetching and playback.
- Safety and offline replies always use the device voice and do not go to the TTS provider. Cloud is a presentation layer, not an independent coaching model.

## Production policy / activation checklist (default OFF)
Build-time client flag:
```
NEXT_PUBLIC_HH_COACHING_FISH_TTS_UI=true
```
Server runtime settings (do not put secrets in NEXT_PUBLIC_):
```
HH_COACHING_LIVE_VOICE_ENABLED=true
HH_COACHING_LIVE_VOICE_APPROVED=true
HH_COACHING_BRAIN_ENABLED=true
HH_COACHING_FISH_TTS_ENABLED=true
HH_COACHING_FISH_TTS_APPROVED=true
HH_COACHING_FISH_API_KEY=(server-only)
HH_COACHING_FISH_VOICE_EN_ID=(approved 32-character Fish voice reference)
HH_COACHING_FISH_VOICE_RU_ID=(approved 32-character Fish voice reference)
HH_COACHING_FISH_MODEL=s2.1-pro-free
```
For free tier only, additionally require:
```
HH_COACHING_FISH_FREE_CLIENT_DATA_APPROVED=true
```
This separate switch is intentionally required because Fish Audio states free-tier text **may be used to improve models**. **Do not enable this for real confidential coaching conversations without an explicit privacy review and user consent.** Paid `s2.1-pro` is chosen with `HH_COACHING_FISH_MODEL=s2.1-pro`; vendor data-processing terms still require review. Confirm no unlicensed community/film/dub actor voice is used. Configure both EN and RU original/licensed references before enabling either.

## Pricing (vendor advertised, verified 2026-11-11)
- Free API `s2.1-pro-free`: USD $0 under fair-use policy, **scheduled to remain free only through November 30, 2026**; no SLA/retention guarantees.
- Paid `s2.1-pro`: USD $15 per million UTF-8 bytes (not per 1M characters); 900 text characters / 3,000 UTF-8 bytes per call.
- At most 6 calls per minute and 40 per account per rolling day; worst-case paid TTS charge 40 × 3,000 / 1,000,000 × $15 = **$1.80 per account per day**. This is a calculated TTS-only API cap, not an overall invoice cap; account multipliers, provider usage quirks, OpenRouter and external browser recognition remain separate.
- Fish transcription API is NOT added in this change. Existing browser recognition remains the free ASR layer.

## Acceptance required before enabling production
1. Verify CI/unit and Next build on the exact PR head SHA; check confidential data never leak to logs or storage.
2. Configure two original licensed voice references, vendor contract and API key only in server Vercel environment. No copyrighted character/actor/dubbing voice without permission.
3. Confirm real vendor response MIME `audio/mpeg`, that free tier supports these voices, and actual charges in Fish dashboard, without real personal data in the initial probe.
4. Signed-in real-device RU and EN tests on Chrome, Safari iPhone and macOS WebKit: mic start, consent, simultaneous language/voice switching, first audio, interruption while streaming, pause, background cleanup, reduced bandwidth, iOS playback permission failure, fallback to device.
5. Prove rejections for unauthenticated/session mismatch, invalid request, unapproved free-tier data use, disabled features, 6/minute and 40/day.
6. Production READY + manual approval for vendor terms and cost before turning flags ON.

## Non-goals
- Exact cloned Harry Potter voices. Voice names are neutral; users must own rights/consent to any recorded model sample.
- Continuous full-duplex WebRTC barge-in. Current Live Voice is turn-based (STT → Coaching Brain → TTS), with interrupt control; it is not yet true duplex low-latency speech-to-speech.
- Moving coaching report, private spoken turns or plan into vendor storage.
