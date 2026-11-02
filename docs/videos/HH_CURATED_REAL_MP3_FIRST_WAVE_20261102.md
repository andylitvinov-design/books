# Holistic House · first five actual recorded instrumental tracks
2 November 2026 · owner review pending

## Scope and provenance
The current catalog's 192 scenario MP3s are synthesized original scores. These five
**additional** sources are real recordings from one composer-owned, original music
collection (not rebranded oscillators, not speculative generated audio):

| ID | Original recording | Intended first review |
|---|---|---|
| curated-memory-away | A Memory Away | Memory, love, calm |
| curated-daybreak | Daybreak | Energy, focus, work |
| curated-home | Home | Safety, body, stress |
| curated-forest-awakes | The Forest Awakes | Nature, energy |
| curated-leaving-millie | Leaving Millie (live piano) | Relationships, quiet piano |

Source repository: https://github.com/tannerhelland/free-music
Pinned source revision: f6bfe16f49feab2181075ab86b13b24740592aa6
Composer-published CC BY 4.0 terms:
- https://github.com/tannerhelland/free-music/blob/f6bfe16f49feab2181075ab86b13b24740592aa6/README.md
- https://github.com/tannerhelland/free-music/blob/f6bfe16f49feab2181075ab86b13b24740592aa6/LICENSE.md

Each original MP3 path and exact Git blob identity is frozen in
data/video-catalog/curated-music-source-wave-v1.json. Exclude any game/movie
arrangement even if placed in the same repository: the CC BY grant for a master
recording does not clear a third-party underlying composition.

## Delivery
- The one-off, feature-branch-only GitHub runner downloads these five source
  MP3 objects; validates exact source byte count and pinned Git blob hash;
  probes real MP3 codec, sample rate, channels and duration.
- The existing guarded importer checks SHA-256, author, performer, two independent
  rights grants and output file path. It cuts a first **96-second** licensed
  preview/music bed per track, stereo 44.1 kHz, MP3 CBR 256 kbit/s, with bounded
  loudness and fades. Encoding 256 kbit/s cannot restore quality missing from a
  lower-bitrate original. Keep the original source SHA in the published registry.
- Five real first-party paths must exist under /audio/mandala/curated/<id>.mp3,
  and all five IDs must be recorded with nonblank EN/RU/ES names and licenses.
- The existing single Video Studio music player, attachment, voice mix and export
  path should accept these IDs; do not create a duplicate editor.
- The runner also generates a non-published 10-second H.264/AAC MP4 proof using
  existing approved calm-sea footage plus curated-home music and uploads it for
  physical-audio review; preserve both video-source and composer credits.

## Rights and quality acceptance — before LIVE
1. Verify and listen to the real five encoded MP3s, no silent files, bad clicks,
   noise, clipping or unusable openings. The original audio may have varied
   production quality. Do not call it "professional-approved" before listening.
2. Show the attribution "Music: Tanner Helland", original recording title,
   source link, CC BY 4.0 license link, and a note that the excerpt was edited.
3. Test selecting a newly recorded track on iPhone Safari, using the existing
   attach control, mixing with voice, recording with an approved MP4 clip,
   **downloading and hearing the final file**. Chrome/Chromium must also work.
4. Validate actual MP4/AAC or WebM/Opus output (depending on browser) and prove
   video + sound are physically present by FFprobe; source MP4 is not a music codec.
5. Only after exact-HEAD Core/Mandala/Guard release gates, production merge,
   Vercel READY, canonical alias, and audible mobile LIVE smoke may this be
   marked shipped.

This first wave belongs in a **draft** stacked PR until the owner's editorial
listening review. A preview workflow's success is not a LIVE deployment.
