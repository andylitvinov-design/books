# Holistic House · WhatsApp Cloud API → CRM Messages (26 Oct 2026)

## Implementation
WhatsApp is a **second transport of the existing CRM**, not an extra CRM, another form or a personal WhatsApp scraper. Existing owner-only Messages already handles WhatsApp/Telegram/Facebook conversations, encrypted message bodies and CRM leads, manual owner replies, opt-outs, delivery receipts and the conservative 23-hour WhatsApp reply window.

This PR adds a WhatsApp six-stage, first-person personal-review journey using the exact owner-authored Telegram copy (RU/EN/ES): welcome and opt-in → topic → optional portrait → goal/obstacle description → optional ME/GOAL/OBSTACLE drawing → public coaching form. The webhook saves *no* contact or message before the affirmative consent; after consent, replies, topic and optional image references are stored as encrypted inbound CRM conversation entries and a single new lead. The photo is viewable only via the authenticated, owner-scoped image proxy. STOP suppresses an existing WhatsApp CRM contact and ends the guided flow.

Incoming WhatsApp interactive button and list replies are treated as the same user messages as typed answers. Reply buttons are sent for 1–3 choices; the four topic options appear as a WhatsApp interactive list. On any uncertain provider send, do not retry automatically.

Signed Meta webhook and SHA-256 validation, hashed/idempotent session state, strict owner/number matching, a per-conversation lock, at most 10 guided responses/day and incoming timestamp freshness protect intake. Private client media ID is never shown publicly; server validates signed URL's Meta host, image MIME and <=5 MB bytes before proxying. Unlike Telegram photo IDs, WhatsApp media can expire; private durable image storage is not part of this change.

## Before release: required external Meta setup
Meta Business Dashboard: https://developers.facebook.com/apps/ . Create/choose the owned business app with **WhatsApp Business Platform / Cloud API**. Decide whether the public service number can coexist with the WhatsApp Business app; do **not** migrate or disconnect a personal/account number automatically. Existing WhatsApp chat history is not imported by the Cloud API.

In the Holistic House Vercel project, configure **Production-only, encrypted** environment values; never send token values in a chat, PR, screenshot, browser or git:

- `HH_CRM_MSG_WHATSAPP_ENABLED=true`
- `HH_CRM_MSG_WHATSAPP_PHONE_ID` — official numeric **Phone Number ID** (not the visible public phone number, not WABA ID).
- `HH_CRM_MSG_WHATSAPP_TOKEN` — authorized long-lived system-user token for WhatsApp Cloud API.
- `HH_CRM_MSG_META_APP_SECRET` — Meta app secret for verifying HMAC `X-Hub-Signature-256`.
- `HH_CRM_MSG_META_VERIFY_TOKEN` — your own strong random verify token; set the identical token in Meta's webhook form.
- `HH_CRM_MSG_META_API_VERSION` — your app's supported version, formatted `vNN.0`.
- `HH_CRM_WA_DIAGNOSTIC_ENABLED=true` — consent-first six-step intake.
- `HH_CRM_MSG_WHATSAPP_PILOT_ENABLED=true` — **restricted** first test; global production approval stays off.
- `HH_CRM_MSG_WHATSAPP_PILOT_WA_ID` — exactly one owned test customer number, E.164 digits **without +**, distinct from the business Cloud API number.

The Meta app webhook callback is fixed:
`https://holistichouse.vercel.app/api/app/crm/messenger/webhook/whatsapp`

Add **WhatsApp Business Account → Webhooks → messages subscription** and verify the URL/challenge, using the same verify token. The Meta WABA must be subscribed to the app. After migration review/application and Vercel Production redeployment, visit **My Practice → Messages → Channels → WhatsApp → Connect**, which checks the official Graph API Phone Number ID and registers it for the signed CRM webhook. Registration does not replace or import a WhatsApp Business app's existing chat history.

## Safe acceptance checklist
1. Ensure the new additive Supabase migration is applied; verify FORCE RLS and `hh_app_inbox` grants (never grant anon/browser access).
2. With global `HH_CRM_MSG_PRODUCTION_APPROVED` absent/false, **only the allowlisted pilot wa_id** can produce an inbound CRM message or receive a reply. A second user must be ignored.
3. From that test handset write «Привет» (RU), `START` (EN) or `Hola` (ES). Verify intro has *no* CRM lead before selecting affirmative consent.
4. Complete six stages, including optional portrait/drawing. Verify exactly one CRM lead/conversation, topic/answers, private photos, image errors, and final coaching-form link.
5. Reply manually from the **same owner Messages conversation** and confirm the received WhatsApp bubble on the test handset. Check Meta signed delivery/read status, STOP blocking, duplicate webhook dedupe and 23-hour reply gate.
6. Confirm other existing Telegram, Messages, account access, report links and private files are unaffected.
7. **Only after owner-approved test:** explicitly review the global production-approval flag and live Meta permissions/policy. Changing `HH_CRM_MSG_PRODUCTION_APPROVED` affects more than WhatsApp; never activate it as part of a routine PR merge. Disable the pilot and approve public sending separately.

**Unverified as of PR authoring:** No WhatsApp/Meta Cloud API project secrets were present in Vercel Production, so actual Meta delivery, registration of the Meta phone number, live webhook challenge, real-media download and real-customer E2E cannot be claimed. The Cloud API integration fails closed by default, and the public site's existing `wa.me` link alone does not create CRM messages.

**Rollback:** set `HH_CRM_MSG_WHATSAPP_ENABLED=false`; no data deletion or paid template sends.

**Manual security gate:** this PR includes a new private RLS table/function; review and apply the migration before enabling the webhook. Do not auto-merge this as an auth/security-only release without review.
