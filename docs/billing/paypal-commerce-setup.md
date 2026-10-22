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

## Public website activation behavior — exact EUR checkout (2026-10-20)

The existing public /en|ru|es/payments and /en|ru|es/cart keep their working personal PayPal.Me/manual verification, Interac, and independently approved Square/Zen until getCommerceConfig().enabled is true. This requires an approved PayPal Business merchant (which may be an unincorporated individual).

After merchant/schema/tax approval, pages switch to the EXISTING account-bound ServiceCart instead of creating a duplicate checkout state machine:
- Visitor selects catalog-fixed EUR 50/30m, EUR 100/60m, or both EUR 150. Client cannot supply the amount.
- Visitor signs into Holistic House and opens a PayPal-hosted secure one-time checkout. Guest card availability depends on PayPal and buyer eligibility, not on the website. The site never handles card credentials.
- On PayPal return, POST /api/app/commerce/orders/{orderId}/capture requires valid cookie, same-origin and account binding and independently reads approved provider order, merchant ID, EUR amount and exact items; a return URL is not proof.
- Account-scoped ledger records paid only after PayPal verified capture; refunds and disputes hold fulfillment. Appointment scheduling remains personal.
- POST /api/billing/paypal/webhook verifies the exact PayPal webhook signature and provider readback before reconciling; events are idempotent.

### Owner actions for genuine EUR card/PayPal checkout
1. PayPal Business signup for a truthful unincorporated seller: https://www.paypal.com/ca/business/open-business-account . Complete PayPal identity, lawful activity, EUR Goods & Services and bank checks. PayPal Business account does not require incorporating a company as such, but PayPal may require trade-name / eligibility checks.
2. PayPal Developer sandbox then live: https://developer.paypal.com/dashboard/applications/sandbox and https://developer.paypal.com/dashboard/applications/live . Create Checkout app owned by the exact seller, and webhook https://holistichouse.vercel.app/api/billing/paypal/webhook. Enter client ID/secret, merchant ID and webhook ID only as protected env variables at https://vercel.com/super10/codex-public-book-library/settings/environment-variables . Never paste these credentials in chat/Git or NEXT_PUBLIC vars.
3. Approve the protected billing ledger schema (docs/billing/proposed-subscription-schema.sql and docs/billing/proposed-service-commerce-schema.sql) after RLS, financial retention, refunds, scheduling and tax review. Test a PayPal sandbox EUR 50 and EUR 100 round-trip plus cancel/failed/refund, signed webhook, different users, duplicate redirects. Only after verified merchant/bank settlement and permitted real small transaction/refund enable flags HH_COMMERCE_PROVIDER=paypal; HH_PAYPAL_ENVIRONMENT=live; HH_BILLING_SCHEMA_APPROVED=true; HH_COMMERCE_SCHEMA_APPROVED=true; HH_COMMERCE_ENABLED=true; HH_COMMERCE_FULFILLMENT_APPROVED=true; HH_COMMERCE_TAX_REVIEW_APPROVED=true; HH_COMMERCE_PRODUCTION_APPROVED=true; HH_PAYPAL_PRODUCTION_APPROVED=true; HH_PAYPAL_TAX_REVIEW_APPROVED=true.

Do not enable approval flags merely to display a button. Until the merchant and live E2E are verified, personal PayPal.Me/manual confirmation remains the honest production fallback.

## Automatic EUR checkout handoff — 20 October 2026

PayPal Canada's agreement permits a Business merchant account even when the seller is unincorporated. KYC, accurate business-activity description, tax and bank details and provider approval are required; a registered corporation is not inherently a prerequisite.
Canadian account terms: https://www.paypal.com/ca/legalhub/paypal/useragreement-full
Create merchant account: https://www.paypal.com/ca/business/open-business-account
PayPal developer REST dashboard: https://developer.paypal.com/dashboard/applications

The public EN/RU/ES payments page and personal cart offer secure automatic checkout only after verified merchant, private financial-ledger RLS and tax/fulfillment gates are active. The amounts EUR 50 / EUR 100 / EUR 150 derive solely from the existing catalog, not query strings. The approved payer returns to the authenticated /{locale}/services/checkout page; only server-side Orders v2 capture with merchant/amount readback can commit paid. PayPal.Me personal and Interac remain manual alternatives.

**Owner setup:** Approve the PayPal unincorporated sole-proprietor merchant identity and EUR payment/settlement, then create separate sandbox and live REST applications. Put HH_PAYPAL_CLIENT_ID, HH_PAYPAL_CLIENT_SECRET, HH_PAYPAL_MERCHANT_ID, HH_PAYPAL_WEBHOOK_ID in the protected production Vercel environment, never in chat/source: https://vercel.com/super10/codex-public-book-library/settings/environment-variables .
First independently review/install the existing guarded subscription/customer and service-order financial schemas and verify RLS, role isolation, refund/tax/cancellation/retention policy. Then run an actual PayPal sandbox approval/capture, cancellation, duplicate click, different owner, retry, dispute/refund, provider-webhook signature and account balance readback.
Only after genuine approval: HH_COMMERCE_PROVIDER=paypal, HH_PAYPAL_ENVIRONMENT=live, HH_COMMERCE_PRODUCTION_APPROVED=true, HH_PAYPAL_PRODUCTION_APPROVED=true, HH_COMMERCE_SCHEMA_APPROVED=true, HH_BILLING_SCHEMA_APPROVED=true, HH_COMMERCE_FULFILLMENT_APPROVED=true, HH_COMMERCE_TAX_REVIEW_APPROVED=true, HH_PAYPAL_TAX_REVIEW_APPROVED=true. Set HH_COMMERCE_ENABLED=true **last** and perform a small user-authorized real charge/refund verification.
Missing credentials or schema means no authorized auto-confirmed transaction; do not enable by URL redirect alone.
