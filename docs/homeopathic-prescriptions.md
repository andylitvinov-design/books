# Homeopathic recommendations

Client records are held only in the configured server-side REST KV store. Do not put patient data, access codes, or prescription records in the repository, preview fixture, or browser analytics.

## Required deployment variables

- `PRESCRIPTIONS_ADMIN_TOKEN`: a long random access code for `/admin/login`.
- `PRESCRIPTIONS_KV_REST_API_URL`: Vercel/Upstash-compatible REST KV endpoint.
- `PRESCRIPTIONS_KV_REST_API_TOKEN`: server-side bearer token for that endpoint.
- `PRESCRIPTIONS_DATA_ENCRYPTION_KEY`: a separate, freshly generated 32-byte AES key encoded as base64 or base64url. For example, generate it locally with `openssl rand -base64 32`; store it only as a Vercel server-side environment variable.

Production requires all four variables. If any KV or encryption variable is missing or malformed, production routes fail closed and do not disclose a record. Preview must use an isolated KV database plus independently generated Preview-only admin and encryption secrets. Never connect Preview to Production Redis. Without a complete environment, Preview and local development use an empty in-memory store and cannot provide cross-request persistence.

## Storage model

Each record has a private UUID `id`. Before a record is written to KV, the complete patient/prescription payload is encrypted with AES-256-GCM using a fresh 12-byte IV and authenticated tag. The stored JSON is a versioned envelope containing only `version`, `algorithm`, `iv`, `tag`, and `ciphertext`; authentication failure, malformed envelopes, and unsupported versions are treated as unavailable records without exposing an error response.

An issued client link is `/{locale}/prescriptions/{selector}#{bearer_secret}`. The selector is a non-secret 128-bit lookup hint. The 256-bit bearer secret remains in the URL fragment, which browsers do not send in the HTTP request target. Only its SHA-256 hash is stored inside the encrypted prescription record. Redis maps `prescription:selector:{selector}` to the internal record only while the record is active and issued.

The first request returns a neutral bootstrap without prescription content. Browser code copies the fragment to a local variable, immediately removes it with `history.replaceState`, and exchanges selector plus secret in a bounded same-origin POST body. A successful constant-time comparison creates a 15-minute server-side opaque session. Its cookie is `HttpOnly`, `SameSite=Strict`, `Secure` in production, root-scoped for RU/EN/PDF interoperability, and a browser-session cookie without a persistent expiry. Redis applies the authoritative TTL. Page and PDF reads re-check active status, selector, access version, and expiry, so revoke or rotation takes effect immediately.

Client rendering uses a server-side projection that permits only `active` records and omits internal notes, access hashes, private IDs, and sessions. Saving a non-active record removes its selector mapping before its encrypted record is retained, so a revoked, archived, or draft record cannot be resolved through either locale or the PDF endpoint.

Canonical remedy items store only `remedySlug`; client titles and locale-specific routes are resolved at render time from the canonical remedy catalogue. An unlinked item remains plain text and never creates a remedy page.

## PDF font

Russian PDFs embed the bundled `assets/fonts/NotoSans-Regular.ttf` as a Unicode Type0 font with an Identity-H encoding and ToUnicode map. The accompanying `assets/fonts/LICENSE-NotoSans-OFL-1.1.txt` is the SIL Open Font License 1.1 from the Noto project; it permits embedding and redistribution. The explicit Next output-file trace rule keeps this font available in the Vercel serverless PDF route instead of relying on a system font or a remote font request.

## Security and privacy review

- The REST adapter rejects non-HTTPS endpoints before any record is sent. Deploy only against an HTTPS endpoint.
- Application-level AES-256-GCM protects every prescription payload before it reaches KV. Keep `PRESCRIPTIONS_DATA_ENCRYPTION_KEY` independent from the admin token, Upstash token, and all public IDs; never log, return, or commit it. Provider-side encryption remains useful as defence in depth but is not relied on for plaintext protection.
- The admin form is protected by a server-side `PRESCRIPTIONS_ADMIN_TOKEN` and a signed, `HttpOnly`, `SameSite=Strict` session cookie scoped to `/admin`.
- An authenticated same-origin admin POST issues or rotates a link. The plaintext fragment secret is returned once, copied directly, never placed in React state or Web Storage, and cannot be recovered after reload. Reissuing rotates selector, hash, and access version.
- Public pages and PDFs require both the selector and a valid server session; selector-only, expired, draft, revoked, archived, wrong-secret, and unknown requests fail closed. Exchange attempts are rate-limited and use one generic invalid response.
- Client pages and PDF responses use a restrictive noindex policy; prescription routes are dynamic and absent from the sitemap. The module does not add client-side analytics or prescription-detail logging.
- Private middleware sets `private, no-store`, `noindex,nofollow`, `no-referrer`, `nosniff`, clickjacking protection, and a nonce-based CSP. The PWA service worker treats prescription, exchange, PDF, and admin routes as network-only.

## Legacy link migration

Legacy path-bearer URLs are intentionally not redirected and are never resolved by the new client routes. They fail closed immediately after deployment. An existing active record shows `Issue private link`; issuing it creates the selector/fragment credential, removes the known legacy Redis mapping, and removes the old `publicId` from the newly encrypted record. A later `Rotate private link` invalidates every earlier link and session for that record.

Count legacy production links without inspecting records or printing identifiers by using Redis `SCAN` with the pattern `prescription:public:*` and reporting only the total number of returned keys. Do not call `GET` on record keys for this inventory. Each owner must receive a newly issued link through the protected admin form.

## Synthetic release verification and cleanup

Use names, notes, dates, and instructions explicitly marked synthetic. After Preview or Production smoke, revoke the synthetic record first, verify RU/EN/PDF denial, then delete only the exact synthetic record, selector, session, and rate keys created during that smoke. Never use real client data in screenshots, fixtures, PDF samples, logs, or browser traces.
