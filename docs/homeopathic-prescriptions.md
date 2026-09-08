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
