# MyTube Creative Editor — functional reengineering of consumer video editing

Goal: original MyTube editing experience with useful **CapCut-class workflows**, not copied CapCut code, trademarks, icons, assets or undocumented formats. Implement changes in the existing Video Studio / Auto Video Director, preserving its one real export pipeline and privacy boundaries.

## Verified baseline on 2026-11-04

- A working 3-lane video/text/audio timeline already lives in \`mandala-multitrack-timeline.tsx\` and the existing Studio. It supports film reorder, boundary adjustment, captions, scrubbing and audio offset. The local Canvas recorder / WebCodecs encoder remain the only output paths.
- The current free storyboard deliberately supports exactly **four approved scene sources**, not an arbitrary number of imported media tracks. It is not yet a full non-linear editor.
- The existing plot selector is four editorial beats with licensed/original source matching; choosing a plot does not guarantee literal depiction of each beat.
- Audio/photo content is user-controlled and should remain local unless explicit consent and an approved separate flow exists.

## Implemented in this change

1. Shared timeline viewport with 1×/2×/4× zoom, horizontal pan, frame seek and iPhone-safe gestures.
2. Optional magnetic caption/audio alignment to actual shot cuts, with a deterministic tolerance.
3. Split and duplicate authored captions without regenerating text. Exact clip times feed the current Canvas captions.
4. Per-approved-shot edit inspector: original/warm/cool/dream tints; soft legacy cut, direct cut, fade-to-black and flash-to-white transitions. Both sides of an adjacent shot boundary use one setting.
5. Visual treatment is painted by the **same** Canvas function in preview and encoded export. No additional render worker, paid API, proprietary stock or new billing.

## Remaining milestones (not claimed as implemented)

- Non-destructive source in/out trimming, arbitrary extra video layers, picture-in-picture, clip-level speed controls and keyframes; these require an upgraded composition model and deterministic source frame scheduling rather than silently relaxing the four-shot licensing/decoding rules.
- Full undo/redo history, autosaved private drafts with restore/import validation, multi-project library and collaboration.
- Waveform extraction, multiple independent voice/music/SFX lanes, volume envelopes, per-clip EQ and voice cleanup with consistent iPhone export.
- True two-source cross-dissolve, masks/chroma key, motion tracking, background removal, AI captions/speech-to-text and GPU effects. Do not present a dark fade or color tint as any of these.
- Automated highlight selection/beat sync and transcript-aligned cuts from the existing director, with provenance and user-editability.
- 9:16 / 16:9 / 1:1 preview fidelity, render format/quality controls (existing paths), large-file limits, rights metadata, memory bounds and regression tests before launch.

## Product UX

Keep today's **1. Theme and idea → 2. Support phrases → 3. Montage** journey; the Auto Video Director remains the default. In Montage, the user can change the selected shot, trim the existing 4-shot boundaries, edit text and audio and apply the new shot transitions/looks without manually constructing a timeline. More advanced NLE controls stay behind an optional "Advanced editor".

## Non-negotiable acceptance

- Run \`node --test tests/mandala-creative-timeline.test.mjs tests/mandala-multitrack-timeline.test.mjs\`.
- Run TypeScript / Next.js checks and mobile WebKit render verification at the exact PR head; test generated MP4 playback and audio/video synchronization on a real iPhone.
- Verify all four selected scene IDs remain allowlisted, current consent rules and rights metadata are preserved, no network calls for edits, and the actual binary is playable.
- Protected PR merge → matching Vercel production SHA READY → route and end-to-end device check. A passing unit test or PR by itself is not LIVE.

## Cost policy

Zero newly required subscriptions, paid APIs, scheduled jobs, cloud GPUs, or additional background rendering. The consumer device renders the video as today; treat CPU/memory, playback compatibility and bandwidth as release constraints.
