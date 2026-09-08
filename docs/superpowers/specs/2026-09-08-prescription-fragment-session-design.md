# Prescription fragment-access security design

## Goal

Remove the prescription bearer credential from every HTTP request target while preserving the bilingual private-page, print, and PDF workflow. Existing path-bearer links must stop resolving. No migration step may inspect or emit patient plaintext.

## Threat model

The current `/{locale}/prescriptions/{publicId}` URL treats the dynamic path value as a bearer credential. Vercel records request paths, so the credential reaches provider logs before application code can redact it. Referrers, browser history, analytics, service workers, and caches are additional accidental-disclosure surfaces.

The redesign assumes an attacker may know or guess a non-secret selector, call every public route directly, replay an expired session, submit malformed exchange bodies, or retain an old link after revoke. It also assumes browser JavaScript can read the initial fragment but must not persist it. Server, Redis, and deployment secrets remain trusted; prescription payloads continue to be encrypted before storage.

## Alternatives considered

1. Encrypt or hash a bearer value but keep it in the path. Rejected because the request path remains the credential and is still logged.
2. Exchange the fragment for a signed stateless cookie. Rejected because immediate per-record invalidation and logout become harder, and record metadata would be present client-side.
3. Exchange the fragment for a server-side opaque session. Selected because it keeps the credential out of request targets, exposes no record identifier in the cookie, supports short TTLs, and can fail closed immediately when a record is revoked or rotated.

## Link and record model

An issued link has this shape:

`/{locale}/prescriptions/{selector}#{bearer_secret}`

- `selector`: 128 random bits encoded as base64url. It is a lookup hint, not a credential.
- `bearer_secret`: 256 random bits encoded as base64url. It exists in plaintext only in the one-time admin issuance response and in the recipient's URL fragment.
- The encrypted prescription record stores `access.selector`, `access.secretHash`, and `access.version`; it never stores the plaintext secret.
- Redis maps `prescription:selector:{selector}` to the opaque internal record ID only while the record is active and an access link has been issued.
- Legacy `prescription:public:*` mappings are not read by public routes. Saving, revoking, archiving, or rotating a record deletes the known legacy mapping when present.

## Browser exchange and session

The first GET always returns a neutral, dynamic bootstrap shell. It contains no prescription fields and no secret in HTML or React server state. A client component reads `location.hash` into a local variable, immediately removes it with `history.replaceState`, validates strict base64url lengths, then POSTs `{ selector, secret }` to `/api/prescription-access` as JSON with `cache: no-store`.

The exchange endpoint validates content type, body size and shape, same-origin `Origin`, rate limits by a one-way digest of the selector plus trusted platform IP hint, resolves only an active record, and compares fixed-size secret hashes with `timingSafeEqual`. All invalid cases return the same generic response. No request body, fragment, cookie, or identifier is logged by application code.

On success the server creates a 256-bit opaque session token. Redis stores only a hash-derived session key with the selector, record ID, access version, and expiry for 15 minutes. The browser receives the opaque token in an `HttpOnly`, `Secure` in production, `SameSite=Strict`, root-path cookie. Root scope is required so the same session works for RU, EN, access APIs, and PDFs. After exchange the browser reloads the fragment-free same-origin path.

Subsequent page and PDF reads require both the selector and a valid session. Each read re-loads the record and checks active status, selector, access version, and expiry, so revoke or rotation invalidates existing sessions immediately even before TTL cleanup. Logout deletes the server-side session and expires the cookie.

## Routes and rendering

- `/{locale}/prescriptions/{selector}`: neutral bootstrap without a valid session; existing bilingual `PrescriptionDocument` only after session validation.
- `/api/prescription-access`: POST exchange; no-store, generic failures, no CORS.
- `/api/prescription-access/logout`: same-origin POST, deletes the session and cookie.
- `/api/prescriptions/{selector}/pdf?locale=ru|en`: selector-only path, valid session required, existing Unicode PDF generator retained.
- RU/EN links change only locale and retain selector. The root-scoped HttpOnly session follows automatically; the fragment is never reconstructed.
- Print remains local `window.print()` after authenticated rendering.

All private responses set `Cache-Control: private, no-store, max-age=0`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, clickjacking protection, and a route-compatible restrictive CSP. Prescription, access, PDF, and admin paths stay network-only in the service worker and never enter the sitemap.

## Admin issuance and migration

Create/update continues to save the encrypted clinical record. Activating a record does not reconstruct an old secret. A protected same-origin admin POST issues or rotates access and returns the new fragment link once with `Cache-Control: no-store`; the client copies it directly and does not use Web Storage. Reloading the admin page cannot recover the secret, so another share requires rotation.

Legacy path-bearer links fail closed because public resolution no longer reads `publicId` mappings. The admin page labels legacy active records as requiring rotation/reissue. Rotation updates the encrypted record, creates the selector mapping, removes the prior selector mapping and any known legacy mapping, and invalidates all earlier sessions by incrementing the access version. Migration reporting counts legacy mappings/records without printing keys or decrypting patient fields.

## Abuse and error handling

- Strict selector/secret/session formats and bounded JSON bodies are rejected before storage work.
- Exchange attempts use a fixed-window Redis counter with TTL; memory preview uses the same interface.
- Unknown selector, wrong secret, inactive record, storage failure, and rate-limit denial share a generic unavailable response.
- Page/PDF reads never expose internal errors and treat malformed or missing storage state as unavailable.
- No analytics event, console statement, redirect, query string, HTML state, localStorage, sessionStorage, IndexedDB, or cache contains the bearer secret.

## Verification contract

Unit and integration tests must prove link entropy and formats, constant-time comparison path, encrypted persistence, session TTL and invalidation, generic errors, route authorization, no-store/noindex headers, sitemap/service-worker exclusions, RU/EN switching, PDF authentication, Cyrillic PDF glyph support, and absence of internal fields.

Hosted preview smoke uses synthetic data only. It must capture the initial network request, HTML, storage state, browser history, refresh behavior, RU/EN pages, PDFs, print layouts, unknown selector, wrong secret, draft, revoke, and expiry/logout. Vercel runtime logs must be searched for the unique synthetic bearer and report zero matches while showing the non-secret selector may appear. Only after every production-critical preview check passes may the same reviewed merge commit be released and re-verified in production; all synthetic records and sessions are then revoked and removed.
