# Holistic House — 120-storyboard music binding and reviewed acoustic import

## Delivered without additional provider fees
- Existing executable Video Studio: 48 four-shot film presets × 4 independently synthesized MP3s = 192 generated original recording files (upstream PR #2948), plus four original synthesized public-domain tunes.
- New canonical five-category taxonomy (PR #2949): 120 editorial scenarios × 4 **different real MP3 file choices** = 480 assignments using the same 192 masters. Every 24-story category draws on 96 distinct recording IDs and does not reuse one within its category. **Across different categories, reuse is explicit**; do not misrepresent 480 assignments as 480 newly created recordings.
- `lib/mandala/goal-tree-audio-playlists.mjs` provides four localized choices for a stable scenario ID, plus a coverage audit. It declares `finalVideoReady:false` because the new editorial storyboards still need licensed video clips and genuine final render.
- Goal-category mapping: Body (health/life/energy); Work (money/goals/life); Energy (energy/life/health); Love (relationships/life/health); Stress (health/relationships/life). Four original instrumental timbres remain available for each scenario.

## What counts as an importable real performance
**Two independent copyrights must be checked:** the underlying musical composition *and* the particular sound recording/performance. Being an old or famous melody does not make a contemporary orchestral performance free to copy.

Only publish individually verified **CC0, CC BY 3.0/4.0, or demonstrably public-domain** sound recordings with separately cleared composition rights, retaining creator, performer, source link, license and exact-date evidence. CC BY requires visible attribution and a link to the license and source. Public Domain Mark is not itself a license, so do an independent rights check for the user's distribution territories.

Sources to review per recording:
- Wikimedia Commons audio: https://commons.wikimedia.org/wiki/Commons:Sound_recordings — public-domain and CC recordings; inspect each file description and both composition/recording tags.
- Openverse audio discovery: https://api.openverse.org/v1/ — search with `license=cc0,by,pdm`, `license_type=commercial`; **never trust search results alone**. Review the originating file's source page and rights.
- Musopen: https://musopen.org/ — per-recording licenses vary; do not assume every recording of an old work is public domain.
- Pixabay: https://pixabay.com/service/license-summary/ — often permissible **inside an edited video**, but standalone redistribution of raw music is prohibited. **Do not put raw Pixabay MP3s into our publicly accessible audio catalog.**

Do not mirror YouTube/Spotify/Apple Music audio, celebrity recordings, music protected by Content ID without permission, or CC BY-NC/ND performances into the public picker.


## Independently reviewed source candidates (not yet imported)

On 2026-11-01, the originating **Wikimedia Commons file pages** were reviewed for recording-level licensing. These are **candidate recordings, not entries in the live soundtrack registry**: downloading, checking recording/composition provenance, verifying SHA-256, hearing the master, cutting/loudness-normalizing, and committing the resulting MP3 must still happen through the importer. A public page's CC0 claim is evidence to review, not a substitute for verifying authenticity and applicable rights.

| Familiar recording | Performer / publisher shown | Recording permission shown | Source file and intended genres |
| --- | --- | --- | --- |
| Beethoven — Für Elise, WoO 59 | Gaodifan (V. Gao), self-made recording, 2006 | CC0 / dedicated public domain | https://commons.wikimedia.org/wiki/File:FurElise.ogg — calm melodic piano; Body, Love |
| Erik Satie — Gymnopédie No. 1 | Teknopazzo, own work; source media corrected in 2022 | CC0 | https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1..ogg — gentle meditation, Body, Stress |
| Frédéric Chopin — Nocturne Op. 9 No. 2 | Membeth, own piano recording, 2013 | CC0 | https://commons.wikimedia.org/wiki/File:Chopin.Nocturne.Es-Dur.opus.9.2.ogg — calm romantic piano, Love, Stress |
| Erik Satie — Gymnopédie No. 1 (alternate performance) | Kevin MacLeod, arrangement/performance, ISRC USUAN1100787 | CC BY 3.0 with mandatory on-site attribution | https://commons.wikimedia.org/wiki/File:Gymnopedie_No._1_(ISRC_USUAN1100787).mp3 — Body, Love |

For CC BY 3.0, show the arranger/performer, exact track title, source URL, license URL and an indication that the 32-second audio was shortened and normalized. Check both underlying public-domain composition and recording before publication. If any source is disputed, or fails identity/attribution or SHA checks, skip it. Never publish a mere Wikimedia transcode hotlink as a product asset.

## Offline operator workflow (no cloud API, no recurring bill)
1. Review source and license for this **exact** recording. Download the file yourself from its legitimate page, not a streaming player URL. Save it as `output/audio-inbox/original.wav` (the `output/` folder is gitignored). Collect evidence of performer, composer, license, source page and date.
2. Obtain the verified SHA-256: `shasum -a 256 output/audio-inbox/original.wav` (macOS) or `sha256sum output/audio-inbox/original.wav` (Linux). Prepare `output/audio-inbox/original.json`:

```json
{
  "id": "curated-warm-piano-01",
  "sourceFile": "original.wav",
  "sha256": "REPLACE_WITH_VERIFIED_64_CHARACTER_SHA256",
  "reviewed": true,
  "reviewedOn": "2026-11-01",
  "recordingLicense": "CC-BY-4.0",
  "compositionRights": "public_domain",
  "sourcePage": "https://commons.wikimedia.org/wiki/File:REPLACE_WITH_EXACT_FILE",
  "recordingLicenseEvidence": "https://commons.wikimedia.org/wiki/File:REPLACE_WITH_EXACT_FILE",
  "creator": "REPLACE_WITH_LICENSED_CREATOR",
  "performer": "REPLACE_WITH_PERFORMER",
  "title": "REPLACE_WITH_EXACT_TRACK_TITLE",
  "categories": ["body", "stress"],
  "moods": ["calm", "focus"],
  "pace": "slow",
  "voiceSafe": true,
  "name": {
    "ru": "Мягкая классическая мелодия",
    "en": "Gentle classical melody",
    "es": "Melodía clásica suave"
  }
}
```

3. Run `node scripts/import-reviewed-audio.mjs --manifest output/audio-inbox/original.json --dry-run`. Correct all metadata/rightsholder blockers before proceeding.
4. Run the same command without `--dry-run`. The script verifies source SHA-256, converts using local FFmpeg to a 32-second 44.1 kHz stereo / 160 kbps MP3 with controlled -23 LUFS integrated loudness and gentle fades, and atomically registers exact file hash and attribution in `data/video-catalog/curated-audio-imports.json`. Never publish a track based on metadata alone.
5. Commit the actual `public/audio/mandala/curated/curated-*.mp3` together with the updated attribution registry. Run `node --test tests/import-reviewed-audio.test.mjs`; review playback, clipping, rights display and exported final video's audio.
6. Only then wire imported metadata into the Video Studio selection UI. The current registry is empty: **no external performance has yet been imported or exposed as a usable track**. This preserves legal and playback honesty.

## Release criteria
- One audio player and one microphone in the existing video interface, no second editor.
- MP3 from our own HTTPS domain; preview, selected soundtrack and video export refer to the same validated file; no silent fallback after unavailable MP3.
- Metadata/rights/attribution preserved, CC BY credits visible to users, no standalone-restricted imports.
- New 120 editorial video scenarios are not marked finished until all their licensed clips are available and final montage is validated.
- Before LIVE: merge #2948, verify the production asset URLs; then merge canonical taxonomy #2949, retarget this stacked PR and run required exact-head checks.
