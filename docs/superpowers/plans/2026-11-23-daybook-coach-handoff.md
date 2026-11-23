# Daybook selected-context handoff implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. User already authorized the #5416/#5414 design and implementation; do not request another design approval. No delegation.

**Goal:** Open the chosen existing AI coach from one saved Daybook goal or entry, review the exact source and explicitly share only a short selected excerpt for the current session; revoke future sharing.

**Architecture:** Preserve canonical Life Plan/journal stores and the existing Context Cloud grant ledger. A short-lived owner/coach-bound encrypted locator contains source identifiers/revision only, never journal text. Issuing or resolving it is not consent and never invokes a provider or starts a paid session.

**Tech Stack:** Existing Next leaf routes, verified request auth, AES-256-GCM app crypto, PostgreSQL owner transactions, React, EN/RU/ES, current native/browser CI.

## Boundaries

- Preserve foreign #5233 files: MyCoachLiveDialogue, PublicCoachingDiscovery, persona registry and central catchall API. Use its existing manual context-panel/session callback.
- Preserve #2609 free-goal Cabinet implementation; no new goal profile store.
- Existing 240 UTF-16-character per-item and 1200-byte/six-item provider budgets remain.
- Journal grants require exact valid contextSessionToken, selected source revision/range/topic and provider review. Account-wide journal grants fail closed.
- No whole-journal/default consent, plaintext persistent browser storage, new service/schedule/provider, signature/credential or deploy action.
- Owner-only source preview may show the full one selected journal entry; only an explicitly selected shareable substring can enter Context Cloud.
- Reject changed/deleted/foreign/expired sources and tokens. Recheck consent/source every provider use. Withdrawal cannot recall text already transmitted.

## Task 1 — locator and excerpt contracts (TDD)
Files: new lib/app/daybook-coach-ticket.mjs, lib/app/daybook-coach-excerpt.mjs; tests/daybook-coach-ticket.test.mjs and tests/daybook-coach-excerpt.test.mjs.

- [ ] RED: import missing helpers, exercise actual app crypto; ticket roundtrip plus wrong owner/coach, tamper, expiry/future, duplicate/extra fields and bounded malformed input.
- [ ] Implement issueDaybookCoachTicket(config,actor,{kind,itemId,revision,coachId},now), verifyDaybookCoachTicket(config,actor,token,coachId,now). Return opaque token/expiresAt; verification returns locator or null. Use seal/openSealed with random record UUID and daybook.coach_ticket AAD.
- [ ] RED: excerpt UTF-16 range, surrogate-pair boundaries, exact revision/topic serialization, max240, empty/range/source mismatch, sensitive disclosure.
- [ ] Implement pure excerpt helpers returning selected text plus composite sourceRevision (under128 chars). No source text in sourceRevision.
- [ ] Run node --test tests/daybook-coach-ticket.test.mjs tests/daybook-coach-excerpt.test.mjs. Require no skipped cases.

## Task 2 — authenticated leaf issue/resolve
Files: new app/api/app/daybook-coach/route.js, lib/app/daybook-coach-handler.mjs, lib/app/daybook-coach.js; tests/daybook-coach-api.test.mjs.

- [ ] RED: real Request/Response handlers with injected dependencies; POST only, origin/sameOrigin, verified actor, exact x-hh-account-id, no query, onlyKeys body, bounded body, 30/hour rate and PRIVATE_HEADERS on errors/success.
- [ ] Issue operation rereads one canonical owner source and exact revision; only accepted/active/in_progress eligible goals. No provider call.
- [ ] Resolve operation requires current context session and matching selected coach; rechecks owner source/revision and returns one source preview plus topic choices. Invalid ticket/source yields private generic unavailability.
- [ ] Keep Next adapter thin; existing repository read methods preserve account active checks and at-rest decryption.
- [ ] Run API/ticket/excerpt suites, strict scoped lint and syntax.

## Task 3 — current-session excerpt consent
Files: lib/app/coach-context-snapshot.js, new lib/app/coach-context-daybook.js, lib/coaching/context-cloud-consent.mjs, context-cloud-selector.mjs, coach-staged-memory.mjs, additive supabase migration; existing context tests plus new repository integration.

