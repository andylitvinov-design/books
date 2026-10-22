# Reiki Practitioner — Audio welcomes before video lessons · 2026-10-22

## Changes
Four new learner screens sit between the existing **What to expect** and original meditation video:
- `flight-audio` → `flight-02` (Flight to the Sun)
- `tan-audio` → `tan-02` (Tantra Reiki)
- `kun-audio` → `kun-02` (Kundalini Reiki)
- `ygg-audio` → `ygg-02` (Reiki Yggdrasil).

Original 63 stable screen IDs remain, ordered course now has **67** screens. No changes to encrypted answers, progress, initiation or consent gates. Existing `paths-01` author audio remains in the fifth, non-video lesson.

Each new screen has bilingual EN/RU author introduction, native audio controls when published, and a **Continue to video / Перейти к видео** action. If no recording has been approved, show an unavailable placeholder instead of an inert player; students may continue. No autoplay or client audio uploads.

## Owner workflow — use, don't duplicate
Owner entry: https://holistichouse.vercel.app/admin/materials/courses/reiki-practitioner

Choose one of five lesson folders and RU or EN. Upload your own MP3/M4A/WAV (max 20MB) to the **existing private draft** bucket, preview it, then deliberately select **Use on learner slide / Publish**. Up to five recordings can be uploaded to a folder in a batch; at most one is selected for each lesson-language pair. Publishing creates a separate public copy via the existing API and manifest. Without an explicit owner publication there are no audio assets for students. No migrations, provider charges, auto-publishing or new storage.

## Acceptance
Run unit/security tests, ESLint, tsc and Next build; dedicated Chromium/WebKit mobile 320–430px script checks all 67 slides and saved checkpoints. Check branch/CI and production READY SHA with canonical alias. Real authenticated iPhone Safari owner upload → private preview → manual public release → learner playback remains a **separate mandatory E2E test**, not proven by green CI.

Tracking: https://github.com/andylitvinov-design/books/issues/1309. Rollback: revert this screen/sequence commit; recordings and existing published manifest remain unchanged.
