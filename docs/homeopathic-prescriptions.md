# Homeopathic recommendations

Client records are held only in the configured server-side REST KV store. Do not put patient data, access codes, or prescription records in the repository, preview fixture, or browser analytics.

## Required deployment variables

- `PRESCRIPTIONS_ADMIN_TOKEN`: a long random access code for `/admin/login`.
- `PRESCRIPTIONS_KV_REST_API_URL`: Vercel/Upstash-compatible REST KV endpoint.
- `PRESCRIPTIONS_KV_REST_API_TOKEN`: server-side bearer token for that endpoint.

Without both KV variables, production routes fail closed and do not disclose a record. A Vercel Preview (or local development) can render only the non-sensitive `Test Client` fixture, using a fixed test-only public token. It cannot create or persist records unless the admin and KV variables are explicitly configured for that environment.

## Storage model

Each record has a private UUID `id` and a 256-bit base64url `publicId`. The KV adapter stores the record by the private ID and maintains a public-token to private-ID lookup. Client rendering uses a server-side projection that permits only `active` records and omits internal notes and private IDs.

Canonical remedy items store only `remedySlug`; client titles and locale-specific routes are resolved at render time from the canonical remedy catalogue. An unlinked item remains plain text and never creates a remedy page.

## PDF font

Russian PDFs embed the bundled `assets/fonts/NotoSans-Regular.ttf` as a Unicode Type0 font with an Identity-H encoding and ToUnicode map. The accompanying `assets/fonts/LICENSE-NotoSans-OFL-1.1.txt` is the SIL Open Font License 1.1 from the Noto project; it permits embedding and redistribution. The explicit Next output-file trace rule keeps this font available in the Vercel serverless PDF route instead of relying on a system font or a remote font request.

## Security and privacy review

- The REST adapter rejects non-HTTPS endpoints before any record is sent. Upstash Redis documents TLS for data in transit; deploy only against an HTTPS endpoint.
- The module does not add application-level encryption. For Upstash, encryption at rest is available only after enabling the provider's Prod Pack; record that setting in the deployment review before storing patient data. If encryption at rest cannot be verified for the selected provider, do not store patient records there. See [Upstash security documentation](https://upstash.com/docs/redis/features/security).
- The admin form is protected by a server-side `PRESCRIPTIONS_ADMIN_TOKEN` and a signed, `HttpOnly`, `SameSite=Strict` session cookie scoped to `/admin`.
- Public lookup accepts only the random `publicId`; `draft`, `revoked`, and `archived` records resolve as unavailable. Revoking a record therefore stops the existing public URL from returning client data.
- Client pages and PDF responses use a restrictive noindex policy; prescription routes are dynamic and absent from the sitemap. The module does not add client-side analytics or prescription-detail logging.
