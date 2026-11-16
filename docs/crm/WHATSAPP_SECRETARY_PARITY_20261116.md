# Holistic House WhatsApp service intake + shared Secretary (2026-11-16)

## Scope
The existing Meta-signed WhatsApp webhook and private CRM are the only transport and store. This does not create a second bot, model, provider, database, timer, paid template, or authentication method.

### Behaviour once official Meta number is connected
- Five exact published service names in the existing website WhatsApp draft include a public `[HH-REQ:service:locale]` marker; nothing is transmitted until the visitor presses Send in WhatsApp. No medical, account, or client material enters this marker.
- On a correctly signed, fresh WhatsApp message from the configured business phone, the existing encrypted CRM consent workflow now stores the selected service and format in its FORCE-RLS session. The short branch asks: explicit CRM/reply consent → preferred format → one question about the goal. Only consented answers enter the CRM Messages contact/thread. STOP remains terminal. This is not a paid booking or a `public_service_enquiries` record.
- If a visitor asks an explicit public product, course, price, or material question outside any active private intake, the optional secretary reuses the same source-verified published catalogue as Telegram. It provides first-party URLs as WhatsApp text, without passing customer content to another AI model. No unsolicited sales.
- Generic free express review still uses its full approved six-stage WhatsApp diagnostic. An active consent/question stage always takes priority over catalogue FAQ.

## Production release gates
1. Exact HEAD protected GitHub CI + RLS, privacy and browser/specialist guard approval; no extra workflows, manual previews or extra Vercel resources. Only the existing protected hourly publisher.
2. Apply only additive migration `20261116235500_hh_wa_service_intake_choice.sql` to the same Supabase project BEFORE serving service CTA source. Confirm the FORCE RLS flags, service and format constraints, and historical rows unchanged.
3. Owner must verify WhatsApp Business Cloud API onboarding within their Meta Business Manager and confirm the exact business number used by current `wa.me` links. For WhatsApp Business App coexistence, use official supported onboarding; do not silently migrate or disconnect a personal account.
4. Subscribe Meta WhatsApp Business `messages` to `https://holistichouse.vercel.app/api/app/crm/messenger/webhook/whatsapp` and store credentials only as Vercel Production secrets: `HH_CRM_MSG_WHATSAPP_ENABLED`, `HH_CRM_MSG_WHATSAPP_TOKEN`, `HH_CRM_MSG_WHATSAPP_PHONE_ID`, `HH_CRM_MSG_META_APP_SECRET`, `HH_CRM_MSG_META_VERIFY_TOKEN`, `HH_CRM_MSG_META_API_VERSION`. Verify the webhook's HMAC signature and business Phone Number ID.
5. Register that verified WhatsApp business account in the existing owner CRM Messenger; for a single consenting test handset use `HH_CRM_MSG_WHATSAPP_PILOT_ENABLED`, `HH_CRM_MSG_WHATSAPP_PILOT_WA_ID`, and `HH_CRM_WA_DIAGNOSTIC_ENABLED`. Enable `HH_CRM_WA_SECRETARY_ENABLED` only after the same real-device test. Keep public send and `HH_CRM_MSG_PRODUCTION_APPROVED` OFF until explicitly approved and provider messages proven.
6. Physical end-to-end proof: one website service CTA → WhatsApp Send → consent → format → short goal → one encrypted CRM thread and contact; FAQ with verified URLs; generic diagnostic; STOP; wrong-number and duplicate rejection; manual practitioner reply; correct Meta receipts and the 24-hour window.

## Explicit limits
- A GitHub merge is not proof of a connected WABA or customer delivery. As of this implementation, the connected WhatsApp account/Meta credentials and physical sender are not proven.
- The service branch currently creates the existing CRM contact and conversation, not a separate public service enquiry, booked appointment, payment, or automatic @Andydotbot notification. Those must be implemented and verified separately if required.
- Do not forward medical records or special-category health data into an AI service. Official WhatsApp policies require clear human escalation and only allow normal free-form replies within the 24-hour customer-initiated window.