# Canonical document generator — preview review

Implementation branch: `codex/canonical-documents`. Stacked PR: [#18](https://github.com/andylitvinov-design/books/pull/18), based on security PR [#16](https://github.com/andylitvinov-design/books/pull/16), commit `74fc134`. Template specification copied from [#17](https://github.com/andylitvinov-design/books/pull/17). No production deployment or merge is authorized by this review.

## Outcome

Payment records and recommendation records are independent. Saving a recommendation exposes the Payment document and Recommendation panels. A standalone payment form is also available. Unpaid payment documents are invoices; marking paid preserves the exact minor-unit amount and existing record identity. Payment links can be revoked and reactivated without reviving old access. Client/PDF projections omit administrative identifiers, private notes, access details and fields belonging to the other document type.

The shared A4 renderer embeds the approved lighthouse and a bundled Noto Sans font for native Cyrillic. Header, muted palette, divider, whitespace, receipt signature positioning and recommendation sections follow the Drive masters. Clinical fields have no generated defaults. Remedy names link to canonical RU/EN profiles in HTML and PDF.

## Evidence and checks

| Requirement | Result | Evidence |
|---|---|---|
| Existing work and authoritative templates | PASS | PRs #9/#13/#16/#17 inspected; Drive specification and both rendered master PDFs reviewed |
| Separate payment/recommendation records | PASS | Payment projection/domain and cross-session isolation tests |
| Receipt versus invoice wording | PASS | Payment tests; local UI unpaid → paid kept CAD 150.00; hosted invoice/receipt inspected |
| Canonical layout and native Cyrillic | PASS | Seven synthetic PDFs parsed and rendered; all character bounds inside A4; ordinary samples each one page |
| Longer recommendation | PASS | 24-item stress fixture generates 13 pages; text and hyperlinks preserved |
| Manual clinical fields and canonical autocomplete | PASS | Local admin save using canonical Arsenicum Album; purpose/stage/follow-up projection tests |
| Preview/PDF/print/private-link controls | PASS | Local authenticated admin and fragment-exchange client page; handler tests; hosted native sample PDFs downloaded |
| Private headers and no sitemap/PWA cache | PASS | Existing security tests, reused private paths, explicit sample-route no-store/noindex/network-only rules |
| Mobile client page | PASS | Browser at 390×844; document width 366px, viewport/content width both 390px; screenshot captured |
| Unit tests | PASS | `node --test tests/**/*.test.mjs`: 125 passed, 0 failed |
| Lint | PASS | `npm run lint -- --ext .jsx`: 0 errors, 10 pre-existing raw-source warnings; changed application code clean |
| Production build | PASS | Vercel Git integration runs `next build`; compile, prerender, file trace and serverless build completed in 40s |
| Hosted synthetic review | PASS | Receipt, Invoice and Recommendation pages inspected in signed-in Vercel browser; native PDF downloads verified |
| Full hosted admin storage workflow | NOT VERIFIED | This branch has no Preview admin credential or persistent private KV configuration; no production resources were connected |
| Under-one-minute usability target | NOT TIMED | Single form save plus download/link actions; no formal timed usability session claimed |
| Production unchanged | PASS | Preview-only branch and draft PR; no merge or production alias/deployment mutation |

## Visual comparison

Approved masters are the visual authority. The generated layout follows their approximately 68pt margins, small lighthouse, name to the right, thin divider, serif document headings, restrained body typography and lower signature. Body uses embedded Noto Sans for reliable Cyrillic; serif headings use PDF Times fonts. This is a close reproduction, not a pixel-identical font match. The recommendation footer includes contact details required by the task, in addition to the master's compact signature.

Local review artifacts (ignored, not committed):

- `output/pdf/synthetic-receipt.pdf`, `synthetic-invoice.pdf`, `synthetic-recommendation.pdf`.
- RU variants and `synthetic-recommendation-long.pdf`.
- `output/pdf/receipt-comparison.png`, `recommendation-comparison.png` (master left, generated right).
- `output/screenshots/mobile-client-receipt.png`, hosted Receipt/Invoice/Recommendation screenshots.
- `output/pdf/validation.txt`: parsed text, page bounds, A4 and hyperlink checks.

Regenerate synthetic PDFs with `node scripts/generate-document-samples.mjs`. No actual client record or filled Beto receipt was downloaded or committed.

## Review boundary

`/document-preview/receipt`, `/document-preview/invoice`, and `/document-preview/recommendation` use fixed synthetic fixtures and never read the private store. They are available only in Vercel Preview or local development and return 404 in production. Vercel deployment protection remains enabled. The ordinary admin and client pages retain their existing authentication and session checks.

Before a production release: review visuals, resolve the dependency on PR #16, configure isolated Preview storage/admin access for stateful hosted QA, then explicitly approve production. Existing production settings and patient records were not changed.
