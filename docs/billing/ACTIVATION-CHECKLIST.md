# Activation checklist: approvals are not configuration

Prepared 13 October 2026. The code PR does not apply any item below. All feature
flags default off; proposals are outside `supabase/migrations`. No live account,
customer record, private key, payment or campaign was used for verification.

## 1. Code acceptance

- Review the exact commit, existing app regression checks and production build.
- Run `npm run test:billing:db` only through the dedicated fresh PostgreSQL 17
  CI job in `.github/workflows/hh-billing-isolated.yml`. Its synthetic fixture
  rejects non-loopback, nonempty/shared databases and production environments.
  It tests subscription RLS/grants, races, receipt rollback, CRM contact/consent
  and registry isolation, service-order scope/recovery, and notification role
  isolation, eligibility/expiry, duplicate claims and enrollment/unsubscribe races.
  These prepared cases still require an actual passing CI result. Then complete
  authenticated browser/mobile tests. Local source/unit tests are not proof of physical phone
  delivery or a functioning Stripe checkout.

## 2. Exact database/security approval scope

Approve reviewed SQL by hash and the actual target project/database. Verify the
existing restricted runtime LOGIN name, helper ownership, inherited/public
permissions and the existing encryption configuration before any membership grant.
Do not use a service-role or superuser connection for the application.

1. `proposed-subscription-schema.sql`: new private schema `billing_private`,
   NOLOGIN/NOINHERIT/NOSUPERUSER/NOBYPASSRLS role `hh_billing_backend`; six tables
   `accounts`, `customers`, `subscriptions`, `checkout_operations`,
   `cancellation_operations`, `processed_events`; exact table/column grants,
   FORCE RLS, `owner_ready`/`customer_owner` restricted helpers, unique provider
   operation/event indexes and an account-deletion trigger. The ledger contains
   opaque IDs, paid-through/period-end timestamps, renewal state and receipts.
   It has no clinical-table grants and retains minimal financial mapping after
   account deletion. Approve a bounded financial retention policy separately.
2. `proposed-service-commerce-schema.sql`: `billing_private.service_orders`,
   ownership/environment RLS, existing billing-role access, trusted cart/amount
   snapshots, payment/refund/fulfillment state and a deletion guard for unresolved
   orders. Approve the human scheduling, refunds and support workflow before use.
3. `../crm/proposed-crm-schema.sql`: role `hh_crm_backend`; `app.crm_contacts`,
   `crm_consent_ledger`, `crm_campaign_drafts`, `crm_self_preferences`; exact
   owner/session policies and scoped grants. Contact addresses are encrypted,
   consent records immutable, recorded grants do not verify an address or clear
   suppression. Owner-account deletion cascades these CRM records; approve that
   retention behavior. No contacts are imported as part of activation.
4. `proposed-crm-billing-registry.sql`: default-empty
   `billing_private.crm_reader_owners` allowlist plus fixed, no-argument
   SECURITY DEFINER `crm_subscription_summary()` with empty search path and
   verified active owner/session checks. Execute is granted only to the CRM role;
   no billing table reads are granted. Approve the exact administrator UUID before
   inserting it. Projection is bounded to 100 opaque account IDs and subscription
   provider/environment/status/paid-through/renewal fields, without health joins.
5. `../pwa/course-notifications-schema.proposed.sql`: two private tables
   `course_notification_preferences` and `course_push_devices`; environment,
   timezone/quiet hours, consent and encrypted endpoint material; owner/session
   FORCE RLS and scoped existing `hh_app_backend` grants. Default ends ROLLBACK.
6. `../pwa/course-notification-dispatch.proposed.sql`: restricted
   `hh_course_push_worker` role, private `course_push_deliveries` receipt ledger,
   bounded fixed helpers for candidates/snapshot/claim/finish with no runtime
   table grants. Helpers inspect only active account/course status, current paid
   entitlement and opted-in notification preferences. Approve role membership
   separately; no clinical scores, answers or notes are exposed.

The proposed new memberships are only `hh_billing_backend`, `hh_crm_backend` and
`hh_course_push_worker` to the verified existing restricted runtime LOGIN. Their
names, target and effects require action-time security approval; this document
does not authorize granting them. No reverse grants of privileged application,
billing or service roles to the new roles are permitted.

## 3. Sandbox billing configuration and secure handoff

Server-only names: `HH_BILLING_PROVIDER=stripe`,
`HH_BILLING_ENVIRONMENT=sandbox`, `HH_BILLING_SCHEMA_APPROVED`,
`HH_BILLING_ENABLED`, `HH_STRIPE_RESTRICTED_KEY`, `HH_STRIPE_WEBHOOK_SECRET`,
`HH_STRIPE_ACCOUNT_ID`, `HH_STRIPE_PLUS_PRICE_ID`,
`HH_STRIPE_PORTAL_CONFIGURATION_ID`. Never paste secret values into chat/source.
Use the owner's secure deployment-secret workflow after exact approval.

