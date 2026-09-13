# SAFE.md

Last reviewed: 2026-09-13

## Scope

- Canonical public site: `https://codex-public-book-library.vercel.app`
- Production source observed on 2026-09-13: branch `codex/public-book-library`, commit `2f665ca2a6e1a1d3f6dddc2c3a85ece773eb59ee`
- Alternate Vercel surface: `https://books-nu.vercel.app` — source parity and canonical-domain intent need verification.
- Public routes include the catalogue, book readers, media, and localized remedy reference pages.
- Private or sensitive routes include prescription, document-preview, admin, and supporting API surfaces.

## Safety boundaries

- Do not expose provider credentials, session material, prescription records, generated documents, or private source payloads.
- Keep authentication and private-route cache controls fail-closed.
- Treat health and homeopathy material as an educational archive, not diagnosis, treatment, dosing advice, or a substitute for professional care.
- Preserve source attribution and existing visible non-medical/editorial notices.
- Do not submit forms, create prescriptions, authenticate, or invoke provider-backed mutations during a public smoke check.

## Required checks

- Public catalogue and one book route render without a white screen, raw internal error, broken primary action, or horizontal overflow.
- Search, no-results, missing-book, and unavailable-media states remain safe.
- Private routes preserve authentication, CSP, no-store, and user-safe errors.
- Public responses retain the baseline `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy` headers.
- Run `npm run lint`, `npm run test:unit`, and `npm run build` when dependencies and generated source assets are available.
- Verify production aliases and response headers after deployment before claiming live completion.

## Rollback and backup

- Header-only changes roll back by reverting the isolated configuration commit or closing its pull request before merge.
- No database or content backup is required for documentation and response-header changes.
- Any change touching prescriptions, documents, auth, storage, or generated source content requires project-specific backup and rollback proof first.

## Known risks / needs verification

- Public response-header baseline was missing on 2026-09-13; a focused pull request prepares the fix.
- Two timeout logs were observed on an admin prescription route during the previous seven days; current production reproduction and affected deployment scope need verification.
- Canonical intent and branch parity between the two public Vercel domains need verification.
- Mobile, keyboard/focus, authenticated roles, uploads, prescriptions, provider persistence, and analytics were not exercised in the 2026-09-13 public sweep.
