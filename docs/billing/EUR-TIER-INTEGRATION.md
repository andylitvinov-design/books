# EUR tiers and authored My Courses integration

## Exact source and destination

Local candidate for existing PR427 branch, based on remote head
`dc2bec11bb22ca404dfdd22f789f2d49b20eb182`, tree
`ffe6961395bf73ae04d9eb342f07dcf80250963f`. That previous publication succeeded.
Canonical quest/Profile, compact-PDF, notification and approved V6 one-slide changes through `0a21d89ee259b6e417747ea4d69c3b0b66905614`
are incorporated. Canonical notification sender and native support take precedence over the unactivated PR427 notification draft; see NOTIFICATION-RECONCILIATION.md. All 19 compact-PDF delta files are byte-exact. Course dashboard/preset design is reused from PR465 head
`8d0cd55ea90ad69b328efe91a897728c7a92781f`; PR462 merge head
`232316a67f27d6cf523e378d87d268fe6d1227ad` has zero file differences from it.
This candidate has not been published to those branches.

## Adapter boundary

- Preserve authored dashboard, catalog, card styling, theme labels and three fixed
  five-test standard packs, plus the separate editable personal course.
- `lib/inner-growth/course-plans.js` adapts the single
  `lib/billing/public-plan.js` catalogue. Raw Stripe status/metadata, URL parameters
  and browser-selected tiers cannot grant access.
- Dashboard uses `SubscriptionProvider` and `canStartCheckout`. The only payment
  API is PR427's `/api/billing/*` and existing paid-proof ledger.
- Exclude PR462's competing `lib/app/course-billing.js`,
  `lib/app/course-membership.js`, `/api/stripe/holistic-course` and executable
  `20261013205000_hh_multicourse_subscription_entitlements.sql` migration.
- Preserve course/cycle IDs and old content versions. Mutations carry owner header,
  explicit course ID, revision and cycle ID where relevant. Stale account/course
  responses and repeated clicks cannot target another course.
- Presets require explicit consent and exactly five actual saved tests. Compatible
  saved results count; missing results cannot be fabricated/skipped. Personal
  courses retain adding/removing tests. Measured-scale approval and daily gates stay.
- Primary selection/close are explicit owner commands. Close archives only the
  selected course and preserves observations. Exports include all courses/cycles.
  Downgrade does not pause, close or delete courses.

## Product acceptance

| Tier | Monthly price | Concurrent active courses | Other confirmed benefit |
| --- | --- | --- | --- |
| Free | EUR 0 | 1 | Existing baseline test access remains |
| Start | EUR 10 | 1 | No ads |
| Advanced | EUR 20 | 5 | Existing baseline test access remains |
| Premium | EUR 100 | 5 | Free tests; one personal 60-minute session per paid month |

No-ad inheritance for Advanced/Premium is an implementation assumption for
activation review. No new lower-tier test paywall is added.

Payment confirmation requires configured merchant/environment, exact monthly EUR
price, paid invoice, matching invoice payment and captured charge. Unpaid upgrades
or success redirects cannot grant a higher tier. Period-end cancellation preserves
paid coverage. Lower allowance blocks new/resumed work beyond quota, never existing
active-course progress.

Premium has one credit per verified paid period, idempotent replay and explicit
request confirmation. A request is not an appointment. Runtime code cannot mark a
session fulfilled. Sales are gated until delivery workflow/schema approval.

The portal currently supports cancellation and payment-method management. Immediate
paid-to-paid contract tier changes are unavailable; do not advertise them as
implemented. Duplicate overlapping subscriptions are rejected. A separately tested
contract-change flow is needed if immediate paid-to-paid changes become a release
requirement.

## Bounded SQL proposal and coordinated cutover

SQL stays under `docs/billing`, with fail-fast review guards, outside automatic
migrations. `proposed-concurrent-course-schema.sql` is the only course-storage
proposal: replace singleton and global live-cycle uniqueness with per-course rules,
add primary/finished metadata, expose narrow owner-derived quota and enforce quota
through account-locked triggers. `proposed-premium-session-schema.sql` adds the
single private monthly-credit ledger.

Safe cutover sequence:
1. Finish native PostgreSQL17 isolated final-slot/RLS/credit race tests and supported
   browser QA. Local PostgreSQL/WASM tests do not prove concurrent native locking.
2. Verify exact target database, singleton/index/column state, historical counts and
   recovery plan without reading client answers or changing data. Check whether
   PR462's competing migration was applied. Never stack both schemas; if applied,
   stop and prepare separate reconciliation.
3. Review exact SQL hashes and runtime access changes, then obtain required
   action-time database/security approval. Code preparation does not authorize SQL.
4. Drain course writes during coordinated schema/application cutover. Old writers
   use `ON CONFLICT(account_id)` and break when the unique key is removed. Install
   only the reviewed schema and compatible application together; verify isolation,
   historical IDs/counts and controlled smoke tests before releasing writes. Do not
   toggle back to the old writer after schema changes or restore singleton after
   multiple courses exist.
5. Set reviewed course-schema flag only after proof. Without it Advanced/Premium
   sales stay closed. A displayed plan is not proof of functional availability.
6. Independently verify three EUR recurring prices, restricted-key merchant binding
   and sandbox webhook replay/return reconciliation. Configure credentials only via
   the separately authorized secure workflow.
7. Approve Premium delivery/credit policy and schema before sale; live activation
   also requires existing tax, terms, production and owner gates.

No SQL, grant, credential, charge, flag, deployment or live activation is performed
by this candidate or document.

## Recovery correction

Historical dispute booleans no longer permanently revoke won/closed-warning valid
coverage. Premium recovery is period- and dispute-specific, records prior state and
cannot turn requested credits into a new available session. Refund, unknown and
legacy holds require reviewed handling; runtime never automatically clears them.
See activation checklist for the conservative policy and approval gate.
