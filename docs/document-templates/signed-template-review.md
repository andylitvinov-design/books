# Signed templates — review checkpoint, 2026-09-18

Preview only. Do not merge or promote until owner review.

## Canonical source copies

Downloaded from the existing approved Drive folder on 2026-09-18:

| Blank master | Drive source | SHA-256 |
| --- | --- | --- |
| Receipt, Signed_Left_LargeSignature | [Master](https://drive.google.com/file/d/1ZP4rPy6znahcV5vPlDIrQn3STh2F3q5S/view) | `6ab935a5a3609af65dc4d505b856755f05783798c3255fa811223545ce21ec57` |
| Recommendation, Signed_Left_LargeSignature | [Master](https://drive.google.com/file/d/1ksYzIDL3srWGGTleuIzSDKJq77pq86Dy/view) | `afb51ff54913623a1c2da55fc457ffb070abd1bdbe2ece673f2c1bc807fe9c68` |

Canonical copies are in `assets/document-templates/` with their original filenames. The owner explicitly confirmed this Receipt filename without `_v2` as the final approved master on 2026-09-18. No filled client PDF is committed or used as a fixture.

The primary signature is the exact [approved PNG](https://drive.google.com/file/d/1aGty2n4RDdc9FebM4pim3EqCvlMhVzMx/view), SHA-256 `9f34fc3bbf3db3c73b1abf61ea3174b7e71cb2b4b66d4e484339a402104f7c6d`. Its 1229×484 RGBA pixels are identical to both blank masters and to the previously extracted PNG; only PNG encoding differs. `scripts/prepare-signature-assets.py` verifies the original PNG against both masters and creates lossless PDF streams without changing orientation, pixels or the PNG file.

## Assets and layout

- Signature: `assets/documents/andrii-signature-left-90.png`.
- PDF signature image/mask: `assets/documents/signature-rgb.deflate`, `assets/documents/signature-alpha.deflate` (lossless encoding of the same pixels).
- Lighthouse: `assets/documents/lighthouse.jpg` for PDF and `public/document-assets/lighthouse.png` for web.
- Shared identity: `lib/documents/letterhead.js`.
- Shared signature geometry, page and typography configuration: `lib/documents/template.js`.
- Shared recommendation naming/sections: `lib/documents/recommendation.js`.

The signature is automatically embedded in Receipt, Invoice and Recommendation, above its line at the master's large size (170.0787×66.97975 PDF points). Web preserves the same ratio and scales responsively. The source PNG is outside `public/`; authorized document pages inline it. Synthetic Preview pages also display it, under the existing deployment protection.

The recommendation master overlaps its footer with the disclaimer. The renderer reserves a single closing block for date/signature/practitioner details and keeps the disclaimer clear. Long content can continue onto additional pages; the signature is drawn only on the final page. Noto Sans (embedded Cyrillic) and PDF Times preserve the existing renderer's quiet typography, rather than claiming identical DejaVu font metrics.

Optional payment method is manual, trimmed, limited to 120 characters and preserved when marking paid. Unpaid invoices never claim money received. All recommendation content remains manually supplied; no generated treatment advice or duplicate remedy pages.

## Verification

- 147 unit tests passed, including signature bytes, alpha mask, final-page-only placement, deterministic bytes, one-page ordinary EN/RU fixtures, active-only projections and private access lifecycle.
- JSX-inclusive lint: zero errors; ten pre-existing raw source archive warnings.
- Synthetic Receipt/Invoice/Recommendation PDFs generated in EN/RU plus a long recommendation. Ordinary fixtures are one page; both recommendation remedy names have canonical hyperlinks.
- Rendered Receipt, Invoice and two-remedy Recommendation inspected against the masters; signature orientation/size preserved, no overlap in closing blocks.
- Local isolated memory-store admin: save recommendation, create invoice with payment method, mark paid (CAD150 unchanged), issue client links, download PDFs, revoke receipt, archive recommendation. No production data or credentials used.
- Scripted creation took 22 seconds for the basic recommendation and 31 seconds for the invoice, including tool overhead. This is not a human usability study.
- Mobile client viewport 390px: document width 390px, signature loaded at 226.8×89.3px, no horizontal overflow.

Local production build passes, including static generation and tracing. Hosted Preview verified all three PDF types, exact signature pixels, Cyrillic text, remedy links and anonymous private-route privacy headers. Mobile review navigation wraps without horizontal overflow at 390px. Full stateful hosted Preview admin testing requires separately configured isolated Preview storage; local authenticated testing never falls back to production.

The owner-supplied filled visual reference was inspected privately: the same quiet lighthouse layout, muted palette, signature orientation and large size are preserved. It was not used as test data or included in the repository. Temporary private reference downloads/renders were removed after comparison.
