# Holistic House Video Studio — Executable Director Scenario v1
Date: 2026-11-01
Integration owner: PR #2913 (Canva-style Video Director Chat), production target: codex/public-book-library.
Related non-rendering prompt-quality branch: feat/video-prompt-director-quality-v2-20261101.

## Why
A descriptive prompt is not executable. The local director previously generated a four-card suggestion, but onConfirm supplied only preset ID, global length and basic sound/mood: the displayed scene sequence and timings did not carry an explicit validated execution contract.

## Canonical executable schema
The trusted client compiler in lib/mandala/video-executable-director.mjs returns:

- version = hh-executable-video-scenario-v1; origin = local_compiler | ai_suggestion_validated.
- presetId, four unique clip IDs from same-origin approved MP4 catalogue, rights-checked and exclusion-filtered. Scene asset paths are copied solely from trusted scene metadata.
- shots[0..3] = role, sceneId, startSeconds, durationSeconds, captionText; contiguous timeline, minimum 2 seconds per clip, exact total of 10/15/20/30/60 seconds.
- edit = {clipIds, durationSecondsByStage, captionTexts, excludedMotifs}, which maps 1:1 into existing compileFreeFilmPreset / applyAutoFilm, not into a new renderer.
- audio = silent or approved local preset track, volume and timeline length.
- rendering = source=licensed_first_party_mp4, engine=existing_canvas_mediarecorder, aspect/quality/brightness/motion, existing transitions.
- provenance flags: noExternalClientData, paidRenderApproved=false, readyToExecute.
- No raw client text, account data, portrait, test result or upload in the result.

Priority: scene rights/exclusions > user explicit settings > visual subjects > safe cinematic defaults. For a recognizable visual request, the local compiler may prioritize one relevant hero clip, while retaining curated sequence continuity. For a missing literal subject (new characters / photorealism) the existing mandatory symbolic-montage confirmation remains.

## Optional AI montage planner
Route: POST /api/holistic-support/video-director-plan
Requires explicit AI opt-in and same-origin. Payload is allowlisted: goal (max 160 chars), locale, duration, aspect, mood, music, phrases, selected candidateSceneIds and excludedMotifs. The server independently checks each candidate against first-party taxonomy, provenance, same-origin MP4 path and exclusion motifs.

The provider sees trusted scene labels/tags, exact user filters and a strict JSON-only output schema:
{"clipIds":["approved1","approved2","approved3","approved4"],"stageSeconds":[4,6,12,8]}

Provider output is strictly rejected unless all four IDs are unique, from approved candidate pool, licensed, exclusion-safe and all integer durations >=2 sum exactly to the chosen length. Invalid, timed-out, quota-limited, unsupported or unconfigured AI leaves the local executable plan intact. No model may override audio, text/caption inclusion, format, user-approved sources, or billing. Existing confirmed-free provider routing and global free-text quotas are reused. Real AI video synthesis is not part of this contract.

## UI integration
The chat storyboard and confirmation now use the SAME compiled scenario. The 4 scene cards display exactly the clip IDs, source labels, stage times and stage captions later fed to compileFreeFilmPreset. User sees whether local director or validated AI cut generated the ordering. On confirmation the existing Studio sets its timeline, soundtrack attach/mute, volume, format, quality, brightness, motion; it disables duplicate global caption/affirmation overlays because the four stage captions are already in the plan. The single existing Create -> MediaRecorder -> verify -> player/download flow is preserved. Changing parameters invalidates old confirmations and stale AI suggestions.

## Quality and acceptance
1. Node 22: tests/video-executable-director.test.mjs including invalid sources, exclusions, scenario length, audio, captions, malformed AI suggestions, RU/EN/ES and runtime integration contract.
2. CI: run as part of existing Mandala workflow, no new heavy pipeline.
3. Browser acceptance: Chromium and WebKit 320/375/390/430px; type 'горы без моря, 30 сек, без музыки', see four non-water scenes and exact durations; confirm; inspect matching rendered frames and no audio; repeat with music and four stage captions.
4. Positive AI path with a mocked JSON suggestion: source IDs/order and durations in the render MUST match storyboard, not just prose. Force malformed provider output -> local fallback, never silent substitution.
5. Real MP4/WebM ffprobe: exact reported duration within encoder tolerances, nonzero video frames, licensed source pixels, expected audio/silence; physical iPhone playback/save separately.
6. Verify exact HEAD Core + Mandala + specialists, merge protection, production Vercel READY exact SHA and LIVE mobile smoke. No LIVE claim until evidence.

## Not yet supported
- Unrestricted text-to-video AI / new photoreal characters or lip-sync.
- AI-picked new music composition / voiceover, multi-track mastering, or independent transition effects.
- Full automatic flow of 49 advanced Cinematic Director questions into supported local controls; those remain separate and must be wired only when the renderer actually supports them.
- Provider cost without explicit future release approval.

Cost: no new paid service, existing free-only opt-in text models. Fallback works without any AI provider. 
