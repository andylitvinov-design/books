# My Coach — durable per-client protocols (22 Nov 2026)

This release removes the four-session storage cap without changing the affirmative client consent required by the existing Save protocol flow. It adds no scheduled task, external API, paid provider, automatic transcript recording or vendor-side memory.

## Storage and migration

- Canonical source: app_private.my_coach_protocol_records, one individually application-encrypted payload per (account_id, protocol_id). An authenticated owner can save, delete and page through the full history; account deletion cascades to the table.
- Read, insert and delete require hh_app_backend, auth.uid() = account_id and the active-account policy. No direct browser/anon/authenticated table grant. No plaintext transcript, name, goal or report text is stored in database columns; only saved_at and opaque UUIDs are outside the ciphertext.
- At the first owner-specific access, the existing at most four encrypted myCoachProtocols entries are copied within a single owner-scoped transaction, verified or rejected on conflicting duplicate IDs, then removed from the combined legacy GROW envelope. Other coaching sessions, goals, ratings and tradition tracks are preserved. Failure rolls back all copies and leaves the original source intact.
- Old records are not erased by deploying this migration; the legacy migration runs only after the new code is live and a signed-in owner requests their archive.
- Saves require the preexisting explicit consent:true with server normalization; retries with identical content are idempotent, and reuse of the same ID with different content is rejected.
- Reads return at most 20 protocols per page plus hasMore and nextCursor; clients pass ?before=<ISO>&beforeId=<UUID> for older pages. Provider-facing context continues to use at most the three most recent client-reviewed summaries and needs separate sharing consent.
- Client-confirmed deletion removes one record without overwriting unrelated sessions. No unconsented automatic deletion or retention deadline is introduced.

## Verified acceptance boundaries

1. Existing GET /api/app/my-coach/protocol remains valid and returns the newest 20 after explicit client opt-in; older pages are available by keyset cursor without listing another owner's records.
2. The source UI's approved Play/voice/profile/onboarding design is unchanged. An existing #5388 staged-memory reader calls listMyCoachProtocols and can receive the newest three reviewed summaries once its protected PR merges; no full transcript is sent to Gemini by this archive change.
3. Existing Context Cloud assessment/item grants stay deny-by-default. No global consent flag is activated or payment setting changed.
4. Complete LIVE acceptance still requires protected Core/Specialist/Guard checks, protected merge, hourly Vercel production release, and actual served-alias smoke test; migration success alone is not proof of site rollout.

## Deployment and rollback

Schema migration 20261122133522_hh_my_coach_durable_protocol_archive_v1_20261122 was applied additively to the existing Holistic House Supabase project. If application code rolls back, existing encrypted legacy data remains available only until its first successful migration by the newer code; never drop the new table in rollback because moved records would be lost. Restore read support instead.
