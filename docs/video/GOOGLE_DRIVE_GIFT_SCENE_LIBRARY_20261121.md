# Holistic House · Video Gift scenes on Google Drive (2026-11-21)

## Grounded source of truth
- PRIVATE production media archive: Google Drive "AI Videos" folder ID 1h5vBd21PdDvaZEHtaj9T3IROjeZBtOK9.
- New subfolder "Holistic House · Video Studio · Media Library" ID 1YWS3qb6bqNIygGNU-XtJvg9u47LlKQKL.
- Existing native Google Sheet "HH Real Video Vault 500", tab "Drive · Gift Scenes 21.11", sheetId 65020035. URL: https://docs.google.com/spreadsheets/d/1oVuZJ_o7TGyiG68tVow8DdLkrOL9vA5xO1wrHTsK0QM/edit
- 45 actual, readback-verified MP4 moved (not duplicated): 42 individual scenic MP4; 3 internal QA movies. 17 source ZIPs plus earlier archive documents remain untouched at the existing parent.
- New group subfolders: Light/Sky (3), Forest/Trees (10), Water/Ocean (12), Flowers/Garden (2), Mountain/Travel (6), Winter/Snow (7), Night/Stars (2), QA Internal (3). Cross-cutting emotional topics are TAGS in the Sheet and client picker, not additional copies of the same MP4.

## Editorial and rights gates
- Existing checked-in data/video-catalog/free-stock-scenes.json is the **reviewed browser composition source**. It contains 24 approved 5-second H.264 scenes (only four also confirmed Drive-archived): warm-clouds-sunset, fall-foliage-forest, snow-forest-winter, sun-trees-forest.
- The other 38 individual MP4 on Google Drive are indexed with RIGHTS_QA_HOLD until licensing, represented people/property, real motion, H264 browser decode and consent reviewed. Three QA samples are excluded.
- The 20 other approved five-second site-owned MP4 are indexed in the same Sheet as SITE_APPROVED_DRIVE_MIRROR_PENDING. They are **NOT claimed to be uploaded to Drive**. No raw public download buttons; in-video compositing only and visible credit "Footage: Joel Holland / Dareful · CC BY 4.0 (adapted)" where required.
- Content never moves straight from arbitrary Drive links to the browser Canvas: authenticated Drive delivery is incompatible with CORS/signed range/timed frame access. The site serves its own reviewed same-origin MP4 derivatives; Google Drive is the source/master archive, and a verified future importer should mirror remaining approved masters under the same registry IDs.
- User-uploaded portraits, therapeutic/CRM info, client voices and paid HeyGen fragments must **never** be copied to this shared Drive.

## Video Studio integration (one editor)
- "Personal Video Gift" /ru|en|es/holistic-support/mandala?mode=gift.
- On occasion chosen, the catalog selects a relevant visual group. Choose another group from Light/Sky, Forest, Water, Flowers, Mountains, Winter, Night; a user sees only the filtered rights-cleared scenes and their thumbnails.
- User chooses a recommended scene, selects another, or "No extra footage".
- The existing 25s compositor uses original portrait at 0–14s, an actual 5-second reviewed, decoded MP4 at 14–19s, then portrait/final ending at 19–25s. The optional HeyGen portrait fragment (3–8s) is a separately consented paid P1, still OFF.
- Same-origin CanvasSink (Mediabunny) timestamp-addressed MP4 decoder for WebCodecs output; native Safari MP4 path uses mute-play 5s video with strict actual frame readiness checks. Both use the existing H.264/AAC exporter, same captions, music and explicit My Videos save. No Cloudflare R2, no new paid server renderer and no Vercel publisher change.
- If a visual group has no cleared scenes, show a truthful empty notice; never substitute unapproved Drive media or infer rights from folder membership.
- The client picker currently derives from the checked-in approved 24-clip catalog; updating Google Drive/Sheet alone does not publish clips until approved first-party manifest and browser QA are updated. A scheduled Drive sync is NOT enabled.

## Acceptance
- Google Drive folders: 42 source MP4 in groups; 3 QA; no copies, source IDs preserved; native Sheet registry has 65 records (45 actual Drive files + 20 site-approved pending mirror).
- P0 still needs protected exact-HEAD TypeScript/build, Chromium and **physical iPhone Safari** H264/AAC/export/credits/scenario playback, My Videos auth and per-owner private upload QA.
- PR #5335 failed its initial TypeScript Core preflight with a single MediaStreamAudioTrack vs MediaStreamVideoTrack mismatch. Correctly widen tracks to MediaStreamTrack[] and re-run mandatory checks via one coherent source repair publish. No manual bypass, no direct production deployment.
