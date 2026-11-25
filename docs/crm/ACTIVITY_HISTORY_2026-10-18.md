# Holistic House CRM — Full owner contact activity history (18 October 2026)

## Shipped source
Existing My Practice → CRM → Contacts cards previously showed at most four recent activity entries drawn from the latest 100 events **across the entire owner account**. Once the owner logged more activity elsewhere, a contact's older business actions became invisible.

This release adds a nested **Full business activity / Вся история действий / Historial completo** disclosure within each contact's actions section. Fetch is lazy: no network request until expanded. Each page contains up to 40 events, sorted by exact PostgreSQL `(occurred_at DESC,id DESC)`. An explicit Earlier activity button loads older pages, deduplicated by immutable event ID, and Refresh reads the latest.

## Authorization and privacy
- Existing owner-only CRM gate: app session verified, legacy practitioner owner allowlist, account-ID header matched. The handler is GET-only and uses private, no-store response headers and same-origin validation.
- Use `createCrmRepository.withOwner` transaction with `SET LOCAL ROLE hh_crm_backend`, authenticated claim and active-account check, plus existing FORCE RLS.
- Parent contact must exist with both `id` and `owner_id`. Event query is scoped to **both** owner and contact, not just contact UUID.
- The cursor is opaque, HMAC-authenticated with server-only application key and bound to owner, contact, microsecond timestamp and event UUID. Forged/cross-contact or cross-owner tokens fail.
- Only fixed business event kind, stage, timestamp and event UUID reach the browser. No notes, addresses, client cabinet tokens, assessments, remedies, emails, invoices or clinical records.
- No new outbound messages, contact import, billing, webhook permissions or bulk exports.
- Front-end request abort/sequence guard prevents stale responses populating a changed/unmounted card.

## Database
Applied index migration **20261019034453_hh_crm_activity_owner_history_index_20261019**. It creates a btree index on `app.crm_activity(owner_id,contact_id,occurred_at DESC,id DESC)` without altering policy or permissions.

## Verification and limitations
Run `node --test tests/crm-activity.test.mjs` and all existing CRM regression tests, linter, and exact SHA Vercel Production build. Verify anonymous 401 for `GET /api/app/crm/activity?contactId=<synthetic-UUID>`. Synthetic DB pagination should use BEGIN/ROLLBACK, preserving zero test records. Authenticated owner click-through needs an explicitly signed-in browser profile (not available by default). Real message providers remain unconfigured per issues #980 / #985.
