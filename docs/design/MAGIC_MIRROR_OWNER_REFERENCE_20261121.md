# Magic Mirror mobile — owner visual reference (21 November 2026)

## Same-view identity
- Approved reference is screenshot 1 of seven, 706×1536 JPEG. Current screenshots 2–7 show For Me, For Work, Present. Image files remain in chat, not public GitHub.
- Canonical guest route: /{en,ru,es}/holistic-support/mandala, Video Studio, Magic Mirror Goal, no query. Exact phone DPR/browser crop not observable.
- Owner files: components/mandala-magic-mirror-goal.tsx, .module.css, and components/mandala-video-mobile.module.css. One existing MP4/canvas and global site dock; no duplicates.
- Production baseline GitHub protected branch: ec8a961dff8858f28c4c9bc94503c3da52e343dc. Vercel must be verified separately after hourly release.

## Visible reference map
- Holistic House wordmark at ~x40–270 y65–112; brighter warm botanical background, gold sparkle, centered Magic Mirror serif title and subtitle above laptop.
- Laptop at ~x40–665 y360–648; bright first-party still before actual Play, original live video continues upon click. Do not fake MP4/audio playback.
- One segmented For Me/Work/Present row ~y670–725; five-dot progress and Step 1 of 5; centered serif question.
- Single-line editable wish with smaller adjacent Next, ~y855–924; two-column, two-row photographic choice cards ~y985–1280; existing seven-action dock anchored below.
- Scope-safe separate input drafts; switching For Me→Work/Present must not display personal text.

## Journeys and protected scope
- Me/Present image → 4 subcategories → 4 topics → existing MandalaAutoVideoDirector → Ideas/Goal, not immediate generation or charge.
- Typed text Next: existing local taxonomy classifier, direct Ideas/Goal; Work: one-tap 4 practical formats. EN/RU/ES preserved.
- Keep server auth, privacy, protected assets, native MP4/export/canvas/credits and other Studio screens unchanged.

## Verification required
- Exact-HEAD Core lint/type/build, Mandala WebKit audio/video and hh-merge-check mandatory before protected merge.
- Capture same-view rendered Chromium/WebKit screenshots and overlay at CSS widths 320/354/390/430; verify keyboard, card taps, Next and global dock; no browser visual pass claimed from CSS alone.
- LIVE requires Vercel production READY deployment with exact alias/SHA from existing hourly publisher, not a manual deploy.
