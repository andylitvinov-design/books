# Remote energy support booking — verification and activation (2026-10-24)

## Production facts observed
- Production origin: https://holistichouse.vercel.app
- Vercel team/project: super10 / codex-public-book-library
- Production Git branch: codex/public-book-library (repository andylitvinov-design/books)
- Supabase project: holistichouse / shervdixkaxurnaecioe.
- Deployed DB schema includes the remote booking and private-conversation migrations.
- Approved active master: Andy Litvinov, slug andy-litvinov.
- Published offer: remote-energy-support, 30 minutes EUR 50, 60 minutes EUR 100.
- app.consultation_requests had zero records at inspection. No real E2E order or delivered email was verified.
- Existing client notifications depend on opt-in web/mobile push or verified Telegram links; no active client subscriptions were observed.
- No HH_CRM/HH_BOOKING Resend credentials or sender/domain verification variables were found in the production Vercel environment at inspection. Transactional email therefore remains DISABLED.

## Workflow
1. Client selects a published master/service, goal, format, 30/60-minute approved price, and preferred time.
2. Authenticated client confirms request; the server validates approved price, client timezone, appointment date, ownership and idempotency.
3. Newly created remote request is saved with status requested, followed by a neutral in-app master message and optional opt-in push/Telegram. A dedicated transactional email is attempted **only if separately enabled**.
4. Master opens My Practice > Requests and can confirm the requested slot, propose a new time or decline it.
5. Master proposal status reschedule_proposed alerts the client in the private request thread. Client chooses Accept time or Decline change.
6. Acceptance changes request back to requested; the master must reconfirm, with overlap detection across their other confirmed bookings. No automatic start is allowed on a merely proposed slot.
7. Master can start only at the appropriate window and complete only after the selected duration. Payment remains not enabled.

## Activating transactional booking email (owner service only)
In Vercel Project Settings > Environment Variables, add to **Production**:
- HH_BOOKING_EMAIL_ENABLED=true
- HH_BOOKING_EMAIL_PRODUCTION_APPROVED=true (only after sender/domain are verified and tests reviewed)
- HH_BOOKING_RESEND_API_KEY (Resend API secret; do not paste into chat, source, or logs)
- HH_BOOKING_FROM_EMAIL (a mailbox on your verified custom sending domain)
- HH_BOOKING_VERIFIED_DOMAIN (the exact sending domain)
- HH_BOOKING_SENDER_VERIFIED=true (only after the Resend sender/domain verification succeeds)
- HH_PRACTITIONER_OWNER_EMAIL (already configured for production; check the actual intended receiving inbox privately)

Verify sender domain with Resend DNS (SPF/DKIM as directed by provider), review owner recipient, then redeploy from the intended production branch. Email notifications contain **only** a neutral link to the private master dashboard; no client's goal, message, contact, or image is sent to Resend.

Important: This adapter intentionally emails only the hard-bound owner practitioner. Future third-party masters will need a separately verified per-practitioner destination and opt-in, not reuse the owner's inbox.

## Operational acceptance test — requires two authorized user accounts
1. Master and client sign in as different verified accounts.
2. Client sends one new booking with a future time; confirm one row in app.consultation_requests, status requested.
3. Confirm master inbox alert inside My Practice; inspect push/Telegram only if explicitly opted in.
4. With booking email enabled, verify provider acceptance and inbox delivery; provider acceptance alone does not prove inbox arrival.
5. Resend the exact same client operationId; verify same request and no duplicate master alert/email.
6. Master proposes another future date/time; client sees proposal in My Requests and receives a neutral update.
7. Client accepts; verify status requested, current time equals accepted proposal, and a new master alert.
8. Master confirms; verify status confirmed and client notification in secure account.
9. Create conflicting confirmed slot and verify SLOT_UNAVAILABLE.
10. Verify session cannot be started prematurely or completed before its duration.
11. Verify client can decline alternate time; no unrelated client can read another booking/messages/photos.
12. Verify network and Resend failures never mark the booking as emailed or paid.

### Known limits
- The existing after() notification is best-effort and no durable delivery retry queue was introduced by this change; a failed notification must be diagnosed from server logs. The canonical booking itself is persisted first.
- Booking email cannot be proven or enabled until sender domain and Resend credentials are supplied, approved and tested. This PR does not configure Vercel secrets, claim delivery or deploy production changes.
- No payment collection is currently enabled.
- A client cancellation currently does not generate the same booking-status notification because the private thread closes on cancelled; this needs a separate status-safe alert or outbox design.

## Security side finding
Supabase flagged 12 app_private tables with RLS off. Privilege checks at inspection showed the sampled anon/authenticated roles do **not** currently have SELECT/INSERT grants to those tables, so do not claim they are publicly readable. A role/endpoint exposure audit is needed before adding RLS; enabling RLS abruptly may break private backend jobs. No policy change is part of this booking fix.
