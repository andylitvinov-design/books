# Context Cloud v2 compatibility report

**Production source inspected:** `64f3a161150f040a23a56f757b9a2ffe07f92199` on `codex/public-book-library`, 2026-11-20.

## Compatibility matrix

| Concern | Existing source of truth | Reuse decision | V2 gap / boundary |
| --- | --- | --- | --- |
| Reviewed guided-session context | `lib/personal-coaching/client-context.mjs`, encrypted `app_private.personal_coaching_sessions` envelope | Preserve V1 readers and `confirmedModelContext()` compatibility | Add a V2 adapter; never turn V1 candidates into model facts without confirmation. |
| Deterministic dialogue | `lib/coaching/coach-session-director.mjs` and `lib/app/coaching-brain.js` | Preserve Director ownership of method, stage, safety and evidence | Context Director supplies a bounded untrusted snapshot; it cannot select a stage, tool or action. |
| Life Plan | `app_private.coaching_life_plans`, areas, goals, actions and change ledger; `lib/app/coaching-life-plan.js` | Read current owner-scoped revision and client-confirmed goals/actions | Context records are references/projections, not a second archive of Life Plan ciphertext. |
| Saved reports | `app_private.coaching_reports` and immutable report versions | Use reviewed/confirmed report/action references only | Do not copy report bodies, PDFs, practitioner content or transcript text. |
| Assessments | Existing assessment stores and result/report modules | P1 only, selected finalized allowlisted scale by scale | Default OFF; no raw answer, diagnosis or inferred psychological profile. |
| Consent | `app_private.coaching_session_consents`, backend grants and owner RLS | Reuse owner/authentication model and policy-version evidence | Add Ali/provider/category/item grants with immediate effective revocation. |
| Text/voice transport | `myCoachGenerativeTurn`, `myCoachGenerativeStreamTurn`, existing parser and early-speech gate | Preserve single inference request, streaming and barge-in | Snapshot is built server-side for each new turn; no browser-provided context or cache survives revocation. |
| Account isolation | `app_private` RLS and `hh_app_backend` grants | Reuse account-bound transactions and AES-GCM AAD pattern | New Context tables receive identical owner checks plus source-account checks. |

## Related pull requests

| PR | State at audit | Reconciliation decision |
| --- | --- | --- |
| #5189 | Merged | Reuse semantic session card; do not treat ephemeral card text as durable Context without review. |
| #5191 | Closed, not merged | Do not depend on its protocol/PDF implementation. |
| #5206 | Merged | Preserve My Goals & Coaching Reports styling. |
| #5215 | Merged | Add My Context as the third compact tab; retain approved mobile layout. |
| #5221 | Open | Avoid its session-rating/PDF/live-dialogue files until it reaches an exact-head reconciled state. |
| #5228 | Merged | Preserve early sentence approval and shared interruption behavior. |
| #5234 | Open | Avoid Gemini Live/duplex files until it reaches an exact-head reconciled state. |

## #5236 addendum boundary

The issue addendum defines an optional later business/project Context domain. It is outside P0.A–P1 personal coaching implementation: separate tenant/workspace grants, source ingestion and Linear proposal rows are required before any business workflow. Personal coaching context must never create a Linear issue. Fireflies is the first proposed source only after an authorized connector review; Plaud remains supported MCP/CLI/manual import only, not an assumed cloud API. No provider call, new token, external synchronization or schema change is authorized by this audit.

## P0 source contract

Context Cloud is **not a second archive**. Existing encrypted source records stay authoritative. A Context item contains client-reviewed bounded text or structured value, source ID/revision/hash, category, provenance, sensitivity, confirmation state and expiry. It never carries raw report bodies, session messages, audio, PDFs, assessment answers, practitioner data, secret identifiers or model instructions.

The normalized durable coaching record is `app_private.coaching_session_records`, linked to encrypted reports, Life Plan rows and session consent evidence. The older `personal_coaching_sessions` envelope remains readable during the V1-to-V2 rollout; no migration imports its historical context automatically.

The Context Director is server-only. It derives the actor from authentication, validates the session and provider, verifies effective current grants, checks source freshness, applies category/item budgets and serializes a labelled untrusted value. Unknown provider, missing consent, source mismatch, stale item, account mismatch, policy change or failure to decrypt returns an empty context snapshot. Ordinary coaching proceeds context-free.

## PR sequence

1. **P0.A:** this audit plus contract/design and baseline tests, source-only.
2. **P0.B:** private Context item/grant/event schema, deterministic selector, Life Plan and reviewed-report adapters, invalidation/revocation/security fixtures.
3. **P0.C:** exactly-once text/stream request wiring, preserving Director and voice interruption.
4. **P0.D:** third My Context tab and owner-only review/grant/revoke/erase API with EN/RU/ES compact mobile checks.
5. **P1:** selected finalized assessment scales and explicit post-session review drafts.
6. **P2:** measure whether retrieval is necessary; no embedding provider, Telegram context or new vendor without a separate approved privacy/cost design.

P0.A does not modify voice transport, live-dialogue UI, streaming, the Coach Session Director or provider configuration. Each later PR must re-fetch the protected base, reconcile #5221/#5234 if still open, and prove exact-head CI before merge.

## Baseline acceptance scope

The baseline is V1 context compatibility, deterministic Director behavior and existing live-voice interruption behavior. P0.B must add unit contracts, DB/RLS integration where available, forged-account and URL-tamper tests, source invalidation/revocation fixtures and prompt-injection fixtures. P0.C must measure a single provider request per turn. P0.D and P1 require Chromium/WebKit 320px/390px checks, keyboard/a11y, EN/RU/ES parity and physical iPhone consent/voice/barge-in verification before any LIVE claim.
