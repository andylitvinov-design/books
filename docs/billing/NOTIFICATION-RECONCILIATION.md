# Canonical notification compatibility

Canonical source: `c3bf606b0f44d331490f545ba37b5c86ced971ae` (merged PR463).
Subscription source: existing draft PR427 head
`dc2bec11bb22ca404dfdd22f789f2d49b20eb182`.

## Preserve the existing implementation

Canonical deployment notes record the notification/dispatch/native tables as
already applied. That record is not a fresh live database inspection. No database,
credential, schedule, feature flag, permission or deployment is changed here.
Existing VAPID keys, HH_PUSH_* configuration, APNs configuration and scheduler URL
remain authoritative. No new provider selector or activation flag is introduced.

The canonical sender retains explicit opt-in, local-hour preference, active-account
and active-cycle eligibility, unfinished daily lesson checks, and its existing
unique device/local-day claim. Notifications are not newly restricted to paid
subscribers. Multiple active courses still produce one generic daily device
reminder. Native ActivityKit and rich EN/RU preview remain present.

## Exact route and UI mapping

- GET `/api/app/notifications` returns canonical state through an owner-header
  guarded adapter. Canonical `/subscribe`, `/unsubscribe`, `/preferences`, `/test`,
  `/live-token` and `/live-stop` routes remain in the authenticated app handler and
  now also reject stale expected-account headers before mutation.
- Unactivated draft root POST/PATCH/DELETE notification mutations are retired.
  The old component is not rendered. No draft-only preferences are silently
  translated into canonical hourly preferences.
- `/api/internal/notification-dispatch` keeps its canonical sender and secret
  authorization. The draft `/api/app/notifications/dispatch` URL exports that same
  GET handler, sharing the same daily claim ledger. It cannot invoke the retired
  encrypted draft repository or sender, including through HH_COURSE_PUSH_* flags.
- After canonical PR470, only Settings displays the canonical notification surface.
  The course route preserves the single-purpose Today screen without notification
  setup or a permanent promotion card; confirmed lesson offers remain nonmodal.
  Owner changes abort requests; duplicate clicks are locked. The native control
  propagates owner identity, resets interrupted work and cleans delayed listeners.
- Root service worker imports one push/click handler. The handler retains fixed
  localized content and canonical teal icon/badge, ignores private payload text,
  and never replaces an in-progress assessment tab when a reminder is clicked.
- Canonical app manifests, iOS widget/bridge, database migrations and dispatch
  implementation are preserved. Already applied migrations are not reapplied.

Old `docs/pwa` SQL and HH_COURSE_PUSH_* configuration are superseded draft history,
not instructions for activating a second stack. Keep them unapplied.

## Verification and remaining release limits

Synthetic UI tests cover single settings/dispatch/listener paths, repeated clicks,
late owner responses, native locale interruption and delayed listener cleanup.
Local PostgreSQL/WASM exercises two active courses, one device/day claim, repeat
dispatch, owner RLS, pause and opt-out. This does not prove native concurrent locks
or physical phone delivery. Native PostgreSQL17 and real-device checks remain.

Two pre-existing canonical sender risks are not repaired by this integration:

1. The current claim function applies LIMIT 60 before excluding existing daily
   claims, which can starve later eligible devices after the first batch.
2. Consent/device/course eligibility can change after a claim and before transport;
   the canonical sender has no final locked eligibility recheck. A newly opted-out
   user may receive an already-claimed reminder.

Fixing these requires a reviewed replacement server-owned claim/final-validation
function and locking protocol under existing restricted roles. Do not fabricate
a user session, bypass RLS, widen grants, or depend on unapplied SQL. The retired
draft's locked-consent, encrypted-storage, paid gating and quiet-hour guarantees
must not be advertised as canonical runtime guarantees. Assess these risks before
release; no live safety or delivery claim is made here.

### Required SQL follow-up contract (design only)

- Replace claim selection so existing `(subscription_id, local_day)` attempts are
  excluded before the bounded LIMIT; retain uniqueness and concurrent-worker
  conflict protection. Never auto-retry an ambiguous transport outcome.
- A narrow server-only final-validation operation must take a specific existing
  claim identity, verify matching owner/device/day and non-finalized status, and
  recheck current consent, account status, endpoint membership, local-time window,
  at least one currently active unfinished course, and expiration.
- Its transaction must serialize with unsubscribe, preference changes and course
  pause/completion, with one reviewed lock order shared by those writers. Hold the
  eligibility lock through a bounded send/finalization or use a separately proven
  equivalent protocol; a check followed by an unlocked send is insufficient.
- Return only the minimal server-side transport fields. Keep credentials off public
  APIs and retain the restricted hh_app_backend execute boundary. Do not grant
  browser roles direct access or make cron impersonate a user session.
- Native PostgreSQL17 tests must prove >60-device fairness, two-worker duplicate
  exclusion, opt-out/device-delete/pause races, expiry/quiet-window boundaries,
  stable multi-course behavior and unknown-outcome handling before activation.

This document defines the missing contract only. It adds no executable migration,
function dependency, grants or production behavior.