- [ ] RED: journal cannot be granted/account-wide loaded without valid session; source range/revision/topic/policy/provider review are bound; changed source/deletion/revoke/foreign account excludes it.
- [ ] Add journal_excerpt category with selected_daybook_excerpt sourceKind to existing ledger/projection. No new text store.
- [ ] Add named category constraint migration and session/non-null item restriction for journal grants; keep existing roles, privileges, RLS and append-only ledger.
- [ ] Build excerpt from current owner encrypted entry only after matching current grant; preserve sensitive-text filter and output budgets.
- [ ] Accept confirmed canonical goal states consistently in review/UI; retain report provenance rules.
- [ ] Test source erase, session/category withdrawal ordering, per-turn refresh, scope mismatch and max escaped/multilingual content. Execute actual two-owner PostgreSQL cases before hosted registration.
- [ ] Reuse current selected-saved-context checkbox, broaden its localized label accurately; independent journal item/session consent remains mandatory.

## Task 4 — manual Daybook entry and existing context panel
Files: new components/app/daybook-coach-link.jsx and daybook-coach-preview.jsx; components/app/daybook-journal.jsx, daybook-personal-goals.jsx, my-coach-context.jsx; minimal existing CSS.

- [ ] RED client state tests: stale account/session/source selection never reveals preview or grants; pending async results are epoch-masked; no automatic provider action.
- [ ] Existing seven-coach registry drives one inline coach selector and manual link action for saved entries/goals. Canonical full-page coach URL includes encrypted locator only.
- [ ] Existing manual session context panel resolves locator for its coach; readonly source textarea supports user selection plus explicit short-whole-entry action; visible exact preview/provider notices precede grant.
- [ ] Grant/revoke invokes existing onGrantChange to invalidate pending dialogue context. All saved journal permissions remain individually revocable even when provider/feature flag unavailable.
- [ ] EN/RU/ES accessible labels, errors, expired source fallback, keyboard selection and narrow phone layout. No popup, navigation shell redesign or auto session start.

## Task 5 — acceptance and single publication
- [ ] Run existing Context Cloud/staged memory/Daybook and six opening-gate tests; actual PostgreSQL two-account grant/withdrawal/source erasure.
- [ ] Exercise actual UI via Chromium/WebKit at320/390/430 EN/RU/ES; select goal/journal excerpt, review/grant/revoke, wrong account and expired ticket, zero page errors. Keep authenticated production/device proof separate.
- [ ] Strict scoped JS/JSX lint, syntax, diff check, full source preflight. No broad build before narrow checks.
- [ ] Refresh production/overlap/lease/protection and all existing workflow budget guards; reconcile source once if genuinely needed.
- [ ] Publish one coherent Ready PR and freeze exact HEAD through existing Core/Specialist/hh-merge-check/native auto-merge. No dummy changes/reruns/manual deploy.

## Task 6 — LIVE and remaining program
- [ ] After existing hourly publisher, verify canonical deployment project/READY/served descendant SHA and authenticated functional acceptance.
- [ ] Record merge/deploy/account/device/provider proof separately. Continue remaining daily-media/WebPush/offline/runtime/native gates from #5416; this plan does not redefine full completion.

## Execution receipt — 23 Nov 2026

Tasks 1–4 implemented locally. Source preflight/full TypeScript and strict scoped lint passed; 250/250 scoped unit cases and final 9/9 real PostgreSQL cases passed. Actual component flow passed Chromium153/WebKit27.2, EN/RU/ES320/390/430, zero page errors; auth is synthetic and no provider is invoked. Source selection reads the textarea's actual current selection on manual click. Global withdrawal now also removes stale permission rows from options. Four pre-existing wiring assertions were reconciled with existing server-approved Live memory, preserving token/request/revision/withdrawal gates and foreign PR source.

Additive consent migration applied once on verified project shervdixkaxurnaecioe as 20261123023514_hh_daybook_coach_excerpt_consent_20261123.sql; SQL MD5 95b8ee44a1d32dec8408a49a46f070a8. RLS enabled, anon/authenticated SELECT false, backend SELECT true and UPDATE/DELETE false. No private client content read or created, provider flag, send, real key or release action. Tasks 5 publication/hosted checks and 6 authenticated LIVE/device acceptance remain open.

Final manual review added an explicit includeJournal gate before source reads and in selection, propagated from the existing selected-context consent; negative tests prove zero journal reads when off. Independent review-agent startup failed twice (relationship persistence), not a completed review. No remote publication before the final coherent validation.
