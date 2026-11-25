# Video Studio/MyTube — align chosen phrases and actual scene objects
19 Nov 2026. Owner request: therapy-oriented narrative MUST reflect the client's chosen goal rather than decorate any randomly matched stock imagery.

## Distinct concepts
- Client goal / selected mechanism: one editorial intention, not a diagnosis or proof of benefit.
- 256 video films are 6×5s actual authored actions; 1,536 MyTube plots have FOUR source beats. Do not conflate.
- A chosen phrase is *client-selected content*, not an instruction to rewrite the story or an automatically approved narration track.
- Image metadata matches are a **search hint only**: `object_hint_in_metadata` never means that a human verified the visible object, a physical JPEG decoded or a licensed MP4 exists.

## Code delivered
1. `video-phrase-story-alignment.mjs` proposes 0-based phrase slots with six narrative phases. One phrase follows its explicitly worded recognition/support/action, three selected phrases occupy recognition → resource/reframe → chosen action (shots 1,3,5). Never changes the text, translates, invents a statement or forces a dangerous phrase. Existing no-goal/manual-placement flows remain unchanged.
2. `storyboard-content-alignment.mjs` reads those slots **only after a Goal is explicitly selected** and when the original 6-shot screenplay exists. Original scene IDs and physical action descriptions remain untouched. User-altered text tracks are not rewritten.
3. `video-photo-action-fit.mjs` extracts only clear physical-object cues (rope, price, receipt, chair, mirror, phone, door, writing, plant, glass) from the actual authored beat. Candidate metadata lacking a requested object is demoted; a matching object tag gets a small preference. All statuses explicitly remain `metadataOnly:true`, `literalVisualVerified:false`, `physicallyDecoded:false`.
4. Original `dot-story-v3-scene-photos.mjs` uses this bounded bonus/penalty to choose among five independently sourced, origin-unique, rights-validated 9:16/16:9 candidates. No images are added, no source/license/FFmpeg checks relaxed.
5. `tests/video-scene-semantic-qa.test.mjs` checks phrase slot parity, full scene action preservation and that a source tagged `object:rope` can outrank a higher scoring family embrace for the actual 'pull a rope' scene.

## Known limitations — keep honest
The live v3 photo metadata inventory last audited had 61,440 candidate assignments and 0 individually scene-approved / 0 physically-verified in the v3 coverage view. Physical image inspection is still required; `strong_tag_match` can be wrong. Proposed caption slots do not imply client-approved audio/voice or demonstrate psychological correction. Rendering gate remains strictly in the old security/audio/video pipeline. No new AI/provider, image generation, network request, private data transfer, DB mutation, bucket, cron or manual Vercel deployment.

## Release acceptance
`node --test tests/video-scene-semantic-qa.test.mjs tests/dot-story-v3-scene-photos.test.mjs tests/film-screenplay-256.test.mjs`
Core + applicable Mandala/owner Telegram specialist, exact tested head, native AutoMerge, scheduled production publish and serving SHA verification.

## Follow-ups
- Explicit user-editable phrase-by-shot UI should show proposed placement and allow individual override, not silently alter captions or narration.
- Genuine visual review for each production-ready physical action; image/MP4 decoding, aspect, license provenance, credits, and actual iPhone 9:16 + desktop 16:9 playback.
- Independently authored scenarios pending: 236/256. Psychological response/benefit requires separate consented user evidence and cannot be inferred from the cinematic text.
