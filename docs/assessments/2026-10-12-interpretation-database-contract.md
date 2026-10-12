# Persisted interpretation base: implementation and release boundary

## Verified present state

- Technical metadata read on 2026-10-12: Supabase project `holistichouse`, schema `app.assessment_versions`, has definition key/version/instrument locale/translation, immutable definition JSON and hash, scoring key/version, result schema, and source metadata. These are scoring registrations, not a complete interpretation content database.
- Schema-only inspection found no interpretation/guidance table in `app`, `app_private` or `public`.
- `lib/app/repository.js:definitionChecked` and the guest counterpart compare the registered database definition and content hash against the source definition before scoring. This is a genuine database check, but it does not make JS interpretation prose database-backed.
- `buildAssessmentResultReport` previously read the versioned source bundle. The new runtime accepts only a selected database-origin report with exact identity, revision and hash metadata. The authoring compiler is a separate build-time module and is never a runtime fallback.
- Technical registration coverage is audited separately. No client tables were queried for this investigation. A denied BFAS registration is excluded from any live audit/read retry.

## Minimal new contract

The proposed SQL creates a separate immutable `app.assessment_interpretation_versions` table, **not an alteration of an immutable assessment definition**, holding:

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

## Implemented candidate (not yet deployed)

- `scripts/build-assessment-interpretations.mjs` compiles reviewed EN/RU content into `data/assessment-interpretations/2026-10-12.v1.json.gz`: 356 content records for 178 exact registered forms at canonical 575f876, including two historical forms. Each numeric scale has its own exhaustive valid-score domain; template placeholders are declared by the stored content. No Cartesian product of subscales is generated. CBI means include legitimate two-decimal rounded values.
- `scripts/seed-assessment-interpretations.mjs` verifies each artifact hash and registered definition; existing same-key different content is rejected, not overwritten. It never auto-connects to a live database. `--check` validates without writing.
- `lib/app/interpretations.js` bulk-loads only exact needed definition IDs and the pinned content revision for EN/RU after existing authorized repository selection, verifies every identity field and canonical SHA-256, and prepares the selected report. The common transaction boundary covers full result responses; limited shared excerpts remain byte-for-byte unchanged and receive no extra content or access.
- `lib/assessments/stored-interpretation.js` resolves only stored templates/rules. Numeric results, Bach weighted profiles, the preserved MHC/compassion guidance and all four original typology rules/names/templates use stored content. Typology rules are required by the expected instrument key, so deleting their payload flag cannot silently drop the type summary. Missing, duplicate, malformed or mismatched records produce unavailable without static fallback.
- UI, Insights and PDF consume the same prepared report. PDF explicitly prints missing-interpretation status and uses prepared practical steps, not independent construct-based advice.
- Proposed SQL has ENABLE/FORCE RLS, SELECT only for existing `hh_app_backend`, published/retired status, immutable content UPDATE protection and a DELETE prohibition to preserve history. No new function/role/credential/client grant is introduced.
- Test DB setup applies the proposed schema and inserts only synthetic prepared content into an isolated empty database. This is not a production migration.

Independent baseline review: 170/170 source definitions match published DB technical registration; 340 content records/696 scale-language entries; all 11,928 numeric values and 6,956 Bach weights have exact domain coverage and text parity. Integrated review adds all eight exact registered typology forms: 356 records, 13,692 numeric cases, 6,956 Bach weights and 11,548 typology tie/near/far scenarios pass; 192 malformed typology rule cases fail closed. Methodology and nonvalidated original-type limits are preserved.

**Release remains blocked until final integrated seed/runtime CI, review, and coordinated schema/content application. No live schema, seed or access changes have been made by this work.**

## Offline SQL release artifact

Run `node scripts/prepare-assessment-interpretation-sql.mjs <offline-output-directory>`. This only writes reviewable files and SHA-256 manifest, with no connection. The artifact contains schema SQL, one atomic full-content transaction, optional four-record transport batches and readback SQL. Prefer the atomic transaction. Optional batches are individually repeatable but a partial set is not release-ready; do not switch runtime until all 356 exact records are verified.

The SQL locks only the new content table for insertion, checks the full immutable registered definition and duplicated identity, recomputes SHA-256 from the canonical payload text with PostgreSQL's built-in hash function, and rejects an existing same-key record with different text/hash/identity/status. It does not overwrite or touch client tables. The isolated PostgreSQL 17 CI executes this exact generated SQL, then checks the JS migrator sees every record unchanged. Published rows can be retired, never edited or deleted through the content contract.
