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
