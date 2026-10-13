# One-time service cart and checkout

Implementation prepared against `andylitvinov-design/books` canonical head `47acae6efc5c243abbe3c22463c4eb36a4b47c20` (13 October 2026). No database, credentials, merchant settings or live charges were changed. This work is separate from the monthly Plus subscription.

## Verified catalog and boundaries

- `express-consultation-30`: EUR 50 for 30 minutes.
- `personal-session-60`: EUR 100 for 60 minutes.
- Existing evidence: `components/consultation-choice-capture.tsx` and `data/personal-service-pages.ts`, in English, Russian and Spanish. No price/currency was borrowed from EzoHata.
- EzoHata was inspected as a public UX reference: service cards have an add-to-cart action and a separate cart route (`https://ezohata.com/checkout/cart/`). No purchase or customer data access occurred there.
- Free drawing reviews and the existing free Wu Xing paths remain free. Contact/from-price marketplace offers, individually quoted courses, and recurring products cannot enter this one-time cart.
- Selecting a paid service does not book a time. Paid orders become `awaiting_schedule`; no automatic appointment, clinical service delivery or subscription is created.

## Security and payment flow

1. A page binds to the authenticated account returned by the narrow commerce status endpoint, without reading a health/account bootstrap. Checkout and private order requests include `X-HH-Account-ID`; the server compares it to the cookie-verified actor and rejects stale account context with 409. The client invalidates payment/order state on logout/account mismatch and does not silently rebind to another account. A mounted-generation guard plus a fresh expected-account identity read suppresses delayed redirects and stale order displays after an account switch or unmount.
2. The browser submits only an operation UUID, locale, and known service IDs with quantity 1. The server calculates immutable currency and minor-unit amounts. Duplicate products, unknown fields, client amounts, coupons and recurring IDs are rejected.
3. The shared billing repository verifies the authenticated session and active account, scopes the dedicated billing role, and locks the owner/provider/environment. A customer mapping and pending order commit before the payment session is created.
4. The order freezes origin, locale, provider price IDs, cart, amount and expiry. Concurrent/repeated clicks reuse the open order. Provider retries use an opaque order-derived idempotency key. Before a new provider mutation, the adapter searches the verified merchant/customer’s sessions since the frozen creation time for the opaque order ID. A matching session is independently verified and recovered, including after the original creation retry window. Complete provider-confirmed absence expires an uncreated order only after its entire frozen lifetime plus five minutes; this releases the open-order guard for a new operation. Truncated/multiple/unavailable provider results remain blocked for reconciliation rather than generating another charge.
5. The Stripe adapter verifies the actual merchant account owning the key before any customer/payment call. It retrieves server-mapped prices and rejects incorrect amount/currency, recurring, inactive, transformed, tiered or custom-amount prices.
6. Checkout uses `mode=payment`. Neither automatic tax nor promotions, subscriptions, saving cards, invoices, or clinical metadata are silently added. Only the opaque order ID is provider metadata. Fixed listed prices and tax treatment require explicit launch review.
7. The shared endpoint verifies the raw webhook signature/account/environment before calling `handleServiceStripeEvent`. Service events have an independent dedup namespace. An unowned event rolls back instead of consuming the subscription consumer's event.
8. Payment confirmation uses retrieved session/line items, the matching customer, exact amount/currency, succeeded PaymentIntent, captured charge and current refund/dispute state. It does not trust the webhook's historical state or a browser return URL. Checkout retries may also perform trusted provider reconciliation. Owner-only GET reads never mutate payment/fulfilment state.
9. Refunds and disputes put scheduling/fulfilment on hold. Full refunds, partial refunds and disputes remain distinct. A later paid snapshot cannot silently release a refund/dispute hold. Invoice IDs, when present, are checked against the same owner customer and amount; no invoice is created by this feature.
10. Account deletion is blocked while an order/payment or paid service remains unresolved. The minimal financial ledger has no cascade to health records. It stores no names, emails, intake answers, reports, card data or raw webhook payloads.

## Recovery workflow

- A crash before session creation leaves a durable pending order. Retrying the cart first performs a complete merchant/customer/order-ID lookup. If a session exists, its actual state is recovered without creating a replacement.
- An expired, unpaid provider session is marked expired only after authoritative readback. A paid/processing session remains attached to its original order; no duplicate charge is created.
- If no session exists, expiry is allowed only after the original one-hour lifetime plus five minutes and a complete successful lookup. The database update independently enforces pending state, null checkout/PaymentIntent IDs and elapsed grace. A new operation can then create a new order; retrying the original operation returns its expired state.
- Before that grace, or when the provider listing is truncated, unavailable, or has multiple candidates, keep the order pending and return `SERVICE_RECONCILIATION_REQUIRED`/`SERVICE_MULTIPLE_CHECKOUTS`. Do not rotate the idempotency key, delete the order, or assume a timeout means no charge.
- Support should retry the same authenticated cart after the grace or provider recovery, confirm the account/merchant/customer/opaque order reference, and inspect any ambiguous candidates in the correct Stripe environment. Any exceptional manual ledger repair requires a separately approved, scoped operator action and provider evidence. Browser query parameters are never evidence.
- Synthetic tests cover crash-before-create, response loss after acceptance, late paid/open/expired recovery, no-object expiry and a fresh operation, incomplete/multiple lookup refusal, and duplicate webhooks. Actual PostgreSQL/RLS and hosted sandbox acceptance remain separate gates.

