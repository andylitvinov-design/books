# Client test ratings

Client feedback measures perceived usefulness of a test and its interpretation, not psychometric validity, clinical accuracy, symptom severity or a treatment recommendation.

## Product behavior

- Five native radio choices, an explicit save action, an editable vote, and removal. Keyboard arrow keys/Space and visible focus work without pointer interaction. Targets are at least 44 × 48 CSS px. EN/RU/ES states include loading, save, retry, concurrent edit, unavailability and success.
- New star input is below the interpretation and is shown only when `buildAssessmentResultReport(result, locale).status === 'available'`. This requires the database interpretation contract from PR #388. If the interpretation is later withdrawn, a signed-in owner with an existing rating gets a read/remove-only panel; no new vote or edit is offered.
- A guest uses the existing explicit save-to-Cabinet flow before voting. No anonymous/session-based votes are counted. One account can have only one active vote for a test key, even after retaking it or changing language/version. A new vote on a different version moves that account's existing vote.
- Public means/counts apply to the exact definition ID (instrument version, language and translation version). Ratings are never blended across versions. A rating is deliberately not tied to an individual interpretation payload, so it remains feedback on the test experience and not a rating of a published report revision.
- Both simple and full test pickers offer highest-rated ordering. Only tests with at least five votes enter the ranked tier; order is raw arithmetic mean, then vote count, then stable test key. Lower-count/unrated tests keep their existing match order below the ranked tier. Topic, rights, availability and other filters remain active. The full catalog retains selected tests at the top so checkboxes do not disappear. Sorting does not silently replace a selected battery or automatically add a sensitive opt-in test.
- An explicit “Select up to 3 top-rated tests” action uses only the current matching, runnable, starter-safe tests with 5+ votes. It never automatically includes a sensitive opt-in instrument or changes an existing selection just because new counts load.
- Stars are shown with the count. A single 5-star vote explicitly says there are too few votes to rank. Loading/failure is never presented as a fabricated zero rating.

## Server and privacy boundary

`GET /api/app/test-ratings` returns current runnable-definition IDs and `{ average, count, ranked }`, plus the named ranking method and minimum count. It returns no names, account IDs, result IDs, answers, dimensions, free text or individual votes.

`GET/POST/DELETE /api/app/results/:resultId/rating` authenticates through the existing verified session and active-account transaction. It resolves the version/key from an owned completed result. Writes accept only `stars`, `expectedRevision` and explicit `uiLocale` (EN/RU; Spanish chrome uses EN). POST also requires published interpretation metadata for the exact instrument identity, scoring/result versions, UI language and current interpretation release, without reading answers, dimensions or interpretation payloads. Missing content fails closed; GET/removal still let the owner manage an existing vote. Client-supplied account, definition or result identity fields are rejected. Mutations keep existing same-origin checks, a 1 KiB body cap and a separate persistent rate bucket (30 write attempts per 10 minutes per account).

The account row lock serializes first votes and edits. A database primary key enforces one row per account/test. Compare-and-set revisions reject stale conflicting writes; an identical retry is idempotent. Removing a rating leaves a nullable-star tombstone with its increasing revision so old browser requests cannot exploit revision reset. The tombstone contains no additional data and is removed with its owning account/result.

`app_private.test_ratings` has RLS enabled. Only the existing server backend role gets owner-scoped SELECT/INSERT/UPDATE. The migration revokes all direct access from PUBLIC, anon, authenticated and inbox. Policies independently require the claimed account and matching completed result/version/key. Composite result/account foreign key prevents cross-account reassignment. Account/result deletion cascades; accounts already marked deleting are excluded from public aggregates immediately. Active votes are included in the user's existing data export. If the code deploys before this migration, the rating endpoint fails closed and the export returns `testRatings: null` rather than breaking all existing exports.

A narrowly scoped, private SECURITY DEFINER function is necessary to compute cross-account statistics despite owner RLS. It has no arguments or dynamic SQL, a fixed empty search path, and returns only definition ID/count/sum. EXECUTE is revoked from PUBLIC/anon/authenticated/inbox and granted solely to the existing backend role. This is not a public PostgREST RPC. No service-role key, new credential, login role, external analytics, email or new third-party transmission is introduced.

## Release gates and migration

Migration: `supabase/migrations/20261012145517_hh_client_test_ratings.sql`, scaffolded with Supabase CLI 2.120.0. This PR prepares the SQL only; it does not apply a live migration or change live grants.

1. Merge the validated database-interpretation contract from PR #388 before enabling the UI.
2. Review the exact migration, role grants and restricted aggregate function. Apply only through the separately approved migration process.
3. Run the isolated PostgreSQL integration suite and app/browser checks for the final combined commit. No customer rows are needed for verification.
4. On the preview, verify EN/RU results with synthetic accounts, then reload the public picker and verify average/count/order. Confirm sign-out, expired session, concurrent tabs and missing interpretation fail closed.
5. After applying, run database advisors and metadata-only checks for grants/RLS/function search path. Do not use customer results as fixtures.

The local unit suite is `node --test tests/test-ratings.test.mjs`; the existing `npm run test:app` includes it. `npm run test:app:db` registers `tests/test-ratings.integration.mjs` in its isolated shared database and verifies ownership, duplicate retries, revisions, retakes, language separation, rating removal, grants/RLS, exact aggregate shape, account deletion exclusion and revoked sessions. Additional negative cases cover retired/missing UI-language content, missing table/access, a mismatched instrument hash and removal of an old rating after interpretation withdrawal. The POST check validates published metadata; full payload integrity and rendered-report availability remain guarded by the strict report resolver.

## Verification evidence

The isolated CI suite must pass on the final combined commit, including the interpretation dependency. Focused earlier commits are not release acceptance. The database suite exercises actual PostgreSQL RLS and concurrency; browser scripts use synthetic loopback accounts and the existing authentication protocol double.

- `scripts/verify-test-ratings.mjs`: EN/RU keyboard/focus, actual radio target sizes, 320/390/1280px reflow, save/reload/edit/conflict/retry/remove, missing and retired interpretations, five-account ranking, and explicit guest save/sign-in/claim followed by persisted voting.
- `scripts/verify-account-test-picker.mjs`: the actual My tests filter button, manual pending selection, filter/category/reset, detailed and dashboard Back, additive saving, and preservation of existing saved answers and a completed result.
- Both scripts write screenshots and `verification.json` into the existing browser artifact. Development-only WebKit hot-update navigation diagnostics are recorded separately; application/API errors and repeated navigation failures still fail the tests.
- Rating guest-session fixtures use a reserved documentation IP to isolate their rate bucket from later suites sharing the same loopback server. Production rate limits are unchanged.

Browser viewport checks are desktop-engine emulation, not physical-device or screen-reader certification. No live database migration is performed by these scripts.
