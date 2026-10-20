# Holistic House — PayPal Orders v2 rollout

Status: **code prepared, payment acceptance DISABLED**. No PayPal secret or merchant
ID is committed to Git, no SQL proposal is applied, and no live charges should be
attempted until all gates below are verified.

## Scope

- Public paths: `/en/payments`, `/ru/payments`, `/es/payments`.
- One-time, per-account consultation orders, currently **EUR 50 / 30 minutes**
  and **EUR 100 / 60 minutes** (same canonical product IDs/amounts as the
  current service catalog). No subscription, automatic recurring renewal,
  arbitrary service price, discount or extra PayPal fee is introduced.
- An external PayPal checkout is used; the site does not receive card details.
  Selecting a consultation never reserves an appointment time.
- Existing manual payment requests and Stripe subscriptions remain isolated.
- **Do not reuse an EzoHata merchant blindly.** The legal PayPal Business payee,
  EUR acceptance, refund policy and tax treatment must be approved for
  Holistic House specifically. USD invoices require a separately approved
  exchange quote; this automated cart is EUR only.

## Secrets and flags (Vercel protected project environment)

The production site is `codex-public-book-library`, connected to
`andylitvinov-design/books` branch `codex/public-book-library`.

Set secrets in Vercel's encrypted environment UI, never in chat/Git:
- `HH_COMMERCE_PROVIDER=paypal` (one-time service orders only)
- `HH_PAYPAL_ENVIRONMENT=sandbox` for initial end-to-end testing,
  switch to `live` only after merchant approval
- `HH_PAYPAL_CLIENT_ID` and `HH_PAYPAL_CLIENT_SECRET`
  for the chosen environment
- `HH_PAYPAL_MERCHANT_ID` — PayPal Business merchant account ID that
  must equal the actual payee in order detail
- `HH_PAYPAL_WEBHOOK_ID` — for that exact environment/URL:
  `https://holistichouse.vercel.app/api/billing/paypal/webhook`.

Do NOT provide `HH_PAYPAL_CLIENT_SECRET` to browsers, use a public NEXT_PUBLIC
variable, or reveal it in logs.

Gate variables (after independent DB approval, tax/terms/refund review, sandbox
tests and fulfillment support):
- `HH_BILLING_SCHEMA_APPROVED=true`
- `HH_COMMERCE_SCHEMA_APPROVED=true`
- `HH_COMMERCE_ENABLED=true`
- `HH_COMMERCE_FULFILLMENT_APPROVED=true`
- `HH_COMMERCE_TAX_REVIEW_APPROVED=true`
- In Vercel production only, also:
  `HH_COMMERCE_PRODUCTION_APPROVED=true`,
  `HH_PAYPAL_PRODUCTION_APPROVED=true`,
  `HH_PAYPAL_TAX_REVIEW_APPROVED=true`,
  and `HH_PAYPAL_ENVIRONMENT=live`.

Unset/false is the safe default. The production config refuses sandbox.

## Database — not installed

Before enabling checkout, separately review, approve, test and migrate:
1. `docs/billing/proposed-subscription-schema.sql` (billing roles/account/
   customer/event infrastructure); it is intentionally execution-guarded.
2. `docs/billing/proposed-service-commerce-schema.sql` (owner-scoped one-time
   order ledger, PayPal/Stripe-specific ID and URL constraints, RLS, refunds,
   scheduling and account-deletion guard); also intentionally blocked.

Never remove the guards and run these unreviewed on production. Review payment
retention, owner isolation, role grants, RLS and no client health data leakage.
Never make a checkout active based on UI return URL.

## Server-side payment lifecycle

1. Authenticated customer selects a known service. Server calculates EUR total.
2. The repository commits an order ID and idempotent operation before PayPal
   mutation. PayPal's merchant-payee, line items and amount must match.
3. Customer visits PayPal's allowed HTTPS approval host.
4. Browser's return asks the authenticated, rate-limited server to capture;
   server checks PayPal order status is APPROVED and matching merchant/amount.
5. Status is PAID only after capture completes and PayPal's details are checked
   and committed in the owner-scoped ledger.
6. Signature-verified webhooks reconcile payment/refund/dispute; duplicate event
   IDs are deduplicated. Partial refunds and disputes hold fulfillment.
7. Captured payment moves to **awaiting_schedule**, not automatic booking.
   Support must confirm the timeslot and mark fulfillment appropriately.
8. Ambiguous PayPal create-order timeouts after the short safe retry window
   require operator reconciliation. Never start a second charge blindly.

Register PayPal webhooks for relevant available topics:
`CHECKOUT.ORDER.APPROVED`, `CHECKOUT.ORDER.COMPLETED`,
`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`,
`PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`,
`PAYMENT.CAPTURE.REVERSED`,
`CUSTOMER.DISPUTE.CREATED`, `CUSTOMER.DISPUTE.RESOLVED`.
Confirm exact events supported for your app and sandbox at PayPal Developer.

## Required QA before activation

- Run `node --test tests/service-commerce-paypal.test.mjs` and
  `npm run test:monetization` in the repo with dependencies.
- Sandbox checkout at €50 / €100 for EN, RU, ES; reject forged totals/payees.
- Cancel, payer decline, expiry, refresh, double click, returning without token.
- Logged-out return, wrong account, cross-user order ID, logged-in account switch,
  CSRF, and current session revocation must never capture another owner's order.
- PayPal webhook valid/invalid/repeated/out-of-order; no signature = no update.
- Refund (full/partial), reversal, dispute, failures and support resolution.
- Validate PayPal OAuth key ownership and actual merchant ID.
- Test database schema RLS and role isolation with unrelated authenticated user.
- Run an actual **small live** payment/refund only after approved bank account,
  fees, currency, taxes, terms and refund policy have been checked.
- Verify `holistichouse.vercel.app` remains READY and pages return HTTP 200
  with online checkout still disabled when flags/secrets are absent.

This document does not authorize changing the merchant, charging a card,
activating payment acceptance, applying migrations, or publishing any claims
that real money can already be accepted.

## Unincorporated individual seller policy (20 Oct 2026)

PayPal Canada's user agreement explicitly supports PayPal Business accounts even when the seller is **not incorporated**. Business account does **not** itself require a registered corporation, but the seller must truthfully describe their sole-proprietor activity, complete identity/bank/KYC review and meet legal/tax requirements. PayPal ultimately decides eligibility.

Sources:
- https://www.paypal.com/ca/legalhub/paypal/useragreement-full
- https://www.paypal.com/ca/business/open-business-account
- https://www.paypal.com/ca/business/accept-payments/checkout/integration

This provider is **not enabled** in production until the owner provides credentials through Vercel secrets, verifies the merchant ID, approves the database migrations/terms/refunds/taxes and passes PayPal sandbox + real provider acceptance. The current PayPal.Me / Interac options remain available until then.

API integration reads EUR 50 / EUR 100 from the canonical product catalog, never an amount in the browser. A payer return does not prove capture: only the provider-readback-verified capture + protected billing ledger can mark an order paid. Scheduling is still manual.
