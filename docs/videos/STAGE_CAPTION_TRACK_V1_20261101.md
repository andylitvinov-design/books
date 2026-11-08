# Holistic House Video Studio · Stage caption & sound timeline v1
**Date:** 2026-11-01 | **Target:** `codex/public-book-library` | **Status:** PR candidate, not LIVE until gates complete.

## One editor, one renderer
This is an additive Video Studio 2.0 P1 slice for the existing `/{ru,en,es}/holistic-support/mandala` Auto Video Director. The four source-backed stages remain real approved MP4; no second editor, voice recorder, AI video provider or wallet is introduced.

## Functional behavior
- Each of the four semantic stages has an *optional* client-authored caption input (0–96 Unicode code points), default empty. Blank means no text on that scene. New goal/new scenario clears pending caption edits; swapping source videos preserves captions attached to the **stage position** rather than moving the words with the source asset.
- Captions render on the actual shared Canvas **after** existing animations/hypno/affirmations, with a readable dark backing, limited line wrapping and .25s in/.35s out fade. Both initial/animated preview and the actual MediaRecorder frames use the identical `paintStageCaptionOverlay` function. No text upload, logging or provider prompt.
- Changing a caption invalidates the old recording and confirmation; only explicit reconfirmation applies. `compileFreeFilmPreset` validates the four caption entries. Global clip retiming/format change preserves existing accepted captions; the export signature includes all caption text.
- Optional montage opens a synchronized video-bar + 4-stage caption track and read-only *actual attached soundtrack* label. One `Edit sound` action opens the original Audio workspace; the sound is mixed through the already existing startPresetAudio/startPresetMixAudio/startUploadedAudio MediaRecorder track. The UI does not invent separate audio waveform, dual voice tracks, or voice synthesis.
- EN/RU/ES, 44px inputs, 16px native keyboard font, responsive 320–430px, no forced autoplay. Text remains local and optional.

## Acceptance
1. `node --test tests/stage-caption-track.test.mjs tests/adaptive-free-film-timeline.test.mjs tests/mandala-auto-video-director-ui.test.mjs tests/video-affirmations.test.mjs tests/mandala-stories-characters.test.mjs`.
2. Targeted ESLint, exact-HEAD TypeScript/Next production build, required Mandala and Core checks. No tests deleted or disabled.
3. Chromium and WebKit mobile: type caption, edit/reorder film, confirm, attach audio, export real moving video, verify playback and ffprobe audio stream, and caption presence in decoded frames. Physical iPhone check required for final device support claim.
4. Preserve the existing single `data-video-audio-section` and one Canvas/MediaRecorder, no paid API, no uploaded private goal or caption.
5. Protected merge only after successful required exact-head CI; production Vercel READY and `holistichouse.vercel.app` alias matched to merge SHA.

## Outside this PR
Voice/music independently editable audio lanes depend on the separately owned voice mixer PR #2636; more generated moving footage depends on PR #2606; XP/premium rendering remains gated behind PR #2705. Full arbitrary clip dragging, native NLE text tracks, cloud-queued FFmpeg and approved paid render integrations remain future work. Do not mark those LIVE.
