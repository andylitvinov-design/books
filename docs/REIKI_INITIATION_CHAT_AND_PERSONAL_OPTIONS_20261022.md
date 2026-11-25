# Reiki Practitioner · Lesson 5 chat and personal initiation choices (2026-10-22)

## Owner-approved offer / approved prices

The existing `end-01` slide in `/en|ru/academy/principles-of-energywork/learn` offers **three clearly distinct choices**. Keep the five-lesson course and its saved slide IDs:

1. **Free gift:** choose one Level 1 system (Tantra, Kundalini, Yggdrasil). This initiation is guided **in chat with Andrey**, not a complimentary private video session. Completion or clicking Send does **not** deliver an initiation.
2. **Optional voluntary donation:** select the other one or two systems for an additional chat initiation, amount discussed later (no mandatory donation).
3. **Optional paid personal 1:1 session:** none, **express 30 minutes for €50**, or **full 60 minutes for €100**. This request is not a payment, charge, entitlement, automatic booking or confirmed session. The owner arranges a time and mode separately.

The no-paid-session choice is the default so a visitor cannot incur a fee by selecting their free gift. Pricing lives in `REIKI_PERSONAL_SESSIONS` and is reused by the learner and formatted private CRM record.

## Data contract and privacy

- Existing authenticated learner, explicit teacher-sharing, application confirmation, server validation and encrypted `end-01` course journal are retained.
- New edited requests use `hh-reiki-personal-request-v2:` with `personalSession` = `none | express | full`; the original `v1` requests still parse and validate without changing submitted choices or touching leads.
- Existing `apply` API, `app_private.reiki_course_leads` encrypted payload and practitioner-only inbox remain canonical. No new table, migration, third-party message, checkout, charge or calendar booking.
- The private CRM human-readable request says **chat**, names any donation traditions, and gives the precise paid-session duration and EUR price, with an explicit no-payment/no-booking qualifier.
- Do not put the selected price, name, answers, location or health details into WhatsApp/Telegram link parameters, pixels, analytics or logs. Messengers only open neutral draft links without personal course data.

## Acceptance / release gates

- EN and RU: all three formats visible and tappable at iPhone widths 320, 375, 390, 430px; keyboard, radio focus, vertical slide scrolling, Back/Continue and 44px targets work.
- New v2 and old v1 serializations validate server-side, including rejecting unknown session IDs or manipulated JSON. Revisit a saved choice and verify readback without loss of older answers.
- Signed-in learner → five lessons → explicit opt-in → one application lead in owner CRM, correct type/price and no duplicate. Test guest/unauthorized denial and rejected/partially-complete submissions.
- GitHub PR tests, ESLint, TypeScript, Next build, live Vercel READY exact production SHA and actual owner/learner mobile CRM end-to-end required before claiming completion.
- Real personal-session booking/payment remains **not implemented**: owners contact applicants manually. Do not declare a paid order from a radio selection.

Rollback: revert the UI/copy/schema changes; old v1 submissions and their encrypted records are preserved. New v2 source must remain available to parse already-saved requests if a future implementation replaces this form.
