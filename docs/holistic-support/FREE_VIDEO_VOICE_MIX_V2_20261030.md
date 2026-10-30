# Holistic House · Free video + meditation narration with independent volume (30 Oct 2026)

## Scope and code ownership

This **stacked PR** is based on Voice Studio PR #2629 and must NOT be independently merged into production before #2629. It extends, not clones, the existing six-panel free Mandala video editor, first-party WAV assets, and the already built Google TTS endpoint. Production is `codex/public-book-library`, NOT GitHub default `codex/bootstrap-books`.

**One browser-first product flow:**
1. Pick an existing animated scene / free stock background; set personal theme and meditation text.
2. For speech select **RU or EN** and one of **six stable voices**: Mark, Alexander, Leon / Sofia, Maya, Alisa (low / medium / high are editorial labels, not yet verified acoustic pitches).
3. Choose **no sound** or one of the **thirteen original first-party** nature / ambient WAV sound beds. Voice Studio shows ocean / rain / breeze first, the remaining beds in a compact selector.
4. Separate voice and music faders (0–100%, defaults **90% voice, 12% bed**). These affect the actual WAV download, not only an icon or preview. Fade-in/out on the bed.
5. **Affirmations:** after consent, Gemini produces voice WAV, browser caches the spoken WAV in memory and re-mixes at different slider positions / background choices **without re-calling Gemini**. The resulting file is automatically attached to the original MediaRecorder video export at unity gain. No fake/silent video substitution.
6. **Personal meditation:** after a short speech WAV has been generated and balanced, an explicit **Add narration to video** button passes the local File through `MandalaPersonalMeditation` to `MandalaFreeVideoStudio`; it checks duration, attaches at unity and selects the next supported local movie duration (10,20,30,60s). The voice does **not** repeat after its final word. Longer narrations are rejected with a shortening suggestion, never silently clipped.
7. Output: actual local MP4/WebM (based on browser encoder) with audible voice + music, plus independent downloadable WAV. Video may use curated footage or free procedural animation depending on the underlying editor branch. No cloud or private upload of the mixed audio.

## Privacy, quotas and cost

- The server Google endpoint stays behind `HH_VOICE_STUDIO_ENABLED`, `HH_VOICE_STUDIO_FREE_TIER_CONFIRMED` and free-only credential checks from #2629; no paid provider fallback.
- Public samples contain server-owned text. Personal scripts require a signed-in session and explicit consent; guest affirmations allow only the reviewed text with limited rate and explicit consent. Google free-tier data policy must be communicated.
- Only text is sent to Google; first-party music, personal photo, and mixed voice remain on device. No background generation, no cloned human voices or unlimited free quota claim.
- **Limits:** max 650 Unicode characters per API request; full 3–12 minute continuous narrated meditation and speech-aligned cinematic subtitles are NOT delivered in this PR. The one-click local video attachment is currently for a **short excerpt (<=59s)**. Long-form chunking and timing requires separate deliberate implementation and E2E.

## QA gates

- `node --test tests/voice-studio.test.mjs` includes six-voice, same-origin and quota/fail-closed contracts; new tests assert gain support, 13 beds and direct meditation video attach.
- `node scripts/verify-affirmation-voice-browser.mjs` includes mocked Gemini, 1 real initial WAV, local gain change, **no extra TTS call**, refreshed attached WAV, real Chromium MP4/WebM and FFprobe/FFmpeg **audio + video + non-silent audio**. WebKit also exercises the UI and local mix. Browser tests never claim real provider integration.
- Run targeted Next ESLint and TypeScript checks, full Next build, existing mandala regression suite, real mobile viewport 320/390/430, iPhone Safari volume/playback/download and manual short-meditation path. No release on red/queued CI.
- Check production Vercel deployment READY, exact merged commit SHA and `https://holistichouse.vercel.app/ru/holistic-support/mandala`. The current stacked PR is **not live** by itself.
- Gemini/provider E2E must confirm true RU/EN six voice WAVs, WAV header, free-quota behavior, explicit consent and no unexpected charges before enabling external traffic.

## Follow-ups (separate, not implied complete)

- Speech segmentation for long 3/5/8/12-minute meditations with deliberate pauses and loudness matching.
- Speech-to-caption alignment, intro/music outro, silence pacing and true audio ducking (not just static sliders).
- Physical iPhone Safari/Chrome playback & share compatibility and FFprobe signed-in meditation export.
- Expanded soundtrack manifest (34 soundtracks in separate PR #2550); do not assume that separate PR is production/live.
