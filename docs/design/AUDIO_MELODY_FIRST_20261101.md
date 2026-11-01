# Holistic House · Instrumental melodies first

Goal: The visitor hears an original melodic instrumental piece, not an isolated drone, tone or noise effect. Choose a goal, audition a composition and explicitly attach it to a personal video.

## Product changes
- Video Studio Audio opens in Beautiful Melodies with theme-aware selection.
- 22 original instrumental arrangements have distinct authored scale-based melody patterns, four changing chords, bass, gentle arpeggios, warm backing and an answering phrase. Each is a 32-second mono PCM WAV (22050 Hz).
- Melodic timbres: synthesized piano, harp, flute, strings, kalimba, celesta, marimba and handpan. No copyrighted samples or paid API. Do not claim acoustic recordings or professional mastering.
- Eight older base soundtracks, nine instrument-name entries and the five originally scored melodies become newly composed WAV masters, preserving 22 existing IDs and URLs.
- 17 nature/ambient/pulse textures remain as optional filters, not the starting playlist. No existing sound content is deleted without an alternative.
- RU/EN/ES copy and quick choices emphasize music, not sounds, and goal-specific melody recommendations.
- One HTML audio player, one mic, consent, Attach and Video export remain; no user recording upload.

## Deterministic build
- Original authored scores: scripts/generate-mandala-melodies.mjs. Master IDs and exact same-origin WAV export path: lib/mandala/local-video-music.ts.
- Store scores, not 31MB of derived PCM binaries, in source Git. Remove 22 obsolete tracked WAV versions; the existing prebuild and predev audio pipeline calls scripts/generate-soft-ocean-melody.mjs, which now writes all 22 compositions under public/audio/mandala using identical filenames.
- Mandala specialized CI regenerates WAV directly before audio regression tests; the established audio build entrypoint regenerates them for production and local dev. No runtime external requests, music providers or serverless render costs.
- Run node scripts/generate-mandala-melodies.mjs --check for byte-for-byte build parity once masters exist.

## Acceptance / limits
- Unique original melodic contours and chord motion; 32-second loops; bounded peaks, nonzero audible RMS, no sample dependencies.
- Tests verify 22 scored originals + 17 optional sound textures, source paths, representative deterministic PCM byte parity, and melody-first ordering across all six goals.
- Exact-head CI, lint, TypeScript, Next build, native browser Play, attach and audible encoded export; Vercel production READY exact SHA.
- Aesthetic judgment is subjective; physical iPhone listening remains a separate acceptance item.
