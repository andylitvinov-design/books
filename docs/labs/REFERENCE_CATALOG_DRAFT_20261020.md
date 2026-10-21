# Laboratory indicator and reference catalog — PRIVATE DRAFT (2026-10-20)

**STATUS: DEVELOPMENT ONLY. DO NOT MERGE, DEPLOY, RUN THE MIGRATION OR ENABLE AUTOMATIC PATIENT CLASSIFICATION.**

Canonical code: `lib/labs/reference-catalog.mjs` and `lib/labs/reference-engine.mjs`. This is an additive versioned **public terminology/reference dataset**, not a second patient record database. Existing encrypted account-scoped reports remain in `app_private.lab_reports`; no production Supabase tables or policies are altered by this draft.

## First data slice
- **61 distinct analytes** across CBC, iron, glucose regulation, lipids, liver, kidney, electrolytes, thyroid, nutrition, inflammation and urinalysis.
- EN/RU/ES display names, strict exact-match synonyms, category, specimen and a preferred storage/display unit for each analyte.
- **67 structured interval records**, covering hemoglobin, WBC, RBC, MCV, hematocrit, platelets, plasma alkaline phosphatase, plasma TSH, plasma creatinine and plasma ferritin, with age/sex partitions where their reference source actually supplies them.
- The numbers are **source-laboratory-specific educational examples** (University of Iowa); they are **not verified ranges for Canadian labs or Holistic House users**. No data for another lab is synthesized or extrapolated. Entries are not clinically approved.
- Sources include laboratory name, original URL, method, specimen, review date and explicit laboratory-specific scope.

Examples demonstrating why age matters (not universal medical cutoffs):
| Example from University of Iowa | Age/context | Reference range | Unit |
|---|---|---|---|
| Hemoglobin | Full-term 0–<31 days, either sex | 13.4–19.9 | g/dL |
| Hemoglobin | Full-term 2–<3 months, either sex | 9.0–14.1 | g/dL |
| Hemoglobin | Age 18+, male reference partition | 13.2–17.7 | g/dL |
| Hemoglobin | Age 18+, female reference partition | 11.9–15.5 | g/dL |
| Plasma ALP | Age 13–<15 y, male reference partition | 116–468 | U/L |
| Plasma ALP | Age 13–<15 y, female reference partition | 57–254 | U/L |
| Plasma TSH | Age 1–<12 months, any sex partition | 1.03–6.80 | mIU/L |
| Plasma TSH | Age 19+, any sex partition | 0.27–4.20 | mIU/L |
| Plasma creatinine | Age 16+, male reference partition | 0.67–1.17 | mg/dL |

These examples are only reproduced in the draft source-specific catalog with provenance, **never inserted into patient missing lower/upper bounds**.

