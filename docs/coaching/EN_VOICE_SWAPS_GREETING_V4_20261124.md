# Owner-approved English coach voice exchange — 2026-11-24

English only: Mira Sulafat, Sofia Gacrux, Alex Orus, Max Charon, Samir Achird, Harry Orus, Merlin Algenib unchanged. RU (including Samir Puck) and ES unchanged. Keep persona IDs, portraits and authored introductions. Both the existing Gemini Live default and unary TTS use the central catalog. Explicit user-selected voice overrides remain available for Live.

All seven public English introductions use /api/coaching/intro/en/<coach>?v=4 and hh-coach-greetings/v4/en/<coach>.mp3. Retain old v2/v3 archives; do not synthesize new voices into an old key. No device speech or paid provider substitution for v4. Existing Gemini Free approvals, daily 24 and 3/minute limits remain. No automatic generation per visit after the saved file exists.

## Protected release acceptance

1. Run existing specialist tests, including my-coach-gemini-approved-voices, coach-greeting-recording, my-coach-greeting-mp3-store, my-coach-gemini-live-failures. Require exact-head protected CI and ordinary scheduled production release; no manual Vercel deploy or new service.
2. After canonical production serves the new code, warm all seven v4 endpoints using the existing public fixed-editorial GET, at most 3/minute and within shared daily allowance. Do not repeatedly retry errors or use Paid fallback. If free provider or quota is unavailable, stop and report outstanding recordings. Seven new actual MP3s are required, not merely versioned URLs.
3. For each: verify HTTP 200 audio/mpeg, nonempty valid MP3, full audible greeting, repeat identical SHA256, Range 206, stored immutable key. Verify the voice and text by listening, not just headers. Confirm iPhone Play/Replay and live-session default voice for each coach; check RU and ES unchanged. Do not mark LIVE complete before all seven tracks and canonical site are verified.
