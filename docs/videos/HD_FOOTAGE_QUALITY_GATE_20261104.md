# Holistic House · HD source-quality gate (4 November 2026)

## What is genuinely present

The 728-source library is already released: **44 licensed/previously approved MP4 masters** and **684 originally rendered procedural MP4 motion graphics**. Existing animation files are physically real but **432 × 768 / 18 fps**; they **do not satisfy the new native-HD threshold**. Keep them available as an honest legacy standard tier, not as native Full HD. Of the 44 existing licensed masters, the retained manifests report **20 v2 and 12 v3 at 1080 × 1920 / 24 fps**, and 12 v1 at 720 × 1280 with FPS not declared in collection metadata. The manifest alone is not independent proof of picture sharpness, licensing of depicted people, or originality.

A technically playable video is not necessarily a good video. We reject misleading footage counts, repainted duplicates, letterboxed or overcropped sources, frozen-frame MP4s, incorrect subject tags, and invented stock rights.

## New acquisition strategy — quality over quantity

First inspect **16 existing Dareful / Joel Holland source-page candidates** (three waves; each licensed under CC BY 4.0). The official Dareful site describes commercial reuse under CC BY 4.0, but individual author/source links, cropped/adapted notices and any depicted persons, logos or trademarks still need per-file review. Future acquisition can expand beyond these sources only after finding and reviewing real independent footage.

`scripts/review-dareful-hd-footage-20261104.mjs` is a **one-time editorial diagnostic**, not a public importer. On the isolated feature branch it creates private 720 × 1280, 24fps, 5-second H.264 MP4 clips with contact sheets, JPG posters, SHA-256 and measurable contrast/edge/motion metrics. It also detects obvious near-duplicates by frame difference hashes.

### Mandatory requirements for publication

1. Licence: individual official source page + creator, CC BY 4.0 link, commercial/adaptation permission, no source already published; attribution and modification notice both in metadata and accessible credits. No assertion that third-party footage becomes exclusively owned by Holistic House.
2. Real moving pictures: ffprobe H.264, yuv420p, native **720 × 1280 minimum** and **24 fps minimum**, at least 4.85 seconds decoded, not one repeated still frame.
3. Quality metrics: successful frame sampling, positive motion score, adequate luminance, contrast and edge detail, unique SHA-256 and near-duplicate comparison. Numeric checks are necessary but **not sufficient** for compelling images.
4. Editorial: review the nine-frame contact sheet **and actual movie**, crop suitability, subject accuracy, pleasantness, safety/consent, no unwanted faces, logos or editorially misleading metadata; reject video even if all metrics pass.
5. Performance: choose appropriately compressed MP4 masters, load posters by default, only stream four clips chosen for export, keep raw HLS sources out of site assets. Monitor storage, CI minutes and Vercel bandwidth under existing plan. No new paid subscription, model API or recurring job.
6. Exact-head CI Core + Mandala, existing visual export on iPhone Safari, protected production merge, Vercel READY matching merged SHA and live playback proof before claiming LIVE.

## Director policy

The new `lib/mandala/video-quality-evidence.mjs` labels existing low-resolution animation as `standard_motion_art`, distinguishable from `editorially_reviewed_hd`. The goal-first director may prefer a reviewer-approved HD alternative **only when editorial relevance and exclusions tie**. Semantic subject matching and the user's explicit selected goal always dominate technical resolution.

**Counts:** 16 inspected source candidates do not add 16 published films. Publish only individual quality-verified approved MP4s, then recalculate the total from the first-party catalog and available physical files. The first creative HD prototypes were rejected because technically HD but visually too schematic.
