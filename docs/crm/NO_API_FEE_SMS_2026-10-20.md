# Holistic House · No-API-fee SMS and free messaging alternatives (20 October 2026)

## Decision

**No reliable, unrestricted, cloud-hosted SMS bulk sender can be enabled at $0 indefinitely.** A carrier-connected SMS necessarily uses a number/mobile plan and provider routing. Do not use browser scraping, undocumented carrier email-to-SMS gateways, disposable numbers, or pretend Web Push is SMS.

In **My Practice → CRM → SMS**, add **SMS from your phone (no paid API)**:

- Existing owner-only CRM accounts and contacts, no external sender setup or SMS API key.
- Filter on the *existing, server-authoritatively calculated* `smsEligibility.allowed` (explicit, current consent), `suppressed=false`, non-archived, valid E.164 number. Globally opted-out Twilio numbers remain ineligible.
- Select up to 20 different phone recipients from *loaded CRM contacts*. Duplicate phone numbers are excluded even across duplicate contact records; do not silently include unloaded contacts.
- Prepare one business-only, ≤240-character SMS, including Holistic House sender identity, full website URL, STOP. Show GSM-7/UCS-2 segment estimate including footer and reject >4 segments.
- A **local-only** list: for one recipient at a time, copy the complete text and open the phone's SMS application using `sms:+E164`. User must paste the text, verify the recipient and personally tap **Send**. No API POST, purchased number, automated send, group chat, background sending, provider receipt or "delivered" claim.
- To preserve iOS compatibility, do **not** insert `body` into the SMS URL. Apple specifies a phone-number-only `sms:` link. The text is available via Clipboard and a selectable textarea fallback.
- **Carrier costs may still apply** (even with no CRM API fee). The user's cellular plan, network, roaming and per-segment charges control the cost. If their unlimited-text plan covers the recipients, the incremental charge may be zero; do not promise that.
- A manual reply of STOP **cannot reach Twilio's signed webhook** when the sender is a personal SIM. The owner must immediately select **Do not contact** in CRM; the workflow says this explicitly.
- No SMS content/phone sent to a new outside service. The prepared queue lives in browser memory only. If the tab closes, there is no fake delivery history.

## Additional channels already available at zero per-SMS cost

- **Private Client Cabinet + Web Push:** The existing code `app/api/app/practitioner-client-messages/route.js` plus `lib/app/client-message-push.js` stores a new private practitioner reply and best-effort notifies a signed-in client **only if that client opted in** (My Cabinet → Settings → Phone notifications). Push can be displayed on an iPhone added to Home Screen, Android or compatible browser. It is not a phone-number broadcast, not an SMS, and must not match anonymous CRM phone contacts to cabinet accounts. Never send medical details in the push payload.
- **Telegram Bot API:** Potentially no per-message API cost, but user must first open and message the *verified dedicated* bot and approve the relevant subscription. The existing CRM messenger integration is disabled until the owner connects a bot credential and approves a pilot. Reusing a different bot without permission is not allowed. It is not native SMS.
- **Email:** Existing CRM delivery via Resend is also gated on a verified owned domain, consent, webhook and sender; its free tier is a separate product, not an SMS gateway.
- **Twilio:** The existing paid sender remains entirely separate and OFF unless explicit production gates pass. No budget or credentials are invented.

## Current provider/trial findings (verified October 20, 2026)

| Product | Published offer | Why it cannot serve free mass SMS |
| --- | --- | --- |
| Twilio Trial | 30 days, at most five verified recipients, predefined message templates | Does not allow arbitrary CRM marketing texts or ongoing free broadcast. https://www.twilio.com/docs/usage/trials |
| Telnyx Pretrial | $25 **AI-only** credits; standard messaging needs account upgrade and may expose $5 general credit | Credits are not permanent free SMS. https://support.telnyx.com/en/articles/14327893-telnyx-pretrial-accounts |
| Twilio Pay-As-You-Go Canada | Outbound from US$0.0083/segment plus carrier fees and number rental | Real recurring costs. https://www.twilio.com/en-us/sms/pricing/ca |
| Web Push | No SMS-provider charge; already provisioned VAPID keys in production | Opt-in browser/app delivery only, not a cellular text. https://developer.mozilla.org/en-US/docs/Web/API/Push_API |

### Legal and privacy controls

Commercial SMS in Canada are covered by CASL: appropriate consent, accurate sender identification/contact information and a functional unsubscribe mechanism are required. See https://crtc.gc.ca/eng/com500/faq500.htm. Entering a lead's phone number, buying a service, or downloading an event list does **not** automatically authorize bulk marketing. The manual SMS tool enforces recorded explicit opt-in rather than guessing implied consent.

Apple's phone-number-only SMS deep link: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
The more general SMS URI RFC: https://www.rfc-editor.org/rfc/rfc5724

## QA and release

- No new database migrations, secret variables, paid providers or automated campaigns.
- `tests/crm-free-sms.test.mjs` checks opted-out/archived contacts, duplicate phone, selection size, private-content rejection, SMS URL format and zero CRM API send calls.
- EN/RU/ES mobile UI and accessible manual controls.
- Verify the CRM source test workflow and production SHA after merge.
- Test physical iPhone clipboard → Messages → paste separately before claiming that device handoff works on iOS. Browser/source tests alone do not prove native app launch.
