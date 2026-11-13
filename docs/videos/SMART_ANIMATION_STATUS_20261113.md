# Smart Animation · 2026-11-13 source milestone

Target repository: `andylitvinov-design/books`, protected website base `codex/public-book-library`. The existing #3469 merged the original fox and 8-beat renderer. This increment does **not** reintroduce #2606, create another video recorder, or claim a full live 60-second MP4 workflow.

## Changes

- Keep one original fox asset and the three existing first-party parallax worlds.
- Two independently authored editorial stories per theme (4 themes × 3 locales × 2 versions), selected by variation, with 8 validated 60-second beats. No personal prompt/name is retained in the storyboard.
- Preview the *actual* fox rig in the existing Studio under one collapsed optional Smart Animation tool; play/pause, skip scenes, adjust aspect and choose story. No automatic playback, payment, remote API call or sensitive data upload.
- CLI owner-only render supports `--variation 1` for the alternate approved story. The existing MP4 renderer and its audio/ffprobe gates remain unchanged.
- Source contracts and unit tests cover title/narration tampering, 8 scene timing, all supported locales, and no accidental second recorder.

## Status and remaining gates

This is a **browser animatic preview**, not a finished cartoon service. The currently distinct procedural export remains separate. Not done: user-triggered hosted cartoon encoding, authenticated job creation, out-of-request durable worker/leases/CPU benchmark, approved EN/RU/ES narrator WAV/TTS + music/SFX ducking, actual 720p full 60s per-clip QA, owner-isolated private Supabase cartoon kind/quotas, finished MP4 Save to My Videos, authorized paid XP, mobile physical Safari E2E.

Before any full production video generator can claim READY: (1) place 60s 24fps H264/AAC work in an existing approved off-Vercel worker; (2) verify voice audio in actual output; (3) safely extend account storage and RLS only with approved migrations; (4) invoke existing browser/MediaRecorder plumbing or a shared output adapter, **not another duplicated editor/encoder**; (5) pass exact-HEAD Core/Specialist/Guard and live mobile functional smoke. No new paid services, provider, cron, billing or worker infrastructure is activated by this PR.

Implementation contract: `GLOBAL_PR_ONE_PUBLISH_V1`, no ref update until all source/tests/docs are staged. This is an independent, previously unimplemented optional Smart Animation browser UI and editorial story-variation root, not the open montage, audio, Therapy or paid video PR scope.
