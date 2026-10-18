# Wise Business payment links — Holistic House (2026-10-18)

## Scope
This is an **optional, server-gated, external Wise Business open-link checkout** for two
published one-time personal sessions on Holistic House:
- `express-consultation-30` — EUR 50, 30 minutes.
- `personal-session-60` — EUR 100, 60 minutes.

EN/RU/ES Services enquiry selectors and the Alchemy of the Soul format selector
show a compact secondary **Pay with Wise** action **only when activated**.
The existing contact/booking flow, free offers, Stripe sandbox/service cart, and
membership/remote-master booking remain unchanged.

Wise supports adding `amount`, `currency`, and `description` query parameters
to a Wise Business **open payment link**. The server reads canonical product
prices from `SERVICE_PRODUCTS`, not a browser-provided amount; it redirects
with HTTP 303 and `Cache-Control: no-store`. Descriptions contain **only a
public product identifier**, no customer names, appointments, health data or
client IDs.

Official source: https://wise.com/help/articles/5qGvWQuTiX0RSSvxWvKcBC/how-to-use-your-open-link-to-get-paid-through-your-website

## Activation (currently OFF)
Use the *actual owner-verified* reusable **Wise Business OPEN** link,
`https://wise.com/pay/business/<verified-handle>`, not a guessed address,
Wisetag, personal SEND link or one-time invoice. Do not commit the live
recipient URL to source or use `NEXT_PUBLIC_*` variables.

For the Vercel production project `codex-public-book-library`:
1. Verify that the URL actually opens **the intended merchant's Wise receiving
   page**, and that the receiving account supports EUR business payments for
   these services. Inspect supported payment methods; card availability is
   account-dependent.
2. Confirm tax/consumer policy and that clients are told to agree scheduling
   before payment. Verify manual owner refund and reconciliation procedure.
3. Set **server-side production** variables:
   - `HH_WISE_PAYMENT_OPEN_LINK` = verified reusable open Wise Business URL
   - `HH_WISE_PAYEE_APPROVED` = `true` **only after independent identity verification**
   - `HH_WISE_PAYMENTS_ENABLED` = `true` after readiness checks
4. Deploy current, reviewed `codex/public-book-library` once, preserving Vercel
   cost/deploy constraints. Check READY, production alias, EN/RU/ES page links.
5. Test a link without paying: amount EUR 50 / 100, description public service
   ID, correct Wise merchant name. A real charge/test transfer only with explicit
   owner approval and a compatible Wise provider account.

With absent/invalid URL or either flag not `true`, the Wise CTA is not rendered
and `/api/payments/wise/<productId>` responds 503. Unknown service IDs respond
404 when enabled. This deliberately cannot accidentally direct customers to an
unverified payment destination.

## Important payment/fulfilment limitations
- Wise is hosted off-site. **A redirect, customer screenshot, or browser return
  is not payment confirmation**. Only independently verified Wise receipt can
  establish settlement; match actual EUR amount, currency and merchant.
- The open-link model may allow the payer to change pre-filled details. Manual
  reconciliation is required. There is **no automatic status, webhook, entitlement,
  subscription, 20/80 marketplace split, master payout, service booking or refund**.
- No client data is collected by this route. Ask clients to contact the practitioner
  about scheduling and final terms before using the link.
- Do not use this flow for packages without published fixed prices, free services,
  practitioner marketplace commissions, membership plans or private-client orders.
  Those require durable owner-bound invoices and provider reconciliation first.

## QA
`node --test tests/wise-service-payments.test.mjs` plus existing service-choice,
Alchemy, checkout, localization and Next build checks. The new test has no real
Wise credentials or transactions.

**Status at authoring:** code prepared with locked EUR prices and safe rollout
flags; exact Wise recipient link was not found in repo, prior retrievable context
or Vercel production environment. Therefore Wise collection is **not live**
until the actual recipient link is verified, configured, deployed and tested.
