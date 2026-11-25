# My Coach native video performances

## First-party assets

The player and the avatar library use versioned, local MP4 files and full-resolution WebP posters from the first displayed frame of each take. HeyGen exports supply the original H.264 video stream for ten clips. Each published MP4 contains only its original video packets and timing, with its seek index at the front for progressive playback. Harry's two soft loops use their existing, approved local MP4s byte for byte.

| Coach | Calm source (HeyGen video ID) | Attentive source (HeyGen video ID) | Native dimensions |
| --- | --- | --- | --- |
| Mira | c14aefe9e83949e68c877ef9d9e72372 | 3d89a814e073455a9383fb0f80513f47 | 480 × 672 |
| Sofia | 104b6535a4c74546938e2a31ad9a31ad | 3509ef76754f4a8dacc02d02ecf8804f | 480 × 672 |
| Max | 734e6ce7ac4741e8be8e0445c34fae07 | 1425f6f323994822abca94ba4fd1a8e5 | 480 × 672 |
| Alex | 025386b0f80e46879c44302c74d6e8db | 2d41c9e002604bbc8219af8a81a819c7 | 480 × 672 |

| Wizard take | Source | Native dimensions |
| --- | --- | --- |
| Merlin greeting | 68778c25c46243ee99dd95a425d72d1c | 768 × 1152 |
| Harry greeting | d2c1461bd5ca43baafab846e85479277 | 768 × 1344 |
| Harry soft calm | harry-soft-calm.mp4 | 360 × 644 |
| Harry soft attentive | harry-soft-attentive.mp4 | 360 × 644 |

All ten HeyGen exports contain 124 video frames at 24 fps. Harry's two local loops run for 7 and 8.25 seconds. Playback state continues to choose the take. The ordinary greeting selects calm, and listening selects attentive for Mira, Sofia, Max and Alex. The player uses a poster before playback, for reduced motion and after a playback failure.

## Source recovery and verification

Download the completed MP4 for the listed HeyGen video ID. Remux the approved video stream into its first-party filename. This command preserves the native source time base of 1/12288, orientation and every encoded video packet.

```sh
ffmpeg -i original.mp4 -map 0:v:0 -map_metadata -1 -map_chapters -1 \
  -c:v copy -movflags +faststart -movie_timescale 12288 published.mp4
ffmpeg -i original.mp4 -map 0:v:0 -c:v copy -f streamhash -hash sha256 -
ffmpeg -i published.mp4 -map 0:v:0 -c:v copy -f streamhash -hash sha256 -
```

Both stream digests must match. Compare frame timestamps with ffprobe when replacing a take. For the poster, extract the first decoded frame at native resolution, convert to RGB, then encode WebP at quality 96. The filename uses the MP4's basename with a .webp extension. The native-video test checks the SHA-256 digest of each packaged video track against its source and reads the dimensions of each poster.

## Build and playback

The ten remuxes and twelve posters live in public/images/holistic-house/my-coach-motion. Earlier site builds downloaded the original four coaches at build time and encoded them at 328 × 456 with CRF 31. The prebuild now copies each committed v2 native performance to its previous v1 URL for older visitors with cached app code. The independent Samir preparation still runs through the existing prebuild entry point. Serving the other six coaches requires only the repository assets.

For a release, verify the actual first-party MP4 and poster URLs on the canonical production domain, including HTTP byte-range support and representative mobile playback.
