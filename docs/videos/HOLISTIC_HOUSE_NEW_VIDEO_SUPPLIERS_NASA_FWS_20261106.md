# Holistic House — additional filmed source suppliers, November 6, 2026

## Current source inventory boundary

Wave 4 Dareful, Wave 5 Acadia, Wave 6 Grand Canyon, Wave 8 NOAA Ocean Exploration are separately indexed. Native filmed source identity is counted exactly once regardless of aspect/crop/shorter-cut derivatives. Source page candidates, metadata links or QA without actual videos count as **zero filmed masters**.

## NEW source A — NASA Image and Video Library
- Official searchable API: https://api.nasa.gov/ — image/video `https://images-api.nasa.gov/search` and `/asset/{nasa_id}` endpoints; no key required for library lookup.
- NASA media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/
- Strict discovery: ten related search terms, video MIME, NASA center identity, unique NASA_ID, 40 candidates max; filter animation/composites/third-party/copyright language where evident. No automatic legal pass.
- Physical QA: decode official images-assets.nasa.gov MP4, 5s H.264/yuv420p 24fps 1280×720 and portrait 720×1280 crop; strict source geometry, SHA-256, full decode, basic frame movement and contact sheet.
- **Critical**: NASA generally licenses factual/informational use subject to restrictions. Commercial/promotional use, emblems/logos, current NASA employees/astronauts or other recognizable persons, some third-party video/music, and implied government endorsement require independent legal rights assessment. Therefore all footage remains PRIVATE QA, not generator eligible, not released.

## NEW source B — US Fish & Wildlife Service / NCTC B-roll
- Official index: https://www.fws.gov/library/collections/b-roll-videos
- Video collections: American Birds, Wildlife, Monarch Butterflies, Fisheries, People & Places, Underwater.
- USFWS explicitly invites footage reuse with credit to videographers and USFWS, but **some videos incorporate separately licensed music**. Entire music productions have constraints; isolate and remove audio from personally licensed camera footage only after rights check.
- This code initially discovers **official FWS/VBrick source pages**, not bypassing video delivery controls or automatic licensing. No download from private embeds, no mass scraping. Site/clip metadata needs manual and legal review before actual MP4 import.

## No additional paid resources or production modification
A one-time branch-only GitHub Actions workflow. Source-only research and QA; all footage remains in isolated artifacts until camera/quality/rights and existing R2 account cost/usage gating are completed. Do NOT enable R2 or add keys, cron, buckets or public footage copies. Do not count until verified actual byte-level SHA/FFmpeg checks and archive readback. Actual Cloudflare bucket and Supabase zero/greater counts must be independently verified before declaring LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: stage all code/tests/MD offline; publish once to QA branch; no PR/production release until legal/r2 gates.
