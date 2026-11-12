# Holistic House Video Studio — 728 physical MP4 source library

Release scope: **44 previously approved/licensed live-source records + 684 original, non-photographic, project-generated animated MP4 masters = 728 physical MP4 source records**.

## What was actually generated

The first wave consists of 320 five-second original-motion H.264 MP4s + 320 JPG posters and 64 four-shot montage presets. The second wave generated **364 additional independent encoded MP4s**, **364 additional JPG posters** and 64 alternative four-shot montage presets, without re-encoding the first 320. The combined original-animation manifest now contains **684 MP4 records**, 128 editable film presets. Previous 44 licensed-footage sources are maintained separately.

The new distribution follows the user-approved 4 category / 16 subcategory / 64 topic MyTube taxonomy:

| Editorial category | Second-wave new MP4s |
| --- | ---: |
| Goals & Money | 80 |
| Love & Relationships | 96 |
| Energy & Confidence | 92 |
| Stress & Recovery | 96 |
| **Total** | **364** |

Every topic has at least ten original-motion variants (v1–v10); 44 highest-need topics in Love, Stress and Energy have an eleventh (v11). The new v6–v11 variants use six recognizably distinct visual families: aurora, orbit, bloom, sunburst, ripple and light path. They are **stylized procedural animations, not 364 newly filmed physical scenes or photorealistic generated footage**.

## Safety, source provenance and quality

- All new files are **actual** project-created H.264 MP4s and JPEG posters, encoded and decoded with FFmpeg, with deterministic per-topic seeds, individual SHA-256 hashes, 5-second durations and genuine moving frames.
- Video master: **432 × 768 at 18 fps**. These are mobile-oriented optimized animated clips, **not native Full HD source photography**. The existing renderer can scale them, but scaling does not create native Full HD detail.
- Metadata labels original procedural non-photographic visuals with `rightsReference.kind=project_generated_original`. Existing 44 licensed sources keep their own provenance; captions, visual tags and categories must not misrepresent animated art as stock camera footage.
- New render uses no third-party creative footage, AI API, GPU, account details or user uploads. New originals have six visual families, but variants share the studio's symbolic aesthetic. A unique SHA-256 proves independently encoded file bytes, not complete perceptual originality.
- Newly sourced physical clips must remain licensed individually; nothing in this release authorizes automatic publication of outstanding stock-footage candidates.
- One-time generator workflow was removed after successful, isolated execution. No recurring job or new paid subscription is added. Storage and egress have nonzero real-world usage and should be monitored under the existing GitHub/Vercel plans.

## Acceptance gates

1. `python3 scripts/extend-original-motion-728.py --check-only --verify --max-mebibytes 95`: 684 original MP4s present, each SHA matches, 364 new motion sources decode, 128 four-shot presets, total originals + posters under 95 MiB.
2. `node --test tests/original-motion-library.test.mjs`: fail if physical MP4/poster missing, hash wrong, rights spoofed, duplicate ID, cross-topic scene mixing, wrong count or invalid four-shot preset.
3. `node scripts/audit-hh-video-library.mjs --strict`: truthful, separate counts for licensed footage and original animation; overall 728 or more physical approved source records.
4. Existing Video Studio: original licensed 44 never removed; new 128 original-animation presets available to Auto Video Director and optional four-shot replacement. Originals are clearly labeled **Animation / Анимация / Animación**.
5. Release only after exact-HEAD Core, Specialist/Mandala, real WebKit/iPhone playback and audio export acceptance, protected merge into `codex/public-book-library`, Vercel production deployment READY for the merged commit, and client-visible smoke. This page alone never represents LIVE proof.

## One controlled release

The 364 new masters build on #3351's existing 320-original-video integration. Prefer one consolidated, protected #3351 release rather than introducing a second duplicate 700+ file PR and another expensive full-CI cycle. Preserve all production UI and CI changes in a conflict-free integration. If the production branch diverges, revalidate the exact protected target before merge.
