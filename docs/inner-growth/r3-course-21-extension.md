# R3 daily-only 21-day extension (release-gated draft)

Baseline includes the selected-scale lesson save fix in PR406 and reconciled canonical `e4cb2c49d46b9729f51afe20cfa15fe8eec7665a`. No live database or configuration changes have been applied.

## Product boundary

The accepted R3 intake, editable account test picker, results reuse, and measured-profile stages remain the entry point. The new route adds a separately consented 21-learning-day programme. It does not silently migrate or overwrite existing 14-day cycles. A saved 21-day programme pins its selected results, exact forms, content version and interpretation payload versions. A newer assessment does not rewrite its initial profile.

The curriculum contains 126 original bilingual day/topic variants, three weekly goals, standalone recaps, specific outcomes, brief practices, everyday actions, aphorisms and optional reflection. It is original educational draft content, not a clinically validated treatment or a guarantee that a habit forms in 21 days.

The requested scenario and implementation gap map are saved in the owner’s private course design document. Its private link is intentionally omitted from this public-source candidate.

## Evidence and consent

- Exact registered definition IDs, complete provenance, form language, dimension shape, scalar attainability and seven explicit aggregate identities are checked before a result can populate the profile.
- Source-verified polarity is distinct from population norms. A position within a registered range is not a health percentage or a valid clinical comparison across tests.
- PHQ/GAD/Kessler/CES-D screening results remain visible with prepared meanings, but are not ranked as daily practice deficits. Mixed-polarity HH composites are also excluded from automatic deficit targets. Descriptive traits do not become deficiencies.
- RU display of an explicitly selected EN form preserves the EN instrument identity. Localized labels never switch the administered form.
- Prepared interpretation envelopes v1/v2 must be database-origin and exact-identity/score matched. Missing, retired, changed or malformed meanings produce an unavailable state. Static scale-guide prose is not a fallback.
- The activation token is a10-minute HMAC over the authenticated actor, R3 and plan revision, exact forms/results, profile eligibility and interpretation hashes. Activation re-reads evidence while locking the owner/source course and selected plan.
- New unchecked21-day consent is required. Private text needs a separate boolean opt-in on each finish request. Saved free text is bounded to1000 characters, encrypted, and not externally transmitted or automatically semantically interpreted. Applying structured feedback is a separate decision. A separate user-invoked local phrase helper can suggest a supported practice preference from a complete allowlisted EN/RU statement of at most240 characters. It sends nothing until the client confirms a specific reversible preference. That POST contains only existing preference fields, never the note/excerpt/hash; saving the note still requires its own consent. Any unrecognized or additional context yields no suggestion, without implying that the text is safe or understood.

## Storage and API

New table: `app_private.growth_course_daily_21`.

The migration was created with the official Supabase CLI, then written locally: `20261012181823_hh_course_r3_daily_21.sql`. It adds an owner-bound composite foreign key to the existing R3 course, fixed model/content/source identity, encrypted daily state, consent timestamp, progress revision and status. RLS is enabled and forced. The existing restricted backend gets SELECT/INSERT plus UPDATE of only state_ciphertext/status/revision/updated_at. There is no DELETE grant or anonymous/authenticated/inbox access. Live application and new persistent table grants require separate action-time review and approval.

Endpoints use the existing verified-session, rate limit, same-origin and private/no-store API boundary:

- GET `/api/app/course-21/preview`: authoritative profile and short-lived activation token.
- GET `/api/app/course-21`: owned saved daily state; optional exact history day.
- POST `/api/app/course-21`: activate, check-in, finish-day, pause, resume or preferences.
- Existing owner export includes saved check-ins and opted-in notes directly, even if enrolment is disabled or the current interpretation loader is unavailable. A missing optional table is distinguished from permission/connection failures.

There is no second intake/test plan and no new copy of questionnaire answers. Old R3 edit-intake/choose-goals requests from stale tabs reject after a new21-day programme exists, so they cannot create an unintended parallel14-day cycle. Before the optional new table exists, the old flow is unchanged.

## Progression

One new lesson can follow completion or explicit skip on a subsequent local date. Absence does not consume a learning day. Check-ins must be refreshed on the current local date or explicitly skipped. Low energy, reported worsening, short available time or explicitly applied feedback can select a shorter prepared version; none increases intensity. Discomfort offers rest/stop or an explicitly requested prepared grounding alternative. Repeats require the exact stored lesson ID and pinned content version. Skipped sessions do not masquerade as completed helpful repeats. Saved daily feedback, notes and reflection are readable in history, separately from unsent drafts. The personal outline uses the same selected-track/day selector as the actual lessons and history, showing exact titles and specific outcomes. Before selection, only a labelled general weekly overview is displayed.

## Release dependency and current evidence

The production repository factory deliberately has no database interpretation loader until the separately reviewed interpretation release is available. Its default cannot activate a new programme. Both `HH_APP_COURSE_21_ENABLED` and `HH_APP_COURSE_21_RELEASE_APPROVED` default to false. This is an explicit pending integration dependency, not delivered production functionality.

## Open completion checklist

- Structured helpfulness/difficulty/comfort adaptation is implemented with explicit opt-in. The local phrase helper additionally supports a few ordinary exercise preferences, with a separate preview and confirmation. This is not general interpretation of free comments/reflections, AI-generated personalization or a safety monitor. The broader free-text requirement remains only partially covered pending explicit acceptance of this bounded scope or a separately reviewed implementation.
- Connect and verify the released exact-key/version/hash database interpretation loader. No held interpretation-release source or payload is copied here.
- Complete exact-head Chromium/WebKit acceptance and inspect the artifacts. The mocked-DTO course context blocks service workers so Playwright can intercept its fixtures; it explicitly excludes SW/PWA acceptance. A real SW-enabled course journey remains required after loader/database release.
- Obtain separate action-time approval before any live DDL/grants; do not enable either course flag before release acceptance.

## Verification record

Initial published head `5b6d4b674bf7f11925366bd2eb15ce2283209bdf` passed CI production build, types/lint, existing database checks and the new actual PostgreSQL17 suite8/8. Its first browser iteration exposed service-worker bypass of the mocked fixture; that harness defect was corrected in `4b1de9ea03fa73856c6f64eaa870c07f33153721`, retaining all assertions and adding fulfilled-fixture markers and failure diagnostics. Neither is a claim of production acceptance.

The local build before publication ended with webpack-worker SIGKILL; it was not a pass. Current local follow-up checks:44 pure model/content/adapter/phrase tests,14 synthetic repository tests,22 UI handler/SSR checks, full unit1134/1134 and app170/170 pass. The locale round-trip confirmation defect found by independent review was fixed with a regression test. New local changes still require their own exact-head CI and final review. No live database or configuration changes have been applied.
