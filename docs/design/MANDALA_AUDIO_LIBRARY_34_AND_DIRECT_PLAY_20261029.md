# Holistic House · 34 original soundtrack loops + one-tap listening
29 October 2026 · approved existing screen `/{en,ru,es}/holistic-support/mandala#video-audio`.

## Scope and real media inventory
- **Existing 13 first-party WAV masters remain byte-identical**: 8-second classics, including harmony, prosperity, energy, love, meditation, rain, ocean, breeze, focus, grounding, breath, sunrise, pulse.
- **21 additional first-party 16-second mono PCM WAV loops** (22,050 Hz, 16-bit) are checked into `public/audio/mandala` and generated deterministically by `createExpandedSoundWav()`. Approximately 0.7 MB each, ~15 MB total, loaded on demand (never all streamed automatically).
- **Melodic synthesizer motifs (9):** soft piano, kalimba, harp, flute, celesta, strings, marimba, lullaby, handpan.
- **Nature-like synthesizer textures (6):** forest, stream, waterfall, fireplace, night, birdsong.
- **Resonant tones (4):** singing bowl, wind chimes, crystal, cosmos.
- **Pulses (2):** soft beat, earth drum.
- All sounds and instrument timbres are **synthesized**: not field recordings, real acoustic instrumental performances, professionally licensed music, therapeutic sound frequencies, or copyrighted covers. They're short original loops, not full-length commercial music. A second phase could license natural recordings/mastered tracks, but that requires real rights, supplier/API review and explicit permission for any spend.

## One-tap playback UX (owner's additional request)
Each visible sound row contains a real **Play/Pause button on the left**, independent of its Select and Favorite controls. Clicking a new track performs synchronized React selection and native HTMLAudioElement.play **inside the same user gesture**, avoiding iOS autoplay restrictions; second click pauses. Every row has a localized aria-label and pressed state; tap target ≥44px, without automatic upload or attachment. Playback only requests a site-local `/audio/mandala/{id}.wav` file from its browser action. Audio previews preserve Safari's true HTTPS native player, loop and hardware media volume behavior.
- Theme, kind, mood, tempo, duration, local search, favorite sort and a **newest-first sort** all reuse one 34-item catalog in RU/EN/ES.
- **Preview ≠ attach**. The existing explicit `Attach to video` button and photo/audio consent gates remain. MediaRecorder exports the same WAV PCM produced by the deterministic generator. Selecting/playback never overwrites an already-exported video.
- Decorative first-party JPEG covers reused from the existing film gallery. They are not videos and do not play when an audio tile is tapped.

## Verification / release
1. **Node contracts:** all 34 referenced WAV files exist and match *exact* WAV bytes from `createAmbientPreviewWav`; 21 new 16 s at 22.05 kHz, 13 classics 8 s, correct 34 unique IDs and 34 valid cover rows; valid RIFF/PCM header and positive RMS.
2. **Chromium & WebKit mobile:** 320/390/430 RU and 390 EN/ES: five default audio rows with ≥44px Play; Show all 34; filter melody and search; each of all 34 real 200/206 WAV HTTP Range response and audio.play() advances, second click pauses; selecting without Attach does not enable export. Actual video export has real non-silent encoded audio (ffprobe+ffmpeg PCM), no personal upload.
3. Targeted lint + TypeScript + Next production build; unrelated cross-team monorepo checks not misrepresented as green. Only after exact-head checks can this be merged to verified canonical production branch `codex/public-book-library` and Vercel READY SHA/domain checked. Real owner's physical iPhone speaker/Files verification remains separate.

**Privacy/budget:** no provider/API/payment, no new RLS/CRM/account scope, no telemetry of client data, no AI render or mass uploads. The existing original audio and local video editor are not duplicated.
