# Integration E2E acceptance protocol

Date: 2026-10-19. A checked source test is useful regression evidence but is
not provider delivery evidence. Mark `READY` only after the row's real
read-back succeeds and the production SHA is recorded.

| Integration | Current acceptance status | Required real check | Pass evidence | Fail-safe / rollback |
| --- | --- | --- | --- | --- |
| Public production | PARTIAL | Open `/`, locale routes and sitemap on the Ready production SHA | HTTP success and expected canonical content | Do not redeploy solely to retry a check |
| CRM owner diagnostics | PARTIAL | Authenticated practitioner opens CRM → Connections | Missing names/callbacks visible; no secret, outbound request or message | Remove feature flag/rollback PR if private data appears |
| Resend | BLOCKED | One consenting owned mailbox: verification email, delivery event, unsubscribe event | Provider ID + signed webhook journal; no content/secret in logs | Set `HH_CRM_EMAIL_ENABLED=false`; retain suppression/webhook handling |
| Twilio | BLOCKED | Read-only service/sender probe, one owner test SMS, delivered receipt, STOP and duplicate check | Provider read-back plus one delivery record, no mass send | Set `HH_CRM_SMS_ENABLED=false`; keep inbound receipt/STOP handling available |
| Telegram | BLOCKED | `getMe`, signed webhook, approved pilot chat inbound, one manual reply, unknown-chat deny, duplicate update | Bot ID equals configured ID; one channel journal entry | Disable Telegram enabled/pilot flag |
| Meta channels | BLOCKED | Owned asset Graph API read-back, signed callback, one synthetic inbound and customer-window reply | Provider receipt and no reply outside 23-hour Meta window | Disable provider flag; do not retry automatically |
| YouTube | BLOCKED | One **new** non-client test upload to confirmed owner channel, then API read-back and playback | Exact channel ID and actual `unlisted` privacy, copy link/history | Disable `HH_YOUTUBE_PHONE_UPLOAD_ENABLED`; never delete unrelated published videos |
| Drive media handoff | BLOCKED | Verify master file byte hash and visual QA in approved Drive folder | File ID, SHA-256, visual result retained without public link | No automatic delete or re-render |
| GA4 | BLOCKED | Default-denied visit, consent grant, consent withdrawal, excluded private route, DebugView on public page | Only allowed public events; no PII/health/private route event | Keep `PUBLIC_ANALYTICS_AVAILABLE=false` |
| Supabase RLS/migrations | PARTIAL | Staging/isolated owner and non-owner 401/403 checks; compare ledger through approved procedure | Expected owner allow/non-owner deny, no production mutation | Never run `supabase db push` to reconcile ledger |
| Event/social/ads | BLOCKED | Provider-specific draft/read-back only after owner approval | Exact event/post/campaign ID and paused/draft state | Keep publication and billing disabled |

## Already executed during this audit

- Local CRM safety tests: email, SMS, messenger and new integration-diagnostics
  contracts passed before the diagnostics change was committed.
- The earlier stale navigation mismatch was reproduced and corrected in the
  affected assertions: 14/14 targeted tests pass locally.
- Vercel production SHA and Supabase applied migrations were read back from
  their dashboards.
- No external provider send, OAuth grant, token creation, billing action,
  media upload, migration replay, or customer-data mutation was performed.

## Production record template

When a row advances, add a dated entry with: source commit SHA, Vercel Ready
deployment URL, provider object ID (if non-sensitive), event timestamps,
synthetic/owner recipient designation, privacy result and rollback switch.
Never include an API key, webhook secret, phone number, email address, message
body, private media URL or client identifier.
