# MyTube / Video Studio — CapCut-class functional technology map

Date: 2026-11-04. This is an original, clean-room implementation: *no CapCut code, proprietary models, templates, presets, assets or trademarks are copied*. Official CapCut user-visible features are a benchmark, not a source or API contract.

## Architecture that remains canonical

1. **Theme and idea** → approved taxonomy / 1024 narrative plots / Auto Video Director recommends a script.
2. **Support phrases** → client-approved text, optional consented voice, original client audio.
3. **Montage** → one timeline with editable approved shots, audio, timed text; real Canvas/WebCodecs/MediaRecorder output and a verified locally decodable file.
4. **Optional advanced controls** inside Montage, never 25 compulsory filters.
5. No browser-local photo, health text, or microphone audio is sent to CapCut or a third-party editor for free editing.

## Product capability inventory

| CapCut-style capability | MyTube state at this revision | Next honest release gate |
|---|---|---|
| Text/script → editable clip sequence | Existing Auto Director, 4 approved shots and selectable story presets | Expanded true video library and real source verification |
| Multi-track film/audio/text timeline | Existing functional 3 tracks | Independent arbitrary extra film/audio layers not yet built |
| Four-shot scene reorder and adjacent boundary trim | Existing | Source in/out trim and arbitrary splits not yet built |
| Zoom/pan timeline, snap to cuts | Merged #3373 | Continuous frame-accurate 30/60 fps editing is not asserted |
| Undo/redo, local editable draft | PR #3380 (requires guarded merge/production) | Private cloud save and collaboration are not yet built |
| Per-shot looks, cut/fade/flash transitions | Merged #3373 | True 2-source cross-dissolve not yet built |
| Local audio pulse-guided four-shot cut | New in this change | Confirm real iPhone audio decode/cuts on verified MP4 |
| Editable imported/exported SRT subtitles | New in this change, max 16 cues | Automatic speech recognition not implemented |
| Text animation (fade / slide / pop), style, position | New in this change, real Canvas overlay | Timeline keyframe animation editor not implemented |
| Mix narration/music, optional local file | Existing local audio engine and per-selected voice/track options | Advanced independent voice/music/SFX buses and ducking |
| Photo composition, scenes, aspect ratios | Existing | AI subject-aware reframing not implemented |
| Keyframes for approved video shots (zoom/pan/rotation) | Two-point per-shot keyframe presets in PR #PENDING | Full editable keyframe curves/independent layers/opacity still pending |
| Mask, PIP, green screen / chroma key | Not implemented | Canvas shader/effects with bounded memory |
| Stabilization | Not implemented | Optical flow or deterministic device-side stabilization |
| Noise/voice cleanup | Not implemented | Consent-based local DSP or owner-approved speech model |
| Auto captions from speech | Not implemented | On-device STT model, word timing, language accuracy/privacy QA |
| Voice cloning / lip sync / AI avatar | Not implemented in this editor | Permission, provenance, owner-approved model, spend caps |
| AI background removal | Not implemented | Segmentation model with explicit user consent, GPU/mobile budget |
| Prompt-generated *new* footage | Separate pending Video Studio/AI providers | Do not mislabel existing approved clips as generated scenes |
| Auto cut from pauses / transcription | Not implemented | Transcript/pause alignment, no fake semantic matches |
| Advanced color curves / LUT / HSL | Not implemented | GPU/Canvas treatment with preview/render parity |
| Speed curves, reverse, optical slow motion | Not implemented | Real source media clock changes in encoder and preview |
| Animated stickers/effects, motion tracking | Some existing original symbolic overlays | Trackable elements/anchors and actual object-detection model |
| Separate 4K and arbitrary-codec export | Current 720p/1080p targets and browser-dependent codec | Source-quality proof, device limits, options and tested MP4 support |
| Social publishing/templates/collaboration | Some separate website/Telegram workflows | Explicit sharing consent, authentication, provider API safety |

## New free implementation details (this PR)

### Beat-aware edit
A user can attach their own audio file and choose **Cut to audio beats**. A decoded local PCM transient envelope detects loudness *attacks* (not true semantic understanding of music) and repositions three boundaries of four actual approved scenes. Minimum 2 seconds/shot, same total duration, same source IDs, editable and undoable. No music is uploaded, no paid model. If the audio has no clear pulses, preserve current montage and show an honest notice. The analysis is deliberately opt-in and file-size bounded.

