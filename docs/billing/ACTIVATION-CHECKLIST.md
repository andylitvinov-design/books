# Activation checklist: approvals are not configuration

Prepared 13 October 2026. The code PR does not apply any item below. New billing
feature flags default off; billing proposals are outside `supabase/migrations`.
Canonical notifications have a separate existing rollout, preserved as documented
in [Notification reconciliation](NOTIFICATION-RECONCILIATION.md). Superseded PR427
notification proposals and HH_COURSE_PUSH_* flags must not be activated. No live account,
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
The two `../pwa/` SQL proposals are superseded/inactive. Do not apply them,
grant `hh_course_push_worker`, or activate another notification ledger.
See [canonical notification mapping](NOTIFICATION-RECONCILIATION.md).

The proposed new memberships are only `hh_billing_backend` and `hh_crm_backend`
to the verified existing restricted runtime LOGIN. Their
names, target and effects require action-time security approval; this document
does not authorize granting them. No reverse grants of privileged application,
billing or service roles to the new roles are permitted.

## 3. Sandbox billing configuration and secure handoff

Server-only names: `HH_BILLING_PROVIDER=stripe`,
`HH_BILLING_ENVIRONMENT=sandbox`, `HH_BILLING_SCHEMA_APPROVED`,
`HH_BILLING_ENABLED`, `HH_STRIPE_RESTRICTED_KEY`, `HH_STRIPE_WEBHOOK_SECRET`,
`HH_STRIPE_ACCOUNT_ID`, `HH_STRIPE_START_PRICE_ID`, `HH_STRIPE_ADVANCED_PRICE_ID`,
`HH_STRIPE_PREMIUM_PRICE_ID`,
`HH_STRIPE_PORTAL_CONFIGURATION_ID`. Never paste secret values into chat/source.
Use the owner's secure deployment-secret workflow after exact approval.

Restricted key scope needs Account read (merchant binding), Prices read,
Customers read/write, Checkout Sessions read/write, Subscriptions read/write
(cancel renewal), Invoices and Invoice Payments read, PaymentIntents/Charges/Disputes read,
and Billing Portal Sessions write with Configuration read as needed by Stripe.
No refunds, transfers, payouts, balance changes or price writes are needed by the
application. Verify the actual dashboard resource scopes against the chosen API.

Historical sandbox identifiers; three EUR recurring prices still need independent verification:
- Account `acct_1TL7DzIrCtuk8CIX`
- Superseded Plus USD price (never use for new EUR plans): `price_1UQ4x8IrCtuk8CIX5gGkNftR`
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

Phone reminders retain the canonical `HH_PUSH_PUBLIC_KEY`, `HH_PUSH_PRIVATE_KEY`,
`HH_PUSH_SUBJECT`, `HH_PUSH_CRON_SECRET` (or `CRON_SECRET`) and existing `/api/internal/notification-dispatch` schedule.
Preserve the existing keys and explicit device consent. No HH_COURSE_PUSH_* flag
or unapplied PR427 cron example activates this candidate. Native APNs configuration
remains separate. See `docs/mobile-notifications.md` for current configuration
and `NOTIFICATION-RECONCILIATION.md` for inherited starvation/consent-window risks,
required SQL follow-up contract and real-device verification gates.

## 5. Live release is a separate decision

Live environment/account/prices/portal/webhook/key need independent verification,
tax setup and final total display, renewal/refund/retention/privacy terms and
service fulfillment approval. Production flags additionally require
`HH_BILLING_PRODUCTION_APPROVED`, `HH_BILLING_TAX_REVIEW_APPROVED`,
`HH_BILLING_TERMS_APPROVED`, `HH_COMMERCE_PRODUCTION_APPROVED`,
`HH_CRM_PRODUCTION_APPROVED` as applicable.
These flags are guards, not evidence of review. No automatic tax or alternate
payment provider is activated. Changing provider does not migrate active payer
contracts; a future adapter must route existing subscriptions by their persisted
provider and require explicit payer authorization for migration.


## EUR tiers, concurrent courses and monthly session credit

The current requested catalogue is Free 1 course; Start EUR10/month 1 course/no ads;
Advanced EUR20/month 5 courses/no ads; Premium EUR100/month 5 courses/no ads/free tests/
one personal 60-minute session per paid month. No-ad inheritance for Advanced/Premium is an implementation assumption, not an additional user quote; confirm it for activation. Amounts are monthly cents 1000/2000/10000.
The server requires three distinct verified recurring EUR prices, never the old USD price.
Do not change active provider contracts by renaming their price. Portal tier changes remain
disabled; this code permits cancellation/payment-method management, not immediate upgrades.

Review `proposed-premium-session-schema.sql` independently by exact hash: one private credit
table, restricted column writes, FORCE RLS for owner/provider/environment, stable period key,
request operation uniqueness, and no booking/fulfillment privilege. Duplicate invoice events
and refreshes must preserve a single credit. Refund/dispute holds prevent unfulfilled use.
A fulfillment owner/workflow, booking confirmation, unused-credit treatment, cancellation,
expiry and retention must be settled before `HH_PREMIUM_SESSION_FULFILLMENT_APPROVED`.

Course concurrency requires its separate SQL proposal and owner-scoped atomic quota tests.
Never merely remove the uniqueness constraint or trust a browser plan/limit. Downgrade keeps
existing history and progress; it must not silently delete, terminate or restart old courses.
Advanced/Premium sales remain closed until `HH_MULTICOURSE_SCHEMA_APPROVED` is appropriate.
No database, grants, credentials, Stripe prices or flags were changed by this document.

## Resolved dispute and session-credit recovery

Charge.disputed is historical, not the final outcome. The verified merchant client
lists and retrieves charge disputes; charge, payment intent, currency, amount and
environment must match. Only authoritative won or warning_closed can restore
otherwise valid paid coverage. Open, lost, unknown, mismatched and unavailable
evidence stays held. Full refunds are never overridden; recovery makes no refunds.
Sources: https://docs.stripe.com/api/charges/object and
https://docs.stripe.com/api/disputes/object.

Premium credits retain hold reason, charge/dispute/invoice/period identity and
previous available/requested state. Only the same unexpired paid period can recover,
with every specific dispute resolved and no refund/unknown/manual hold remaining.
Requested stays requested with the same operation ID and timestamp; resolved hold
history remains. Fulfilled/expired credits never revive.

Unknown/mismatched provider evidence and legacy revocations without exact hold
identity require manual reviewed recovery. Runtime has no manual-clear endpoint.
Before sales approve this conservative policy and accountable manual review workflow.
No automatic booking, fulfillment, refund or lost-dispute reversal is performed.
