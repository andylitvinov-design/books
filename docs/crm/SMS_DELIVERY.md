# Holistic House CRM — SMS via Twilio (19 Oct 2026)

**Status:** implementation prepared. SMS is NOT connected/live without verified provider credentials and explicit approval.

## Owner workflow

My Practice → CRM → SMS (or Contacts → SMS) → record documented SMS opt-in → write a message → confirm a single recipient → send. Saving a contact, website enquiry or paid appointment does NOT grant SMS promotional consent. This is not a bulk-campaign tool.

- Sender is identified as Holistic House, a public website contact-information URL and an unsubscribe instruction are appended. Public sender identity, physical mailing address and reply contact details on that website must be verified before sending.
- Do not include health details, test reports, diagnoses, private links or bearer tokens.
- E.164 international phone required, actual consent proof separately recorded, no send for archived or opted-out contacts.
- Max 10 outgoing attempts per owner per 24h; max four GSM-7/UCS-2 SMS segments per message. Carrier pricing depends on destination, type and segment count.
- Manual confirmation, stable request UUID and no automatic retry if delivery status uncertain.
- Encrypted message body, keyed phone fingerprint and FORCE RLS owner-scoped database table.
- Provider "accepted" is not "delivered"; Twilio signed webhook records delivery/undelivered/failure. Incoming STOP is registered even if outbound send is disabled.

## Configure a real sending account

1. Create or sign in to your owned [Twilio Console](https://console.twilio.com/). Verify business/sender identity, a compliant sending phone number, regional SMS/A2P requirements and billing. Do not purchase or rent a number without owner review of cost and terms. Complete any required Canadian anti-spam (CASL) checks for the message and recipient.
2. Create a Twilio Messaging Service, attach the verified sending number, and enable **Advanced Opt-Out**. Configure the **Incoming Messages** webhook as:
   https://holistichouse.vercel.app/api/app/crm/sms/webhook
   Outgoing requests pass this exact URL in the StatusCallback parameter. Preserve any existing app's webhook unless a migration is approved.
3. Add Vercel **Production server-side encrypted Environment Variables** (never NEXT_PUBLIC, never in GitHub/chat):
   - HH_CRM_TWILIO_ACCOUNT_SID — real AC account SID
   - HH_CRM_TWILIO_AUTH_TOKEN — real Twilio auth token
   - HH_CRM_TWILIO_MESSAGING_SERVICE_SID — real MG service SID
   - HH_CRM_SMS_SENDER_VERIFIED=true — ONLY after sender and compliance verification
   - HH_CRM_SMS_CONTACT_DETAILS_VERIFIED=true — ONLY after the linked public site displays correct legal name, postal address and contact details as required for commercial SMS
   - HH_CRM_SMS_ENABLED=true — ONLY after backend, migration and test are verified
   - HH_CRM_SMS_PRODUCTION_APPROVED=true — only after owner-approved deployment
   - HH_CRM_SMS_PILOT_APPROVED=true and HH_CRM_SMS_TEST_PHONE=+1... — controlled consenting test recipient
   - HH_CRM_SMS_LIVE_APPROVED=false — pilot ONLY; no real clients
4. Test one synthetic/owned and consenting handset, confirm arrival on device and actual signed Twilio status callback, stop-text inbound, duplicate UUID rejection, cross-tenant RLS and mobile EN/RU/ES display. Fake provider tests do not prove actual delivery.
5. When number, opt-in procedure, sender compliance and one-to-one pilot are verified and separately authorized, HH_CRM_SMS_LIVE_APPROVED=true allows eligible real recipients (not bulk). No paid provider activation, number purchase or user marketing SMS should be inferred from code deployment.

## Security and operational status

- The SMS webhook verifies Twilio signed form payload and account SID before any DB write; accepts only the configured Messaging Service SID when present.
- Webhook stores no raw inbound phone, body or health data. STOP fingerprints the sending number and blocks future SMS, even if outbound kill switch is OFF.
- The database migration supabase/migrations/20261019180000_hh_crm_sms_delivery.sql extends the existing consent scope and adds encrypted owner SMS history, RLS and private signed event reconciliation.
- Tests: node --test tests/crm-sms.test.mjs; check Next production build and GitHub PR CI.
- **Kill switch:** unset HH_CRM_SMS_ENABLED or set it to false. Keep incoming callback credentials available for opt-out and late delivery receipts.
- Never report "live" until the confirmed production deploy SHA, configured sender, one real test delivery and signed provider receipt are all verified.

## References

- [Twilio Advanced Opt-Out (STOP, START, OptOutType)](https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out)
- [Twilio request-signature validation](https://www.twilio.com/docs/usage/security)
- [CRTC: CASL requirements for commercial SMS](https://crtc.gc.ca/eng/com500/faq500.htm)
