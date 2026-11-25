# Holistic House CRM — contact corrections and pagination R2 (18 October 2026)

## Delivered
Owner-only business contact editing (EN/RU/ES) supports name, language, manually recorded source, international phone, and safe email correction. Contact status, suppressions, address verification and consent remain separate owner-authorized controls.

Each update locks the owner-owned record and checks its expected revision, re-encrypts personal details and records one append-only contact_updated activity without logging personal values. A verified email or email with any consent, verification token, unsubscribe token or dispatch history cannot be changed: the owner must create a new contact. A phone linked to messenger thread history cannot change either. Owner-wide unique hashed email and phone constraints continue to block duplicates.

The contact list now loads 50 at a time with a signed owner-bound HMAC keyset cursor, preserving PostgreSQL microseconds and sort order (created_at DESC, id DESC). The dashboard shows full owner contact counts and the UI discloses that filters/search cover loaded contacts only.

Applied Supabase migration 20261018200343; SQL source: supabase/migrations/20261018200343_hh_crm_contact_corrections_20261018.sql.

## Security and release gates
No clinical records, assessments, reports, marketing sends, messenger sends, paid entitlements or customer imports. The migration only grants narrowly scoped contact column UPDATE to the existing hh_crm_backend restricted role, not email_verified, suppressed or owner_id. The activity kind whitelist adds contact_updated but no free text.

Run focused tests and lint, review SQL, execute a transactional rollback dry-run, apply the migration, verify RLS and permission readback, merge, verify Vercel READY and anonymous CRM HTTP 401. Owner-authenticated browser E2E requires a connected signed-in profile; do not claim it until verified. Email sending remains gated by Resend setup issue #980.
