# Homeopathic recommendations

Client records are held only in the configured server-side REST KV store. Do not put patient data, access codes, or prescription records in the repository, preview fixture, or browser analytics.

## Required deployment variables

- `PRESCRIPTIONS_ADMIN_TOKEN`: a long random access code for `/admin/login`.
- `PRESCRIPTIONS_KV_REST_API_URL`: Vercel/Upstash-compatible REST KV endpoint.
- `PRESCRIPTIONS_KV_REST_API_TOKEN`: server-side bearer token for that endpoint.
- `PRESCRIPTIONS_DATA_ENCRYPTION_KEY`: a separate, freshly generated 32-byte AES key encoded as base64 or base64url. For example, generate it locally with `openssl rand -base64 32`; store it only as a Vercel server-side environment variable.

Production requires all four variables. If any KV or encryption variable is missing or malformed, production routes fail closed and do not disclose a record. A Vercel Preview (or local development) can render only the non-sensitive `Test Client` fixture, using a fixed test-only public token. It cannot create or persist records unless the admin, KV, and encryption variables are explicitly configured for that environment.

## Storage model

Each record has a private UUID `id` and a 256-bit base64url `publicId`. Before a record is written to KV, the complete patient/prescription payload is encrypted with AES-256-GCM using a fresh 12-byte IV and authenticated tag. The stored JSON is a versioned envelope containing only `version`, `algorithm`, `iv`, `tag`, and `ciphertext`; authentication failure, malformed envelopes, and unsupported versions are treated as unavailable records without exposing an error response. The public-token lookup maps only the opaque random public ID to the opaque internal record ID.

Client rendering uses a server-side projection that permits only `active` records and omits internal notes and private IDs. Saving a non-active record removes its public-ID mapping before its encrypted record is retained, so a revoked, archived, or draft record cannot be resolved through either locale or the PDF endpoint.

Canonical remedy items store only `remedySlug`; client titles and locale-specific routes are resolved at render time from the canonical remedy catalogue. An unlinked item remains plain text and never creates a remedy page.

## PDF font

Russian PDFs embed the bundled `assets/fonts/NotoSans-Regular.ttf` as a Unicode Type0 font with an Identity-H encoding and ToUnicode map. The accompanying `assets/fonts/LICENSE-NotoSans-OFL-1.1.txt` is the SIL Open Font License 1.1 from the Noto project; it permits embedding and redistribution. The explicit Next output-file trace rule keeps this font available in the Vercel serverless PDF route instead of relying on a system font or a remote font request.

## Security and privacy review

- The REST adapter rejects non-HTTPS endpoints before any record is sent. Deploy only against an HTTPS endpoint.
- Application-level AES-256-GCM protects every prescription payload before it reaches KV. Keep `PRESCRIPTIONS_DATA_ENCRYPTION_KEY` independent from the admin token, Upstash token, and all public IDs; never log, return, or commit it. Provider-side encryption remains useful as defence in depth but is not relied on for plaintext protection.
- The admin form is protected by a server-side `PRESCRIPTIONS_ADMIN_TOKEN` and a signed, `HttpOnly`, `SameSite=Strict` session cookie scoped to `/admin`.
- Public lookup accepts only the random `publicId`; `draft`, `revoked`, and `archived` records resolve as unavailable. Revoking a record therefore stops the existing public URL from returning client data.
- Client pages and PDF responses use a restrictive noindex policy; prescription routes are dynamic and absent from the sitemap. The module does not add client-side analytics or prescription-detail logging.
