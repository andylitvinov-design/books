# Holistic House · Adaptive Montage MVP (2026-11-01)

## Source and boundaries
Use one existing Video Studio at `/{ru,en,es}/holistic-support/mandala`, production target `codex/public-book-library` (not repository default). Auto Video Director is goal-first and the montage editor is optional. Preserve existing Canvas, MediaRecorder, user photo/voice consent, sound attachment, Hypno, and free provider fallback.

## Included in this implementation
- Four real approved MP4 stages with adaptive timing for 10/15/20/30/60 seconds; 30s = [5, 7, 10, 8], minimum 2 seconds per stage, exact contiguous output timeline.
- Four color-coded bars show each stage's actual duration; users can optionally move an approved clip earlier/later and move one second across neighboring stage boundaries.
- Must confirm montage after edits. The core studio independently validates clip order against the exact preset set and verifies duration sum before exporting.
- The same storyboard timestamps drive Canvas preview and MediaRecorder, not a false independent animation or new paid AI provider.
- Changed stage ID *or start/duration* changes the export signature and invalidates the old Blob. Global duration retimes the same free-film plan using adaptive weights.
- Existing legacy equal allocator remains available to other first-video/food paths; no silent behavior change in their saved drafts.
- RU/EN/ES and narrow iPhone layouts. This patch creates no databases, new endpoints, chargeable API calls, XP debit or uploading of private media.

## Acceptance before production
1. `node --test tests/adaptive-free-film-timeline.test.mjs tests/free-film-timeline.test.mjs tests/mandala-auto-video-director.test.mjs`.
2. Run targeted ESLint, TypeScript, Next build, applicable video-browser Chromium/WebKit E2E + ffprobe of *saved* 30-second film on the exact PR head.
3. Mobile: select two alternatives, edit a stage duration and swap stages, re-confirm, create a real film, check actual scene ordering and export time. Confirm 320/354/390/430px, keyboard/VoiceOver, RU/EN/ES.
4. Physical iPhone Safari: verify source playback, audio attachment, user-created file download and reopen.
5. Protected merge after required checks; verify exact production commit, Vercel READY and alias.

## Explicitly not included
Full Canva-like multi-track drag-and-drop, eight distinct source MP4 clips, waveform trim, new photorealistic text-to-video, centralized cloud worker, voice cloning, personalized healthcare treatment or XP purchases. Those depend on separate release requirements and existing open PRs #2606 (new procedural animation), #2636 (voice mixing) and #2705 (XP) and must not be misrepresented as LIVE.

Use the owner's Video Studio 2.0 technical roadmap for P1/P2. Do not open a second video editor or wallet.
