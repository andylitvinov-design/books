# Holistic House Video Credits · Free allowance release

Owner instruction: 5 November 2026. This independent production-port uses the **current 7k-line Video Studio**, rather than merging the stale 2026-10-30 XP branch that would overwrite newer work.

## Policy
- 1,300 credits on the first authenticated active account visit, once in the lifetime of the account. Existing active accounts also qualify.
- 300 new credits on the first access in each UTC month beginning **the month after** the starter grant. No backfill, no rollover. The first month has 1,300, not 1,600.
- One completed newly rendered browser video = **10 credits**, regardless of portrait/landscape, selected source MP4s or WebCodecs vs MediaRecorder. A preview or an unchanged original source MP4 download is not a generated video.
- Monthly allowance is consumed first; starter credits persist. The current public product promises **no paid top-up**, conversion to cash, external transfer or expiry of starter credits. This is separate from Growth Points. Older unmerged CAD/XP PRs must not be reintroduced without conflict review.
- A video must have a non-empty MP4/WebM blob and native browser playback verified before the server confirms the debit and the download/share/delivery actions become available. Release on failed/cancelled/expired output; two tabs serialize through app.accounts row locking. A duplicate operation ID is idempotent.
- This local browser renderer can be bypassed in a custom browser client; only a server-rendered artifact with signed worker proof can enforce remote premium cost. Do not sell server AI generation without that gate.
- The present release covers the **website's unified local Video Studio generator**. Telegram/server-side video jobs need their own worker event integration to apply the same 10-credit tariff, not a fabricated claim.

## Activation
1. Production PR must pass exact-HEAD Core/Specialist/Billing/Browser, including Chromium + Safari WebKit. Confirm no newer Studio code is lost.
2. Review this additive private FORCE-RLS SQL, apply to the *existing* Supabase project `holistichouse` only after approval. Test with an authenticated account and a separate user, two-tab holds, month boundary and cancellation.
3. Enable `HH_VIDEO_CREDITS_SCHEMA_APPROVED=true` and `HH_VIDEO_CREDITS_ENABLED=true` in the correct existing Vercel Production project only **after** schema verification and LIVE code is serving. The second flag is the charging switch; while OFF the previous free behavior is unchanged. An enabled switch without schema or app availability fails closed.
4. Test confirmed debit once per video, insufficient balance, double-click, Safari re-encoding, cancel, failed MP4, expired hold, read isolation, and RU/EN/ES copy. Verify exact served Vercel SHA/alias independently.
5. Leave existing PayPal/Square, subscriptions, wallet conversion and provider AI paid flags OFF. Zero additional services, scheduled tasks or new payments.

## Rollback
Set `HH_VIDEO_CREDITS_ENABLED=false`, redeploy through the existing protected flow; no direct ledger deletion and no data loss. Database ledgers remain immutable for audit.

Data erasure: the backend is denied DELETE on video-credit ledgers, but FK ON DELETE CASCADE deliberately removes the account's private history during an authorized account deletion; an immutable DELETE trigger must never block privacy erasure.
