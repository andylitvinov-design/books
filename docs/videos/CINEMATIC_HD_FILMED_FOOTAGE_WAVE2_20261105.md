# Holistic House · Cinematic filmed footage expansion · 5 Nov 2026

## Goal, counts, nonclaims

The released source library initially holds **44 licensed/approved filmed or composited MP4 records + 684 original low-resolution procedural motion-graphics MP4 records = 728**. The four previously shortlisted Dareful edits in PR #3383 are **not** counted here until that distinct owner-gated PR is actually merged and production verified. This wave adds **25 new, individually identified Dareful camera-footage source candidates**, not 25 approved MP4s. They are distinct from the existing 12-v3 source pages and 16 previously reviewed candidate pages. No fake duplicates, crops or source URLs are counted as unique independent footage.

The 25 clips are exact source-page/Mux-download pairs from Dareful's 2026 live catalog. Dareful attributes its work to **Joel Holland** under CC BY 4.0; each new clip's source page and source-page tags were checked. Video assets are **third-party licensed** for use with full creator/source/license links and a change notice. They are not exclusive first-party ownership or generic Shutterstock preview content.

## Editorial quality requirements

The owner wants a *more beautiful video*, not a larger number of low-resolution background loops. Each new source is separately evaluated, ideally in the format that preserves its strongest composition:

1. **Actual video, not still slides:** separately encoded five-second H.264/yuv420p at 24 fps, decodable changing frames; FFprobe duration/codec/geometry/size and SHA-256 evidence.
2. **Two output variants per underlying source:** a **720 × 1280 9:16 portrait reframe** for phone and a **1280 × 720 16:9 landscape** preserving more of the original 1920×1080 source. These are **two crops of the SAME footage, not two distinct films**. A 720×1280 portrait encode from a 1920×1080 landscape original is **NOT true native 720-wide portrait detail**, so no misleading native-portrait-HD claim.
3. **Measured scene quality:** at least four separately decoded moments; motion delta, meaningful edge detail, tonal contrast, exposure, at least five seconds of runtime, and frame-difference hash comparisons. Numerical score can disqualify a clip; it cannot confirm artistic quality or model/trademark releases.
4. **Manual visual curation:** a nine-frame contact sheet **and video playback** for both crops, rejecting flat sky, severe crop, muddy colour, poor subject placement, hard cuts, logos, people or misleading semantics. A source unsuitable for vertical is allowed in a future landscape-only selection, never silently called portrait-ready.
5. **Independent visual families:** balance water, sky, aerials, flowers, forests and mountains, not 25 variants of one ocean/forest.
6. **One scene = one source identity:** original Dareful page and stream unique across released and pending sources, unique decoded master SHA and perceptual similarity check; withhold near matches and reserve credit/modified-by metadata.

## Correct release process

`data/video-catalog/dareful-cinematic-hd-candidates-wave2-20261105.json` contains the 25 researched URL pairs, provisional titles and motifs, with **approvedForPublication=false** and per-source rights review. The isolated one-time GH runner `HH Cinematic Real Footage Wave 2` creates output only under `artifacts/cinematic-dareful-wave2-20261105/`, uploads a temporary private review archive and does **not** mutate `public/`, `scene-taxonomy.json`, `free-stock-scenes.json` or user profiles.

After reviewing the actual moving MP4s, record each source's technical/visual/release decision and exact SHA, select its target aspect and **obtain per-source owner signoff where the established project policy requires it**. Only approved physical binaries then go through the existing CC BY film-collection-v3 importer/probe with complete individual credit and actual user-facing attribution. Do not change the old 728 source count or turn draft stock into a playable scene until files and rights pass.

After a protected GitHub PR merge, verify successful Core/Mandala/Video Studio + iPhone Safari exact-head export and Vercel production READY on the actual merged SHA, and read-back source counts from canonical site. No new paid video API, background subscription, personal-data upload, external unlicensed footage, automatic licence reinterpretation or CI bypass. Existing audio/video generation and mobile controls remain unchanged.
