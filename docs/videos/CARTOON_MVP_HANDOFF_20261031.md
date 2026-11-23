# Holistic House — Smart Animation proof-of-render (2026-10-31)

## Scope of this increment

A first-party vector puppet fox, deterministic 8-scene story planner (RU/EN/ES, four gentle story presets), three illustrated layered worlds, and an owner-operated FFmpeg renderer.

This implementation intentionally lives in **the existing Draft PR #2606**, preserving its first-party procedural Video Studio path. It does not create a competing public UI or bypass the active #2713/#2702 studio release work. The production target remains `codex/public-book-library`.

### Files
- `lib/mandala/cartoon/storyboard.mjs`: 8× timed safe story beats, total 60s, no raw user request retained in storyboard, no paid/AI providers.
- `lib/mandala/cartoon/fox-svg.mjs`: articulated original fox geometry with animated limbs, head, tail, eyes and mouth; 3 parallax worlds. SVG output is self-contained and deterministic.
- `scripts/render-cartoon-mp4.mjs`: standalone Node/Sharp -> FFmpeg H.264/AAC MP4; original frames, 24 fps. Optional `--audio` provides *licensed narration file*; `--silent-demo` is explicitly a **silent proof** (not a promised narrated film). `--preview-seconds` can verify short segments, not the full product.
- `tests/cartoon-storyboard.test.mjs`: contract and motion transform checks.

### Development commands

```
node --test tests/cartoon-storyboard.test.mjs
node scripts/render-cartoon-mp4.mjs --output /tmp/fox-demo.mp4 --locale ru --preset friendship --aspect portrait --silent-demo --preview-seconds 3 --width 360 --height 640
node scripts/render-cartoon-mp4.mjs --output /tmp/fox-60s.mp4 --locale ru --preset friendship --source-fps 12 --audio /private/licensed-voice.wav
ffprobe -v error -show_streams -show_format -of json /tmp/fox-60s.mp4
```

The full 720p run is CPU-intensive; it belongs in a background worker, not a Vercel request or a CI job invoked on every PR. Sharp and FFmpeg are already used elsewhere in the repository; confirm the worker's audited dependency graph before deployment.

### Honest limitations and release gates

**NOT LIVE.** The current addition is a working local rendering proof, NOT a deployed, queued service. The narrator script is part of the plan, but server-side TTS, per-shot audio synchronization, original music/SFX, authenticated job submission, worker leases/queue, signed Supabase storage, cartoon quotas/DB migration and XP integration are still pending.

Do not claim an arbitrary input can create a fully new acting animal, or that the character is premium studio-quality. It is a single original programmable vector fox. Before commercial launch, assess character aesthetics and artwork licensing/provenance, run actual 60s H.264+A​​AC sample with narration, privacy/RLS, mobile RU/EN/ES Chromium/WebKit and iPhone Safari, full cost benchmark and exact-head release CI.

A clear next integration sequence: (1) settle #2713 and #2702/Voice PR ownership; (2) one Cartoon mode in existing Studio with the single approved storyboard; (3) reusable trusted container worker with durable jobs and private delivery; (4) narrator/TTS and 60s audio timeline; (5) XP/cost only after confirmed wallet dependencies. Avoid a second editor or second wallet.

## Safety

No child profiles, uploads, names, tests or raw wish are serialized to the render plan. Plans are validated against fixed story/world/action IDs. The renderer does not execute user code or read external media URLs. The full service must add rate limits, authorization, content moderation and retention gates before user submission is enabled.
