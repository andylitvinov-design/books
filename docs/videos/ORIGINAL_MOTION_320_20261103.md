# Holistic House Video Studio — 320 first-party abstract motion MP4s

**Purpose:** increase physically available video choices with **original, non-photographic moving artwork**, not invented licensed stock footage.

## Distinct counts and rights

- Original existing footage: **44 independently approved stock/first-party MP4 catalogue records**. Do not rewrite or delete them.
- New collection: **320 separately encoded five-second MP4s**, indexed by **64 MyTube topics × 5 artwork variants**. Each is a deterministic original composition and contains actual moving gradient/video frames, not a copied stock video or a static image passed off as filmed scenery. Each also has a JPG poster, SHA-256, physical video probe and motion proof. The first four variants per topic form **64 new four-shot montage presets**.
- Total when shipped: **364 actual MP4 files** (44 previous + 320 new) but only **44 pre-existing footage masters**. The 320 belong to a different editorial class: *original animated artwork*. **Do not claim 364 filmed video sources.**
- Creative rights: generated exclusively with project-owned procedural vector code, abstract gradients, shapes and seeded motion. No external photographic assets, music masters, customer data, or paid AI providers used. Provider credit/CC BY sources in the existing library remain unchanged.

## Build, review and release

- Temporary one-time public GitHub Actions workflow: `.github/workflows/hh-original-motion-library-320.yml` executes only on feature branch `codex/original-motion-320-20261103` when the generator source/workflow changes or when manually confirmed; no schedule.
- Generator: `python3 scripts/build-original-motion-320.py --verify --max-mebibytes 65`. Each clip is H.264 yuv420p, portrait 432×768, 18 fps, 5 seconds (abstract artwork; **not** Full HD photographic footage). QC verifies real MP4s/posters, actual FFmpeg video streams and frame movement, SHA-256 uniqueness and the total media budget.
- Runs `--check-only --verify` after generation; only then commits 320 clip files, posters and `data/video-catalog/original-motion-scenes-v1.json` to its dedicated feature branch. Abort on missing codec, duplicate hashes, stationary frames or budget overrun. Never publish partial assets.
- Existing Video Studio imports the generated catalog separately from `scene-taxonomy.json`. Four-shot validity, same-origin paths, exact source IDs and first-party rights still apply; `video-montage-sources.mjs` and `render-plan-v2.mjs` whitelist the new `original_motion_mp4` class **only** with original provenance and checksum.
- The new 64 motion presets reuse the **existing** Canvas/MediaRecorder/webcodecs export. The cards display **ANIMATION** / **АНИМАЦИЯ**, never “filmed stock”; existing 44 clips are still preferred for realistic video motifs.
- Mobile: keep `preload=none` / poster-only discovery, never download all 320 on page load, verify Safari's four unique source decode and final download.
- This is **not** automatically a medical treatment, a real actor, or a video depicting the user's life. Purely symbolic visuals must remain safe and opt-in.

## Spending

Public repository standard GitHub-hosted runner is free under GitHub's public-project policy; no paid API, GPU, or new monthly subscription is used. Vercel and user's CDN plan **must be checked for upload-size / traffic quotas**. Build refuses >65 MiB new MP4 + JPG assets; no hourly/recurring re-generation. GitHub repository binary growth is irreversible by normal Git deletion, so keep one reviewed publication wave and avoid uploading stock originals.

## Gate to LIVE

1. Source build successful with **320 physical MP4s** and **320 posters**, one hash per video.
2. Existing Core/Mandala/Browser tests green on *the final actual PR SHA*; old 44 untouched.
3. Protected merge to `codex/public-book-library`.
4. Vercel Production **READY** on exact merged SHA, confirmed 200/playback of a sampled original MP4 and poster plus Safari four-shot export.
5. Until then, 320 remains **development**, not a LIVE claim.

## Future realistic footage expansion

Continue the parallel #3335 licensed-source acquisition work for realistic nature, work, people-safe metaphors, relationship and stress scenes. An abstract original motion clip is not interchangeable with authentic photographed footage in quality scoring; default director should respect explicit “real landscapes” versus “abstract animation” wishes.
