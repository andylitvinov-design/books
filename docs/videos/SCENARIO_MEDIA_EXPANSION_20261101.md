# Holistic House · Scenario media library / verified expansion · 2026-11-01

**Owner target:** one goal-first Video Studio, not a second editor. Categories: **Тело / Дело / Энергия / Любовь / Стресс**. Goal → topic → at least 4 scenarios per topic → **at least 4 different real licensed MP4 sources for each scenario** → optional music and narration → actual export. No silent stock-photo or CSS-animation substitutions.

## Verified baseline (production branch `codex/public-book-library` before this PR)
- **44 actual local H.264 MP4 master clips**: 12 money-v1 + 20 film-v2 + 12 Dareful CC BY v3. Local JPG poster for each.
- **24 presets / 6 currently executable theme buckets**; each preset references 4 *different* clip IDs (96 placements), but cross-preset sharing is extensive. **Only 36 of 44 approved MP4 IDs are used**.
- From dedicated clip capacity, 52 *additional independent MP4 masters* are needed to allocate four non-shared, same-theme clips to each current preset. This assumes all 44 existing masters can be allocated exactly once and does not yet cover new stress topics.
- The 22 authored instrumental melody IDs in `scripts/generate-mandala-melodies.mjs` were referenced by the editor but their static `.wav` files were **not committed** to the production branch. 17 texture/nature WAV files already exist. `scripts/ensure-mandala-melodies.mjs` now prepares the 22 real 32s WAV masters in `predev` and `prebuild`; no API or paid service.

| Existing theme bucket | Current MP4 masters | Dedicated slots (4 scenarios × 4) | Minimum new distinct MP4 |
|---|---:|---:|---:|
| money / Дело | 16 | 16 | 0 |
| energy / Энергия | 8 | 16 | 8 |
| life / Жизненные изменения | 8 | 16 | 8 |
| health / Тело | 9 | 16 | 7 |
| relationships / Любовь | 2 | 16 | 14 |
| goals / Цели, дело | 1 | 16 | 15 |
| **TOTAL** | **44** | **96** | **52** |

**Стресс**: new fifth goal category is a structural requirement from the owner's newer scenario-tree specification; it is NOT claimed to have a dedicated executable four-scenario topic in the above 24. Four new stress scenarios imply at least **16 further approved dedicated MP4 slots**, unless a future taxonomy demonstrably allocates additional unique footage. Do not mark it ready based on health footage reused from another scenario. This is a *minimum*, not a final target for the expanded topic tree.

## Implemented controls

1. `lib/mandala/scenario-media-coverage.mjs` is the shared deterministic audit and fair assignment planner. Validates real same-origin MP4/JPG paths, approved license metadata, four distinct IDs in every storyboard and counts *cross-scenario reuse*. The planner proposes unique, same-theme clips, giving existing matching scenes priority, filling each stage fairly, and leaving `null` slots rather than inventing assets.
2. `npm run media:audit` checks catalogue entries AND **physical** local MP4/JPG files, reports shortages and missing original WAVs; `npm run media:plan` previews proposed assignments. Add `--dedicated` as a future release gate when the library is complete. `--apply` refuses to change live preset allocations unless all four dedicated clips for **every** scenario are ready and music is present; manual viewing is still required for artistic consistency.
3. `npm run media:music` prepares each original 32s WAV only if absent or invalid; `npm run media:music:verify` checks them without generation. All 22 are synthesized from project-authored scores rather than uploading commercial recordings. They are generated during build **before Next.js serves the soundtrack URLs**.
4. `scripts/import-scenario-video-batch.mjs` imports reviewed local **Dareful CC BY 4.0** footage (two different original source videos per new 5s H.264 film) using the existing FFmpeg-based importer. It rejects source pages reused elsewhere in the catalog and duplicate/new scene IDs; it requires *explicit* independently reviewed visual motif labels and EN/RU/ES descriptions. On success it writes the output MP4/JPG, provenance record and the taxonomy the existing Video Studio reads.

**Important:** the automation above makes an intake pipeline and fixes original music publication; it **does not conjure or falsely report** 52 additional imported stock videos. Their individual source files, license checks and human visual review remain prerequisites. No unapproved source is exposed to client rendering.

## Operator procedure · no new subscription

