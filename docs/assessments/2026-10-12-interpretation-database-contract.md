# Proposed persisted interpretation base (not yet implemented or applied)

## Verified present state

- Technical metadata read on 2026-10-12: Supabase project `holistichouse`, schema `app.assessment_versions`, has definition key/version/instrument locale/translation, immutable definition JSON and hash, scoring key/version, result schema, and source metadata. These are scoring registrations, not a complete interpretation content database.
- Schema-only inspection found no interpretation/guidance table in `app`, `app_private` or `public`.
- `lib/app/repository.js:definitionChecked` and the guest counterpart compare the registered database definition and content hash against the source definition before scoring. This is a genuine database check, but it does not make JS interpretation prose database-backed.
- `buildAssessmentResultReport` currently reads the versioned source bundle, not a database table. The report now fails closed before all interpretation branches on incompatible provenance or dimension shape, including legacy special reports.
- Technical registration coverage is audited separately. No client tables were queried for this investigation. A denied BFAS registration is excluded from any live audit/read retry.

## Minimal new contract

A separate immutable `app.assessment_interpretation_versions` table, **not an alteration of an immutable assessment definition**, would hold:

- `assessment_version_id` FK to `app.assessment_versions(id)`
- Exact `definition_key`, `definition_version`, `instrument_locale`, `translation_version`, `instrument_content_hash`, `scoring_key`, `scoring_version`, `result_version` identity
- `ui_locale` (`en` or `ru`), separately from questionnaire language
- Immutable `interpretation_version` and `payload_hash`
- JSON payload with explicit dimension keys and supported shapes, prewritten construct/scoring/anchor/limit text, prewritten recommendations, independently attributed category rules, source/version/review status, and approved score-to-text selection rules
- Publication state and review metadata, with an exact unique versioned key; no silent same-version replacement

The payload must distinguish reviewed author guidance, original form, abstract-only scope and original HH reflections. Numeric response mapping must be declared per instrument, not inferred from all ranges. It must keep special Bach/MHC/compassion semantics.

## Runtime behavior

1. Fetch a record using exact instrument identity, score/result versions, report language and pinned interpretation revision. Never use title matching or a latest-version fallback.
2. Verify its hash, expected dimension keys/shapes and all score values before any category or suggestion is selected.
3. Assemble only prewritten text selected by explicit payload rules. Mechanical formatting of numbers does not authorize inventing an interpretation.
4. Attach the prepared report to results through existing authorized server repositories (account, guest, practitioner/shared and PDF inputs). Return interpretation identity/hash with it.
5. All report surfaces use the same payload and selection rules. Missing or mismatched content produces a visible “interpretation unavailable” state. The previous JS templates are not an automatic fallback.
6. Bulk-load the exact needed records for a response to avoid one query per dimension. Never return unrelated personal records.

## Access and release boundary

- Reuse the existing server-side backend role for read-only lookup. No client/anonymous writes, no new credential, no public Data API exposure and no SECURITY DEFINER function.
- Apply appropriate private-schema/table RLS and existing-role policy only after review. Any explicit grants/schema application require separate authorization/review; this document does not authorize them.
- Seed only reviewed non-personal content. Do not update `assessment_versions`, assessment answers, results, accounts or shared records.
- Deploy in coordinated stages: schema/seed verification, exact content coverage check, then runtime switch. Otherwise a strict runtime switch would make existing reports unavailable until seeding completes.
- Preserve old interpretation revisions for reproducibility. Review clinical/source content before marking a revision published.
- No live schema, seed or access changes have been made by this work.

## Acceptance evidence required

- Anti-join every runnable registered test/locale/score version against published interpretation keys: zero missing or incompatible identities, with excluded/blocked items explicitly listed.
- Every dimension has a complete declared valid-score domain and explicit prewritten interpretation/recommendation rules. Boundary and invalid values are tested.
- Unknown versions, wrong hashes, missing locales, missing dimensions, score/range mismatches and missing DB content fail closed across UI/Insights/PDF.
- EN/RU synthetic account and guest browser journeys, saved history, sharing/export consistency, query limits and unchanged account authorization tests.

This is an exact implementation plan, not a claim that the requested persisted database-backed report behavior is already delivered.
