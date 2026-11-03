# Holistic House — Telegram & WhatsApp Subscription Center

**Design and delivery specification v1.1 · 2026-10-20 (America/Toronto)**  
**Source of truth:** [Issue #1302](https://github.com/andylitvinov-design/books/issues/1302).  
**Existing platform:** [CRM Messenger #985](https://github.com/andylitvinov-design/books/issues/985), Push Settings in `components/app/notification-settings.jsx`, CRM marketing preferences in `components/app/communication-preferences.jsx`.  
**Status:** phased implementation. Presence of source code never means external Telegram/WhatsApp deliveries work.

## Business model and roles

1. **Visitor / guest subscriber:** receives general educational material and events only after a verified channel-specific, affirmative marketing opt-in. No access to client messages or reports. This is Phase 3; do not silently create CRM contacts.
2. **Signed-in client:** can register Telegram username and/or an E.164 WhatsApp number now, then verify actual destination via independent provider handshake (Phase 2). Can request notification topics: practitioner messages, bookings, report-ready, course tasks, optional news. Saving the contact never grants marketing consent or activates sends.
3. **Master:** existing in-app messages and Web Push stay unchanged. Future external alerts require verified per-master channel preferences; no inference from CRM contact records.
4. **Owner:** may inspect aggregate subscriber/verified/send-status metrics in existing CRM, but may not read clinical details, impersonate client account identities or silently send campaigns.

## Canonical UI

Location: My Cabinet → Settings → Notification Center. Existing Web Push Settings remain the canonical push controller. Add one compact Messenger Notification Settings section with two independent cards: Telegram and WhatsApp. Show a plaintext input only during entry. Show a masked destination after persistence and an explicit **Pending verification — no messages are being sent** state. Do NOT display a fake Connected badge. Use EN / RU / ES, accessible form labels, mobile screen width 360–430px and account-switch cancellation.

Do not ask clients to install a mobile app or run anything on the owner's Mac. Avoid redirecting from account settings to unrelated CRM owner tools.

Telegram: allow a voluntary @username for a pending contact; do NOT treat the username as proof or as a delivery endpoint. In Phase 2 replace pending with a short-lived cryptographically random deep link to a dedicated Holistic House bot and /start handshake. The bot is not provisioned by source changes. **Never reuse existing Ezohata or unrelated bots.**

WhatsApp: accept an E.164 phone number, encrypted at rest. Confirmation of phone control and WhatsApp-specific purpose consent must occur via an official Business Platform inbound exchange or compliant verification before any send. Merely filling a phone number does not make it reachable or opted-in.

## Phase 1 — secure working foundation (this PR)

- [ ] Add pure input validation and permission gates for channels, destination formats, notification topics, clear purpose acknowledgement, separate optional marketing preference, and a safe mask.
- [ ] Add account-only pending destination storage in the **app_private** schema: one row per account and channel, encrypted destination, requested topic flags, language, consent copy version and creation/update timestamps; **never store verified destinations at this stage**. Separate from owner CRM contact tables and all clinical data.
- [ ] Use HH application session verification, same-origin writes, X-HH-Account-Id check, scoped SQL transactions, FORCE RLS, no grants to anon/authenticated or CRM/messenger inbox roles.
- [ ] Add authenticated GET / POST preferences endpoint. GET returns only current account's masked hints and topic choices; POST saves pending contact or removes it. All actions return sendingEnabled:false.
- [ ] Add EN/RU/ES settings surface to existing Cabinet Settings. Preserve Web Push and CRM owner-specific marketing controls. Display the disabled/awaiting-verification gate honestly.
- [ ] Add source, policy and route tests, verify Next.js build, DB/RLS policy and exact active deployment SHA. This phase must not call Telegram or Meta or send messages.

**Explicit Phase 1 limitations:** account holders only, not yet public anonymous signup; no verified bot chat IDs, no WhatsApp Cloud API templates, no background dispatcher, no provider receipts. Do not merge if the database migration cannot be applied safely with verified account-only RLS.

## Phase 2 — real verified delivery, owner approval required

Implement a unique 15-minute hashed Telegram linking token bound to one signed-in account, verified Bot API secret webhook, /start and /stop, recipient identity, separate notification outbox and idempotency per event. Reuse existing provider adapter but not manual-reply authorization as a loophole for automatic messages. First deliver one neutral message on an allowlisted owner test account and check provider acceptance. After QA, seek separate approval to enable general client sending.

Implement WhatsApp only using owned Meta WABA / Cloud API with sender identity, webhook HMAC, recipient-initiated verification, approved utility templates outside the 24-hour customer-service window, explicit opt-in, spending cap, receipts and STOP. This is a separate gate; no budget/fees are authorized now.

## Phase 3 — guest subscriber, courses and marketing

Add public signup with server-side rate limits, proof of channel possession, separate explicit marketing consent plus ledger, double opt-in wherever applicable, self-service unsubscribe without account, and privacy-compliant TTL for unconfirmed signups. Unverified guest input is not a notification recipient. Attach events only after verified account association: new message, booking, report-ready, lesson. Store only event type/IDs (not confidential content) and link to an authorized screen after login. Master CRM aggregate counts only; no automatic contact merges.

## Default notification payload and routing

Only neutral, fixed translations, for example: "Holistic House: You have a new message. Sign in to your account." No sender name, report result, mental-health scores, medicine names, dosage, chat text, clinical snippets, session tokens or detailed object IDs in external provider logs. Signed-in deep links must re-check access after ordinary login, and login return paths must be allowlisted. Channel fallback must not cause repeated sends.

## Security, QA and acceptance

- Guest and unrelated client identities cannot read/write another account's pending contact; anon/authenticated PostgREST receive no direct table grants.
- All private-data API responses are no-store. Source includes no provider sends in Phase 1.
- Forged/expired/deep-link and changing account session do not create a verified channel.
- Invalid username/number/topic/unknown field/consent version is rejected, and duplicate save remains one row.
- Never convert "news requested" into approved CASL marketing consent until independently verified and recorded.
- A deleted account cascades pending contact deletion. A remove action deletes that channel only.
- Provider credentials remain server-only; no private data in URL, browser localStorage, analytics or logs.
- A future notification can only be enqueued after exact event confirmation, recipient authorization, verified destination, purpose-specific consent and status check just before dispatch; withdrawals suppress pending jobs.
- Sending cost defaults $0 and transport OFF. UI never calls accepted Telegram events "read" or "delivered" without receipts.

## Runbook / owner actions after Phase 1

No action required to prepare a pending contact. Phase 2 requires an independent official Telegram bot created via BotFather and its token installed only in a secret manager (not in chat, Issue or repository). Phase 2 WhatsApp requires Meta Business/WABA, approved template and explicit budget approval. Any high-risk clinical messaging remains inside authenticated Holistic House, not messengers.

**Related compliance documents:** https://core.telegram.org/bots/features ; https://whatsappbusiness.com/policy/ ; https://crtc.gc.ca/eng/com500/guide.htm
