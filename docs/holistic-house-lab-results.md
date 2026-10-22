# Holistic House — Private Laboratory Results v1 (2026-10-20)

## Owner journey
Signed-in client: **Profile → My laboratory results** `/{en|ru}/app/labs`.

1. Choose a CSV/TSV/TXT lab report (local browser parsing only) or paste a semicolon/tab/CSV table (column names in English or Russian). Manual input is supported. PDF/photo can be selected, but **OCR of scanned images is not available**; client must copy or manually transcribe numeric entries. Do not claim scanned PDF has been processed.
2. Inspect/correct each *indicator name, value, unit, lower and upper lab reference boundary*. Optional laboratory name and test date. A lab-provided *critical* flag is never inferred.
3. Explicitly check confirmation that transcription and limits match the original laboratory report; POST to private API.
4. Compare against the **specific reported lab reference bounds only**. `low`, `high`, `within`, or `unrated` (any incomplete/one-sided range). No invented normative levels.
5. Show grouping into seven non-medical action prompts: verify values; gather history; collect symptoms/medicine context; prepare questions; review sleep/food/movement/stress; discuss with qualified healthcare clinician; record follow-up. The plan does **not** prescribe medications, supplements, lab tests, remedies, doses, cure claims, or diagnoses.
6. Display saved encrypted structured reports (max 24, max 100 metrics per report), delete individual reports, and describe raw changes only for matching indicator name **and unit**; never imply direction equals progress.

## Integration
- Frontend: `components/app/lab-results.jsx` + `.module.css`; account nav in `app-workspace.jsx`; Profile link in `profile-domains.jsx`.
- Pure parser and review: `lib/labs/analysis.mjs`. No third-party AI/OCR sends.
- Authenticated endpoints: `GET /api/app/labs`, `POST /api/app/labs`, `POST /api/app/labs/:id/delete`. Existing verified Supabase session, same-origin POST, exact `X-HH-Account-ID`, app throttle, private no-store headers.
- DB: `app_private.lab_reports`, backend-only grants, **FORCE RLS**, account-owner policies, cascade on account deletion, index by owner/date.
- Persistence: **AES-256-GCM**, per-account, per-record, field-scoped encryption, as in existing private Cabinet. No original file or unconfirmed input content stored or transferred.
- `GET /api/app/export` includes structured report history; existing account deletion cascades. Clinical data never appears in open marketing, SEO, shared practitioner CRM or automatically shared reports.
- English and Russian; ES only when Cabinet ES is supported.

## Safety/compliance release gates
1. Apply migration to correct Supabase project and verify ownership/RLS/permissions, policy evaluation and account isolation.
2. Test parser corner cases (locale, comma decimals, quoted CSV, invalid dates, missing bounds), unit tests, frontend build and client mobile layout.
3. Two account real-session verification: owner can create, export and delete; second account cannot enumerate/find/modify; guest cannot access; archived/deleting account denied.
4. Confirm encryption key management, retention/deletion and backup policy; perform Canadian privacy review before enabling real client PHI input.
5. Ensure **no health PHI in application analytics, request logs, error telemetry or external AI providers**; test with synthetic data only.
6. Validate responsible copy on page and urgent lab-critical behavior using clinical reviewers; there is no automatic clinical triage.

## Next milestones
- Phase 2: controlled browser-local parsing of digitally selectable PDF tables where accurate; prevent ambiguous numeric units.
- Phase 3: privacy-reviewed OCR for scanned PDFs and photos, human verification of every extracted number/range, explicit consent to any external processor, documented retention and accuracy QA. Do not silently upload to generic AI.
- Phase 4: clinical review workflows (patient opt-in and separately authorized clinician credentials), doctor-reviewed recommendations, vetted educational guide links, and date-based reminders. Do not connect lab deviations to homeopathic prescribing or automated treatment decisions.
- Phase 5: versioned clinical terminology (LOINC where licensed/appropriate), method-specific units, population/age/sex/medication context, unit conversions *only if validated*, alerts according to reviewed clinical protocols.

## QA
`node --test tests/lab-results.test.mjs` (safe synthetic samples)
`npm run build` / Next/React strict validation in project CI.
Preview deploy and authenticated smoke testing before production alias.
