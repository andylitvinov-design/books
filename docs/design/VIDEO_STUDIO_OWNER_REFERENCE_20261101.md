# Holistic House · Video Studio owner-approved mobile mock (2026-11-01)

## Reference identity and priority
- Owner supplied one 864 × 1536 portrait image of an **iPhone mock** in ChatGPT on 1 Nov 2026; reference is a visual/product contract, **not an assertion that a generated video is already saved**.
- Canonical page: `/{ru,en,es}/holistic-support/mandala`, anonymous guest, existing Video Studio / `MandalaFreeVideoStudio`; no new route or second renderer.
- Existing in-place workspace navigation, privacy guard, Free local Canvas/MediaRecorder composition, approved 44 source MP4, 48 four-shot presets, private photo consent, XP/payment gates and protected cabinet all stay intact.
- Reference hero copy suggesting a medical cure is deliberately replaced with non-clinical support wording.

## Mobile reference geometry — content only (not iOS browser chrome)
Target 390 CSS px; inspect 320, 354, 390 and 430 px, plus desktop 768 and 1440:
| Region | Reference placement | Implementation owner | Expected action |
| --- | --- | --- | --- |
| Brand and profile | First row, approx 56 CSS px | existing `quickBrandBar` | Open home or existing My House |
| Main film banner | Next, approx 140–155 px | **one** current Canvas stage, local-approved artwork | Play/Pause changes current preview without autoplay |
| Six Video Studio workspaces | Immediately below banner, one row | original `quickVideoNav` | Real in-place content, aria-pressed and functional controls |
| Four easy goals | Compact 2×2 with shared text and two CTAs | actual `MandalaAutoVideoDirector` input **portaled** into one existing quickSection | No lost spaces or 16px Safari zoom; pick goal, suggest or clarify |
| Music & Voice | Horizontal three pictured 1-tap melody cards | original `quickMusicRail`, first-party WAVs and single native player | Select + preview + explicitly attach to real video |
| Auto Video Director | Four pictured alternative stories and separate 4-frame preview | same existing `MandalaAutoVideoDirector`, approved taxonomy posters | Goal-ranked selection with aria-pressed; one confirmed plan enters original renderer |
| Ready result | Directly below Director, not after hidden advanced content | original local recording result and same verified video Blob | Save/Share/Preview **only on real decode PASS**; before render a clearly labeled empty state |

### Invariants and privacy
- Four story **choices** are not the four sequential frames of one story; both groups are separately labeled.
- The four source thumbnails come from the same allowlisted `scene-taxonomy.json` masters compiled in the real film; images are not outputs of a new paid AI model.
- Suggested goal and refined wording remain local; never send raw wish, private photo, tests or medical details to third parties or telemetry.
- A source MP4 fallback after a Safari recorder error must remain explicitly labeled **unedited**; it is not counted as a personal film.
- The lower advanced editor still exposes 6 topics, manual styles, 24+ scene library, 8-session content, affirmation/text details, duration, format, soundtrack uploads, and gated premium tiers.

## QA and release gates
1. Source/typed/regression: current `tests/mandala-auto-video-director-ui.test.mjs`, `tests/mandala-approved-mobile-studio.test.mjs`, full Mandala source contracts, ESLint, TypeScript and Next build.
2. Rendered Chromium/WebKit mobile `scripts/verify-holistic-mandala-browser.mjs`: actual goal typing, visible 2x2 goals, selection, two distinct story images, four real media scenes, 6 tab navigation, no overflow/zoom, music attach, result, native MIME/download and ffprobe. Capture same route with matching viewport to compare screenshot content and landmarks. PR automatic checks are NOT a substitute for `workflow_dispatch` full media-browser test.
3. Protected merge to verified production branch; Vercel READY and alias `holistichouse.vercel.app` exact SHA. Separate physical iPhone Safari 20/60s file/playback/Share→Save to Files and EN/RU account checks. Label unperformed evidence `NOT_VERIFIED`.

This is a source/UI implementation using the existing site; reference photographic scenes are translated to available first-party posters, never invented source clips or a fabricated finished file.
