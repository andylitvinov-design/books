# Holistic House — Warm Pleasant Sunlight filmed video release
**2026-11-06 · Rights and physical video proof**

Four real independently filmed original stock sources are now staged as eight MP4 edits: four genuine 16:9 landscape files (1280×720, H.264 24 fps, 5 seconds) and four 9:16 portrait re-frames (720×1280, H.264 24 fps, 5 seconds) with matching JPG posters. These are **four distinct filmed originals**, not eight independently filmed works, and not procedural animations. The vertical crop is not native portrait 4K.

The source footage is by **Joel Holland / Dareful, CC BY 4.0**. Original official pages:
- https://dareful.com/dusk-dawn-ocean/
- https://dareful.com/free-4k-stock-video-of-autumn-fall-foliage-aspen-trees-stock-footage/
- https://dareful.com/trees-looking-up/
- https://dareful.com/autumn-mountain-landscape/

The first-party copies are five-second excerpts; audio removed, landscape downscaled, portrait center-cropped from wide originals and both H.264 re-encoded. Creator, source, license URL and modification notice appear in each `free-stock-scenes.json` and `scene-taxonomy.json` metadata record.

**Review evidence**: reused existing one-time GitHub Actions exact-source media run `41977542713` / artifact `13392457705`, generated 9-frame contact sheets and actual decoded FFmpeg metrics. The assistant inspected the contact sheets, including sunlight appearance and frame continuity, not merely filenames. All selected films had a quality score 100, passed the motion gate and were verified as actual five-second H.264 files in both formats. Each copied file and poster has an independent SHA-256 checked against `sunlight-physical-import-evidence-20261106.json`; CI contract recomputes SHA-256 for every file. The source user did **not** individually watch each video, and no claim of actual physical iPhone Safari playback/export is made.

**Catalog linkage**: 48 pre-existing portrait licensed scene records retained; 8 new aspect-specific filmed MP4 records => 56 total local licensed scene records, plus 684 old procedural motion-art files => 740 total catalog rows *after protected production deployment*. Four new landscape clips make an honest 16:9 film preset possible where previously only portrait videos were indexed. New preset `warm-pleasant-sun` / **Тёплое приятное солнце**, localized RU/EN/ES, holds four different original films and chooses the right four files for landscape vs portrait; no repeated source in one four-shot montage. Original 24 curated extra presets remain.

**No extra cost/services**: no paid generation API, second renderer, public third-party hotlink, remote user asset or recurring workflow. The one-time GitHub importer was removed from the branch immediately after staging physical assets.

**Remaining protected gates** before claiming LIVE: `node --test tests/warm-sunlight-filmed-release.test.mjs` and existing media/film/MyTube tests; exact-head Core + Specialist including applicable WebKit media export; protected `hh-merge-check`; merge; verify Vercel production READY with SHA ancestry and actual public MP4 16:9 / 9:16 playback. Record separately any physical iPhone Safari verification not performed.
