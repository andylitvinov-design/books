# Holistic House · ZEN.COM service checkout (staged)

Prepared 18 October 2026. **No merchant charge, credential write, schema
migration or live activation is performed by this change.**

## What is implemented

- ZEN Checkout adapter for the existing EN/RU/ES Services cart only: one-time
  `express-consultation-30` (€50) and `personal-session-60` (€100).
- The server, not the browser, freezes the cart, merchant transaction UUID,
  **EUR** total, product names and quantity. ZEN receives only an opaque
  pseudonymous customer ID; no health data, user email or clinical details.
- Initiation: `POST https://secure.zen-test.com/api/checkouts` in sandbox,
  `POST https://secure.zen.com/api/checkouts` in live. The request has the
  checkout SHA-256 paywall signature. The redirect hostname is allowlisted.
- Durable `processing` payment-attempt marker is **committed before** the ZEN
  checkout POST. This prevents a lost response, multiple tabs or webhook race
  from issuing a second charge. An ambiguous 404 after initiation blocks
  automatic retry and requires manual reconciliation; never silently rotate
  `merchantTransactionId`.
- Signed IPNs: `POST /api/billing/zen/ipn`; validate IPN hash with the IPN API
  secret. The IPN can only trigger a terminal-authenticated readback from
  `GET https://api.zen[-test].com/v1/transactions/merchant/{merchantTransactionId}`.
  The authoritative read must match order ID, type `TRT_PURCHASE`, customer
  mapping, exact currency/amount and available line items. Only `ACCEPTED`
  without refunds can mark a service paid; `AUTHORIZED` is not paid.
- Refunds are held for operator review; unknown/refund-in-progress states
  never result in automated fulfilment. No subscription, time booking, or
  automatic practitioners' payouts are added.
- Authenticated return/recovery: `POST /api/app/commerce/orders/{orderId}/refresh`,
  same-origin, account-bound and rate-limited, rechecks ZEN rather than trusting
  a return URL or browser status. The existing GET remains read-only.
- Stripe subscription and Stripe service integrations remain unchanged unless
  the independent `HH_COMMERCE_PROVIDER` switch is explicitly configured.

## Required merchant and deployment configuration

ZEN must approve the business/site and enable a merchant payment gateway.
From the matching ZEN terminal (sandbox first), obtain **Terminal UUID,
Paywall Secret, Terminal API Key and IPN API Secret**. Configure in Vercel's
protected environment settings, **never** in GitHub, a chat message, public
`NEXT_PUBLIC_` variables or website HTML:

| Name | Sandbox (first) | Live (only after QA) |
| --- | --- | --- |
| `HH_COMMERCE_PROVIDER` | `zen` | `zen` |
| `HH_COMMERCE_ENVIRONMENT` | `sandbox` | `live` |
| `HH_ZEN_TERMINAL_UUID` | sandbox terminal UUID | approved live terminal UUID |
| `HH_ZEN_PAYWALL_SECRET` | sandbox secret | live secret |
| `HH_ZEN_TERMINAL_API_KEY` | sandbox terminal API key | live terminal API key |
| `HH_ZEN_IPN_SECRET` | sandbox IPN API secret | live IPN API secret |

The entire feature remains **off** until explicit security/launch approvals:
`HH_BILLING_SCHEMA_APPROVED=true`, `HH_COMMERCE_SCHEMA_APPROVED=true`,
`HH_ZEN_SCHEMA_APPROVED=true`, `HH_COMMERCE_ENABLED=true`,
`HH_COMMERCE_FULFILLMENT_APPROVED=true`,
`HH_COMMERCE_TAX_REVIEW_APPROVED=true`. Production additionally requires
`HH_COMMERCE_PRODUCTION_APPROVED=true` and environment `live`.
`HH_ZEN_SCHEMA_APPROVED` may be true **only after** a real provider-aware
PostgreSQL/RLS migration and integration tests are reviewed and completed.

**Database blocker:** `docs/billing/proposed-subscription-schema.sql` and
`docs/billing/proposed-service-commerce-schema.sql` are explicitly UNAPPLIED.
The original service schema permits only Stripe checkout IDs and
`checkout.stripe.com` URLs. The updated service SQL file is still a
**proposal**, with its fail-closed `RAISE EXCEPTION` guard intentionally
intact. A reviewed migration (including provider-aware IDs and ZEN URLs),
restricted role/GRANT/FORCE RLS, and a fresh isolated PostgreSQL test must be
approved before enabling. Never apply the proposal unedited.

## End-to-end acceptance checklist

1. Confirm ZEN.COM merchant account / terminal supports **EUR**, remote
   consultations and checkout with a pseudonymous customer ID (some methods
   may require additional payer information). Confirm terms, refund policy,
   location, settlement account, taxes and receipt workflow.
2. Apply the separately approved DB migrations to the correct isolated
   environment. Verify account/session scoping and webhook ownership with
   an actual PostgreSQL 17 / FORCE RLS integration run. Do not use Supabase
   elevated service-role bypass in the app.
3. Set sandbox-only env. Confirm `/api/app/commerce/status` exposes
   `{available:true,provider:"zen"}` only in a configured test environment.
4. Run `node --test tests/service-commerce-zen.test.mjs` and existing
   `tests/service-cart.test.mjs`, `tests/service-commerce-flow.test.mjs`,
   `tests/service-commerce-stripe.test.mjs`,
   `tests/service-commerce-repository.test.mjs` and
   `tests/service-commerce-account-binding.test.mjs`. Complete browser
   checks for all three languages and account switches.
5. Run one controlled ZEN **sandbox** purchase and valid signed IPN.
   Check ZEN transaction state/amount/order, `processing → paid`, duplicate
   callback handling, slow IPN, checkout cancellation, accepted refund and
   double-click/lost-network reconciliation. Check that no paid access is
   released by the return URL.
6. Verify merchant redirect and IPN URL
   `https://holistichouse.vercel.app/api/billing/zen/ipn`, HTTPS-only
   checkout hosts and secrets kept server-side. Inspect logs for no secret or
   private data leakage.
7. Obtain separate approval before live production flags/keys. Verify
   `READY`, HTTP 200, and a small authorized live purchase with a receipt
   and refund flow. Monitor initial payments and support inquiries.

If an initiated checkout has no ZEN transaction during recovery, the
`processing` marker deliberately blocks another attempt: reconcile the
**same** `merchantTransactionId` in the ZEN merchant panel and do not
create a replacement until merchant absence has been confirmed and the
existing order explicitly resolved.

### References
- https://docs.zen.com/payments/checkout-integration/purchase
- https://docs.zen.com/payments/checkout-integration/signature
- https://docs.zen.com/payments/api-reference/notifications
- https://docs.zen.com/payments/api-reference/purchase-transaction-details-merchant-id
- https://docs.zen.com/payments/api-reference/transaction-statuses

Note: ZEN's IPN signing layout is confirmed here against the public ZEN PHP
SDK implementation; it still requires verification in the actual merchant's
sandbox with ZEN-generated messages before production.
