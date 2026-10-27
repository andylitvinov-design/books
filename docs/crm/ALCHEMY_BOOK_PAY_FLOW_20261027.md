# Alchemy of the Soul — Book a Session → Pay Your Session (27 October 2026)

## Scope / source of truth
- Site: `/{en|ru|es}/services/alchemy-of-soul`; production branch `codex/public-book-library` in `andylitvinov-design/books`.
- Reuse existing `ContactChannelChooser`, `POST /api/service-enquiries`, `app.public_service_enquiries`, existing `crm_contacts`, owner My Practice Requests, and `/{locale}/cart`. Do not create a second CRM, auth provider or payment provider.
- Confirmed personal offers: `express-consultation-30` — €50/30 min; `personal-session-60` — €100/60 min. The €200 monthly programme remains a separate enquiry route, not a recurring payment.

## State machine and actions
1. **Choose** one existing public SKU; phone (international format) OR first-party Google OAuth; the optional topic is kept out of external messenger drafts.
2. **Book a Session** means an explicit reply-only consent + idempotent server-side enquiry/CRM write. It creates a lead, NOT a confirmed time, payment or client clinical profile. Anonymous phone never proves account ownership. A Google address is populated from the existing verified account, but typed contact details alone are not account authorization.
3. **Await confirmation**: site stores a signed, 30-day, HttpOnly, SameSite=strict cookie, restricted to the booking-status endpoint. It contains the enquiry UUID, operation UUID and timestamp, no contacts or health details. A public HH reference is NEVER an access token. GET /api/service-enquiries/booking-status uses FORCE RLS, the signed proof and the original operation ID. It discloses only the fixed SKU, reference and, when confirmed, start time.
4. **Owner confirms**: in existing My Practice → Requests, the assigned authenticated practitioner explicitly records the future UTC time *after agreeing it with the visitor*. Revision check + practitioner RLS + practitioner row lock + slot-overlap checks for Alchemy and existing remote bookings. A client cannot set `status='booked'`, an amount or a payment result.
5. **Pay Your Session**: only after a successful server readback `status='booked'`, the single CTA changes. A further tap exposes the selected SKU and a link to the **existing** `/{locale}/cart?items=<known-sku>`. That cart controls available Square/PayPal/Interac/Wise/ZEN methods and has its existing separate provider/manual reconciliation logic. No payment provider links are rendered under the public booking form.

## Boundaries / limitations
- **Not a real-time slot-reservation engine:** proposed times are manually agreed before owner confirmation; no Google Calendar hold or automatic calendar availability integration is claimed.
- **Not a payment-to-booking reconciliation:** a manual PayPal, Wise, Interac or ZEN transfer remains unverified until provider/manual confirmation. The booking token is not a checkout authorization credential. An existing checkout order is not automatically linked to a public enquiry ID.
- **Single-browser proof:** the guest can revisit the original browser within the cookie TTL. Phone/HH reference alone cannot restore the protected status elsewhere; a future verified account-link flow would require its own identity checks.
- **No external customer notification promised:** owner receives existing optional enquiry notification; the client checks status or receives a personally agreed reply via opt-in contact. Never send PHI, test results or sensitive notes to messaging/analytics.
- **No Stripe Business assumptions, no new paid APIs, mass sends, ads or privacy-held analytics.**
- **No PHI or treatment guarantees.** No automatic booking or payment by tapping the CTA.

## Migration and security
`supabase/migrations/20261027134425_alchemy_booking_after_owner_confirmation.sql` adds nullable `booking_sku`, `booking_starts_at`, `booking_confirmed_at` and an explicit booked-state CHECK constraint. It does not add anonymous grants, change FORCE RLS or move client-private data. Apply **before** the code serves new booking INSERTs; verify constraints and RLS on the actual production Supabase project.

## Verification / release gates
- Focused tests: signed proof expiry/tampering, wrong SKU/locale/consent, status read gate, dual-calendar overlap source invariants, EN/RU/ES and 320–430px no-charge UI, and existing cart/provider contracts.
- Typecheck, full Next build, exact-head CI, preview/production smoke and post-deploy Vercel READY + exact SHA + canonical domain are **separate gates**.
- Real E2E requires consented visitor via **both** phone and Google, CRM enquiry readback, authenticated owner booking confirmation, client status change, cart SKU and one actual provider readback. Never simulate a paid receipt or auto-merge a failing auth/payment workflow.
- Safe rollback: revert UI/API changes via production branch, leave nullable additive schema columns in place, disable new submission if RLS/provider error. Do not erase bookings.

Tracking: [Revenue funnel #990](https://github.com/andylitvinov-design/books/issues/990), [CRM #985](https://github.com/andylitvinov-design/books/issues/985).