1. Curate visibly distinct nature/urban/people-free clips relevant to **energy +8 / life +8 / health +7 / relationships +14 / goals +15**; then expand new stress topics. Prefer calming light, landscapes, flowers, meaningful paths and authentic human-safe symbolism (avoid recognizable people and trademarks until documented releases).
2. Free source options with per-item review: [Dareful](https://dareful.com/about-dareful-completely-free-4k-stock-video/) CC BY 4.0 (requires author/license/change credit); [Mixkit Free Video](https://mixkit.co/license/modal/videoFree/) (do **not** use Restricted items); [Pexels](https://www.pexels.com/license/) and [Pixabay](https://pixabay.com/service/license-summary/). The existing individual importer supports several providers after exact-clip review; batch approval presently permits Dareful only. Do not hotlink stock or redistribute raw video.
3. Download original clips legally and save outside `public/`, ideally as short source files. An operator prepares one JSON brief per output with **two distinct real source files** (each around 2.5s or longer), `id`, `theme`, translations in `label`, `symbol`, `tags`, and two `sources` entries including exact `file`, `provider`, `sourcePage`, `author`, `clipTitle`, `licenseId`, `licenseUrl`, `licenseEvidence`, `checkedOn`, `noRecognizablePeople:true`, `noVisibleBrandLogos:true`, `exactClipLicenseConfirmed:true`, `commercialUseApproved:true`, `editingApproved:true`, `identifiableSubjectsCleared:true`. See `lib/mandala/free-stock-sources.mjs` for validation contract; do not pre-set a true flag without a real check.
4. Prepare batch manifest `batch.json` in the **same directory** as briefs, with schema:
   ```json
   {
     "version": 1,
     "scenes": [{
       "brief": "checked-scene-01.json",
       "targetScenarioId": "soft-reset",
       "taxonomy": {
         "description": {
           "ru": "Новый проверенный реальный пейзаж",
           "en": "A newly reviewed real landscape",
           "es": "Un paisaje real verificado"
         },
         "categories": ["nature", "calm"],
         "motifs": ["light", "forest"],
         "pace": "slow"
       }
     }]
   }
   ```
   Names above illustrate the schema; no `checked-scene-01` video is claimed to exist.
5. **Dry-run**: `node scripts/import-scenario-video-batch.mjs /private/source/batch.json`. Then `node scripts/import-scenario-video-batch.mjs /private/source/batch.json --import`. The latter performs H.264/1080×1920 render, poster generation, sha256 checks, provenance and taxonomy registration. Import is sequential and non-overwriting; run in a dedicated Git working tree, review its diff, commit the produced files through the existing protected PR/CI process. If a batch fails mid-way, preserve logs and continue using a new batch for unprocessed items; never delete already-published files blindly.
6. `npm run media:audit` shows remaining deficits. When all required clips exist, `npm run media:plan`, visually review every proposed four-shot storyboard, then `node scripts/audit-scenario-media.mjs --apply --audio`. The active preset catalog is changed **only after complete coverage**. Test portrait iPhone Safari decoding, music attachment, MP4 export and license credits. Do not disable required CI checks to publish.

## Soundtracks: beautiful & recognisable

- **Ready by build**: 22 original authored instrumental melodies (piano, harp, celesta, flute, strings, handpan etc.), plus 17 existing optional nature/texture audio tracks.
- For **famous classical themes**, a public-domain composition (for example Beethoven's *Ode to Joy* / *Für Elise*, or Bach's *Prelude in C Major*) is **not equivalent to a public-domain audio recording**. Obtain a recording with explicit commercial synchronization and distribution rights, ideally CC0, or generate an original performance from a verified public-domain score; retain creator, license, evidence, file SHA-256 and source URL.
- Mixkit's [Free Music License](https://mixkit.co/license/modal/musicFree/) allows music **within videos** subject to its restrictions, but forbids redistribution as stand-alone music-only tracks, games and other uses; **do not** import it as a downloadable raw music library. Use the standard reviewed music policy before any additional tracks become selectable.
- Aim for 4 musically distinct scored options per scenario (gentle piano, strings, nature + melody, and warm uplifting track) without forcing four loud layers into one mix. Respect voice intelligibility (music ducking) and mobile Safari recording constraints.

## Acceptance criteria

- Scenario → four genuinely different H.264/AAC-capable real moving clips, owned or licensed, with no shared source footage across scenarios in the *dedicated* pool.
- Approved manifest and physical files agree. Source origin and licenses remain traceable. No unknown remote URLs, no copyrighted commercial soundtracks without verified rights.
- Every active user goal has four meaningful variants; a topic with insufficient video is clearly flagged not-ready, never silently filled with an unrelated clip.
- 22 WAV melodies are built and serve HTTP 200, decode, preview and export with audio. Test `npm run media:music:verify` after build and physically reopen the generated MP4 on iPhone.
- RUN `node --test tests/scenario-media-coverage.test.mjs` before merge; release only through actual production CI and Vercel verification.
