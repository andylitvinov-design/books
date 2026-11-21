# Context Cloud v2 Design

## Decision

Context Cloud v2 is a server-owned, account-scoped projection layer over existing encrypted Coaching Life Plan, reports, session state and explicitly selected assessment results. It never becomes a second archive: durable rows contain only encrypted, user-editable Context item text/value plus provenance references, grants and audit metadata. Existing source records remain authoritative.

## Boundaries

- The client can request review, grants, revocation and durable edits, but never submits an account id, provider allowance, source text or pre-built model context.
- `ContextDirector` is deterministic and server-only. It authenticates the actor, reads source revisions and active grants in one transaction, selects a bounded allowlist and serializes it as untrusted data.
- A missing actor, unknown provider, revoked/expired grant, missing source, revision mismatch, unavailable decryptor or policy mismatch produces an empty snapshot. The ordinary context-free Coach turn continues.
- Context is appended to the existing text or voice request once. It never changes `CoachSessionDirector`, causes a second inference request, enters TTS unless already present in the approved model response, or persists a model assertion.
- Raw reports, transcripts, audio, assessment answers, practitioner material, private identifiers and prompt-like source text are excluded. Test scales remain off until a client selects the final result and grants the exact provider/category.

## Separate business-context extension

The #5236 addendum introduces an optional later business/project domain. It is not personal coaching Context Cloud and cannot share grants, rows, identities, prompts or UI. It starts only after P1 with a separate tenant/workspace consent model, Fireflies-first metadata import, read-only Linear reconciliation and review-required proposals. Plaud uses only a supported MCP/CLI/manual import path; there is no claimed unattended Plaud API. No external record, transcript or project proposal can enter Ali coaching context, and no therapy/personal-coaching content can create a Linear issue.

## Data model

`app_private.context_cloud_items` stores owner-encrypted `display_ciphertext` or structured `value_ciphertext`, category, topic key, status, sensitivity, evidence kind, source type/id/revision/hash, observed/review/expiry timestamps and schema version. It has no raw source copy.

`app_private.context_cloud_grants` is append-only consent evidence with `item_id` nullable only for a category grant, `provider_key`, purpose `ali_coaching`, policy version, decision and revocation time. The effective grant is the latest valid event at snapshot time.

`app_private.context_cloud_events` is an owner-readable encrypted audit ledger for confirmation, correction, source invalidation, grant/revoke and erasure. It stores no personal facts in public metadata.

## Source adapters and precedence

P0 enables only saved Life Plan targets/actions and client-confirmed reviewed report/action references. Source adapters read by `account_id`, compare stored revision/hash, and remove stale items rather than guessing replacement content. Last explicit client correction wins in the selector; it does not rewrite its source automatically.

P1 adds a fixed allowlist of finalized assessment scales. It creates one item per selected result/scale, with method/date/limitations only. It never imports an answer set or diagnosis. Post-session candidates are drafts only and require client editing plus explicit save before becoming confirmed.

## Provider and request contract

`buildCoachContextSnapshot({actor, session, providerKey})` returns `{version:2, items, serialization, digest}` or the empty equivalent. `serialization` is labelled untrusted reference data and is subject to per-category length/item budgets. The existing conversational prompt builder receives this value as a separate bounded message; no caller can pass it from the browser.

The provider-specific grant is checked before a request leaves the server. Revocation is checked on every new turn, so no snapshot cache can outlive it. A provider policy change invalidates the effective grant until the client re-confirms the new policy version.

## UI and deletion

The third My Goals & Coaching Reports tab exposes only the client’s own context items, provenance label, review state, provider notice and enable/revoke/remove controls. It supports EN/RU/ES and compact 320–430px layouts. Erase removes durable Context records/grants/events under the account; source records follow their existing erasure paths and are never silently deleted by Context Cloud.

## Acceptance

Tests prove owner isolation, forged-account rejection, RLS/backend grants, revocation on the next text and voice turn, source invalidation, prompt-injection containment, no raw test/report/transcript leakage, no duplicate model request, compatibility with v1 context, and locale/mobile/stream interruption behavior. Physical iPhone verification and exact-head deployment proof remain release gates, not assumed by unit tests.
