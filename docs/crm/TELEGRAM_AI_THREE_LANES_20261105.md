# Holistic House — One Telegram AI Bot / Three Independent Lanes · 2026-11-05

## Scope / honest deployment state

One **existing verified CRM Telegram bot** receives all opt-in AI client conversations. The signed private webhook is the single admission point. A PostgreSQL transaction persists a bounded encrypted payload *before* the webhook responds. Separate database-backed lanes are `message`, `video`, `delivery`. This is **not** a claim of 300 measured concurrent users or validated bot delivery. The only initial video export is a real 20-second four-scene portrait H.264 MP4 assembled from previously licensed/rights-reviewed catalogue footage, **not diffusion or invented footage**. Source scenes have independently verified bytes, duration, aspect ratio and provenance before ffmpeg can run. `ai_telegram_threads` stores sealed chat ID, consent and stop; `ai_conversation_turns` keeps opt-in encrypted QA text.

## Routing

1. Inbound `X-Telegram-Bot-Api-Secret-Token` verified by existing `/api/app/crm/messenger/webhook/telegram`. Feature `HH_AI_TELEGRAM_QUEUE_ENABLED=true` additionally requires existing CRM Telegram production approval and verified bot identity. Keep **OFF until reviewed migrations and synthetic/real opt-in tests**.
2. `/start`, `/ai`, hello, «привет» or «ау» → localized welcome. No raw client prompt retained before consent. User explicitly replies «Согласен» / `I agree` / `Acepto` to begin. `/stop` revokes, drops queued work, erases encrypted turns and chat ID. Existing `/start hhreview_*` and any active diagnostic stay on their separate consent/privacy flow; no stolen webhook or duplicate bot.
3. Message is deduplicated by webhook update ID, encrypted, rate limited to 50/day/chat. A `message` worker commits its answer and optional `video` order, then schedules one `delivery` job. Basic responses use existing safety-aware Holistic Guide cues; **external paid AI, clinical analysis and uploaded photographs are not used**.
4. `/video …` or «создай видео про …» with a specific goal → licensed-footage video job, maximum two per day/chat, one active render in the initial deployment; all 48 currently approved catalogue source scenes are native portrait, so no upscaled fake landscape output is claimed. FFmpeg never executes shell/user args, 115-second timeout and maximum 12 MB. Output `ai-generated/<uuid>.mp4` in **private `hh-client-private-media` bucket**, not the public video vault. No reuse of public R2 write keys for private client media. Video is sent only after the `video` worker has uploaded an actual validated MP4.
5. `delivery` obtains the verified sealed chat ID again immediately before sending. Telegram acceptance != recipient read. A definite 429 retries after the server-directed delay. Unknown send outcome is `unknown` **without automatic retry**, avoiding duplicates. STOP cancels unsent jobs. Accepted MP4 is deleted from private temporary storage on a best-effort basis; storage purging must be monitored. Telegram's ordinary per-chat and global limits are respected by bounded sending concurrency; capacity must be measured before raising the limit.
6. A cron-secret authenticated read/process endpoint `/api/internal/telegram-ai-work` can drain 4 messages, 1 video, 3 sends per authorized call; existing daily housekeeping also processes deferred message/delivery and expired thread retention. No new scheduled task, paid AI, additional bots, or new Cloudflare bucket.

## Feature flags / rollout

- `HH_AI_TELEGRAM_QUEUE_ENABLED` **absent/false by default**; never activate from PR merge alone.
- Existing `HH_CRM_MSG_PRODUCTION_APPROVED`, `HH_CRM_MSG_TELEGRAM_ENABLED`, bot token and signed webhook must already be independently verified; no token/secret value is published.
- Apply reviewed `supabase/migrations/20261105235000_hh_ai_three_lanes.sql` to the authorized production `holistichouse` project after protected merge. Verify RLS/privileges and available private bucket capacity before activating the flag. **Database deployment and E2E send are not evidenced by source alone.**
- Verify bot text `/ai`→onboarding→agree→meditation query; `/video`→real MP4 received by consenting test chat; diagnostic `/start hhreview_ru` still works; `/stop` suppresses all pending deliveries. Include duplicate update, worker crash/lease expiry, provider 429/5xx/timeout, parallel users, quota and retention tests.
- Target load test 50 / 100 / 300 parallel clients and 1 video worker; record P50/P95 intake latency, DB pool usage (pool max 4/serverless invocation), queue wait, generated MP4 time/size, delivery accepted/unknown and storage cost. Never promise 1,000+ chats or 5 simultaneous renders before measured infrastructure capacity and budget.

