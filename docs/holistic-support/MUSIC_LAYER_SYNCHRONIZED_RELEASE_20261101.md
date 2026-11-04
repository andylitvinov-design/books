# Holistic House Video Studio · 3-layer music + synchronized native film preview
2026-11-01 · Continuation of existing PR #2731; production base `codex/public-book-library`.

## Reconciliation
Original five authored 16-second WAV melodies and their browser-local decode/mix function were already delivered with #2845 (39 original first-party WAV assets). This clean work does **not** restore the pre-#2702 editor, change the 39 WAV catalog, copy older CSS, create a player, add a microphone, or call an external music service. The commit is a source-preserving non-force integration on the current six-workspace editor.

## User workflow
- The compact Music & Voice row exposes five first-party melodies; ✓ is a deliberate Include in Video control, ▶ is independent audition through the existing **one** HTMLAudioElement.
- Include/Exclude maintains a bounded, ordered selection of 0–3 distinct WAVs. A fourth selection removes the oldest first, rather than violating the 3-layer browser memory/audio limit. No default or background autoplay.
- Selecting/playing a quick melody does not upload the visitor's audio or permit an external request. Phone microphone & own-file upload remain separate, with prior rights/format/size checks.
- The visible film Play/Pause uses that same explicit user gesture to start/stop the selected first-party melody WAVs with the existing Canvas / licensed video. Pausing, tab visibility loss, going to recording, and unmount close every temporary speaker and restore the iOS audio routing session.
- Selected 1/2/3 WAV masters feed `startPresetAudio` / `startPresetMixAudio`; up to three decoded first-party WAV buffers are combined into **one** MediaStreamTrack for the native encoder. If a selected master cannot be loaded/decoded, export fails closed; no deceptive silent video.
- Full Audio pane still uses the original Play/Select/Attach flow; quick ✓ is a distinct explicit attach gesture. Uploading a private audio file never implicitly attaches it or bypasses rights.
- Voice Studio #2629 → #2636 and meditation writer #2676 remain separate products.

## Acceptance and remaining external proof
- Test runtime of quick layer toggles, max-three FIFO/removal, zero automatic audition, single native player and mic.
- Test the WAV mixer with mocked same-origin fetch, 1–3 decoded loops to one MediaStream audio track, failed fetch, cleanup and audio-session restoration.
- Run strict exact-head Core (lint/TS/Next build), Mandala unit/source, browser Chromium/WebKit at RU 320/390/430px and EN/ES 390px, encode/export and ffprobe audio/video track with non-silent RMS. Verify Safari local Play/Pause, quick ▶ vs ✓, background pause, Save to Files.
- Once PR is merged under production protection, confirm Vercel deployment READY at exact SHA, domain alias, RU/EN/ES media GET and real iPhone speaker/export.
- Do not claim source tests or Vercel READY prove acoustic E2E; obtain separate observed browser/physical test evidence.

## Limitations
The quick rail initially shows five curated melodies (full 39-track catalog remains in the expanded editor); user files and cloud-generated voices cannot be mixed as extra layers here. The personal meditation **audio preview** points to one first-party track; the actual film export is where the layered mix is encoded. Never assert simultaneous author narration until parent #2629 and mixer #2636 have separately passed their providers/consent gates.
