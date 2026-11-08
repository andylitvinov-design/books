# Holistic House — Full HD film collection v2

Owner request: expand the number **and visual quality** of the real, playable
video templates, including money, energy, life and health.

## Production structure

- **Existing** 12 branded H.264 money MP4s, 720x1280/20fps, remain unchanged
  under \`public/videos/holistic-house/money-films-v1/\`.
- **New** 20 branded H.264 MP4s, 1080x1920/24fps, each 5 sec with a derived
  JPEG poster, under \`public/videos/holistic-house/film-collection-v2/\`.
- Money: +4 (16 real MP4s total). Energy: +6 native MP4s, old Canvas
  effects retained only in an optional "all" list. Life: 5 native MP4s.
  Health & wellbeing: 5 native MP4s.
- Other existing theme groups — Relationships and Goals — are unchanged.
  There is only **one** photo/editor/recorder workflow, no duplicate studio.
- Selected film uses the SAME first-party MP4 file for both mobile preview
  and browser-only personal export. The client photo stays on the device.
  EN/RU/ES labels and a neutral wellness-not-medical-advice disclosure.
- Full HD source does not mean guaranteed 1080p on every mobile recording:
  the browser offers 720p and optional 1080p and determines MP4/WebM codec.

## Rights and provenance

Original moving backgrounds: Supareels licensed AI-generated b-roll.
- https://supareels.com/terms
- https://supareels.com/stock-footage-licence
- Source scene pages and exact source file paths are recorded in
  \`scripts/render-hh-film-collection-v2.mjs\` and public manifest.
- Commercial transformations and client videos are permitted; **raw source
  clips may not be redistributed or resold**. We export our own edited,
  graded and Holistic House-branded compositions with an independently
  moving light layer. Raw stock files exist only under a temporary build
  folder and are deleted after processing.
- The upstream scenes are AI-generated atmospheric footage, not medical
  evidence, factual recordings of real locations, or proof of income.

## QA / no-cost gate

1. One-time GitHub runner, triggered only for the feature branch, downloads
   exactly the curated sources and renders the 20 remixed clips. No external
   paid generation/API; no per-client billing. Remove one-time workflow before merge.
2. Verify H.264 container, moov/mdat, 20 distinct SHA-256 digests, 1080x1920,
   decoded JPEG poster, non-identical video frames, 24fps/5s, no flat footage.
3. Focused unit + TypeScript + lint + Next production build.
4. Mobile Chromium/WebKit 320/390/430px: category switch EN/RU/ES, native
   video currentTime advances, Full HD v2 money/energy/life/health, actual
   local canvas record+download, consent, zero private-photo uploads.
5. After safe merge into \`codex/public-book-library\`, Vercel READY + exact
   SHA + public alias + direct HTTP 200 video/mp4 and ffprobe check.

**Safety**: Health/Wellbeing video choices are metaphors for rest and
attention. No diagnoses, treatment promises, health predictions, or user
health data are inferred, transmitted, or tracked.
