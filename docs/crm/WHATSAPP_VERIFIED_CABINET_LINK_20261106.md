# Holistic House · WhatsApp verified account link (2026-11-06)

## What this release does
An authenticated Holistic House account holder can explicitly link a real WhatsApp Cloud API identity to the existing Cabinet. The site creates a random single-use 256-bit message proof (15-minute expiry); the person sends that prepared text inside WhatsApp. Only a signed official Meta webhook with the correct business Phone Number ID and exact sender may claim it. The verified WhatsApp identity is hashed and linked to one existing Cabinet; the user can unlink and an inbound STOP revokes the link. No contact created by an unverified click, no fake WhatsApp delivery, no phone/name matching, no automatic news opt-in, no provider-initiated message, no new paid services.

This is NOT WhatsApp OAuth or standalone website login. The working Supabase/Google and Telegram login sessions are preserved. Supabase WhatsApp phone OTP needs Twilio or Twilio Verify and is not activated. WhatsApp-backed Cabinet conversations need the official CRM inbound/consent/thread release (#2177) and separate participant authorization. Do not claim full WhatsApp LIVE until true provider/device E2E.

## External prerequisites before enabling even the pilot
2026-11-06 Vercel production env readback: no official WhatsApp/Meta keys; no live WABA connected. Meta Business operator must register/check an owned Cloud API number without migrating the existing personal WhatsApp automatically, connect WhatsApp channel in existing owner CRM and subscribe the same official webhook:
https://holistichouse.vercel.app/api/app/crm/messenger/webhook/whatsapp

After exact-HEAD protected CI and security review, apply the additive private migration 20261106215000_hh_whatsapp_account_link.sql to existing Supabase. It was tested with BEGIN/ROLLBACK on real PG17, not applied in this code change.

Only under owner-controlled, single consenting test number, set server-only Vercel Production env:
- HH_CRM_MSG_WHATSAPP_ENABLED=true
- HH_CRM_MSG_WHATSAPP_PHONE_ID (Meta numeric Phone Number ID)
- HH_CRM_MSG_WHATSAPP_NUMBER_PUBLIC (visible business phone digits, without +)
- HH_CRM_MSG_WHATSAPP_TOKEN (existing authorized Cloud API token)
- HH_CRM_MSG_META_APP_SECRET / HH_CRM_MSG_META_VERIFY_TOKEN / HH_CRM_MSG_META_API_VERSION
- HH_CRM_MSG_WHATSAPP_PILOT_WA_ID (one approved synthetic/test handset, never business number)
- HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED=true
Leave HH_CRM_MSG_PRODUCTION_APPROVED and HH_CRM_WA_ACCOUNT_LINK_PUBLIC_ENABLED OFF. Do not use paid templates, broad sending, phone OTP, or unsolicited broadcasts.

## Acceptance and rollback
Owner consenting handset: signed-in Cabinet → consent → one-time WhatsApp text → signed webhook → same account link → unique sender; wrong number/business, expired/replayed token, wrong account, no signed webhook, STOP, unlink. Confirm CRM leads require independent explicit contact consent. Check Telegram flow unaffected, no clinical information transferred to WhatsApp, no new expense. Public rollout only after another documented decision.
Disable HH_CRM_WA_ACCOUNT_LINK_PILOT_ENABLED to hide new verification and stop accepting link pilot; keep existing linked rows revocable from Cabinet. Do not treat GitHub merge or Vercel READY as actual provider acceptance.

Signed STOP is honored even after the link-pilot flag is switched off, within a bounded 30-day provider timestamp, and only for links predating the STOP. A missing provider timestamp never authorizes account linking. The owner may register a WhatsApp business by a read-only Graph API identity check while the sender pilot is restricted; this does not turn on general CRM sending or paid templates.
