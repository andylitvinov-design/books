# Remedy status and Aconitum implementation

User-supplied specification is the approved design. Deliver a reviewed Preview only; do not merge or deploy Production.

## Design
- Canonical Markdown remains the source of published routes; add only Aconitum from author message31. Preserve the existing 188 files.
- A separate provenance registry records known names, aliases, source references and review status. Server validation derives canonical/source-only/custom identity and ignores submitted status.
- Both admin editors share name search, explicit custom selection and status badges. Client pages and PDFs show only canonical links or plain names, with optional clinical fields left empty. Preserve import preview/apply/undo.
- Audit all 22 prior mention-only records and classify Aconitum supplementary sources separately. Other candidates remain unpublished pending review.

## Execution and validation
1. Complete independent source audit, canonical content and admin editor work.
2. Integrate server validation, shared registry, admin route options and dynamic Book02 counts.
3. Run domain, search, mixed-document, import and content preservation regressions; run all tests, lint and production build. Check runtime tracing.
4. Review changes, commit and open a PR against codex/public-book-library.
5. Deploy Preview using isolated preview storage; run synthetic hosted acceptance, inspect bilingual PDFs and capture requested screens.
6. Report source counts, routes, evidence and review checkpoint. Production remains unchanged.
