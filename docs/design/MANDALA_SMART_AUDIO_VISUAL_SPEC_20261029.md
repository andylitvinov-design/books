# Mandala Audio Library · visual-to-code spec · 2026-10-29

**Source:** owner screenshot in chat on 29 October 2026 at ~09:30 Toronto.
**Page/view identity:** public `/{en,ru,es}/holistic-support/mandala`, guest or signed-in user, **same public client-local editor**. Screenshot is the lower **Audio track** portion of the Mandala editor, not the private My Practice cabinet, Video Therapy eight-session output screen or dashboard. Reference shows a mobile Safari/iOS in-app browser viewport, with the fixed five-tab site dock outside the section. Do not include iOS status/address bars in pixel comparisons.

## Reference decomposition (keep / improve)
- Keep established cream/forest-green design, existing four-topics/health/life selection, active Canvas/MP4 renderer and native audio preview.
- **Problem 1 (source):** the old carousel offered only five audio WAV presets and oversized gradient squares; no relation to chosen video theme. Change to a 2-row, horizontally scrollable 13-sound library with compact named tiles, real selection check, per-tile audible description, highlighted local recommendation. The rail must never increase document width at 320–430 CSS px.
- **Problem 2 (source):** duplicate native file picker and custom label. Keep one **Add audio file** label as the visible control; retain the accessible, programmatically usable input for iPhone Files picker and tests. Keep 15 MB/3 min file limits, rights checkbox, removal and browser-local privacy.
- **Problem 3:** no control for sound subtype, intent and tempo; add 3 selects and a voice-friendly option before the audio rail, plus an explicit Auto-match to the selected theme. Filters affect recommendations without deleting a manual user choice; audio auto-match is opt-in and changes again if context changes. Voice-friendly default reduces music volume to 30%.
- Use two visual density levels: small filter labels (~10px) with touch-friendly selects, compact audio cards (approx 145–190px wide, 88px tall) and distinct sound-kind palettes (sand/mint/lilac). Audio direct-play/volume/player and error retry remain unchanged underneath; no giant sound boxes.
- EN/RU/ES strings, labels and descriptions must fit at 320, 354, 390, 430px. Standard focus states; no autoplay; no medical promise.

## Semantic function
Existing topic selector -> `theme` -> `recommendMandalaAudio()` (local deterministic ranking) -> chosen preset `music` -> HTTPS `/audio/mandala/{id}.wav` native player -> `createAmbientPreviewWav(id)` identical raw PCM -> `startPresetAudio()` same local MediaRecorder audio track. Uploaded audio still uses user File locally and explicit rights before export. No new API, DB, CRM, storage, paid AI render or third-party provider. Filter is neither diagnosis nor profiling from assessments.

**New sound classes:** sustained tones, synthesized nature textures, soft rhythm; no field-recording claim. Existing 5 originals unchanged; 8 new first-party WAV files, low-resource 22.05 kHz mono (8s loops). All soundtracks remain short loops rather than commercial full-length studio recordings; audio-quality feedback is welcome before licensing longer recordings.

## Acceptance evidence required
1. Pure Node recommendation and WAV byte equality checks for all 13, positive RMS, no private network calls.
2. Existing Chromium/WebKit browser matrix (RU 320, 390, 430 + EN/ES 390): native HTTPS preview progress, no horizontal overflow, actual MP4/WebM audio output, own-file upload and consent.
3. Render screenshot after deployment, crop to same mobile content area and compare; source screenshot includes iOS chrome so direct pixel score is not valid without a same-state browser reference. Physical iPhone Safari speaker QA remains a separate gate.
4. Exact GitHub Actions run + Vercel READY SHA/domain, not inferred from PR merge. No promotion without green relevant checks.
