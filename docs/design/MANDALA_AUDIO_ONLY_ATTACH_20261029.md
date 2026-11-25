# Holistic House · Audio-only mobile picker & attach flow · 29 October 2026

**Owner-approved reference:** latest iPhone design in project chat: short audio-only waveform **rows**, not video thumbnails or a second video editor. The existing public Mandala editor is the source of truth; no separate route, CMS, user database or audio streaming service.

## Page identity and hierarchy
- Canonical: `/{ru,en,es}/holistic-support/mandala#video-audio`, public client-local video editor, with one existing preview / Canvas renderer and saved result.
- Keep cream/warm-green palette from existing editor, headings >=20px, body 13–14px, track names 13.5px and detail text 11.5px (only metadata), large 44–48px tap targets, safe 320/354/390/430 widths.
- First fold: compact "Аудио-трек" title, inherit **current video theme** from video filters, local auto-match toggle; two columns of actual **Type / Mood / Tempo / Video length** controls; search + meaningful ordering; optional voice-friendly mode.
- Default show only **four sound rows** with locally generated waveform icon and label, no fake video images, track preview available via one native site-local WAV audio player, Expand all 13.
- Bottom: single Files picker + real microphone capture, selected-sound status, attached-sound status, the explicit **"Прикрепить к видео"** action and a small preview/volume control. Separate selected vs attached state, explicit native consent for files, minimal error and recovery help.

## True functional chain
1. Film theme + optional wish -> local `recommendMandalaAudio()` (same existing 13 licensed/self-synthesized WAVs; only first-party sources). Type/mood/pace/search/order filter *actual* tracks.
2. Selecting a row changes *preview source*, not an already-rendered file, and does not silently attach it.
3. `Attach to video` records a preset ID or original private File object in local React state; audio rights and max 15 MB/180 seconds gate uploads/recordings. A *different selection* prevents accidental export of the wrong sound until user applies or cancels.
4. `Create video` uses **only** attached local sound to feed the existing MediaRecorder video stream; produced MP4/WebM contains a real audio codec track (FFprobe + nonzero PCM RMS). Attaching after earlier video render invalidates the old file: re-create is required; this is not an instant MP4 mux of an already downloaded file.
5. `Record voice` requests the microphone only on explicit click, stops tracks and creates an on-device M4A or WebM File; rights confirmation and Attach still required. No upload to server, CRM, profiles or third-party pixels.
6. "Background under voice" is only a *suggestion* at 30% volume; this stage still exports **one selected audio source**, not multi-track voice/music mixing; no fake effects or clinical claims.
7. Keep standalone guest and EN/RU/ES editor/therapy/affirmations/portrait behavior intact; no video stock thumbnails in this audio block.

## Release / QA checklist
- Existing first-party audio WAV identity/rms checks; new selected vs attached source/consent/mic unit tests.
- Browser Chromium/WebKit with real native audio GET/Range, select→attach→create with FFprobe audio, private Files selection + rights + attach, 320/390/430 and EN/ES 390; overlay/screenshot on equivalent route/state/crop.
- Verify full focus/touch/no-horizontal-scroll, no duplicate dock or account writes.
- Merge **only after focused green CI** into checked Vercel production branch. Vercel READY and canonical alias at exact SHA and physical owner iPhone playback/Save-to-Files verified separately; do not label speaker acceptance from CI alone.

## Owner's 29 Oct exact-reference visual reconciliation
- Reference is the **second** image supplied by the owner on 29 Oct: vertically stacked **soundtrack rows**, green audio-header, colored topic/type/mood/tempo/duration chips, search+sort, square illustrative covers, small waveforms, local favorites and a bottom native player. The first photo is the older actual page with oversized two-row tiles and dropdowns.
- Real implementation now uses the existing 13 **8-second synthesized WAV loops**, and **existing same-origin JPEG poster stills** only as decorative audio cover art. No video tile, playback, or external content is introduced in the audio picker. These stills are illustrative, not claims of field recordings or multi-minute songs.
- Soundtopic chips only change **audio recommendation scope** (starting from the already selected visual video theme), not the underlying finished video scene. Other audio chips filter metadata. Favorites toggle visibly in local state; no fake account persistence. Four/five rows initially, expandable list, selected vs attached sound remain distinct.
- iPhone widths 320/354/390/430, 13–14px core text and 44px interactive targets; preserve a fallback native player for actual Safari audio decoding and correct iOS media volume. Physical owner screenshot and speaker QA are still needed to certify visual/hardware parity.
