# Issue 26 delivery plan and architecture

Review checkpoint only: no merge or Production deployment/data writes. Extend
ccc1f96 (Holistic House Preview) in isolated codex/issue-26-client-cabinet.

## Audit / alternatives
Current Books AES-GCM records, HMAC-derived owner links, hashed access tokens and
atomic Lua consultation pairs are authoritative. Add encrypted Client records and
random-ID indexes to this store rather than adopting a new database or rewriting
consultations. Separate Consultation records are unnecessary: recommendation ID is
the existing consultation identity. Report technical guide explicitly says data is
mock/local JS with no production backend; reuse date-grouped practitioner-delivered
feed UX only. No report imports. Audit Reiki invite lifecycle for version/revocation
ideas only; do not copy Supabase/RLS schemas.

## Implementation sequence
1. Backend: Client validation, encrypted persistence, atomic Client + pair + history
   creation and retry deduplication. Random IDs in every key. Stable HMAC-derived
   cabinet access, explicit rotate/revoke, 30-day hashed HttpOnly session. Add
   negative tests for cross-client document access and stale versions.
2. Owner UI: searchable client list/detail/edit/archive; existing-client selector
   and inline create in consultation; primary cabinet actions on Documents Ready;
   owner-only explicit legacy assignment with name suggestions but no auto-merge.
3. Cabinet: locale-neutral session, EN/RU timeline and type filters; read documents
   and PDFs through client ownership authorization, without document bearers.
4. Domain: configurable canonical origin; exact old-host public 308 path/query;
   generic private browser bridge preserving fragment, no-store/noindex/no-referrer;
   no private SW cache/native deep links; preserve well-known endpoints.
5. Verification: focused unit failures before code, full unit/lint/build after;
   isolated prescriptions-preview only; browser synthetic 1/2/3 consultation flow,
   stable link, language, HTML/PDF isolation, rotate/revoke, migration network checks.
   Publish PR and Preview plus screenshots/evidence; retain explicit Production gate.

## Security boundaries
Client directory and PII encrypted with existing key. Raw cabinet bearer derived
only for owner response and never stored; hash/version/selector persisted. Every
cabinet document read checks active client, unexpired session/version, active
record and exact clientId. Reports are type-ready without fabricated records.

## Future report adapter contract
A real report adapter must accept an authenticated owner request and return an
immutable document {id, clientId, kind:'report', consultationId, dateIssued,
status:'active'|'revoked', encryptedPayload}. clientId must be explicitly selected
by the owner, never inferred from report names. Payload must be encrypted using
the existing store. Ingestion and client history index update must be atomic and
idempotent by source ID. A projection renders only client-safe fields in EN/RU;
HTML/PDF must call the same cabinet ownership authorization as current documents.
No external URL redirect, untrusted report HTML, demo records, public assets or
new bearer bypass is allowed. Until source provenance/consent and safe renderers
are approved, Reports is an honest empty state and unsupported report rendering
fails closed.

## Delivery manifest and scope contract

| Task ID | Requirement | Source | Verification |
| --- | --- | --- | --- |
| CDB | Encrypted first-class Client records and ID-only indexes | Issue 26 B, M | `tests/clients.test.mjs` REST encryption assertions |
| CRM | Owner client list, detail, archive and explicit legacy assignment | Issue 26 E, L | route/build checks and browser review |
| CONSULT | Existing-client selector or inline client creation | Issue 26 F | `tests/clients.test.mjs` retry/history flow |
| DOCS | Atomically attach receipt/recommendation to `clientId` | Issue 26 D, G | client and admin-document tests |
| CABINET | Persistent cabinet selector/access and dated document feed | Issue 26 C, H | access/history tests and browser review |
| AUTH | Hashed 30-day session, rotate/revoke and cross-client denial | Issue 26 C, I, M | `tests/clients.test.mjs` |
| LOCALE | EN/RU share client identity and cabinet session | Issue 26 J | route/page tests and browser review |
| REPORTS | Report-ready empty-state adapter contract; no report import | Issue 26 K | prior-project audit and component contract |
| LEGACY | Owner-confirmed only legacy assignment; no name auto-merge | Issue 26 L, N | legacy race tests and browser review |
| PRIVACY | no-store/noindex/referrer/PWA/native safeguards | Issue 26 A, M, P | migration/PWA/native tests |
| PREVIEW | Isolated synthetic Preview acceptance/screenshots | Issue 26 acceptance, gates 3-4 | hosted browser evidence |

Included: all IDs above. Excluded: production storage/data access, client-data
migration, report import, Production deployment, merge, and Holistic House
hostname attachment. The only external write allowed at the review checkpoint is
a Preview deployment of this draft branch, using its existing isolated
`prescriptions-preview` configuration. High-risk production/domain gates remain
blocked pending explicit owner approval.
