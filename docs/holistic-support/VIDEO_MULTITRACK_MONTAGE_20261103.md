# Holistic House — Multitrack Montage (2026-11-03)

Production target: codex/public-book-library. Existing page: /ru|en|es/holistic-support/mandala; Montage is the second workspace in PR #3242.

## Source-backed capabilities
- Reuse ONE Canvas preview and its current MediaRecorder + WebKit H.264/AAC export; never instantiate an alternate video engine.
- Three visible timeline rows: the licensed four-MP4 shot plan, editable user-authored captions, and the currently attached audio bundle.
- Touch or pointer rearrangement of original video shots, one-second cut adjustments, add/edit/delete and drag captions, move audio start, accessible play and scrub.
- Text timing is used in the same preview + MP4/WebM Canvas paint. Once a caption is edited, independently timed captions replace (not duplicate) the old per-stage caption overlay.
- Attached audio onset is scheduled relative to MediaRecorder start or the Safari offline AAC sample clock. One soundtrack bundle can comprise one file or up to three existing presets; do not pretend its members are separately movable.
- The "Add video" action opens the actual first-party film catalogue; no invented blank fifth clip. Voice/music selectors continue to use the existing authorization and local playback logic.
- RU/EN/ES; 16:9 compact hero on Montage; advanced controls collapsed. Private media remains local; no provider calls or new payment paths.

## Not yet supported / P1
- Unlimited raw uploaded video clips, split/merge/crossfade, independent mixing of multiple uploaded voice/music tracks, keyframe volume automation, undo/redo, waveforms from uploaded audio or persistent projects.
- Native Safari export and exact audio/video alignment require real-device acceptance in addition to source contracts.

## Acceptance gates
1. New editable timeline unit tests; existing four-shot, sound, Safari, basic mobile layout and other Mandala tests.
2. ESLint, strict TypeScript and Next build.
3. Real Chromium and macOS WebKit browser acceptance at 320/354/390/430 px: select source-backed film, drag caption and soundtrack independently, scrub, export, decode and verify text timings and audio onset.
4. Current-head required Core/Specialist and protected hh-merge-check PASS; merge to codex/public-book-library, verify Vercel exact SHA READY and live RU/EN/ES video playback.
5. Never merge on red/pending, never bypass consent or enable paid models.
