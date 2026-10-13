# Holistic House subscriptions: implementation and release gates

## Delivered code, not a live billing activation

The reviewed recurring catalogue is now EUR only:
- Free: one concurrently active course.
- Start: EUR 10/month, one concurrently active course, no first-party advertising.
- Advanced: EUR 20/month, five concurrently active courses, no first-party advertising.
- Premium: EUR 100/month, five concurrently active courses, no first-party advertising,
  available tests included, and one personal 60-minute session per verified paid month.

No-ad inheritance for Advanced/Premium is an implementation assumption to confirm at activation; the user explicitly specified no ads for Start.

Counts mean concurrent active courses, not lifetime purchases. Saved course/result history
is preserved on cancellation, downgrade and expiry; no course is silently deleted or ended.
Existing free account/guest testing is preserved; this change introduces no new test paywall.
All retest guidance and educational/non-diagnostic limitations continue to apply.
Premium session requests require a separate scheduling confirmation and never book a time.
The old USD Plus price is not an approved fallback and grants no new EUR entitlement.

Dismissible, nonblocking EN/RU offers can appear after successfully saved lessons/tests.
They use static first-party content without health targeting. Paid access hides these promos.

All new features default off or unavailable until their separately approved
persistence, credentials and provider configuration exist. An unavailable checkout
never fabricates a payment, subscription or entitlement. Sandbox access cannot grant
production benefits. This code does not activate subscriptions, charge a person,
configure secrets, apply SQL, send messages, merge or deploy.

## Security and lifecycle

- Existing Supabase getUser verification and active-session/account checks protect
  owner endpoints. Cross-origin mutations are denied. Client requests cannot choose
  customer IDs, provider prices, subscription IDs, paid-through dates or redirects.
- A dedicated restricted `hh_billing_backend` role accesses only the minimal
  billing ledger. Six tables store opaque IDs, state and operation/event receipts.
  No names, email addresses, test names, responses, scores, concerns or health
  profiles are sent to Stripe. Customer creation uses an empty payload.
- Customer ownership is committed before creating any chargeable Checkout Session.
  Durable checkout preparation freezes locale/origin/price and the idempotency key.
  Cross-tab/server requests serialize in the database. An uncertain operation past
  the provider's idempotency retention window fails closed for reconciliation.
- Webhooks verify the exact raw bytes, timestamp-tolerant signature, environment
  and account. Events resolve through the local customer mapping, never metadata.
  A receipt is committed atomically with successful authoritative reconciliation;
  failures roll back and return a retryable response. Duplicate events do not grant
  twice. Reconciliation fetches current provider state under the same owner lock.
- Access comes from an exact approved-price invoice line backed by a successful
  invoice payment and charge. ACTIVE status, client redirects, manual/out-of-band
  invoice marks and unsupported payment records are not payment proof. Paid access
  expires at its verified paid-through timestamp, even if a webhook is delayed.
- Cancel renewal schedules Stripe cancellation at period end without prorations,
  verifies the requested owned contract and preserves already-paid access.
  Cancellation and account deletion are separate actions. A proposed database
  trigger prevents account deletion while renewable or unresolved billing exists.
- A complete checkout is not cleared until its exact subscription is persisted.
  Unlinked sessions are recoverable by an opaque operation reference. Full refunds
  or disputed charges remove only their affected current coverage; partial refunds
  do not automatically remove the paid month. This policy needs owner/legal review
  before live launch.
- Stored provider/environment keys and cross-provider uniqueness keep the ledger
  portable. Stripe is the only adapter currently implemented. Do not toggle the
  provider or rotate the fixed price against active contracts without an explicit
  migration. PayPal is a researched future candidate, not an implemented provider.

## Historical sandbox identifiers; EUR prices still require approval

- Account: `acct_1TL7DzIrCtuk8CIX` (sandbox)
- Product: `prod_VQwqC9Dx3v4EtB`
- Superseded USD price: `price_1UQ4x8IrCtuk8CIX5gGkNftR` (not used by the EUR code)
- Lookup key: `holistic_house_plus_monthly_usd_v1`
- Portal configuration: `bpc_1UQ4yhIrCtuk8CIXYQ7ZOH3X`
- Historical price is 1000 USD cents/month; it must not be relabelled or reused as EUR.
- Three new recurring EUR price IDs (1000/2000/10000 cents) must be verified and configured. No Stripe price was created or changed by this implementation.
- Portal: cancellation at period end, no prorations, invoice history and payment
  method changes, no subscription tier changes or public portal login page.