Restricted key scope needs Account read (merchant binding), Prices read,
Customers read/write, Checkout Sessions read/write, Subscriptions read/write
(cancel renewal), Invoices and Invoice Payments read, PaymentIntents/Charges read,
and Billing Portal Sessions write with Configuration read as needed by Stripe.
No refunds, transfers, payouts, balance changes or price writes are needed by the
application. Verify the actual dashboard resource scopes against the chosen API.

Previously verified sandbox identifiers:
- Account `acct_1TL7DzIrCtuk8CIX`
- Plus monthly USD 1000 cents: `price_1UQ4x8IrCtuk8CIX5gGkNftR`
- Period-end cancellation portal: `bpc_1UQ4yhIrCtuk8CIXYQ7ZOH3X`
- EUR 5000 / 30 minutes: `price_1UQ5O1IrCtuk8CIXD11XIGm9`
- EUR 10000 / 60 minutes: `price_1UQ5O4IrCtuk8CIXCCTwwWIG`

Service-only names: `HH_STRIPE_SERVICE_30_PRICE_ID`,
`HH_STRIPE_SERVICE_60_PRICE_ID`, `HH_COMMERCE_SCHEMA_APPROVED`,
`HH_COMMERCE_ENABLED`, `HH_COMMERCE_FULFILLMENT_APPROVED`,
`HH_COMMERCE_TAX_REVIEW_APPROVED`. Recurring and one-time checkout stay separate.

Create the reviewed webhook destination `/api/billing/stripe/webhook` only with
approval. Select checkout completed/expired/async-payment events, subscription
created/updated/deleted/paused/resumed, invoice paid/payment_failed/
payment_action_required, charge refunded and dispute created/closed. Exercise
signature failure, duplicates, reordered events, outage/replay, paid-through
expiry and period-end cancellation with synthetic sandbox accounts.

Unknown subscription checkout operations beyond the safe 23-hour idempotency
window remain blocked if authoritative lookup cannot establish their outcome.
Use read-only provider reconciliation/support; never reset the operation or start
another contract blindly. One-time orders have separately tested bounded recovery.

## 4. CRM and phone reminders

CRM names: `HH_CRM_ENABLED`, `HH_CRM_BILLING_REGISTRY_ENABLED`; the existing
practice-owner allowlist and separately approved registry UUID both apply.
Contacts, suppression, own withdrawal and campaign drafts are implemented. Actual
email/messenger dispatch, verified sender/domain/postal identity, destination
verification, no-login unsubscribe endpoint, exact campaign/audience approval and
durable recipient jobs remain work before any campaign is sent. Payment never
implies marketing consent; no health-based segmentation is supported.

Push names: `HH_COURSE_PUSH_ENVIRONMENT`, `HH_COURSE_PUSH_STORAGE_APPROVED`,
`HH_COURSE_PUSH_ENABLED`, `HH_COURSE_PUSH_PUBLIC_KEY`,
`HH_COURSE_PUSH_PRIVATE_KEY`, `HH_COURSE_PUSH_SUBJECT`,
`HH_COURSE_PUSH_DELIVERY_APPROVED`, `HH_COURSE_PUSH_DISPATCH_APPROVED`,
`HH_COURSE_PUSH_CRON_SECRET` (or the scheduler's `CRON_SECRET`). Generating and
installing a matching VAPID key pair and scheduler credential needs security
approval and secure handoff. Device permission/consent is always user-initiated.
Only neutral encrypted reminder payloads go to Apple/Google/Mozilla push services.
Review scheduler destination/frequency/cost before adapting the unapplied cron
example. Confirm iPhone Home Screen and Android delivery, denial, revocation,
quiet hours, multiple accounts and expiration with synthetic test accounts.

## 5. Live release is a separate decision

Live environment/account/prices/portal/webhook/key need independent verification,
tax setup and final total display, renewal/refund/retention/privacy terms and
service fulfillment approval. Production flags additionally require
`HH_BILLING_PRODUCTION_APPROVED`, `HH_BILLING_TAX_REVIEW_APPROVED`,
`HH_BILLING_TERMS_APPROVED`, `HH_COMMERCE_PRODUCTION_APPROVED`,
`HH_CRM_PRODUCTION_APPROVED`, `HH_COURSE_PUSH_PRODUCTION_APPROVED` as applicable.
These flags are guards, not evidence of review. No automatic tax or alternate
payment provider is activated. Changing provider does not migrate active payer
contracts; a future adapter must route existing subscriptions by their persisted
provider and require explicit payer authorization for migration.
