# Canonical client documents implementation plan

Goal: deliver the user-approved Drive templates in the existing admin workflow, preview only.
Architecture: build on PR #16 (74fc134) and retain encrypted storage, fragment exchanges and scoped HttpOnly sessions. Payment records and recommendation records have distinct identities and client projections. A shared native PDF letterhead uses the approved lighthouse, A4 geometry and bundled Cyrillic font. No clinical defaults.

- [x] Audit PRs #9, #13, #16, #17 and Drive specification; inspect rendered master PDFs.
- [x] Isolate worktree; baseline prescription/security tests: 28 passed.
- [ ] Add payment domain validation and wording tests, implement independent invoice/receipt records.
- [ ] Add canonical recommendation fields and shared letterhead/PDF layout; cover Cyrillic, links, wrapping, pagination and absence of private metadata.
- [ ] Wire separate admin payment and recommendation panels, authenticated previews/PDFs and existing client session routes; preserve no-store/noindex/PWA exclusions.
- [ ] Generate only synthetic Receipt, Invoice and Recommendation PDFs. Render and inspect masters and generated files, including RU and long documents.
- [ ] Verify admin workflow and mobile client page with browser; run unit/lint/build checks.
- [ ] Commit, push, create stacked PR and preview; verify preview without production writes. Record any hosted storage/auth limitation precisely.

Sources: docs/document-templates/README.md and the private Drive folder linked there. Real filled receipts are not downloaded or committed. Local master downloads and evidence stay in ignored tmp/output folders; only approved lighthouse asset enters product source.

Delivery docs: repo-local AGENTS and three delivery docs absent; central management-delivery/docs fallback supplies all three. Full verification workflow applies with the user's explicit preview-only release boundary. Existing unrelated changes in books checkout remain untouched.
