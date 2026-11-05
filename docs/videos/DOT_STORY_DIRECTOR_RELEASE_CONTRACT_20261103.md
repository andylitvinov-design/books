# Dot Story Director — implementation and release contract

Status: **PARTIAL SOURCE IMPLEMENTATION; NOT LIVE**. Tracks #3344, #3345. Target branch `codex/public-book-library` (not repository default). Do not represent editorial plans as rendered films.

## Architecture and source ownership

- Owner-only signed Telegram webhook: `app/api/app/notification-channels/telegram/webhook/route.js`.
- Owner pairing, private-chat verification, callback ownership and idempotency: existing `lib/practitioners/owner-telegram-video-model.mjs` and `owner-telegram-video-service.js`.
- Current private FFmpeg slideshow: `owner-telegram-video-render.mjs`. Must remain unchanged for `/video`.
- Canonical taxonomy: `lib/mandala/mytube-content-taxonomy.mjs`, source JSON `data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json`.
- Editorial plot adapter: `lib/mandala/telegram-story-plots.mjs`, 256 scenarios × four variants. **These variants are editorial templates**, not 1,024 individually curated/filmed stories.
- New read-only length planner: `lib/mandala/dot-story-cut-plan.mjs`. Produces source IDs, durations and four-stage timeline; **does not render**.
- Approved media trust boundary: `lib/mandala/video-montage-sources.mjs` and verified physical-asset resolver. A catalog JSON record alone is insufficient physical proof.

## Telegram UX and session state

1. Existing `/video` remains photo+audio slideshow. New `/video_story` is separate.
2. Owner-only inline keyboard: four categories → four subcategories → four topics → four scenarios → four plots; Back / Change / Cancel. Telegram has no native cascading dropdown; use `editMessageReplyMarkup` or new `sendMessage`.
3. Bot displays exact labels and concise visual beat synopsis, source-coverage indicator, duration and estimated cuts. A default auto-suggested plot is optional; explicit user selection always wins.
4. Upload 1–15 audio files, optional 0–15 photos. Validate actual MIME, byte limits, time limits and update high-water. A video without photos is valid **only in story mode** after source coverage is approved.
5. Store `job_id, selection_revision, taxonomy_version, category_id, subcategory_id, topic_id, scenario_id, plot_id, audio_manifest_revision, render_plan_hash` transactionally in owner-private database. Force RLS; no anon/auth grants. Never use transient process memory.
6. Callback_data max 64 bytes. Use compact opaque server-side nonce or numeric ID mapping rather than full scenario/plot IDs. Bind nonce to owner ID, job ID, revision, expiry and expected step. Reject replay, old job, old audio batch, foreign chat, unexpected stage, malformed data. Reply to callback quickly; long work via existing bounded background.
7. Changing plot or adding media invalidates preview approval and render plan. Retry must resend saved MP4 without rerendering; cancellation never publishes.
8. Preserve owner-only RU/EN YouTube destination, verified OAuth, title/description editing and explicit separate publication. Never upload automatically.

## Matching and cut timing

- Read real combined audio duration from FFprobe after local audio normalization, not only Telegram-rounded metadata. 1–1800 seconds maximum, enforce existing 90 MB sources and 50 MB output constraints. A single 30-minute render may exceed Vercel's runtime or output cap; detect and offer shorter output rather than silently truncate.
- Default target shot 12 seconds, adjustable 3–30 seconds; nominal cut count `ceil(durationMs/targetCutMs)`, at least four stages, bounded 300 cuts. Exact per-shot allocation must sum to the audio duration in milliseconds.
- Four story stages are **not** four unique MP4s. Example: 180 s / 12 s = 15 cuts; 1800 s / 12 s = 150 cuts. Cuts can reuse source footage; report `uniqueSceneCount` separately.
- First gate: 4+ distinct relevant rights-verified source IDs. Exclude unsafe motifs; score plot visual tags and metadata; never fill gaps with unrelated scenes or invented URLs. Stage-specific semantic scoring, continuity, duplicate penalties, pacing and source diversity must be added before labeling output **optimal**.
- Planner returns `needsPhysicalMediaVerification:true`; a render worker must verify files exist, actual FFprobe duration, codec, hash, attribution, rights and any source restrictions. Clip loops must preserve continuity, not create frozen frames.
- Do not assert speech-aware cutting without speech-to-text or optional owner-provided transcript. Audio waveform onset/energy can help cut placement without transcribing, but must not infer the spoken meaning.
- Long-form FFmpeg adapter must map approved MP4 inputs to actual segments, scale/pad without distortion, respect aspect and FPS, cut or loop source, concatenate visual timeline, map **original combined soundtrack** once, AAC encode, enforce monotonic PTS and A/V end drift tolerance <= 250ms. Retain source attribution in owner preview/metadata as applicable.
- Include explicit quality profile: default 720p for long videos, optional 1080p only when within time/size budget. No paid API, cron, remote GPU, new bot or recurring spend.

## Required tests (must pass before LIVE)

- Taxonomy exact 4×4×4×4×4, RU/EN/ES and 1,024 distinct plot IDs, wrong-ancestor rejection.
- Unit plan: 30s, 60s, 180s, 1800s, uneven millisecond remainders, 4 stages, no gaps/overlaps, bounded cuts, source diversity, forbidden motifs, invalid rights, bad URLs, no source coverage.
- Callback: signed webhook, verified owner only, old nonce, foreign chat, replay, malformed callback, >64 byte, media arriving during confirmation, job restart, stale revision, expiration.
- Real synthetic FFmpeg: short and long audio; four or more physical licensed fixture MP4s; inspect `ffprobe` for audio/video streams, duration within 250ms, full soundtrack, valid frame decoding, no black end, reasonable output size.
- Privacy: private Supabase bucket/RLS, no raw audio or Telegram file IDs in logs, no client media leakage, no publication without owner approval.
- Regression: existing `/audio`, `/done`, `/video`, `/video_done`, `/video_retry`, `/video_cut`, RU/EN YouTube, saved cabinet MP4, iPhone Telegram preview.
- CI: exact HEAD Core + focused video/Telegram Specialist, production branch protections, merge, Vercel READY with serving SHA and real owner-private Telegram E2E. No claims based only on mocks or HTTP 200.

## Remaining implementation sequence

1. Merge #3345 only after focused tests and source review. Reconcile #3257/#3316 taxonomy ancestry; do not overwrite site/mobile navigation.
2. Implement persistent picker and callback parser, additive DB migration with forced RLS and bot-only selection. Focused PR.
3. Implement stage-aware rights-verified physical media matcher and attribution readback; reconcile #3082/#3302 audits. Focused PR.
4. Implement bounded FFmpeg MP4 visual+original-audio adapter and FFprobe tests. Focused PR.
5. Integrate media/selection manifest, preview confirmation, retry, status and fallback slideshow; run real owner Telegram acceptance and guarded LIVE release.

**Fail closed:** If fewer than four relevant verified sources exist, show an explicit coverage error and allow the existing photo slideshow; do not invent media, loop a single unrelated clip or auto-spend XP.
