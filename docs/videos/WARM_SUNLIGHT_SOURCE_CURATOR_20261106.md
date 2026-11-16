# Holistic House · Тёплое приятное солнце / Warm Pleasant Sunlight
**Date:** 2026-11-06 · **Scope:** catalog curation **only**, not playable assets

**Goal:** expand the **filmed**, source-credited sunlight options available for future MyTube/Video Studio generation: golden hour, sun sparkles above sea, peaceful dawn light, gentle coast, soft morning mist, and warm mountain/desert sunsets. Avoid harsh glare, flickering time-lapses, distressing weather, hurried driving shots and identical footage behind different URLs.

## Honest inventory
- Starting production baseline: **48 licensed filmed/composited MP4 masters + 684 procedural animations = 732 catalog records**.
- **9 unique Dareful public source-page candidates** saved in `data/video-catalog/warm-sunlight-source-queue-20261106.json`, separate from existing draft PR #3575's 25, three previous source waves and released pages.
- **0 new downloaded/encoded/approved/deployed MP4 files** in this change; no Vercel, Cloudflare R2, Supabase or recurring job writes. Candidates must **not** appear in playable asset counts or the automatic montage picker.
- There are **7 known Mux manifests** and **2 source pages with Mux URL pending verification**. M3U8 is a provider playlist, **not** a verified local MP4.
- Source page names and durations are publisher metadata. No scene frames were decoded, no actual brightness, framing, authorship of depicted content or exact motion verified.
- All candidate source pages claim CC BY 4.0 (Joel Holland / Dareful); attribution links and crop/re-encode changes must be publicly visible in resulting clips. Recheck each official source before import.

## Curated wave
| Priority | Subject | ID | Source |
| --- | --- | --- | --- |
| P0 | Golden coast at dusk | `sunset-coast-gold` | https://dareful.com/coast-dusk-sunset/ |
| P0 | Bright sunrise over the ocean | `sunrise-ocean-bright` | https://dareful.com/free-4k-stock-video-clip-of-a-bright-sunrise-over-the-ocean-stock-footage/ |
| P0 | Soft sunrise over water | `sunrise-water-soft` | https://dareful.com/sunrise-over-water/ |
| P0 | Warm light along the horizon | `sunset-sunrise-landscape-gold` | https://dareful.com/sunset-sunrise-landscape/ |
| P1 | Tranquil evening sea | `sunset-ocean-tranquil` | https://dareful.com/sunset-ocean-sea/ |
| P0 | Sunlight over the ocean | `sun-over-ocean-gold` | https://dareful.com/sun-over-ocean/ |
| P1 | Soft aerial dawn light | `dawn-dusk-aerial-soft` | https://dareful.com/dawn-dusk-aerial/ |
| P1 | Warm desert sunrise | `desert-sunrise-warm` | https://dareful.com/free-4k-uhd-travel-stock-video-time-lapse-desert-sunrise/ |
| P1 | Colorado mountain sunset | `rocky-mountain-sunset-light` | https://dareful.com/free-4k-stock-video-of-a-sunset-drone-flight-in-the-colorado-rocky-mountains/ |

**Dedup finding:** Malibu Sunset official page currently resolves to the **same Mux stream ID** as the Colorado sunset page; the Malibu listing is excluded from the new count until an independent full-media comparison proves otherwise. Existing released `warm-clouds-sunset` and `sun-trees-forest`, plus earlier queued `water-evening-sunset`, `sunset-sky-landscape`, `sunset-coast-timelapse`, are only cross-referenced, never new sources.

## Import/release gate (no shortcut)
1. Independently resolve the original downloadable video for each recorded page; review the publisher's individual CC BY 4.0 terms and whether people, properties or logos require separate rights.
2. Actually download each candidate, run ffprobe/FFmpeg, contact sheets and watch full original motion. Confirm brightness and soft pleasant sunshine, no flashes, acceptable contrast, cinematic visual appeal, source file and strong *two-aspect* framing; reject weak material. Do not claim vertical crop is native portrait 4K.
3. Check source page, video SHA-256 and multi-frame perceptual similarity against existing masters, all prior curation waves and within this batch. Reject duplicated or near-duplicated shots even with distinct names.
4. Record actual individual source approvals and editor decisions; retain author, original URL, CC BY 4.0 attribution and exactly what was cropped/silenced/re-encoded.
5. Use the **existing** approved film importer and Video Studio's physical playable catalog; publish only real H.264 MP4 + poster with 16:9 and 9:16 quality gates. Retain 16:9 as the default editor format.
6. Run exact-HEAD Core, Mandala video exports incl. WebKit, protected `hh-merge-check` and verify Vercel READY/alias/real movie playback before reporting as LIVE. No paid services, new subscriptions or bulk Cloudflare R2 uploads without cleared cost/rights gates.

**Related:** PR #3575 is already the separate 25-source cinematic screening lane. This wave does **not** modify its branch or duplicate its source pages. Existing catalog: `data/video-catalog/free-stock-scenes.json`; additional prior candidate wave manifests under `data/video-catalog/dareful-verified-candidate-wave*.json`.
