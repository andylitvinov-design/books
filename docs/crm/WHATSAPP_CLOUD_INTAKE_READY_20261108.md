# Holistic House · WhatsApp Cloud API 6-step CRM intake · 2026-11-08

## Scope and status
Prepared WhatsApp transport for the **existing** owner CRM Messages inbox, not a second CRM or a phone-number-based account-sign-in shortcut. The official signed Meta inbound webhook is reused. A new opt-in session stores only HMAC IDs, stage/locale/time/counters; no CRM contact or message is created before an explicit agreement. Thereafter the existing encrypted CRM thread stores consenting text and optional media ID, and the owner-only photo proxy resolves WhatsApp media through validated Meta hosts, size and image signatures. STOP suppresses and stops future replies. Duplicate/reordered Meta events are transactionally claimed, and only one message to a verified pilot sender is attempted per committed conversation turn, with conservative 23-hour customer service reply checks. The original Telegram flow remains unchanged.

**This is not standalone WhatsApp website login.** The existing Google login plus signed WhatsApp↔Cabinet verification was released separately in #3905 with the private Supabase migration; the additional first-party 6-step intake prepares incoming contact and CRM owner replies. Supabase Auth WhatsApp OTP currently needs Twilio/Twilio Verify. No unapproved paid provider, template, outgoing campaign or auto-enrollment is enabled.

## Gates — OFF by default
- `HH_CRM_MSG_WHATSAPP_ENABLED=true`, official Cloud API token, Phone Number ID, Meta App Secret, Verify Token and supported Graph API version are prerequisites.
- For a one-person pilot only: `HH_CRM_MSG_WHATSAPP_PILOT_ENABLED=true`, `HH_CRM_MSG_WHATSAPP_PILOT_WA_ID` (one verified consenting sender, digits only) and `HH_CRM_WA_DIAGNOSTIC_ENABLED=true`.
- Keep `HH_CRM_MSG_PRODUCTION_APPROVED` and `HH_CRM_WA_DIAGNOSTIC_PUBLIC_ENABLED` OFF during the pilot. A future public rollout requires **both**, a separate owner decision and cost/Meta policy review. Inactive diagnostic intake never falls through to unconsented generic CRM ingestion.
- The website must direct new people to the **same business number** registered in Meta. Do not automatically migrate a number from WhatsApp Business App; confirm coexistence, ownership and previous chat continuity first.
- Meta Webhooks `messages` event subscription: `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/whatsapp`. WABA must subscribe the app. Only the official signed `X-Hub-Signature-256` body can confirm user origin.
- All credentials are server-only Vercel Production secrets; no values in GitHub/chat/client JS. Meta is not currently connected, so no external handsets tested and no outgoing bills approved.

## Release procedure
1. Protected PR exact-HEAD Core, CRM, IA/Auth, private Postgres, RLS, WebKit/browser and `hh-merge-check` success.
2. After the protected merge and Vercel READY/alias/SHA verification, apply the reviewed private migrations `20261026193500_hh_crm_whatsapp_diagnostic_intake_20261026.sql` and `20261026215750_hh_crm_whatsapp_diagnostic_receipts.sql` to existing `holistichouse` Supabase. No new DB.
3. Verify FORCE RLS, hh_app_inbox grants, public/service_role denial, bounded replay cleanup, and no existing accidental rows.
4. Once the owner has connected an official Meta Business app/number, configure Production-only settings via the authenticated Vercel UI and verify webhook challenge/signatures. Run one consenting pilot handset: first message → consent button → focus → optional photo → question → optional drawing → one encrypted CRM thread/contact → one reply received. Test duplicate, stale, wrong sender, wrong business, STOP and manual reply window.
5. Verify independent Google/TG account access, reports/media private, no private data in provider logs, and user opt-out. Do not mark WhatsApp LIVE from SQL green or HTTP 200 alone.

## Rollback
Disable `HH_CRM_MSG_WHATSAPP_PILOT_ENABLED`, `HH_CRM_WA_DIAGNOSTIC_ENABLED` and future public flag. Never delete historic CRM messages or consent records merely because transport is disabled. The signed account-link STOP and user-initiated unlink remain separate from this intake flag.

## Engineering receipt
The predecessor Draft #2177 was stale/conflicted, so the portable pieces were revalidated on current protected production with one new PR. See CRM #985 and the separate verified-account-link #3905. One-publish contract: GLOBAL_PR_ONE_PUBLISH_V1; no new CI workflow/runner, no provider charges, no mass sends.
