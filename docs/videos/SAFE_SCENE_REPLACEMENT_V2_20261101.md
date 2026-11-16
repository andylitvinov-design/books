# Holistic House Video Studio 2.0 — safe scene replacement
**1 November 2026 · implementation scope P1 / existing Auto Video Director**

## Objective
Let users replace any one of four narrative stages with another approved, real MP4 from the existing 44-scene first-party catalogue. Keep the single 4-stage editor, narrative timing, original soundtrack mixer and MediaRecorder. Do not create a second video generator or paid provider.

## UX and render contract
- In the optional "Open montage" panel, each stage gets one "Replace clip" selector. The storyboard preview updates to the real approved poster.
- Alternatives are ranked by theme + tags/motifs, and never reuse another selected clip. Confirm after edit; editing invalidates the previous recording.
- User-requested avoid-water / forest / night terms apply to replacements as well as original presets. Unrecognized exclusion keys fail closed.
- Both UI and final studio validator check approved source IDs, licensed MP4 media, exact same-origin master path and catalogue provenance: first-party source or approved Dareful CC BY 4.0. The existing video playback registry must also recognize each chosen clip.
- Keep exactly four distinct clips, existing adaptive stage timing and 10/15/20/30/60 second durations. Original audio, uploaded photos and consent, affirmations and Hypno remain unchanged.
- No private data upload, paid API, new storage, payment or XP deduction. RU/EN/ES, native mobile selector 44px high and 16px font.

## Release gates
1. Run node --test on tests/adaptive-free-film-timeline.test.mjs, tests/free-film-timeline.test.mjs, tests/mandala-auto-video-director.test.mjs and tests/mandala-auto-video-director-ui.test.mjs.
2. Core/Mandala exact-head TypeScript, lint and build must be green.
3. Chromium/WebKit mobile: replace stage, preserve exclusions, confirm, export a real video with the chosen moving clip and attached audio, validate with ffprobe.
4. Physical iPhone Safari playback/reopen and CC BY attribution visibility remain owner-device acceptance.
5. Protected merge only on verified current HEAD/base; then confirm Vercel READY and official alias SHA.

## Exclusions
Not a replacement for unrestricted text-to-video, eight concurrent source decoders, a full multitrack DAW, cloud rendering, voice clones, XP billing or clinical treatment.