These are identifiers, not credentials. No customer, card or live charge was used.
Stripe SDK 23.0.0 and API 2026-09-30.endive were checked against the installed SDK.

## Explicit approval and verification needed before enabling

1. Review `proposed-subscription-schema.sql` outside the migration runner. It has an
   intentional execution guard. Approve the six tables, fixed-search-path helpers,
   RLS policies, role membership grant to the verified existing runtime login,
   cross-provider locks/indexes and account-deletion trigger. Do not guess login
   names or use service-role/superuser runtime credentials.
2. Run isolated PostgreSQL integration tests for actual grants/RLS, cross-owner and
   cross-environment denial, revocation, concurrent checkout/deletion, event
   rollback/replay, customer mapping durability and historical subscriptions.
   Mocked transaction and source-contract tests do not substitute for this gate.
3. Have the owner securely configure a least-privilege Stripe restricted key and
   webhook signing secret using sensitive deployment variables. This is an
   action-time security approval, not a key pasted into chat or committed source.
4. Configure the webhook endpoint `/api/billing/stripe/webhook` for subscription,
   invoice payment, checkout completion/expiry/async, refund and dispute events.
   Observe provider delivery/retries and replay/order recovery in the approved
   sandbox. No scheduled job or webhook endpoint was created by this code change.
5. Verify signed-in desktop/mobile EN/RU checkout, decline, asynchronous payment,
   duplicate click, session expiry, back/cancel, period-end cancellation, portal,
   renewal failure/recovery and exact paid-through expiry. Verify notifications,
   service fulfillment and CRM separately; they are not subscription side effects.
6. Resolve business tax registrations, final price/tax presentation, renewal terms,
   cancellation/refund policy, privacy and retention. Stripe Tax requires actual
   registrations; do not simply enable automatic_tax. Native App Store/Play digital
   purchase distribution also needs its own store-policy/payment review. PWA web
   payments do not establish native-store compliance.
7. Review CI on the exact feature commit and the production alias before describing
   anything as live. Keep schema, keys, live configuration and deployment approvals
   separate from the code PR.

### Server-only environment names

`HH_BILLING_PROVIDER=stripe`, `HH_BILLING_ENVIRONMENT=sandbox`,
`HH_BILLING_SCHEMA_APPROVED`, `HH_BILLING_ENABLED`,
`HH_STRIPE_RESTRICTED_KEY`, `HH_STRIPE_WEBHOOK_SECRET`,
`HH_STRIPE_ACCOUNT_ID`, `HH_STRIPE_START_PRICE_ID`, `HH_STRIPE_ADVANCED_PRICE_ID`,
`HH_STRIPE_PREMIUM_PRICE_ID`,
`HH_STRIPE_PORTAL_CONFIGURATION_ID`.

Production additionally requires `HH_BILLING_PRODUCTION_APPROVED`,
`HH_BILLING_TAX_REVIEW_APPROVED` and `HH_BILLING_TERMS_APPROVED`.
No NEXT_PUBLIC key/secret or entitlement override is supported.

## Source references

- https://docs.stripe.com/billing/subscriptions/webhooks
- https://docs.stripe.com/api/invoice-payment/list
- https://docs.stripe.com/api/customer_portal/sessions/create
- https://docs.stripe.com/events/manage-webhook-endpoints
- https://docs.stripe.com/billing/taxes/collect-taxes


## Separate entitlement infrastructure

`HH_MULTICOURSE_SCHEMA_APPROVED` gates Advanced checkout; Premium additionally requires
`HH_PREMIUM_SESSION_SCHEMA_APPROVED` and `HH_PREMIUM_SESSION_FULFILLMENT_APPROVED`.
Flags are evidence of neither SQL approval nor a functioning operational workflow.
`proposed-premium-session-schema.sql` remains outside the migration runner with a hard guard.
The ledger keys credits by owner/provider/environment/subscription/paid-period-end. Replays
cannot mint a second credit or consume a second one. Requests contain no address or health
information, never send messages and never create appointments. A separate reviewed manual
fulfillment workflow is required before enabling Premium sales.

Payment confirmation uses exact server-held EUR prices and paid invoice lines backed by
captured charges. A browser choice/return, ACTIVE status, metadata or unpaid price change
cannot grant a tier. If a newer selected price is unpaid, still-paid earlier-tier coverage
remains authoritative. Existing subscribers use the cancellation/payment-method portal;
immediate tier-change/proration sales are not implemented or approved.
