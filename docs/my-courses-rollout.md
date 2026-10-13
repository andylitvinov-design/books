# Holistic House · My Courses — rollout and billing runbook

## Plans (EUR, monthly)
| Plan | Concurrent course slots | Ads | Included tests | Personal session |
|--|--:|--|--|--|
| Free | 1 | Existing site policy | Existing free offerings | Not included |
| Start | 1 | Off | Existing free offerings | Not included |
| Advanced | 5 | Off | Existing free offerings | Not included |
| Premium | 5 | Off | Included | One per billing month |

**Do not launch paid subscriptions** until the live EUR recurring prices, ad hiding implementation, included-test rules, and one-session-per-paid-period booking/redemption are verified. The application presents plan capabilities, but these service fulfilment details need business integration.

## Data model
Migration: `supabase/migrations/20261013205000_hh_multicourse_subscription_entitlements.sql`.

This is a **schema break for the older deployed course server**: the old version writes `INSERT ... ON CONFLICT(account_id)`, which will stop working after the unique constraint is dropped. Do not apply the migration in a long-lived environment while the legacy server is still handling enrolment. Coordinate the schema cutover with the new app deployment in a low-traffic window or split into expand/contract migrations.

- All historical owner-scoped course content, encrypted personal text, check-ins and sessions remain in their original tables.
- `growth_courses` becomes 1-to-many per account.
- One active/paused cycle *per course* instead of *per account*.
- Locked courses are read-only and retain history after a downgrade. Users may restore them when their tier has spare slots.
- Every start and new cycle must lock the account row, then validate server-side membership and occupied slots.

## Stripe
**Stripe is currently connected only in test mode. Do not use test keys to collect production payments.** Hosted Checkout redirects to Stripe; no card data touches Holistic House.

Configure the following **server-only** Vercel secrets and variables for production. The three price IDs must be **live, EUR, recurring monthly**:
- `HH_STRIPE_SECRET_KEY` = live secret key
- `HH_STRIPE_WEBHOOK_SECRET` = signing secret for `https://holistichouse.vercel.app/api/stripe/holistic-course`
- `HH_STRIPE_PRICE_START`, `HH_STRIPE_PRICE_ADVANCED`, `HH_STRIPE_PRICE_PREMIUM` = corresponding price IDs

Subscribe to `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` from the live Stripe endpoint. Configure the Stripe Billing Customer Portal for plan changes/cancellation. The payment return URL never grants membership by itself; only a verified webhook can update database entitlements. Monitor event delivery and database failures, including retries and out-of-order events. Run subscription life-cycle tests in test mode before enabling production keys.

## Premium fulfilment gating
The plan model includes a **personalSessionsMonthly=1** entitlement. This is an entitlement descriptor, not an appointment reservation, consumed service ledger, booking calendar, or payment receipt. Before accepting real Premium subscriptions implement/verify:
1. Included assessment tests and rules across the account's test library.
2. One personal session entitlement per successful paid period, non-transferable and safely expired.
3. A secure booking and redemption path integrated with the existing consultation service that records consumption.
4. Cancellation, grace-period, duplicate invoice, upgrade/downgrade and refund policies on the customer-facing checkout/terms.
5. No-ads enforcement at every ad slot for Start/Advanced/Premium.

## Acceptance checks
- `node --test tests/course-plans.test.mjs tests/multi-courses-architecture.test.mjs tests/my-course.test.mjs tests/my-course-r2.test.mjs`
- `npm run test:app` and lint/build workflows.
- On an authenticated **test** account: create Free course → block second; close → allow another and keep history.
- On a test subscription: Advanced → five courses → block sixth; verify separate day-1 sessions and separate encrypted notes; select main and resume.
- Simulate expired/downgraded subscription; verify at most one course can receive new writes, and locked courses are safely preserved.
- Verify EN/RU, mobile touch layout, progress, consent dialog, checkout absence when unconfigured, and auth/RLS BOLA protections.
- Verify new production build, apply schema change and release in coordinated window, then smoke-test enrolment and rollback path.
