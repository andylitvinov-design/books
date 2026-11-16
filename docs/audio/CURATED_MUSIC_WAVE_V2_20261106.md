# Holistic House Audio Vault — curated source wave 2 (2026-11-06)

## Exactly what this delivery contains
- 20 **different, newly collected, original composer-authored MIDI source scores**, real binaries under `assets/audio/curated-midi-v2/`. These are not MP3 recordings and are not yet playable in the existing Video Studio music picker.
- A manifest of 20 corresponding *recorded MP3 master candidates* with original author commit, original file path, Git SHA-1 object identity, exact byte size, rights evidence, RU/EN/ES labels and preliminary goal/mood metadata. It does **not** publish them as MP3s or increase the live track count.
- A one-time, offline `--audit` / `--stage` script with strict source hash checking and ffprobe codec/length checks.
- No additions to `curated-audio-imports.json`, since new MP3s must be listened to, approved and actually encoded and stored first.

## Original source, provenance, permitted use
All selected works are originally composed by **Tanner Helland**, not covers of game music or remixes of another composer. Publisher: https://github.com/tannerhelland/free-music ; immutable original commit: `f6bfe16f49feab2181075ab86b13b24740592aa6`.
Composer/publisher rights notice: https://github.com/tannerhelland/free-music/blob/f6bfe16f49feab2181075ab86b13b24740592aa6/README.md
CC BY 4.0 full licence: https://github.com/tannerhelland/free-music/blob/f6bfe16f49feab2181075ab86b13b24740592aa6/LICENSE.md
Required attribution in client-facing export: *Music: [original title] — Tanner Helland, licensed under CC BY 4.0; source: https://github.com/tannerhelland/free-music; adapted/shortened and mixed by Holistic House*. Include https://creativecommons.org/licenses/by/4.0/ and preserve per-track composer/source detail. This license permits commercial use and modifications **with credit**, subject to third-party rights not covered by it.

## Import & release procedure
1. `node scripts/acquire-curated-music-wave-v2.mjs --audit`: checks all 20 actual MIDI assets against original pinned Git blob hashes and byte lengths, compares candidate IDs to published catalog and reports pending vs published candidates.
2. On an authorized machine with Node 22 and ffprobe, run `node scripts/acquire-curated-music-wave-v2.mjs --stage`. This downloads only the SHA-pinned **20 original MP3 recordings** from composer repo into gitignored `output/audio-inbox/`; validates SHA, length, MP3 codec and track duration; creates private `curated-*.json` worksheets where `reviewed:false`.
3. HUMAN editorial audition each complete recording: verify no borrowed melody/uncredited game themes, music-only/voice friendliness, clipping, noise, musical distinctness, appropriate mood and licence. Update rights review date and `reviewed:true` only after evidence. Reassess `voiceSafe` appropriately. Mixed licences require separate review.
4. For each approved file, `node scripts/import-reviewed-audio.mjs --manifest output/audio-inbox/curated-<slug>.json`. The **existing** importer validates SHA256, evidence/composition rights, FFmpeg output and duration, then publishes a ≤96-second normalized MP3 and updates `data/video-catalog/curated-audio-imports.json`. Only at that point is it an **actual** selectable track in Video Studio. File naming remains `/audio/mandala/curated/curated-<slug>.mp3`.
5. Re-run `node --test tests/curated-music-wave-v2.test.mjs` and applicable existing audio tests. Pass protected Core, Specialist, Guard and mobile preview/audio-export QA; verify protected PR merge, production Vercel READY with matching SHA and a real audible iPhone test. PR creation alone is never LIVE.

## Cost and rights safety
No runtime hotlinks or build-time mass download; no new API key, paid runner, background cron, Vercel preview or Cloudflare R2 objects. No cost commitment and no generated false scene count. Existing 5 actual external MP3 recordings remain independent. Every distinct audio count is **by actual verified MP3 file**, not source candidate or assignment.

## Additional-source research
Future source prospect: https://kaino.dev/library/music (CC0 tracks). Not automatically imported; per-object recording/composition rights, provenance, availability, duplicates, audition and downstream standalone distribution conditions all require review before adding to our public catalog.
