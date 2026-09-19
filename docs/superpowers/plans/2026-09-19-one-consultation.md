# One consultation implementation plan

> Execution: superpowers:subagent-driven-development. User's supplied workflow is the approved design; stop at review, never deploy production.

**Goal:** Client and canonical remedy names create two independently secured bilingual documents in one action.
**Architecture:** Keep existing recommendation record as logical consultation and link payment by its existing paymentDocumentId/consultationId fields. Add a store atomic pair write (single encrypted Redis MSET, synchronous memory commit). Validate both before writing; issue independent access credentials only through existing protected endpoint. Owner link component caches freshly issued credentials in memory so EN/RU copy does not rotate twice. No raw secret stored in database/browser storage.
**Stack:** Next.js server actions, React, existing encrypted REST store and native PDF renderer.

## Audit
Existing forms create records separately; recommendation exposes clinical fields. Existing projections support name-only items and both languages. Existing client actions lack language switch; link issuer always rotates and copies English. Login directs to old recommendation form. Existing signed templates and security remain the baseline.

## Tasks
- [x] Domain/store: create and update validated pair with defaults CAD230/received/Individual consultation, fixed identity and canonical-only items; atomic pair write and idempotent create key; tests for invalid input, partial failures, retry, preserved access and fields.
- [x] UI/routes: /admin/consultations/new and /admin/consultations/[id] result plus /edit; short form, collapsed optional details, canonical autocomplete with aliases/abbreviations; defaults and useful validation. Login and owner header link new route.
- [x] Access UX: copy EN/RU using same issued credentials per document, separate documents remain independently secured; no displayed tokens. Client language switch retains session. Result actions Open/PDF/Print/revoke; edit updates paired client/date without recreating records.
- [ ] Verification: unit and security regression, lint/build; synthetic Test Client + arsenicum-album/natrum-muriaticum/gelsemium; four private routes, four PDFs and links, session language switch, signature and lighthouse, no clinical invention. Seven requested screenshots. Review and update PR23 and Preview with proof.

Implementation audit correction: existing client documents already had locale navigation. New owner link retrieval uses versioned HMAC derivation from the existing server secret with hash-only storage and CAS issuance, replacing the initially planned mount-only credential cache. 158 tests, JSX-inclusive lint and local production build pass. Bounded independent source/security review approved; screenshots and four PDFs generated from the exact synthetic UI flow.
