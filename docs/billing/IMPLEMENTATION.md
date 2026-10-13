# Holistic House Plus: implementation and release gates

## Delivered code, not a live billing activation

The fixed Plus offer is **10 USD per month**. It appears after each successfully
saved course lesson and after a successfully submitted test. It is dismissible,
nonblocking, EN/RU, and does not change the ordered My Course test flow from PR421.
The existing free account and guest behavior, saved reports and plan capacities
are preserved. No new free monthly test quota has been introduced.

Paid benefits are unlimited access to available self-report tests, self-reported
wellbeing tracking, existing self-guided support courses and removal of first-party
promotional blocks. Retest guidance continues to apply. There are no diagnostic,
treatment, guaranteed-outcome or real-time clinician-monitoring promises. Promotions
are static Holistic House content, never third-party health targeting or tracking.

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

## Verified sandbox configuration supplied by the owner workflow

- Account: `acct_1TL7DzIrCtuk8CIX` (sandbox)
- Product: `prod_VQwqC9Dx3v4EtB`
- Price: `price_1UQ4x8IrCtuk8CIX5gGkNftR`
- Lookup key: `holistic_house_plus_monthly_usd_v1`
- Portal configuration: `bpc_1UQ4yhIrCtuk8CIXYQ7ZOH3X`
- Price is 1000 USD cents/month, no trial, tax unspecified.
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
`HH_STRIPE_ACCOUNT_ID`, `HH_STRIPE_PLUS_PRICE_ID`,
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
