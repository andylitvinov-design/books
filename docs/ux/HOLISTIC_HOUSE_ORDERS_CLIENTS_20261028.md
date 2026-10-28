# Holistic House — «Мои заказы / Клиенты»
**Design reference · 28 October 2026 · EN/RU/ES**

Owner-approved 8-screen visual mockup accompanies this ChatGPT request and is delivered as `holistic-house-orders-clients-design-20261028.zip`. This document is the retained implementation contract for future edits. The artwork contains fake people, prices and payment statuses: **never ingest them as live data**.

## Intended screens and layout
1. Bottom dock: Home · Practices · Requests · Progress · Settings. Five equal tap targets at 320–430px, safe area respected. Other destinations remain in Account menu.
2. Two role tabs: **My orders** (authenticated customer) and **Clients** (verified practitioner; ordinary members see **Conversations** instead). No cloned contacts, third-party customer lists, or duplicate inbox.
3. My orders: real service image, localized service title, practitioner, request date, unreads, business status, exact booked price **only if stored on order**. Filters All · Waiting · In progress · Completed. Limit/page state is explicit.
4. Order details: status, original enquiry, service duration/booking if present, private request-specific text dialogue; close/mark viewed and repeat-safe send through existing participant-only API. Materials return to My Practices. No fake paid or completed statuses.
5. Clients: reuse existing on-site direct messages, private client requests and role-checked CRM Telegram/WhatsApp/Instagram messages. Owner default CRM view remains intact.
6. Private voice: explicit microphone start, stop, discard, optional preview, 2-minute/20MB maximum. Audio file goes through existing signed storage intent/complete/send; no auto-publish. Voice is currently a **separate direct conversation with the practitioner**, *not* an attachment in the individual order thread. This distinction must be explicit in UI until a separate per-order audio backend is securely built.
7. Error states: signed out; network unavailable; unknown send result; app re-open; stale account changes; read/unread; no results. EN/RU/ES and Safari 320/390/430 accessibility; VoiceOver and real recording require device acceptance.
8. No invented checkout: booking, order, payment, delivery are distinct provider-confirmed records. No personal health/test data in third-party notifications, pixels or push content.

## Implementation path
- Existing: `/app/messages`, `messages-hub`, `messages-simple-inbox`, `direct-message-inbox`, `practice-request-conversation`, CRM #985.
- New: `messages-orders-clients.jsx` uses read-only `my-orders` endpoint and returns to existing master inbox; direct-voice-recorder adds capture to existing audio upload.
- Existing report/clinical client record remains separate from CRM Contacts and can only be opened with existing authorizations.
- Acceptance: independent customer/practitioner logins, foreign-master 403/404, real recorded voice delivered through authorized direct thread and playable on second account, actual Vercel READY/SHA/domain, authenticated iPhone Safari. Build and mocked transport alone **do not prove** these.
- See issues #985 (CRM) and #990 (request conversion). No new paid provider API, mass outreach or auto marketing.