## Known limitations

- This is a practical **first end-to-end pipeline**, not a claim of unlimited capacity, real-time rendering or full generative AI. The chat uses conservative Holistic Guide responses; it should later be routed to the project's approved Holistic Intelligence / Video Director scenario-planning pipeline when model consent, safety and quota controls are in place. A predictable initial film uses 4 licensed scenes, not every semantic axis, motif, or advanced edit.
- The app's existing private video bucket has limited capacity; queues should be paused rather than silently filling it. Large-scale delivery should use a **separate approved private R2 bucket** (not the public video vault) with encryption, deletion lifecycle, no hidden fees and new consent as needed.
- Crash recovery without a new scheduler uses the existing daily housekeeping and explicitly authenticated worker endpoint; daily recovery is not near-real-time. Faster, measured throughput later requires an approved no-surprise-cost persistent worker or appropriately scoped scheduler.


## Client Telegram Audio → voiced MP4 (prepared 2026-11-07; NOT LIVE)

This is **not** the owner-only Dot /audio → /video flow and does not reuse
the verified owner's private channel or claims. Only the existing signed
**client** Telegram webhook may route these events.

1. A client who has completed the verified Telegram /start link, enabled
   automatic private-video delivery in My House, and granted the separate
   AI-video conversation permission may type `/hhvideo <topic>` and send or
   forward a voice recording; after those permissions are in place, a
   forwarded audio can also initiate the request, followed by the topic.
   Unlinked/no-opt-in media is NOT downloaded, stored, or repurposed.
2. The signed client parser accepts only 1–60 s, ≤3 MB OGG/Opus, MP3,
   M4A/AAC, or WAV with bounded Telegram metadata and an exact private sender.
   For text it still rejects forwarded messages. Direct /voice remains
   owned by the existing subscriber AI unless a video session is active;
   owner /audio /video, ordinary /ai /tests, CRM diagnostics and /stop remain
   untouched.
3. Before typed `/hhvideo_confirm`, only the encrypted one-use Telegram file
   **metadata** (never bytes) may be held in the consenting private thread
   and expires after 15 minutes. The owner is told that confirming certifies
   rights to the recording/voice and authorizes temporary download from
   Telegram, server-side FFmpeg montage, private MP4 retention and sending to
   the verified linked chat. A forwarded recording does **not** establish
   original-speaker authorization by itself.
4. On confirmation, the worker rechecks account link, purpose-specific
   versioned opt-in, job lease and bot identity BEFORE getFile; the Telegram
   path and downloaded bytes are independently bounded, path/codec checked,
   and temporarily stored only in a private per-job directory.
5. The **existing** 4-licensed-shot FFmpeg pipeline uses one original
   soundtrack input, H264 + AAC MP4, length 10/15/20/30/60 seconds based on
   actual non-truncated audio duration. The MP4 is decoded and checked for
   an AAC stream and timing; it is limited to 12 MB and private
   `personal-videos/<account>/<job>/master.mp4` storage. The temporary
   original audio is always deleted in `finally`, including failed renders.
   Without audio, an explicitly text-only plan creates an honestly silent 20s
   film, not a claim that a voice recording was embedded.
6. This release does not listen to, analyze, or transcribe speech to pick
   the scene. Clips are selected from the **typed goal**. The consented
   speech-to-timed-shot Groq branch remains separately disabled until genuine
   free-quota authorization; no private audio sent to third-party STT.
7. Existing unique video dispatch, UNKNOWN provider outcome, STOP/relink
   revocation, encrypted retention, five-row orphan cleanup and daily
   CRON_SECRET housekeeping are preserved. No new runner, bot, bucket or
   paid endpoint is created.

**Source checks completed in preparation:** eight focused audio/security
contracts PASS, ten private-master/source checks, and a physical FFmpeg
synthetic test produced 20.00 s 360×640 H264 + AAC MP4 with nonzero
decoded volume. These are not proof that a real Telegram user received a
video. Production lacks the four private AI tables and no opted-in automatic
recipient existed in the last authorized read-only check; no migrations
or flags have been changed. Draft/zero-extra-cost/physical iPhone plus
PostgreSQL multi-account RLS and actual provider acceptance remain STOP
conditions. Do not merge or label Telegram Audio→Video LIVE until these
gates are actually satisfied.

