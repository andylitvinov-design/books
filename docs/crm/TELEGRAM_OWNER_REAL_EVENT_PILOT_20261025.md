# Holistic House — owner-only Telegram live-event pilot (2026-10-25)

## Goal

Reuse the verified **@andydotbot** link for *one first-party practitioner's*
neutral notifications from genuine public enquiries and participant-visible
client messages. A successful manual owner test is already evidenced in #1302.
This release is NOT evidence of a real booked/paid service or customer delivery.

## Existing paths

- Cabinet Telegram: `/ru/app/settings#hh-telegram-connect` (verified /start).
- CRM → Connections: `/ru/app/practice?panel=crm&crmTab=integrations`.
- Public opt-in enquiry: `POST /api/service-enquiries` → private saved record → CRM.
- Private messages: `POST /api/app/practitioner-client-messages` → committed participant note.
- Optional separate CRM Telegram Inbox uses `HH_CRM_MSG_*` and is **not** needed here.

## Release gates

- `HH_CLIENT_TG_OWNER_PILOT_ENABLED=true` is **owner-only real-event pilot**, disabled by default, production only.
- `HH_CLIENT_TG_SEND_APPROVED` stays OFF (all-customer notifications).
- `HH_CLIENT_TG_LINK_ENABLED`, approved shared practice bot credentials,
  verified account link, `messages`/ `booking` opt-in and signed webhook remain required.
- SQL derives the original practitioner's authenticated owner; never from a submitted chat ID.
- Public only: newly committed contact-bearing enquiry, 15-minute freshness;
  unique claim per enquiry, max 12 attempts/hour/owner and no retry after uncertain provider result.
- Message only: actual client author on current assigned consultation,
  participant-visible, active/writable status; unique claim per message, max 20/hour/owner.
- Both: consent/STOP rechecked before provider, fixed neutral localized text,
  link to private My Practice, no client notes, symptoms, scores, or attachments.
- `accepted` records only Bot API acceptance, never end-user read/delivery.
- RLS=ON/FORCE; public/authenticated roles have no table access or claim function execution.

## Acceptance and release

1. Focused tests + lint/typecheck/Next production build on exact PR head.
2. Apply and verify migrations `20261025181314` and `20261025181838`.
3. Merge only with relevant CI and review, then check Vercel READY and alias exact SHA.
4. Enable only the owner pilot flag, redeploy/check READY. No mass sending.
5. One **owner-approved** real opt-in public request from a controlled visitor, 
   check same HH reference in CRM and exactly one neutral Telegram message
   received on owner's phone. A separate approved test client is required for
   client → assigned master → Telegram private-message E2E.
6. Confirm STOP/disconnect suppresses new sends, duplicate form operation sends once,
   unrelated masters and draft/private materials send zero.
7. Record provider acceptance and physical phone receipt in #1302/#990.
   Do not mark full E2E PASS before these observations.

## Rollback

Set owner pilot flag OFF and redeploy; do not roll back RLS or remove verified
user links. Keep past dispatch rows as audit. No paid API, bulk send or
`HH_CRM_MSG_*` migration is necessary.