### Captions
SRT import/export of client-authored subtitles, 16 items maximum (fail closed rather than silently discard), with 0.1-second timing, line sanitization and localized copy. Editable caption options: **Classic/Cinema/Minimal/Glow**, **None/Fade/Slide Up/Pop**, **Top/Center/Bottom**. The existing canvas overlays now paint selected text appearance on both preview and video export; the project draft stores these options without personal media.

## Engineering constraints and acceptance

- The exact frame compositor must run in both browser preview and the exported video. Hidden CSS animations never count as exported video.
- A new edit invalidates previous downloadable blob; undo restores project metadata, not stale video binary.
- Every source remains license/allowlist verified; all four real shot IDs are preserved by smart cut.
- Audio decoding and editing must be client-local; cap file size and output duration to current supported limits; failures must be non-destructive.
- Android Chrome and iPhone Safari/WebKit keyboard, scrub, audio permission, file imports and playback must pass real browser acceptance.
- PR requires exact-head Core + Mandala Specialist + guard checks, protected merge and Vercel production READY exact merge SHA. No statement of LIVE without those checks.
- Keep GPU/paid API, external AI subscriptions, cloud autosave, scheduled jobs and provider costs OFF until a separately approved pilot.

## Priority after this change

1. Arbitrary NLE source timeline and independent audio tracks / fades / waveforms / precise trim.
2. Real keyframe engine and visual transform/PIP/mask paths.
3. Local optional transcription, voice cleanup and automatic pause cut when model, privacy and device capability are verified.
4. Color curves, speed ramp and tracker; true two-source effects, export quality guard.
5. Template system, edit agents and optional collaborative project persistence with authorization.


## 2026-11-04 original per-shot camera keyframe release candidate

The *existing* four approved licensed scenes may now receive real start/end camera frames:
zoom 1–1.6×, ±16% horizontal/vertical pan and ±6° rotation. Built-in effects:
push in, pull out, pan left/right, drift and subtle tilt; user may edit
start/end zoom and end pan/rotation. The scene's local 0..duration clock drives
bounded smooth/linear interpolation. Camera transforms run **inside the same
Canvas compositor** before user-approved caption overlays, and therefore
travel with the actual local MP4/WebM export rather than being CSS-only.

Frames are re-rendered deterministically without adding an uploaded image,
external AI model or paid provider. A color backdrop prevents stale previous
frames showing at rotated corners; visual framing near the edge can reveal a
dark background on intentionally rotated edits. Mobile performance and
final encoded video playback must be verified before promotion.

The metadata-only JSON draft now accepts strictly validated optional
motion settings; older drafts remain valid, undo/redo coalesces continuous
motion slider gestures, and every edit invalidates the previous binary export.
This is deliberately **not** a general multi-layer keyframe compositor:
arbitrary independent video layers, opacity keyframes, masks, motion tracking,
chroma key, and real two-video cross dissolves remain outstanding.

Acceptance is the exact branch's Core/Specialist checks plus an actual
iPhone/WebKit clip with a visible zoom/pan across 4 approved scenes, valid
audio, synchronized captions and decodable MP4; protected merge → Vercel
READY exact SHA, with no additional paid services.


## 2026-11-04 — non-destructive video source slip + playback-speed (release gated)

A user may now select a licensed shot in **Montage** and edit two *actual media*
parameters rather than merely changing UI labels:

- **Start position in source:** 0–95% in steps of 5. Internally this is a
  deterministic slip offset in the current licensed MP4's natural loop, not
  a new URL, arbitrary local user upload or pretending to use AI.
- **Source playback speed:** 0.75×, 1×, 1.25× and 1.5×, applied to the
  muted native HTMLVideoElement decoder that supplies the actual frames.
- One \`resolveLicensedSourceFrame\` maps shot-local project seconds to source
  seconds in the **same** Preview, MediaRecorder and WebCodecs renderer.
  No change to overall project length, spoken audio/soundtrack or captions.
- A speed/phase change invalidates the previously encoded video, pauses the
  preview, and is Undo/Redo-able (adjacent slider steps coalesce).
- The existing portable project draft stores the two new optional scalar
  properties, rejects invalid and unexpected fields, and accepts old drafts.

This is **slip editing and constant-speed playback**, NOT complete source
in/out trimming, audio pitch correction or a speed-ramp engine. The project
still deliberately uses four separately licensed approved video scenes.
The next required release gate is real WebKit iPhone frame/loop/playback testing,
with an output MP4 that has the correct four scenes and still has the
visitor's original audio. No paid provider and no new background worker.
