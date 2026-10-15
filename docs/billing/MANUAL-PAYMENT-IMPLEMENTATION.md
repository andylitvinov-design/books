# Holistic House — Ezohata-inspired manual payment ledger (2026-10-15)

## Implemented source flow
1. Authenticated Google Cabinet user can request Advanced or Premium using
   PayPal EUR/USD, Interac CAD or bank/PrivatBank UAH. Server chooses plan,
   currency and EUR reference. A candidate first-month 50% discount is not a quote.
2. One open request per account (unique operation UUID and partial DB index),
   returned under the existing owner session. No private test answers, health
   data, bank details, customer email or raw financial reference is exported.
3. Dual-authorized practitioner review is at /admin/manual-billing. Both
   /admin secret session and verified, allowlisted Google owner are required.
   Currency quotation, exchange-rate review, merchant confirmation and paid
   receipts are separate actions. No guessed FX, payee or payment URL.
4. A reviewer must attest an independently confirmed merchant-bank/PayPal
   payment reference and exact amount. The backend HMACs the reference with
   a server-side secret and has a global unique receipt digest. It grants exactly
   one additional monthly term from the last unexpired paid date; double clicks,
   duplicate transfer references and stale revisions fail.
5. A separately confirmed refund reverses effective paid coverage without
   deleting course/test history. Client sees private order state and paid-through.
6. A fully approved manual paid period enters the same *server-authoritative*
   billing status and quota projection. Stripe billing access takes precedence
   over manual coverage when a valid existing Stripe paid term exists.
   Manual subscriptions NEVER automatically renew; the client must pay again.

## Release safety and unresolved dependencies
- All flags default OFF. This PR does not create a PSP account, collect a
  transaction, publish a bank account, activate payment auto-renewal, apply
  production SQL or assert bank-statement matches.
- MANUAL REQUESTS: apply and verify only the bounded private SQL proposal
  'proposed-manual-order-schema.sql' after isolated DB tests, reviewed
  migration, backup and security approval. Then enable
  HH_MANUAL_BILLING_REQUESTS_ENABLED in production only if secure requests
  can be accepted. If not, the pre-existing Telegram enquiry still works.
- OWNER QUOTE/RECEIPTS: verify the correct Holistic House recipient, legal
  availability and currencies, tax, refund and consumer disclosures. Then
  configure HH_MANUAL_BILLING_PAYEE_APPROVED and
  HH_MANUAL_BILLING_REVIEW_ENABLED in server-only production environment.
  Both are off until independent external verification. Owner manually attests
  received funds; no connected bank API exists yet. A customer-uploaded
  screenshot is NOT authoritative.
- ACCESS: first reconcile and approve the existing, unapplied bounded
  billing_private subscription, multi-course and session-credit SQL, native
  quota/RLS tests, existing historic courses, and coordinated deployment.
  Only then turn on HH_MANUAL_BILLING_ACCESS_APPROVED. The dedicated
  app_private.course_access() proposal includes manual coverage only when
  hh.manual_billing_access is explicitly set by the trusted backend.
- PREMIUM: a manually paid personal-session credit/delivery workflow is not
  provisioned by the Stripe-only premium credit table. Consequently Premium
  quotation/activation stays blocked even after basic Advanced approvals
  until a separate manual credit ledger and schedule/fulfilment procedures
  are independently reviewed and the explicit
  HH_MANUAL_PREMIUM_CREDIT_SCHEMA_APPROVED /
  HH_MANUAL_PREMIUM_FULFILLMENT_APPROVED gates are authorized **and the
  separate manual credit workflow is genuinely implemented and tested**.
  Flags alone cannot activate manual Premium in this release. **Never
  collect €100 if the promised service cannot be provided.**
- PRICE: Advanced €20 per one month (candidate first month €10 only if
  eligibility confirmed); Premium €100 per month. Cross-currency invoice
  amount requires independent FX and recipient verification. Do not reuse
  EzoHata's legacy payee, bank details, region-specific processors or fees.
- REFUNDS/DISPUTES: only a refund already completed and independently confirmed
  on the bank/PayPal statement can be recorded. The reviewer must supply its
  separate unique reference and exact full amount. This admin UI never sends
  or executes a refund. Revocation is backed by the verified refund evidence.
  An append-only status transition table (owner-scoped read, no direct INSERT,
  UPDATE or DELETE privileges) stores opaque action/reviewer references.
  Owner self-service expiry of stale unpaid requests is performed by a narrow
  verified-session SECURITY DEFINER function, not a broad owner UPDATE.
  Provider-verified automated matching, chargebacks,
  refunds, notifications and entitlement reconciliation after external
  account approval remain later work. Bank transfer does not authorize a
  future recurring debit.

The isolated PostgreSQL 17 tests apply the guarded proposal only in
disposable CI and check select/insert/update RLS ownership, reviewer scope
and contract compatibility. Existing tests and paid Stripe webhooks remain
unchanged.
