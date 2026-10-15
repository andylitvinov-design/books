# Client Session Pages — implementation notes (books #585)

These changes provide session-scoped guest invitations. Do not share with real clients until the migration, private Storage configuration and cross-session security tests pass.

## Setup and release gates

1. Apply the additive migration `supabase/migrations/20261015153000_hh_client_session_pages.sql` to the existing approved Holistic House Supabase project after schema and cost review.
2. Configure `HH_APP_SUPABASE_SECRET_KEY` only as a server-side Vercel secret. The existing publishable key cannot sign private uploads or playback. Never commit this secret.
3. Set `HH_CLIENT_SESSIONS_ENABLED=true` only when the database, private bucket and credential are ready. The feature fails closed otherwise.
4. Run `node --test tests/client-session-validation.test.mjs tests/client-session-contract.test.mjs`, existing app unit/database tests, lint, build and browser EN/RU mobile smoke.
5. Confirm guest A can only view session A, not session B or the whole cabinet. Confirm revoke/expiry works, actual PDF and video/audio on iPhone Safari/Chrome.
6. Release the current reviewed source head once, verify the Vercel production alias and deployment SHA.

## Routes and distinction

- `/en/client/session/{shareSelector}#{secret}` is a session-only invitation. It exchanges a separate scoped grant and does NOT log into the full cabinet.
- `/en/client/{clientSelector}/sessions/{sessionId}` is for a separately authorized full-cabinet user.
- `/en/client/{clientSelector}` lists their sessions and the existing history.
- `/admin/clients/{clientId}` contains owner session editing, approval and Copy this session link.

## Known limitations and safeguards

- Browser-to-Storage signed upload currently uses `uploadToSignedUrl`; large/slow networks need TUS resumable support; keep upload files <=45 MB on current Free-tier storage.
- Assessment reports render approved HTML and generate a genuine PDF in the browser. Legacy documents have a grant-scoped server-side PDF endpoint.
- Provider signed playback URLs remain usable until expiry (maximum five minutes), independently of session grant revocation.
- Draft items and reports are encrypted at rest; published content is a separate immutable per-revision snapshot. New sessions always have separate media and grant URLs.
- The app_private RLS/grants and Canadian privacy/retention requirements need independent review before use with real client recordings.
- The feature never auto-sends WhatsApp, automatically spends HeyGen credits, or imports entire guest histories into Google Cabinet.
- Rollback: disable `HH_CLIENT_SESSIONS_ENABLED` without destroying client records/blobs; legacy cabinet/report journeys remain in place.
Storage Free-tier facts verified 2026-10-15: single file maximum 50 MB, 10 GB overall egress limit (5 GB cached + 5 GB uncached); no tier upgrade authorized. Public domain cannot serve private client recordings.
