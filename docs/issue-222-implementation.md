# Holistic House IA v2 implementation

Source contract: andylitvinov-design/ai-projects-brain#222 revision 2.
Base: `codex/public-book-library` at `92fc2f175f500d6db5596e12eb4130aac404fa4f`.
Work branch: `codex/issue-222-ia-v2`.

## Scope

- Shared Home / Library / Services / Academy / About / Cabinet navigation in both components.
- Localized Library hubs, old readers/remedies intact, existing featured-book editions preserved.
- Academy is an external same-tab link, not an imported catalogue.
- Existing invite/session cabinet resumes authorized sessions.
- Practitioner-managed test/result register: draft, edit, share, unshare, archive; source result and practitioner comment remain separate.
- Clients read only their own shared records. No public registration, uploads, scoring engine or new video generation.

## Storage and security

The existing REST-KV store injects additive assessment methods using its current AES-256-GCM envelopes and transport. Keys contain random IDs; records and idempotency markers are encrypted. Lua atomically commits creation, client index and idempotency marker. Mutations compare the expected encrypted record, client snapshot and related-document snapshots. Client identity is immutable and shared records must be unshared before editing.

Memory store parity exists for tests, not as a production durability claim. The production factory still fails closed without complete KV configuration. Existing client/document IDs, encryption keys and bearer links are untouched.

## Verification

Run `npm run test:unit`, `npm run lint`, `npm run native:check`, `npm run pwa:check`, `npm run build`, and `npx --no-install tsc --noEmit`. The full legacy unit suite currently has unrelated existing failures in PDF, consultation, reader and Services fixtures; IA v2's targeted tests and all changed navigation expectations must pass before review.

`npm run verify:ia-v2` is a write-capable **CI-only** harness. It accepts no live URL/arguments. It uses an ephemeral local Redis service (database 15), synthetic clients, loopback TLS, and production-built Next.js. It tests actual owner/client browser flows, cross-client HTML/RSC isolation, session resume/revoke/rotate, application restart and new-adapter readback. `.github/workflows/ia-v2.yml` installs its isolated browser prerequisites and creates its one-day local certificate. Artifacts contain synthetic screenshots and sanitized logs.

Never run this harness against Production or an unverified Preview data store. Production/Preview backend configuration is a separate read-only preflight and explicit approval gate. CI Redis evidence is not a claim that the deployed private-data configuration has been verified.

## Release and rollback

Open a PR to the verified production branch and stop for Preview review. Do not merge/deploy or close #222 without the required approval/evidence.

Rollback by reverting the UI/service integration commit(s); keep additive `client:assessment:*`, `client:assessments:*` and `client:assessment-request:*` records intact. Do not clear KV, rotate encryption keys or reissue client links. Previous code does not enumerate the new namespaces. The existing cabinet/documents remain usable after rollback.

## Explicit future work

Secure binary uploads with an approved private store; client-completed questionnaires and approved scoring; private video delivery; richer follow-up views. These are not implemented or exposed as inert controls here. PsiTrends, DNS, original media and existing public video placements are unchanged.