## Required approval before activation

`proposed-service-commerce-schema.sql` is an intentionally guarded, unapplied proposal, outside the migration directory. It depends on the separate subscription schema proposal's billing-only role, session guard, customer mapping and transaction scoping. It needs review and isolated PostgreSQL/RLS testing before anyone approves a real migration.

The owner-authorized sandbox setup created and read back these service prices on 13 October 2026 under merchant `acct_1TL7DzIrCtuk8CIX`:

- EUR 50 / 30 minutes: `price_1UQ5O1IrCtuk8CIXD11XIGm9`.
- EUR 100 / 60 minutes: `price_1UQ5O4IrCtuk8CIXCCTwwWIG`.

Both were verified as `one_time`, `livemode=false`, with tax behaviour unspecified. These are sandbox IDs, not live payment authorization. They were not written to application environment settings. Verify the merchant/key and price fields again during approved activation. Existing sandbox Plus price IDs are not valid service prices.

Configuration gates:

- Shared restricted Stripe key, account ID, webhook secret and sandbox/live environment.
- `HH_STRIPE_SERVICE_30_PRICE_ID`, `HH_STRIPE_SERVICE_60_PRICE_ID`.
- Both approved schema flags: `HH_BILLING_SCHEMA_APPROVED`, `HH_COMMERCE_SCHEMA_APPROVED`.
- `HH_COMMERCE_ENABLED`, `HH_COMMERCE_FULFILLMENT_APPROVED`, `HH_COMMERCE_TAX_REVIEW_APPROVED`.
- Production additionally requires live environment and `HH_COMMERCE_PRODUCTION_APPROVED`.

The restricted key needs merchant-account read, customer/session creation, price/session/line-item/PaymentIntent/charge/invoice read, with the narrowest account-specific permissions available. New credentials/grants/configuration are separate approvals. Do not put a key in a public/browser environment variable.

Before approving live activation, the owner must decide service scheduling/fulfilment, cancellation/refund terms, tax treatment, customer-support handling of ambiguous/refunded/disputed orders, and financial-record retention/account deletion. This code does not initiate refunds or mark appointments fulfilled. Those are explicit operator decisions.

## Verification

- `node --test tests/service-cart.test.mjs tests/service-commerce-flow.test.mjs tests/service-commerce-stripe.test.mjs tests/service-commerce-repository.test.mjs tests/service-commerce-account-binding.test.mjs`: pure catalog/flow plus isolated Stripe mock adapter suite.
- `node --conditions=react-server --test tests/service-commerce-stripe.test.mjs`: detailed adapter security tests, including wrong merchant, wrong owner/currency/amount, payment mode, refund holds, and redirect restrictions.
- Repository guard tests use a mock SQL transport; they do not replace an actual PostgreSQL/RLS integration run.
- Targeted ESLint and a minimal-fixture TypeScript check passed.
- `scripts/verify-service-cart-browser.mjs` is a loopback-only RU/EN/ES test at 360px and 1024px. It covers selection/removal/session persistence, failed checkout recovery, payload keys, touch targets, overflow, and server-confirmed clearing. All payment/order responses are synthetic; it cannot contact a real checkout.
- Chromium visual/interaction execution is blocked in this cloud executor: Chromium aborts at startup because the OS denies `socket()` (`Operation not permitted`). No screenshots or browser pass are claimed. Run the script in an approved browser-capable CI environment.
- A real PostgreSQL/RLS integration run and a sandbox hosted-checkout/webhook round-trip remain launch gates. No live purchase has been tested.

References: [Stripe Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment), [Checkout creation](https://docs.stripe.com/api/checkout/sessions/create), [session retrieval](https://docs.stripe.com/api/checkout/sessions/retrieve), [charge refund state](https://docs.stripe.com/api/charges/object), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Repeated reloads, lost checkout/recovery responses and early webhooks are protected by a durable server-side matching-cart barrier: the latest paid or held order is looked up under the owner lock regardless of the browser operation ID. A paid cart requires an explicit “buy again” action bound to that exact owned cart/order ID; a new order records repeat_of_order_id. Stale acknowledgments cannot authorize a third purchase after the next order settles. Refunded/disputed/review-held carts remain blocked pending support resolution even if an acknowledgment is submitted. No browser boolean or unscoped order ID bypasses this check. Regression covers three fresh IDs, discarded responses, a webhook before reload, deliberate repeat purchase, stale acknowledgment and held-order denial.
