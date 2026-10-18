# Holistic House — Wise Business open links and WiseTag (2026-10-18)

## One-time service scope

Two existing published, individually scheduled services only:
- `express-consultation-30`: 30 minutes, EUR 50.
- `personal-session-60`: 60 minutes, EUR 100.

The secondary Wise action appears in EN/RU/ES Services and Alchemy of the Soul
only after explicit merchant approval and activation. It is **not** a booking,
automatic payment confirmation, entitlement, subscription, marketplace payout,
or a replacement for the existing contact/PayPal/Stripe/manual paths.

## Two distinct Wise mechanisms

1. **Wise Business OPEN payment link** —
   `https://wise.com/pay/business/<verified-business-slug>`.
   After server-side matching to the immutable published service catalogue, the
   app adds supported `amount`, `currency`, `description` URL parameters.
   This URL is not an immutable invoice. Customer must verify amount and payee.
   See https://wise.com/help/articles/5qGvWQuTiX0RSSvxWvKcBC/how-to-use-your-open-link-to-get-paid-through-your-website

2. **WiseTag** — `https://wise.com/pay/me/<verified-tag>`.
   On 18 Oct 2026 the owner provided a screenshot showing their WiseTag and
   QR code. The QR was decoded to an exact Wise `/pay/me/` URL (no guessing).
   This is a **Wise-to-Wise transfer recipient**, not a Business Open checkout:
   the app must **not append** `amount`, `currency`, `description`, payment
   status, or customer details. The customer must have Wise, enter/verify
   **EUR 50 or EUR 100** themselves and discuss scheduling before sending.
   See https://wise.com/help/articles/6DtiR7Ugdp7hfoKJHfRfvJ/whats-a-wisetag-and-how-do-i-use-it

   WiseTag can represent a personal **or** business profile. The supplied
   screenshot alone does **not** prove that commercial payments are permitted
   on the underlying account. Wise prohibits using personal accounts for
   sales of services. Confirm recipient is a **Wise Business account** before
   switching this channel live.
   See https://wise.com/ca/blog/wise-business-vs-personal-canada

Both link types are strictly validated as canonical https Wise URLs without
unexpected hosts, URL credentials, query parameters or fragments. A server-side
303 redirect has `Cache-Control: private, no-store`. The UI presents an amount
and clear manual reconciliation warning, but clicking never marks anything paid.

## Environment and safe activation

In Vercel production project `codex-public-book-library` use **server-only**
variables, never `NEXT_PUBLIC_*`. Store the recipient URL in Vercel
configuration, not in application source.

- `HH_WISE_PAYMENT_OPEN_LINK`: verified Wise Business open link, **or**
- `HH_WISE_PAYMENT_WISETAG_LINK`: verified Wisetag from the owner-supplied QR.
- `HH_WISE_WISETAG_BUSINESS_VERIFIED=true`: REQUIRED for Wisetag path only,
  after independent confirmation the recipient is a permissible Wise Business
  payee. A WiseTag screenshot is *not* sufficient verification.
- `HH_WISE_PAYEE_APPROVED=true`: only after matching account identity,
  currency support, merchant terms, refund policy and legal/tax review.
- `HH_WISE_PAYMENTS_ENABLED=true`: switch on only after merchant readiness and
  checking the hosted Wise destination.

When a valid Business Open link is configured, it has priority over Wisetag.
Any missing verification flag, missing/invalid recipient URL, or disabled switch
returns 503, with **no payment CTA**. Unknown product IDs return 404 when
enabled. There is no API secret; linking to Wise is not a bank API integration.

Existing manual-payment plan flows do not accept WiseTag automatically.
Do not offer Wisetag for subscription, Premium session credits, marketplace
splits/commissions, remote Reiki bookings, arbitrary/custom amounts or client
specific medical consultations not in the approved fixed catalogue.

## Release and QA checklist

1. Independently confirm Wise **Business** account ownership/eligibility to
   receive commercial EUR payments and local Wise payment method availability.
2. Confirm posted prices, sales/tax terms, client cancellation/refund guidance
   and the rule to coordinate time **before** transferring.
3. Verify the exact owner-provided WiseTag URL in private Vercel env; never
   infer Wise Business URL from the @handle.
4. Switch on both approvals and enabled flag only once verification is complete.
5. Build/deploy reviewed canonical source; verify READY production SHA and
   `holistichouse.vercel.app` alias, EN/RU/ES selectors and exact Wise redirect.
6. Test `node --test tests/wise-service-payments.test.mjs`, matching existing
   site tests and Next build. Real transfer is optional and requires a
   separate explicit authorization. No simulated transfer proves receipt.
7. Manual reconciliation: verify recipient and actual EUR amount in the Wise
   account, record a unique transaction reference in an authorized financial
   workflow, confirm an agreed appointment separately. User-uploaded
   screenshots or frontend return links are **never authoritative**.

**Status:** integration code supports verified WiseTag, but the business
profile, merchant/legal acceptance, provider receipt reconciliation and live
transfer still need confirmation. The path remains OFF until ready.
