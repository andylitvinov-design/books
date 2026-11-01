# Holistic House · 39-track clean audio release
Date: 2026-10-31 · Production target: `codex/public-book-library`

## Source and scope
- 13 previously shipped WAV masters and the compact single-player Audio workspace are preserved intact (merged #2696).
- Bring 21 deterministic 16s instrument-like / nature-like first-party WAV loops and the exact PCM encoder from #2550.
- Bring five separately scored 16s melodic WAV originals and a same-origin audio-graph decoder from #2731.
- Exactly 39 distinct sound IDs, three-language titles/metadata, local motif and theme-aware ranking, four kinds (melody/tones/nature/pulse).
- Reuse the current one native audio player, one microphone, a separate Play/Pause tap on each card, selection versus explicit Attach, existing upload rights gate and MediaRecorder.
- New WAV assets are synthetic source-owned soundtracks, **not** actual field recordings, paid licensed commercial music, or therapeutic claims.

## Safeguards
- No obsolete Studio component/CSS transplant from either stale PR. The original six workspaces, visual editor, Safari decoding/Save-to-Files recovery and consent requirements remain.
- Five new scored tracks are decoded for export from the same /audio/mandala/{id}.wav asset heard in preview; fail closed on unavailable/invalid master, not a silent video.
- The other 34 audio presets retain deterministic locally encoded WAV parity. Recording is user-triggered; no background autoplay, external API, client storage, voice cloning or paid render.
- No simultaneous 3-layer music selector from #2731 is shipped in this scoped PR. That UI/transport is a separate follow-up and cannot be declared merged or LIVE until independently tested.

## Validation
- `node --test tests/mandala-smart-audio.test.mjs tests/mandala-audio-attach.test.mjs`
- `node --test tests/mandala-native-audio-files.test.mjs`
- lint, TypeScript and Next production build.
- Mandala Chromium and WebKit mobile verification RU/EN/ES, one-tap Play/Pause across a new melody and a new synthesized sound, explicit Attach, actual encoded audio+video, Export and iPhone native sharing.
- Verify strict exact-head release-ready and specialist checks, then protected native merge; confirm Vercel READY and source SHA before claiming LIVE.

## Previous work reconciliation
- #2550: preserve its 21 WAV masters, expansion scores, localized titles and illustrations. Do not merge the stale editor UI.
- #2731: preserve five WAV masters and same-origin export decoding, but keep multi-layer central film-preview synchronization as a distinct later capability.
- #2629 → #2636: unrelated provider TTS / voice-and-music mixer stack, not part of this static audio release.
- #1563: authenticated owner audio upload into private client reports and course editor, not part of public soundtrack catalogs.

## Source rights and release boundary
No security or privacy controls are removed, no background provider costs are introduced, and existing branch protections are not bypassed.