## Source/provenance register
1. [University of Iowa — Hemoglobin](https://www.healthcare.uiowa.edu/path_handbook/handbook/test960.html): EDTA whole blood, colorimetric; sex and age partitions.
2. [University of Iowa — WBC Count](https://www.healthcare.uiowa.edu/path_handbook/handbook/test1977.html): EDTA whole blood, flow cytometry; age partitions.
3. [University of Iowa — CBC](https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test299.html): EDTA blood; RBC, MCV, adult hematocrit/platelets. Verify method-specific ranges before application.
4. [University of Iowa — Alkaline Phosphatase](https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test1487.html): plasma, colorimetric; age and sex partitions.
5. [University of Iowa — TSH](https://www.healthcare.uiowa.edu/path_handbook/handbook/test1827.html): plasma, electrochemiluminescence immunoassay; adult and pediatric partitions updated April 2026. **Newborn <1 month TSH bands are deliberately omitted** because an exact 48-hour boundary cannot be resolved with date-only input.
6. [University of Iowa — Creatinine](https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test530.html): plasma, enzymatic colorimetric; neonatal/child/16+ partitions. Creatinine mg/dL → µmol/L factor 88.4 is whitelisted for reference example display only.
7. [University of Iowa — Ferritin](https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test793.html): plasma, ECL immunoassay; adult manufacturer interval. The **0–20 ng/mL clinical deficiency threshold is not a reference interval** and was NOT imported as a reference range.
8. [SickKids CALIPER pediatric reference database](https://caliperproject.ca/caliper/database/): future method/platform-specific enrichment after individual interval extraction, permissions/clinical validation and citations. **No bulk/direct CALIPER database data has been imported**; the University of Iowa's TSH page credits CALIPER pediatric research.
9. [MedlinePlus — Understanding Lab Results](https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/): lab-specific ranges, variable methods and individual context.
10. [CLSI EP28](https://clsi.org/shop/standards/ep28/): clinical laboratory establishment/verification of reference intervals.

Last manual source check: 2026-10-20. This is not a claim that a healthcare professional has reviewed the data.

## Matching and status workflow (release design)
1. **Extract locally**: existing CSV/TSV/TXT parsing; no unsupported claim that PDFs/photos were scanned. Later, selectable PDF text / on-device image OCR only after opt-in and accuracy tests.
2. **Recognize the test** using exact normalized aliases and specimen; ambiguous or unrecognized names go to manual review. No fuzzy substring guessing, invented test names or LOINC mappings.
3. **Verify values and units**. Reference units can be converted only by the small, explicit, analytically safe whitelist implemented in `reference-engine.mjs`. No formula-based guessing from string suffixes.
4. **Context at sample date**: age in calendar months and exact neonatal days, plus sex-related source partitions when relevant. Calculate locally; **do not store DOB just to select a range**. Pregnancy, prematurity, wrong specimen, missing sex/age, unknown method or missing units must not silently yield a clinical category. The draft resolver returns an educational example only.
5. **Trust the actual lab report**, not this catalog, for low/high/within/unknown flags. If original bounds are missing or one-sided, show **unrated / ask the lab**, not normal. Lab-marked criticality is a separate field: do not infer an emergency threshold from this educational database.
6. **Human review and explicit confirmation** before any structured lab result is stored by the existing encrypted private account API. Do not copy report scans, patient names, DOB or raw pasted text into the public catalog, source repository, analytics, errors or an AI provider.
7. **Interpretation** remains an explanation and questions for a qualified healthcare practitioner; no diagnosis, prognosis, supplement/remedy/treatment selection, or clinically unverified seven-day prescriptions.

### Different concepts that must stay separate
- **Reference interval:** typically a laboratory's population distribution, often assay-, age- and sex-specific.
- **Clinical decision threshold:** e.g., risk-driven lipids or glycemic markers; not interchangeable with 2.5–97.5 percentile reference intervals.
- **Individual clinical target:** may depend on diagnoses, treatment and shared clinical decisions.

Do not use one datatype/field as a replacement for another. Future registry rows need `kind = reference_interval | decision_limit | personalized_target` plus qualifiers, source, method, clinical review and approval.

## Future record schema (not a live migration)
`analyte: { id, names:{en,ru,es}, aliases, specimen, unit, loinc?:verified_only }`

`reference: { analyteId, sourceId, valueLow, valueHigh, age: { minMonths,maxMonthsExclusive,minDays,maxDaysExclusive }, sex: any|male|female, specimen, method, unit, referenceType, provenance, reviewedOn, reviewer, approved }`

A catalog table in Supabase is **not yet necessary**: versioned deterministic build-time JS is cheaper, auditable and never contains PHI. Convert to separately versioned **read-only** catalog tables only when multi-source curation and controlled releases require it. Do not duplicate `app_private.lab_reports`.

## Safety/QA gates before any UI activation
- Independent licensed clinical laboratory reviewer verifies each individual age/sex/method interval against the actual target population and analyzer platform, plus the source permission/licensing terms.
- Validate sample collection date, specimen, fasting status, pregnancy, neonatal gestational age, sex-context relevance, method/platform, missing limits, one-sided limits, borderline results, pathology flags, and unit precision.
- Confirm no result can be auto-labelled `within` from an imported non-lab-specific interval; create clinical decisions only after an explicitly approved rule set.
- Synthetic English/Russian/Spanish PDF and image QA: rotated, low resolution, mixed units, decimal commas, extra decimals, censoring (`<`, `>`), tables over multiple pages. **OCR should always require per-number user verification**.
- Full private-account security/E2E: authentication, two-account isolation, AES-GCM, FORCE RLS, export/deletion, retention/backup, no health payload leakage to analytics, marketing, messages, push, public URLs or practitioners.
- Accessibility/mobile width 320–430 px and real device flow: file choice → recognition → manual verification → account save → history → deletion.
- Separate owner approval before production merge/deploy. **No paid OCR/AI, no external health data API or outbound PHI transfer without permission.**

## Commands and current draft-only state
`node --test tests/lab-reference-catalog.test.mjs tests/lab-results.test.mjs`

The draft reference engine has no imports of browser/client code and is not wired to production UI or API. No database migration was applied and no external report data was used. GitHub CI, Next build, Supabase RLS and real-device E2E remain separate release gates, **not implied by offline tests**.
