# Holistic House · Video Studio — source library growth (03 Nov 2026)

## Owner objective and hard distinction

Increase *real, playable, high-quality video footage* accessible to the existing Auto Video Director; do not create a second editor or mistake more editorial text, color treatments, re-crops, stock links or AI prompts for more unique **original** videos.

**Measured source baseline:** `data/video-catalog/scene-taxonomy.json` records **44 approved local MP4 masters** (12 money-v1, 20 film-v2 and 12 CC BY v3). This is a catalogue count; physical H.264/decoded-frame/hash evidence must still pass `node scripts/video-catalog-probe.mjs --check` for each exact release SHA. The first 32 collection-level master rights remain subject to deeper per-source evidence, unlike the 12 Dareful two-source credits.

**Editorial demand:** the newer MyTube taxonomy `mytube-content-taxonomy-4x4x4-v1.json` is 4 categories × 4 subcategories × 4 topics × 4 variants = **256 unbound story concepts / 1,024 visual placements**. These are not renderable videos. Separately, the earlier legacy 120 four-beat goal-tree scenarios remain unbound; 48 legacy playable four-source presets reuse the same 44 physical files.

**Sourcing target:** **320** independently identifiable licensed/original footage masters first (five options across each of 64 topics, ~80 unique choices per top-level category), then expand toward **500** if user demand warrants. At baseline, **276 additional approved masters** are needed for 320. A stricter rule forbidding *all* reuse across 256 scenarios would require 1,024 distinct videos, so our first target permits appropriate reuse *across* scenarios while retaining four distinct clips *inside* each final four-beat export.

## Work included in this branch

- New **offline growth auditor**: `node scripts/audit-video-library-growth.mjs` reports approved scenes, never including unbound scenarios, URL candidates or editorial renders. `--queue` prints the 320 editable clip briefs for visual sourcing. `--json` outputs machine-friendly totals. `--target=500` raises ambition without editing or inventing footage.
- **16 licensed-source candidates** across three separately reviewed metadata waves (4 + 4 + 8). Wave 3 is new and carries eight official-page references with Mux HLS URLs; **all candidates remain unapproved and cannot be exported**. They are a sourcing queue, not downloaded/owned footage and not a change to the 44 public masters.
- Original free preview/draft code now accepts `--wave3` with the same source hostname allowlist, motion verification and private-artifact-only output. Neither tool changes the public catalogue or `public/videos`.
- Fix for physical rights audit: a *single independently licensed and verified source* imported through the existing `licensed_single_shot_edit` path is now accepted by the final catalogue probe. Two-shot composites must contain **two distinct** official source pages; unknown source shapes and untrusted rights fail closed.

## No-cost operator path (only on demand)

1. Review / recheck individual Dareful pages and actual CC BY 4.0 notices; identify source creator, date and attribution (Joel Holland / Dareful, licence URL, any edited/cropped status). Source pages or Mux media URLs are **not proof of clearance for faces, logos, private property, or actual visual content**.
2. `node scripts/preview-dareful-candidates.mjs --wave3` — ffmpeg reads network streams and produces private nine-frame contact sheets. If networking is blocked or HLS is removed, the source remains rejected. No automatic CI frequency, third-party subscription or XP charge.
3. `node scripts/render-dareful-candidate-masters.mjs --wave3` — manually triggered, temporary five-second 1080×1920 H.264 drafts and motion/decode evidence. A technically rendered draft is **not** approved artwork, not a distinct source already in production, and not a published MP4.
4. **Human approval required**: view moving footage; check actual subject versus EN/RU/ES labels, right to edit, attribution, faces/trademarks, motion, framing, repeated source identity/perceptual similarity and no deceptive AI/camera claim. Reject weak, overcropped or near-duplicate material.
5. Acquire the **licensed original source file** separately into an operator-only workspace, prepare the validated rights brief with accurate creator/source/checkedAt/motifs and run `scripts/import-scenario-video-batch.mjs` in dry-run mode. Its current allowlist supports individually reviewed Dareful CC BY 4.0. Do **not** feed generated draft films into it pretending they are original licensed source footage.
6. Only after owner approval, use `--import` on the vetted source batch. The established importer will create 5s encoded MP4 and JPG and append canonical `free-stock-scenes.json` and `scene-taxonomy.json` with hashes, attribution, and semantic tags. Run the full exact-SHA physical probe and both source coverage tests, plus iPhone Safari playback, real export and Vercel READY deployment checks before claiming LIVE.
7. Continue acquiring across all four categories; source priorities should close actual per-topic motif gaps, not chase easy nature footage while relationship/work/stress stories remain uncovered. Auto Video Director should prefer semantically related, real approved files, not randomly select footage to meet numerical quotas.

## Zero-spend and performance requirements

No recurring GPU, provider API, stock subscription, or paid background downloader is enabled. The no-cost path reuses FFmpeg and the existing GitHub/Vercel pipeline **within any applicable free-usage limits**; it does not promise that storage, bandwidth, or CI minutes for hundreds of videos are unlimited. Before bulk publication, inspect current GitHub repo size, Vercel artifact size and bandwidth, run mobile-first optimizations and publish in small batches. Serve thumbnails until a user selects a clip; avoid preloading 320 MP4 streams or deploying raw stock/video mezzanines. Keep raw original third-party clips out of `public/`.

## Definition of done

- Only **approved, physically present, deduplicated** independent MP4 assets count toward the target; record real count from canonical catalogue after FFprobe/FFmpeg and rights review.
- Each available four-shot story references four different approved, visibly appropriate sources, remains editable in the existing director and really exports from a phone.
- Full attribution and change notices persist, plus a public-facing credits page if licensing requires it.
- No new recurring paid services, no silently enabled per-video XP charges, and no additional specialist/CI workflow storms.
- No LIVE declaration until protected merge, successful exact-head CI, matching Vercel production SHA and actual browser export proof.
