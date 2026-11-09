# Telegram video effect — release checklist 2026-11-06

Status: prepared for existing Draft PR #3647, NOT LIVE. The separate web video-effect PR #3654 is merged.

## Implementation
The video Telegram message lane is available only after general AI consent and verification that the CRM bot identity is exactly the same as the paired client bot. The account must have a one-use Telegram /start link verified in Holistic House and a current versioned automatic video-delivery opt-in. Generic CRM consent is not an account authorization.

Each video request produces a preview of four approved actual portrait scenes (9:16, 20 seconds). Only a typed /hhvideo_confirm within 15 minutes starts the immutable job; /hhvideo_cancel drops the draft. The new /hhvideo command never overrides the existing Subscriber AI /video route. A different account, relink or revoked opt-in fails closed.

The render reports real stages: queued, scene verification, encoding, private upload, Telegram acceptance. It does NOT synthesize a percentage or time promise. An editable progress message is sent without a reply keyboard, while the seven-question 0-10 check-in uses a separate private native keyboard.

The seven scales are calm, mood, clarity, energy, confidence, support and readiness. After a real provider-accepted MP4, the client sees three buttons Yes / No / So-so, with localized labels. Only after a separate /watched acknowledgement is the seven-scale after-check-in offered. Signed deltas include decline and unchanged values; missed baseline creates post-only feedback, never invented improvement. Scores live inside encrypted, purpose-bound chat state, not in URLs or analytics. /stop_checkin stops just the test, /stop erases AI work.

Output validation checks H.264, 360x640 physical dimensions, about 20 seconds and successful frame decode. Job completion uses an unexpired matching lease and heartbeat. An unknown Telegram response never creates an automatic duplicate send.

## Zero-new-cost scheduler
Reuse the already existing 5-minute direct-message-push cron, NOT a new cron. A bounded one-video recovery runs only when the existing AI flags, verified account/bot identity and separate HH_AI_TELEGRAM_RENDER_BUDGET_APPROVED flag all pass. The cost approval flag remains absent/off pending explicit budget verification. No paid AI model or new provider.

## Account-owned personal MP4 + durable receipt (prepared, NOT LIVE)

The Draft source uses the existing private `hh-client-private-media` bucket and the
strict, owner-bound `personal-videos/<accountId>/<videoJobId>/master.mp4` path.
One confirmed render job maps to one READY `personal_videos` master and one
unique `personal_video_telegram_dispatch` receipt.

The additive private SQL functions in the **unapplied** account consent migration:

- `ai_video_commit_personal_master` checks live job lease, account binding, verified
  Telegram link, versioned automatic consent, actual private storage object and
  existing per-account/global video quotas before one permanent master/receipt.
- `ai_video_delivery_allowed` fails closed on STOP, unlink/relink, revoked
  opt-in, missing READY personal video or absent claimed receipt.
- `ai_video_finish_dispatch` records accepted versus failed/suppressed/unknown.
  Unknown provider outcome is never blindly retried.
- The Telegram inbox DB role receives EXECUTE-only privileges on these narrow
  functions, not blanket grants over other customers' private video tables.
- A provider-accepted movie remains privately available in My Cabinet instead
  of being deleted when Telegram acknowledges transmission.

**Not yet verified:** production migration, RLS multi-account tests, real Bot API
receipt, FFmpeg/storage/billing budget and client disclosure/opt-in. Verify the
automatic-video consent explicitly includes private cabinet storage and deletion.
No cloud-save consent event is forged on behalf of a client.

## Still mandatory before LIVE
- Security review of owner-bound personal_videos / personal_video_telegram_dispatch integration and current consent policy. Do not treat generic CRM chat identity as verified recipient.
- Exact-current-HEAD Core, Guard, Specialist plus Postgres RLS/role isolation, replay, failed worker, 429/timeout, STOP and 50/100/300 synthetic intake checks. Do not skip cancelled release-reaudit.
- Protected merge; then reviewed database migrations: existing three-queue migration 20261105235000, and account binding migration 20261106082000 (optional voice migration is separate).
- Confirm production Vercel SHA/alias and hosting capacity/billing headroom before enabling flags.
- A real explicitly opted-in client account and linked Telegram conversation must verify actual provider-received MP4, progress, 7-before/7-after and reaction; a provider acceptance is not proof of viewing.
- Current production held zero consented automatic video recipients when last checked. Do NOT send to the only linked account without opt-in.

GLOBAL_PR_ONE_PUBLISH_V1: No second PR, no additional paid resources, no forced merge, no production secrets or migration before independent review.

## Ambiguous provider outcome is not failure (2026-11-07)
Do not convert Telegram network timeout or 5xx to a definite rejected video send. The pending account-bound AI migration adds the 'unknown' value to the existing private video dispatch status constraint, and records 'unknown' when the Bot API result is uncertain. The single primary-key receipt remains terminal; do NOT automatically replay the same video. This is a staged security/correctness repair in Draft PR #3647, NOT an applied migration or live evidence. No new provider, cost, broad inbox table grant or Telegram send.

## Safe orphaned MP4 retention — prepared only, 2026-11-07

The worker now registers an upload intent before FFmpeg and before creating a private
object. The new private, FORCE-RLS intent table survives STOP, job deletion and
lease loss. An account/job-specific SQL function verifies the current linked
Telegram recipient, active AI consent, versioned automatic-video permission
and render lease before allocating an object key.

If a process crashes after uploading a master but before an atomic master/
dispatch commit, the existing CRON_SECRET daily housekeeping may claim at most
five uncommitted uploads older than 24 hours. Claims first transition to
CLEANING, which fences a concurrent master commit. Cleanup refuses to claim
any job with an active lease, a personal master or Telegram dispatch receipt.
The storage worker compares the exact canonical account/job key before removal,
and only then finalizes a private idempotent cleanup record. Failed cleanup
can be reclaimed after a one-hour lease timeout. No listing or broad deletion
of personal-videos folders is permitted.

A revoked feature flag does not disable privacy retention. No new cron, bucket,
paid provider or public/anonymous grants are introduced. The SQL has NOT been
executed; the PR is still Draft. Required before LIVE: database migration and
dual-account FORCE-RLS transaction tests, crash-after-upload injection, STOP/
relink denial, storage deletion readback, checked real provider receipt and
zero-extra-spend approval. Do not claim the static source tests are database
or real-device E2E acceptance.

### SQL delimiter repair (2026-11-07)
The prepared orphan-retention migration contained four invalid PostgreSQL dollar-quote closing delimiters and three invalid opening delimiters. All seven functions now use paired `AS $$ ... $$;`. A focused source-contract regression requires seven valid pairs and rejects untagged single-dollar bodies. This does not constitute applying the migration or proving multi-account RLS. Production feature flags remain OFF pending strict review and cost/consent gates.


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

