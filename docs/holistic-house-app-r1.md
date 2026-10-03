# Holistic House App R1 — deployment and verification contract

Implementation of ai-projects-brain #223. This document does not authorize production changes. Existing Client/KV records and #222 remain separate.

## Delivered source

- `/{en,ru}/app`: portrait, test catalogue/runner, individual result, comparison/history, context events, consultation requests, privacy/settings.
- Five-question Current State EN and RU are independent frozen instruments. Mini-IPIP-20 uses its English original, original five response values and original scoring direction. No clinical norms, diagnoses, total health score, IQ score or automatic remedy advice.
- The runner starts unanswered, saves numeric choices server-side, saves the current optional context on Save and exit, handles revision conflicts, and resumes server state. No private localStorage, sessionStorage or IndexedDB persistence.
- Results use exact instrument/content/translation/scorer/result-schema provenance. A new result never overwrites the old one. A snapshot replaces axes from the remeasured instrument and carries only unaffected axes with their original measurement dates.
- Three optional Andy service requests. A request is not a confirmed appointment/payment. The requester explicitly selects any result summary to share; no raw answers, future results or entire profile are sent.
- `/admin/app-requests`: uses the **existing** admin cookie under `/admin`, separate inbox SQL role, and only received request fields. It cannot read account tests/history.
- Own-data export and a durable deletion-request workflow. Deletion is not reported completed merely because a button was clicked.

## Feature gates

Default: application disabled when configuration is missing. The route shows an honest unavailable state, not fake Google login or memory persistence. New app entry is shown only with `HH_APP_ENABLED=true`. Legacy link-based Cabinet remains accessible.

| Variable | Scope | Meaning |
|---|---|---|
| `HH_APP_ENABLED` | server | Enable the configured app |
| `HH_APP_SIGNUPS_ENABLED` | server | Permit new self-service Accounts |
| `HH_APP_PRODUCTION_APPROVED` | server, production only | Additional explicit production gate; leave absent in this PR |
| `HH_APP_SUPABASE_URL` | server | Dedicated approved Auth project origin |
| `HH_APP_SUPABASE_PUBLISHABLE_KEY` | server | Provider SDK API key; not authorization by itself |
| `HH_APP_DATABASE_URL` | server secret | Dedicated LOGIN with only the two app-role memberships; verified TLS required |
| `HH_APP_ENCRYPTION_KEY` | server secret | 32 random bytes encoded as base64, generated/stored through an approved secret channel |
| `HH_APP_ENCRYPTION_KEY_ID` | server | Envelope key identifier, default `app-v1` |
| `HH_APP_ALLOWED_ORIGINS` | server | Exact comma-separated HTTPS app origins, no wildcard, no paths |
| `HH_APP_SUPABASE_SECRET_KEY` | privileged operator only | Optional future provider-admin deletion integration; not needed by ordinary app requests |

Never put these secrets into `NEXT_PUBLIC_*`, GitHub source, browser state, logs or screenshots. Do not copy legacy KV keys or production client data to a Preview environment. Avoid logging database bind parameters and OAuth callback queries in infrastructure logs.

`CI=true` + `HH_APP_TEST_RUNTIME=isolated` permits only loopback test HTTP/DB, is rejected on Vercel and in production Node mode. This is not an application login bypass. The test Auth protocol double is a separate process under `tests/helpers`, not a route or application import.

## Auth architecture

The app is a server-only backend-for-frontend. `@supabase/ssr` runs only server-side with supported PKCE flow and HttpOnly cookies. No browser Supabase auth client reads cookies. Each request creates its own SDK instance and propagates refreshed cookies.

1. Same-origin POST starts Google OAuth with `openid email profile`, not Drive/YouTube scopes.
2. Provider handles Google OAuth. Google's authorized redirect is the Supabase `/auth/v1/callback`, not the app callback.
3. The provider redirect allowlist contains exact app `/api/app/auth/callback` origins/routes for the approved stable Preview host and, later, production. No broad wildcard.
4. SDK code exchange validates the PKCE verifier. App callback returns only to its allowlisted own origin.
5. Server `getUser()` verifies provider identity. Session claims are read only afterwards and independently checked against `auth.sessions` and `Account.status` in each DB transaction.
6. Missing/revoked session, blocked/deleting account or missing consent fails closed. App and legacy Cabinet cookies are separate authorities. No automatic link by email/name.

Real Google integration needs a dedicated approved Books/HH Supabase/Auth target. The connected projects found during discovery belonged to other products and were not reused, restored or modified.

## Database provisioning: isolated target only, not part of build

The migration is additive to a new `app` / `app_private` schema and has **not** been applied to a hosted project by this PR. Its initial source was hardened before first application. If an earlier version was applied by another operator, do not rewrite applied history; stop and create a reviewed additive repair migration.

Never run migrations/seeding from `next build`, a public endpoint, a normal page request, or a production workflow.

Approved setup order:

