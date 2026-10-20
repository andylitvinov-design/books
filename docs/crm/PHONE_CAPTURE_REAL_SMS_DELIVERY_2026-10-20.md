# Holistic House — phone capture, consent, real SMS delivery and zero-fee fallback
**Architecture & implementation specification v1 • 20 October 2026 (America/Toronto)**

Linked system: [CRM #985](https://github.com/andylitvinov-design/books/issues/985). Source branch: \`codex/public-book-library\`. This is a **verified design + production readback**, not authorization to purchase an SMS number, to send to clients, to import existing lists or to activate campaigns.

## 1. Decision and economics

**Normal carrier SMS cannot be promised free.** The green CRM "SMS from your phone" mode does not bill a third-party API, but the owner pays any fees in their cellular plan and must personally tap Send for every message. It is not an automatic, trackable SMS provider.

Twilio Canada published outbound long-code/toll-free pricing: **US$0.0083 per SMS segment**, *plus* carrier fees (e.g. Rogers/Fido US$0.0084/segment) and a rented Canadian long code from **US$1.15/month**, before other possible fees and taxes. Illustrative 100 one-segment Rogers deliveries: US$1.67 in outbound per-segment fees + US$1.15/month number rent = **US$2.82**, excluding other charges; two segments can roughly double per-message fees. Actual invoice may differ. Trial: 30 days, up to five verified recipients, preset messages only — not an ongoing free commercial sender.

Sources: https://www.twilio.com/en-us/sms/pricing/ca ; https://www.twilio.com/docs/usage/trials

**Recommended production policy:** free **authenticated Cabinet message + opt-in Web Push first**; Telegram only after client initiates bot and connection is verified; email where the client separately opted in and email delivery exists; **one-to-one real carrier SMS as optional paid fallback**, only where notification purpose and current consent authorize it and budget allows. No auto-upgrade, provider purchases, mass sends or multi-provider load-balancing without separate review. An SMS can work without recipient internet; Push/Telegram/email cannot.

## 2. Actual deployed intake/storage inventory (read October 20)

| Source | Is phone collected now? | Current storage / limitations |
| --- | --- | --- |
| Owner My Practice → CRM → Contacts | **Yes** (manual E.164 phone or email) | \`app.crm_contacts.contact_ciphertext\` holds name/email/phone encrypted with authenticated AES-GCM; \`phone_hash\` is owner-scoped keyed dedupe. **No automatic SMS consent** |
| Owner CRM → SMS | Can record existing independently evidenced SMS marketing consent; manual handset SMS composer | \`app.crm_consent_ledger\` (channel \`sms\`, purpose \`product_updates\`), restricted \`app.crm_sms_jobs\`; no real outbound Twilio configured |
| Business-consulting landing enquiry | **Yes** — name, optional email, optional phone, question, and required *reply-to-this-enquiry* consent | \`app_private.business_consulting_requests.payload_ciphertext\` under practitioner. **Not** automatically copied into \`crm_contacts\`, **not** marketing opt-in, **not** phone verification |
| Sitewide public WhatsApp/Telegram contact chooser and Reiki handoffs | No provider phone number is silently read | Client submits an enquiry and explicitly opens their own messenger; master may manually record a contact after genuine inbound. Do not equate Telegram @handle to verified phone |
| Client Cabinet | Existing authenticated users + optional app-install Web Push for private messages | Existing client opt-in push subscriptions; **not** a central, verified E.164 CRM phone register and not proof of SMS marketing consent |
| External events / Eventbrite | May hold registration/contact details externally depending event | **No silent import**, merging or marketing opt-in from third-party exports. Use a separate, clear opt-in link |
| Tests, reports, private consultations | Clinical/personal context | **Never bulk-import or target by answers**. Keep these records separated from business CRM |

**Production database verification:** \`app.crm_contacts\` **0 rows**, SMS consent events **0**, \`app.crm_sms_jobs\` **0**, SMS opt-outs **0** on verified project \`shervdixkaxurnaecioe\`. These counts are not a claim about separate business enquiry or external Eventbrite data. \`crm_contacts\`, \`crm_consent_ledger\`, \`crm_sms_jobs\` all have **FORCE RLS** and **no anon/authenticated SELECT grants**. Current Vercel Production environment has **no \`HH_CRM_TWILIO_*\` or \`HH_CRM_SMS_*\` keys**; real provider sending is OFF. At time of verification \`/en/contact\` returned **404** and \`/en/about\` did not provide verified public postal sender details — a commercial SMS identification/compliance blocker. Do **not** publish the practitioner's private residential address or manufacture an address; agree on publicly usable business/legal contact details.

## 3. How numbers should be collected

### 3.1 Minimum visual UX (EN/RU/ES)

- Public consultation and event form: "Phone (optional, include + country code)", language and optional preferred reply channel. Required, purpose-limited statement: "**Use my number only to answer this request / notify me about this booking**", explicitly separate from marketing.
- **Separate, unchecked** optional marketing checkbox: "I want Holistic House offers/news by SMS. I can unsubscribe at any time." Clearly name sender and identify how often communications may be sent if that is promised. Show concise privacy summary/link before submission; do not block a requested service if they refuse marketing.
- Private Cabinet → Profile → Contact & notifications: add optional self-entered phone, indicate \`Unverified / Pending verification / Verified / Revoked\` and channel toggles for appointment notices, private-message alerts and marketing as **distinct purposes**. Current Cabinet Web Push consent is independent.
- Master CRM contact card: provenance \`manual / business_enquiry / event_optin / client_self_provided\`, phone validity, \`verifiedBy\` and date (when actually verified), separate recorded opt-in proof (channel, source, time, locale, version), last provider status and STOP suppression.
- Client changing a verified phone must **not inherit** the old number's permissions; invalidate prior phone verification, disconnect prior SMS preferences and request verification again before sending. Maintain the original immutable audit event.

Suggested Russian opt-in text:
> «Хочу получать новости и предложения Holistic House по SMS на указанный номер. Это необязательно; могу отказаться в любое время, ответив STOP.»
This **does not** replace the exact legally reviewed EN/RU/ES identification and privacy notice, or a real sender/STOP configuration.

### 3.2 Phone validation and verification

- Normalize to **E.164**, e.g. \`+14165551234\`, with explicit country picker. No guessed +1; harden with pinned phone metadata library for plausible number lengths/type, not merely regular expression.
- A plausible E.164 does **not** show that a number exists, belongs to the client, accepts SMS or is mobile.
- To prove possession, after provider approval: **one-time code sent by a legitimate SMS provider** (hash OTP server-side, 5–10 min expiry, attempt/rate limits, no plaintext logs), OR inbound \`START\`/registration keyword from customer's own handset to the dedicated business number, subject to consent and provider policy. Both can incur messaging fees; do not advertise as free.
- Service/booking consent and marketing consent are separate. A \`START\` code by itself must not silently authorize future marketing without clear informed disclosures.

## 4. Canonical storage and privacy model

**Existing CRM remains source of truth for owner-scoped commercial contacts**, not client medical records. No global unencrypted telephone spreadsheet, Google Sheet master contact list, public GitHub/Drive exports, or phone numbers in analytics events/URLs/logs.

| Store | Minimum fields | Protection |
| --- | --- | --- |
| \`app.crm_contacts\` (already exists) | owner/contact UUID, encrypted \`displayName,email,phone\`, \`phone_hash\`, locale/source/lifecycle/suppressed | Server-only AES-GCM with authenticated account+record context; hashed owner-scoped phone dedup; FORCE RLS |
| \`app.crm_consent_ledger\` (already exists) | owner/contact IDs, \`channel,purpose,decision,occurred_at,recorded_at,source,text_version,actor_kind\` | Append-only historical evidence, no fabricated owner attestations; old purpose currently \`product_updates\` only |
| \`app_private.crm_sms_optouts\` (already exists) | keyed recipient fingerprint, STOP provider event, time | Applies to future SMS across duplicate owner contact records; not public |
| \`app.crm_sms_jobs\` (already exists) | owner/contact, encrypted message text, recipient hash, consent event, segments, provider message SID, status | Owner-only status + verified webhook, idempotency, no client health information |
| **Proposed** private account channel table | account UUID, encrypted phone, scoped fingerprint, verification state/at, locale, purpose-specific preferences + origin, revision | Distinct from practitioner marketing CRM; FORCE RLS, private grants; individual self-service only |
| **Proposed** private verification challenges | recipient/account key, salted/hmac code digest, expiry, attempts, last sent at, abuse limits | TTL 5–10m, purge/expiry, no reusable plaintext PIN, never expose in public endpoints |
| **Proposed** unified notification attempt table | notification ID, recipient account and purpose, preferred channel, provider IDs/status, cost/segments, timestamps, attempts | Separate transactional/in-app alerts from promotional campaigns, bounded retention and no copy of clinical text |

Notes:
- A masked \`+1 *** *** 1234\` may be shown in owner/client authorized UI; full number only when required and role-checked.
- **No implicit linking** Cabinet user → CRM contact from matching email or phone. Explicit account-authorized link/invitation, privilege checks, and consent required before merging records.
- Never put an encryption key, private token, complete phone/medical content into front-end bundles, \`NEXT_PUBLIC\` variables, GitHub, Metricool, logs or advertising analytics.
- Implement retention/deletion policy reviewed for PIPEDA and consent evidence. For inactive leads, propose periodic review (e.g. 12 months), not unapproved blanket purges; retain documented consent/withdrawal evidence only as long as legally and operationally justified. Existing cascade deletion policies must be preserved.
- Check current Supabase docs, migration ledger and role grants before any DDL; adopt *new additive migration* and independent rollback-only RLS tests. Do not quietly alter the already applied migration files.

## 5. Reliable delivery state machine

1. Client explicitly opts into a **particular purpose and channel**. Prefer opt-in Web Push for private in-app messages. Capture phone verification separately.
2. Generate neutral, non-clinical notification: e.g. "Holistic House: You have a new private message. Sign in to view it." If a link is included, use **authenticated Cabinet destination**, no diagnosis, test score, report preview, medical content, private bearer token or auto-login.
3. For real SMS **only**: check owner approval/budget, purpose, verified number, current consent, global STOP, valid sender, send window and unique idempotency key immediately before provider dispatch.
4. Send **once** through reviewed Twilio Messaging Service (existing code); accept but **do not claim delivery** from the HTTP API response. Never automatically resend an ambiguous send.
5. Validate signed status webhook, account SID, Messaging Service ID, message SID and recipient match; reconcile possibly early receipts. Display timestamps for \`accepted → queued → sent → delivered\` or \`failed / undelivered / unknown\`. \`sent\` means carrier accepted, not handset reached.
6. Permit user-initiated readback of a known provider message using Twilio GET; never downgrade terminal delivery after out-of-order callbacks. No blind retry on \`unknown\`.
7. On STOP, immediately block future SMS and persist withdrawal, regardless of whether the marketing dispatch gate is ON. Preserve STOP even if phone reappears as another CRM contact. Manual iPhone SMS replies require **human** suppression in CRM; the website cannot read personal Messages.
8. Record **in-app "read"** only if authorized client actually opens the message. Standard SMS does not provide a human read receipt.

Budget controls: per-owner rolling daily cap, configurable monthly hard spend cap with atomic reservations, length/segment cap (especially Cyrillic UCS-2), explicit recipient opt-in, budget alert around 80%, separate permissions for marketing versus transactional delivery, no paid SMS fallback unless the owner approves and customer has chosen it. If provider is down or budget exhausted, keep the message in Cabinet and show pending; do **not** imply it reached a phone.

Twilio status source: https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks

## 6. Production prerequisites blocking real SMS

- [ ] Owner creates/owns verified Twilio production account, payment profile and suitable sender. **No number purchase without explicit owner approval of price and billing.**
- [ ] Complete carrier eligibility/verification for the actual sender/Canada destination and intended message category. Choose two-way sender able to accept inbound STOP.
- [ ] Add confidential \`HH_CRM_TWILIO_ACCOUNT_SID\`, \`HH_CRM_TWILIO_AUTH_TOKEN\`, \`HH_CRM_TWILIO_MESSAGING_SERVICE_SID\` in Vercel **Production**, not chat/GitHub.
- [ ] Verify signed incoming callback \`https://holistichouse.vercel.app/api/app/crm/sms/webhook\`, messaging service sender pool, status callback and correct Advanced Opt-Out for EN/RU/ES. **Advanced Opt-Out cannot be assumed from successful API auth.**
- [ ] Publish actual agreed business/legal sender identification/contact page (currently /en/contact = 404) and verify required address/contact details without leaking home address.
- [ ] Enable only controlled \`HH_CRM_SMS_PILOT_APPROVED\`, \`HH_CRM_SMS_TEST_PHONE\` and approved config gates after compliance checks. Keep \`HH_CRM_SMS_LIVE_APPROVED=false\`.
- [ ] Send **one** SMS to a consenting test handset and check actual arrival + signed \`delivered\` callback. Then test inbound STOP, HELP, duplicate request ID, wrong phone, encrypted database, rejected unauthorized actor and failed/undelivered. Repeat on more than one carrier if feasible.
- [ ] Only then consider separately approved one-to-one production messaging and budget cap. **Never** claim "live sending" from a successful code build alone.

## 7. Implementation program, smallest safe stages

**P0 — existing safe functionality**: Keep manual handset SMS queue, manual email, Cabinet Web Push and currently OFF Twilio adapter. Show truthful provider status. No phone is auto-imported from enquiry, medical profile or Eventbrite.

**P1 — phone intake map & UX (no paid provider needed)**: Unified EN/RU/ES phone input/country selector + purpose disclosure in public consultation/event subscription interfaces; preserve existing enquiry-only consent; add clearly optional, separately recorded marketing SMS opt-in **only after a reviewed consent proof table/workflow exists**. Build client Cabinet phone/contact preferences for self-management. Add sensitive-data and owner-permission tests.

**P2 — verified phone & identity (provider requires separate approval)**: OTP or verified inbound starter, E.164, attempt throttling, revoke/rotate, explicit Cabinet–CRM linking only by client's authorized action, consent version evidence. Add owner CRM statuses \`unverified/verified/opted_out\`. Do not enable billing unintentionally.

**P3 — controlled real SMS pilot**: Verified sender, Canadian compliance contact page, STOP, signature checks, retry-free status, max 1-2 segments for reminder text, hard monthly budget. Document exact pilot phone, sender and receipt *privately* in protected operations storage, not a public repo.

**P4 — hybrid notifications**: Client can choose Cabinet+Push, Telegram, email or approved paid SMS; default free channels where actually connected and consented. Channel routing per *purpose*, no broad auto-marketing. Owner CRM shows queue \`saved/accepted/sent/delivered/failed/unknown\`, observed provider metrics and spend; no fake human-read receipts.

Acceptance: (a) unauthorized actor cannot query or set another phone/consent; (b) all fresh public leads default marketing=false; (c) actual SMS consent proof tied to **current phone**; (d) STOP remains blocked across contacts; (e) duplicate/unknown attempts are never sent twice; (f) 1 owned handset E2E with actual carrier receipt; (g) exact production Vercel READY SHA and alias verified; (h) mobile EN/RU/ES no clipped fields.

## 8. Compliance and reference links

- CASL — consent, identification and unsubscribe: https://crtc.gc.ca/eng/internet/anti/reg.htm and https://crtc.gc.ca/eng/com500/faq500.htm
- CRTC opt-out and evidence: https://crtc.gc.ca/eng/com500/guide.htm
- Privacy Commissioner: PIPEDA meaningful consent and record minimization: https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/
- Twilio Canadian published SMS fees: https://www.twilio.com/en-us/sms/pricing/ca
- Twilio Advanced Opt-Out: https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out
- Existing CRM delivery details: \`docs/crm/SMS_DELIVERY.md\`
- Existing free options: \`docs/crm/NO_API_FEE_SMS_2026-10-20.md\`

**Release gate:** This document is a design and readback, not a deployed new subscription/verification API. No customer phone data was read or modified, and no SMS was sent.
