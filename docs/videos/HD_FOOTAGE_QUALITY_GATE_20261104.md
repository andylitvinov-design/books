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

## Independent sample audit of the first 320 original animations

Performed offline against all **320 actual MP4 files** in the previously exported original-motion ZIP, not merely a metadata count.

- **320/320** decode successfully as H.264 video, 432×768 / 18fps / approximately 5s. **0/320** meet the new native 720p24 HD requirement.
- **2/320** show unusually weak motion at mean decoded-frame luma delta below 1.0: `motion-goals-money-goal-achievement-v1`, `motion-stress-recovery-specific-phobias-v4`.
- **2/320** show weak edge activity below 1.2: `motion-energy-confidence-self-confidence-v5`, `motion-stress-recovery-abandonment-wounds-v3`.
- Pairwise poster-frame **dHash distance ≤4** flagged **149 pairs out of 51,040 comparisons** for editorial near-similarity review, across different topics. This is NOT proof of 149 duplicate MP4s: the hash is one frame, and multiple flagged pairs may share a clip.
- Technical validity is not artistic quality; independent videos can share compositional structure. This explains why adding hundreds of recoloured procedural scenes would fail the user's quality requirement.

The four weak-metric sources are **review candidates, not automatically deleted clips**. Removing them without a curated replacement would silently break existing four-shot presets. The new director tie-breaker prefers individually reviewed higher-definition sources when relevance is identical.


## Final release scope (4 Nov 2026)
Four selected moving H.264 HD-encoded portrait excerpts were approved through direct user instruction to complete and release this PR, following assistant editorial review of all 120 frames per five-second clip and confirmation of four individual official Dareful CC BY 4.0 source pages. The user did not separately watch each clip, and this is not represented as per-clip owner review. Four other technically passing candidates and eight unsuccessful technical candidates stay unpublished. Live source count is 48 licensed + 684 procedural MP4s = 732 after verified merge and deployment. The four new master crops must only be used for 9:16 portrait export, and are NOT native portrait Full HD. Visible credits: /videos/holistic-house/film-collection-v3/hd-credits-20261105.html.

## MyTube × motif coverage and curated upload priorities (5 November 2026)

Once four source-credited, portrait-only licensed H.264 excerpts are published, the
local first-party catalog becomes **48** physical MP4s (44 prior plus four new).
The separate **684** original-motion clips remain procedural visual art, not 684
independent film sources. Portrait clips do not qualify for square/landscape
compositions or native portrait Full HD: encoded video is 720×1280 / 24fps.

Every new approved master receives a **reviewed editorial topic ranking** in
`data/video-catalog/mytube-scene-rankings-v1.json`. The four films are
mapped to 3 topic candidates each without pretending they depict people,
relationships, clinical recovery, or all four events of a scripted film.

The new offline coverage auditor gives a **real basis for further sourcing**:

```bash
node scripts/audit-mytube-media-coverage.mjs --strict
node scripts/audit-mytube-media-coverage.mjs --queue --aspect=portrait
node scripts/audit-mytube-media-coverage.mjs --json --aspect=landscape
node scripts/audit-mytube-media-coverage.mjs --csv
```

It reports the **256 scenarios × 5 motifs = 1,280 decisions**, 46 motifs and
10 styles, topic-tagged four-shot feasibility, per-motif coverage and a
prioritized manual-review queue. Four topic-tagged candidates mean **source
suggestions**, not a literal finished story; exact visible object, releases,
attribution, cinematic quality and actual encoding need independent review.
The tool never labels 0/500 R2 uploads as completed, counts source-page URLs
as downloaded footage, or adds procedural graphics to filmed inventory.

The CC BY 4.0 notices must remain visible as actual attribution with source
links and the explicit landscape-to-portrait crop modification. Four author
pages were individually verified; there are no recognizable persons or
misleading relationship acting in the displayed four preview posters.
This is an **editorial source quality check**, not a claim of owner viewing
each moving video on an iPhone. Final Safari playback/export remains an
independent LIVE acceptance gate.

**R2 500:** The empty Supabase/R2 staged components do not provide a licensed
cloud inventory. Cloudflare account-wide cost and billing proof, an existing
private bucket, scoped credentials and professionally reviewed distinct sources
are still absent. Maintain `COST_GATE=HOLD`; do not auto-upload a batch or
turn on vault feature flags. Quantity milestones (20/100/250/500) cannot be
marked achieved until physical independent originals pass the same safeguards.
