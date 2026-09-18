# Signed document templates implementation plan

> Use superpowers:subagent-driven-development for independent implementation and review.

**Goal:** Match the owner's approved signed receipt and recommendation masters in PDF and responsive client pages; deliver preview only.

**Architecture:** Extend the existing deterministic native PDF renderer and shared web document components. Keep payment and recommendation records independent and retain existing authorization, fragment exchange, encrypted store and active-only projections. Use the exact approved signature bytes and measured master geometry; never substitute a generated signature.

**Baseline:** `origin/codex/public-book-library`, commit `2f665ca`. Original checkout contains unrelated changes and is preserved.

## Steps

- [x] Audit current templates, fields, private routes and canonical branch.
- [ ] Obtain `andrii-signature-left-90.png` and the exact `Signed_Left_LargeSignature` masters; inspect rendered pages and record SHA-256 provenance. Commit only the signature and blank templates, never the filled client reference.
- [x] Add optional `paymentMethod` through validation, public projection, server action, form, web and PDF. Test preservation through paid/revoked updates, absent legacy values and excessive length rejection.
- [x] Centralize PDF/web recommendation labels. Preserve exact practitioner identity and payment wording; avoid clinical inference. Layout constants await the exact final masters.
- [ ] Embed the approved original PNG in the shared web signature block and native PDF image resources. Reserve measured vertical space before signature placement so multi-page content cannot overlap it. Trace assets into all PDF routes.
- [x] Add a two-remedy synthetic recommendation, shared paid/unpaid fixtures and byte-determinism tests. Signature image assertions await the approved asset.
- [ ] Run unit tests, JSX lint, production build, synthetic generation and rendered master comparison. Verify local authenticated synthetic save/link/PDF/revoke flow and hosted Preview sample routes without using production storage.
- [ ] Push branch, open PR against canonical branch, verify Ready Preview and return PDFs/screenshots/assets/tests. Stop for review; no merge or production deployment.

## Source availability — 2026-09-18

The known approved Drive folder contains older `Receipt_Master_Template_Signed.pdf` and `Homeopathic_Recommendation_Master_Template_Signed.pdf`, but none of the exact requested `Signed_Left_LargeSignature` filenames. Exact-name and broader filename searches across accessible Drive and likely local locations did not find the rotated signature PNG or final masters. Requested their local folder or Drive location from the owner. Signature embedding and final visual acceptance depend on those sources; unrelated field work can proceed.

## Verification commands

`npm run test:unit`; `npm run lint -- --ext .jsx`; `npm run build`; `node scripts/generate-document-samples.mjs`; render generated PDFs with `pdftoppm`, inspect images and parse text/page bounds with `pdfplumber`.

## Preparation checkpoint

139 unit tests pass; JSX-inclusive lint has zero errors and ten existing archive warnings; production build passes locally. Seven synthetic PDFs generate successfully. Parsed page bounds show zero out-of-page glyphs, ordinary documents are one page, the long recommendation is 11 pages with 24 remedy links. The two-remedy sample contains two links in RU and EN. Independent bounded review found no actionable defects.

These are unsigned preparation artifacts, not approved signed-template deliverables. No signature was recreated or taken from an older master. Production and production data were not changed. Final PDF visual acceptance, PR/Preview review package and automatic signature confirmation remain pending the exact source assets.