1. Identify the intended isolated project/database and confirm no real client data is present.
2. Apply `supabase/migrations/20261002164037_hh_app_r1_foundation.sql` with an approved migration operator.
3. Provision a dedicated `LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS` credential through the project's secret manager, not a literal password in SQL history. Grant membership of `hh_app_backend` and `hh_app_inbox` only. Do not grant arbitrary schema/table ownership, superuser or bypass RLS.
4. Runtime database connections must verify the server certificate. Do not use a URI option that disables TLS verification.
5. Run `scripts/app-seed.mjs --approved-isolated` with the approved migration connection and exact `HH_APP_APPROVED_DB_HOST`. It verifies the semantic SHA-256 of all definitions, refuses a changed published version, then inserts catalogue metadata. It creates no client data.
6. Run the real restricted-role database test suite in an independent disposable test DB. Configure provider origins/Google only in the approved isolated target.
7. Add server configuration to branch-specific Preview, verify SDK round-trip and real durable saves, and confirm Preview is not using production KV or Auth.
8. Record exact deployment and source commit before requesting production approval.

RLS and grants are separate. `authenticated` can read only owned rows when session/account checks pass; it cannot write computed results, snapshots or protected Account fields. The backend role has server operations with RLS. The inbox role can read/update only the configured practitioner's requests and has no account/result/answer grants.

The only SECURITY DEFINER helpers are narrowly bounded boolean session/account checks and the rate limiter in a non-exposed schema, with empty search_path and PUBLIC/anon EXECUTE revoked. Do not expose `app_private` through PostgREST. Do not solve a permission problem by replacing user reads with unrestricted service-role queries.

## Transactions and data privacy

All owner mutations lock the owner Account; run updates also lock their row. Autosave compares expected revision and records a keyed request fingerprint for uncertain retries. Changed payload under the same operation ID fails. Submit freezes the acknowledged answers, creates one deterministic score result and one profile snapshot, then marks the run completed **in one transaction**. Failure rolls back all those writes; duplicate submit returns the existing result only for the same submitted revision.

Composite FKs bind result to the run's owner and actual instrument version. DB triggers prevent in-place changes to published definition content, completed results/snapshots, run identity/version and submitted answers. Snapshot source dates, values and owner are checked again in SQL.

Free-text context labels/notes and request contact/message/selected excerpt use AES-256-GCM with random IV and AAD bound to owner, record and field. Numeric assessment answers/results remain structured private values protected by database encryption at rest, verified TLS, grants and RLS; assess provider region/backups/retention before a real-user launch. Application-level encryption is not a regulatory-compliance certification.

## Deletion and withdrawal

The self-service request requires explicit `DELETE` and recent provider sign-in, then transactionally sets Account to `deleting`, creates an operator deletion job and signs out all provider sessions. UI says **requested**, never **erased**. RLS blocks data access for deleting Accounts even while an old JWT has not expired.

Operator fulfilment must verify the request, revoke provider sessions, erase the self-service account and its cascaded rows, delete the Auth user via the supported provider-admin API, record job completion, and apply the provider backup-retention policy. Those privileged external operations require the approved target and operator access; no synthetic job should be treated as a real request. Existing legacy practitioner/consultation records are separate and must follow the applicable approved retention process, not be destroyed by app account deletion.

Until an operator fulfilment/retention procedure and provider deletion path are verified, public signup remains gated. A user can cancel a request or remove its shared excerpt without deleting the whole account; removal cannot undo information already read by the practitioner.

## Verification commands and evidence layers

- `npm ci` — committed pinned dependency lock.
- `npm run test:app` — pure contracts, canonical hashes, scoring, invalid-input, encryption, origins and SQL-source checks.
- `npm run test:app:db` — actual PostgreSQL schema, restricted-role A/B RLS/grants, row locking, duplicate submit, concurrent save/submit, injected rollback, persistence, request sharing and session revocation. Requires explicitly isolated loopback test DB.
- `npm run build`, `npx --no-install tsc --noEmit`, `npm run lint`, `npm run pwa:check`, `npm run native:check` — build/regression checks.
- `.github/workflows/hh-app-browser.yml` — real Next browser journey + real PostgreSQL + a separate minimal provider-protocol double. Screenshots contain synthetic users only. No network/auth traces or storageState tokens are uploaded.

Evidence must stay separate:

1. Pure unit/source tests.
2. Actual PostgreSQL/RLS/transaction tests with test equivalents of `auth.users`, `auth.sessions`, `auth.uid()` and `auth.jwt()`.
3. Browser integration through the real server SDK and protocol double.
4. **Real Supabase/Google OAuth and hosted durability** — not established by 1–3.
5. Vercel branch Preview build/HTTP availability — not proof of configured account flows.
6. Production — unchanged until separately approved.

## Rollback

Disable app/signup flags and revert the feature UI/API commit through the normal reviewed process. Preserve legacy Client/KV and document access. Do not delete app rows, drop tables, rotate keys or destroy user history as a UI rollback. Disable new writes before schema maintenance. Keep previous encryption keys available for any retained records; no silent key replacement.

## Later stages preserved

Legacy cabinet claim/import, Resource Map/Bach after source review, practitioner assignment, multi-practitioner sharing/directory, billing/calendar, AI and private video are explicitly later stages of #223. No inert public controls should imply they already work.
