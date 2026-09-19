# Consultation workflow — review checkpoint

Preview only. Production and production data remain unchanged. Built on PR #23 with all approved signed document assets preserved.

## Current-state audit

Before this change, recommendation and payment used separate creation forms; recommendation exposed clinical fields. Language rendering and canonical remedy/PDF links already worked. Both client document types already had locale navigation. The owner link issuer only copied English and rotated credentials every time. Payment association existed as a one-way reference, without an atomic paired save or a compact result screen.

## Implemented

- `/admin/consultations/new`: client, date (today), client language, canonical remedy names and Paid/Unpaid. Payment defaults: CAD230, Individual consultation, one consultation, same issue/service date. Payment settings and all clinical fields are collapsed and optional.
- Autocomplete uses canonical Latin names, Russian names, aliases and word-prefix abbreviations, including `nat mur`. Selecting a canonical result is mandatory; no pages or clinical content are generated.
- One submit creates linked active Recommendation and Receipt/Invoice, with atomic encrypted pair writes and idempotent retries. Existing signed templates and fixed identity are reused.
- Documents Ready provides copy EN/RU, Open, PDF, Print, Edit consultation and separate revoke controls. Paired edits preserve identities/access and reject stale forms. Existing legacy documents retain their previous controls.
- Owner copy uses versioned, domain-separated HMAC derivation and authenticated same-origin retrieval. Only a hash is stored; repeated copying across reloads/locales does not rotate links. Separate documents use independent selectors/secrets. Key mismatch and legacy credentials fail closed; no silent replacement. Atomic access issuance prevents revocation races.
- Existing client fragment exchange/HttpOnly session protection, no-store/noindex, public projections and sitemap exclusion remain. Fragment is cleared on initial load and hash-only reopening.

## Verification

- Exact synthetic flow: Test Client, 2026-09-18, Arsenicum Album, Natrum Muriaticum, Gelsemium, default CAD230/Paid/English. Both documents created with one submission; recommendation has no clinical details or payment fields, receipt has no remedies.
- Four client PDF routes returned 200 with EN/RU content. Four downloaded PDFs are one page, preserve exact approved signature pixels; recommendation PDFs contain three locale-correct canonical hyperlinks.
- EN/RU private receipt and recommendation links tested; locale switch uses the same document/session. English and Russian copy after reload preserves access. Separate receipt revocation verified.
- Unauthorized form and owner-link requests return404; private PDF no-store/noindex verified. Existing security tests plus CAS, idempotent pair writes, owner-link recovery, key changes, legacy handling and revocation-race tests cover regressions.
- Automated warm form input and submission:6.3 seconds (not a human usability study).
- Seven requested UI screenshots and four PDFs are local review artifacts under `output/consultation/`; no real client data used.

Tests/lint/build and final hosted Preview status are recorded in the PR. Redis Lua behavior is covered by transport fixtures; no production Redis tests were run. Full stateful browser acceptance uses an isolated local memory store with temporary QA credentials, never production storage.
