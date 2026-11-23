# Samir: three video reactions — 23 November 2026

Single visual layer for the seventh Holistic House coach (`genie`), reusing the existing Coach media component. No second coach engine, additional paid video inference, new storage, background scheduler, or new deployment job.

## Approved, existing media

- Idle: completed HeyGen Video 1 record `b984e6733fa94bcf9b13713cd1a88676` (8s, 1080×1350). Production build creates a muted, same-origin 768×960 H.264 copy: `genie-natural-idle-v1.mp4`.
- Listening: completed HeyGen Video 1 record `344cf059da0149dda3e9d68f65d4e185` (8s, 1080×1350), mirrored to `genie-natural-listening-v1.mp4`.
- Encouraging: **approved, edited, no-talking V2** `samir_natural_encouraging_loop_v2_smooth_768p_silent.mp4`, committed byte-for-byte as `genie-natural-encourage-v2.mp4` (5s, 768×960, silent). Source SHA-256: `03d2ac8f3e5c20ee1926075ac6d14c767b3d2210ed93514c3536fba258161abf`.

The legacy `genie-calm-loop-v1.gif` and poster are retained as historical/static fallbacks. Never use the rejected talking footage. Browser playback uses only local MP4s; audio is the separately consented Gemini/coach voice stream.

## Deterministic scene algorithm

| Real UI state | Video |
|---|---|
| Before Play, greeting, idle, neutral or difficult coach reply, pause | Idle |
| Client speaks, microphone listening; coach thinking | Listening |
| During a coach answer with approved scene `encourage`, `action`, `insight`, or `closure` | Encouraging |
| Distress / empathy | Idle, no imposed positivity |
| Client interrupts a speaking coach | Listening immediately |

`selectCoachVisualScene` already classifies reviewed dialogue and prioritizes distress; `samirMotionTake` only maps existing local cues. No new client inference, network calls or extra tracking.

Samir-only video layers crossfade 300ms after the incoming clip starts; the previous clip pauses after fade. Reduced-motion, tab visibility, viewport gating, poster and muted playsInline behavior remain in the shared player.

## Acceptance before declaring LIVE
Protected exact-head Core, Coach Specialist, WebKit/browser, hh-merge-check; production build log `HH_SAMIR_MOTION 2/2`; HTTP 200 and H264 without audio for all three first-party MP4s; real iPhone RU/EN/ES Play, barge-in, speaking/listening transitions, no lip movement, no layout change. Use only protected auto-merge and existing budget-capped hourly Vercel publisher; verify served SHA and domain before closing.
