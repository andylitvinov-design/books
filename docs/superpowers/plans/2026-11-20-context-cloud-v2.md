# Context Cloud v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an owner-controlled, provenance-aware Context Cloud to Ali without new providers, duplicate private archives, or additional inference calls.

**Architecture:** Build the private Context core and deterministic selector before wiring it to the current Coach request boundary. Keep source adapters narrow and revision-aware; use grants and invalidation to make the snapshot fail closed. Add UI and P1 sources only after core authorization and request contracts pass.

**Tech Stack:** Next.js, server-only ESM, Supabase PostgreSQL `app_private`, application AES-GCM sealing, Node test runner, React/CSS modules.

---

## File structure

- `supabase/migrations/20261120*_context_cloud_v2.sql`: private tables, backend grants, RLS, owner policies and erasure-safe foreign keys.
- `lib/coaching/context-cloud-contract.mjs`: pure v2 item/grant/provider validation and bounded serialization.
- `lib/app/context-cloud-store.js`: authenticated encrypted persistence, source adapters and transactions.
- `lib/coaching/context-director.mjs`: deterministic server-only snapshot construction and invalidation.
- `lib/coaching/conversational-persona.mjs`: one bounded untrusted-context message in the existing request construction.
- `lib/app/coaching-brain.js`: exactly-once snapshot wiring for text and stream paths.
- `app/api/app/[...path]/route.js`: authenticated My Context API endpoints only.
- `components/app/my-coaching-plan.jsx` and `.module.css`: third compact locale-aware tab.
- `tests/context-cloud-*.test.mjs`: unit, request, authorization, source invalidation and UI contract coverage.

### Task 1: P0.A compatibility report and baseline

**Files:**
- Create: `docs/coaching/CONTEXT_CLOUD_V2_COMPATIBILITY_20261120.md`
- Test: `tests/context-cloud-compatibility.test.mjs`

- [ ] **Step 1: Write the failing inventory test**

```js
test('Context Cloud v2 compatibility report names current v1 and no duplicate archive',()=>{
  const report=source('docs/coaching/CONTEXT_CLOUD_V2_COMPATIBILITY_20261120.md')
  assert.match(report,/client-context\.mjs/)
  assert.match(report,/coaching_session_records/)
  assert.match(report,/not a second archive/i)
})
```

- [ ] **Step 2: Run the test**

Run: `node --test tests/context-cloud-compatibility.test.mjs`

Expected: FAIL because the report does not exist.

- [ ] **Step 3: Add the source matrix**

Document V1 context, Director, encrypted Life Plan/reports, assessment state, consent ledger, all seven reconciled PRs, current production SHA, reuse/missing decision, and the P0/P1/P2 PR boundaries. State that #5221 and #5234 are dependency-sensitive and Context core must not modify live-dialogue files until rebased.

- [ ] **Step 4: Run baseline coaching contracts**

Run: `node --test tests/personal-coaching-client-context.test.mjs tests/coach-session-director.test.mjs tests/coaching-live-voice.test.mjs`

Expected: PASS before Context Cloud changes.

- [ ] **Step 5: Commit**

```bash
git add docs/coaching/CONTEXT_CLOUD_V2_COMPATIBILITY_20261120.md tests/context-cloud-compatibility.test.mjs
git commit -m "docs: inventory Context Cloud v2 sources"
```

### Task 2: P0.B private schema and pure contract

**Files:**
- Create: `supabase/migrations/20261120*_hh_context_cloud_v2.sql`
- Create: `lib/coaching/context-cloud-contract.mjs`
- Test: `tests/context-cloud-contract.test.mjs`
- Test: `tests/context-cloud-schema.test.mjs`

- [ ] **Step 1: Write failing contract tests**

```js
assert.deepEqual(normalizeContextItem({category:'goals',status:'confirmed',evidenceKind:'confirmed_plan',sensitivity:'private',sourceType:'life_plan',sourceId:ID,sourceRevision:2}), expected)
assert.equal(serializeCoachContext([injectionItem]).includes('ignore previous'), false)
assert.deepEqual(selectGrantedItems(items, grants, {providerKey:'groq'}), [])
```

- [ ] **Step 2: Run them**

Run: `node --test tests/context-cloud-contract.test.mjs`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement contract functions**

Export `normalizeContextItem`, `normalizeContextGrant`, `effectiveGrant`, `serializeCoachContext` and `emptyContextSnapshot`. Reject unknown fields/categories/providers and cap items/text before serialization. Encode data as untrusted quoted values, never instructions.

- [ ] **Step 4: Add schema migration**

Create `app_private.context_cloud_items`, `context_cloud_grants` and `context_cloud_events` with `account_id` owner FKs/cascades, source revision/hash fields, timestamps, status checks, RLS enabled, `hh_app_backend` grants and policies matching `coaching_session_records`. Do not grant `public`, `anon` or `authenticated` direct table access.

- [ ] **Step 5: Run tests**

Run: `node --test tests/context-cloud-contract.test.mjs tests/context-cloud-schema.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261120*_hh_context_cloud_v2.sql lib/coaching/context-cloud-contract.mjs tests/context-cloud-contract.test.mjs tests/context-cloud-schema.test.mjs
git commit -m "feat: add private Context Cloud v2 contract"
```

### Task 3: P0.B source adapters, confirmations and revocation

**Files:**
- Create: `lib/app/context-cloud-store.js`
- Create: `lib/coaching/context-director.mjs`
- Test: `tests/context-cloud-director.test.mjs`
- Test: `tests/context-cloud-isolation.test.mjs`

- [ ] **Step 1: Write failing director tests**

```js
assert.equal((await buildCoachContextSnapshot({actor:A,providerKey:'groq',store})).items.length, 1)
await store.revokeGrant(A.id, grant.id)
assert.deepEqual(await buildCoachContextSnapshot({actor:A,providerKey:'groq',store}), emptyContextSnapshot())
await assert.rejects(()=>store.readItemAs(B, item.id), /CONTEXT_FORBIDDEN/)
```

- [ ] **Step 2: Run them**

Run: `node --test tests/context-cloud-director.test.mjs tests/context-cloud-isolation.test.mjs`

Expected: FAIL because the store/director modules are absent.

- [ ] **Step 3: Implement owner-bound adapters**

Read Life Plan and reviewed reports only through server transactions scoped to `actor.id`. Seal context item values with account/item-bound AAD. Persist only client-confirmed items. Compare source revisions/hash before selection; write an invalidation event and omit stale items. Never import report body, session transcript, audio or test answers.

- [ ] **Step 4: Implement deterministic selector**

`buildCoachContextSnapshot({config, actor, session, providerKey, now})` validates actor/session/provider, computes current effective grants, rejects stale/deleted/superseded/expired items, caps categories, and returns an empty snapshot on expected context failure. It must not throw a context error into an otherwise permitted coaching turn.

- [ ] **Step 5: Run tests**

Run: `node --test tests/context-cloud-director.test.mjs tests/context-cloud-isolation.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/app/context-cloud-store.js lib/coaching/context-director.mjs tests/context-cloud-director.test.mjs tests/context-cloud-isolation.test.mjs
git commit -m "feat: build consented Context Cloud snapshots"
```

### Task 4: P0.C exactly-once Coach integration

**Files:**
- Modify: `lib/app/coaching-brain.js`
- Modify: `lib/coaching/conversational-persona.mjs`
- Test: `tests/context-cloud-coach-request.test.mjs`
- Test: `tests/coaching-live-voice.test.mjs`

- [ ] **Step 1: Write failing request tests**

```js
assert.equal(fetcher.calls.length, 1)
assert.match(fetcher.calls[0].body, /UNTRUSTED CLIENT CONTEXT/)
assert.doesNotMatch(fetcher.calls[0].body, /raw transcript|assessment answer/i)
assert.equal(revokedTurn.context.items.length, 0)
```

- [ ] **Step 2: Run them**

Run: `node --test tests/context-cloud-coach-request.test.mjs tests/coaching-live-voice.test.mjs`

Expected: FAIL because no Context Director output reaches the request.

- [ ] **Step 3: Wire snapshot once per turn**

Resolve the authenticated actor/provider snapshot immediately before existing `conversationalCoachMessages` in both `myCoachGenerativeTurn` and `myCoachGenerativeStreamTurn`. Pass one `contextSnapshot` argument to the message builder. Keep Director construction, streaming delta validation, barge-in and reserveModelCall unchanged.

- [ ] **Step 4: Run focused regression suite**

Run: `node --test tests/context-cloud-coach-request.test.mjs tests/coach-session-director.test.mjs tests/coaching-live-voice.test.mjs tests/my-coach-early-stream.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/app/coaching-brain.js lib/coaching/conversational-persona.mjs tests/context-cloud-coach-request.test.mjs tests/coaching-live-voice.test.mjs
git commit -m "feat: add approved context to Ali turns"
```

### Task 5: P0.D My Context mobile UI and API

**Files:**
- Modify: `app/api/app/[...path]/route.js`
- Modify: `components/app/my-coaching-plan.jsx`
- Modify: `components/app/my-coaching-plan.module.css`
- Test: `tests/context-cloud-api.test.mjs`
- Test: `tests/my-coaching-plan-context-mobile.test.mjs`

- [ ] **Step 1: Write failing API/UI tests**

```js
assert.equal(response.status, 403) // forged accountId is ignored/rejected
assert.match(ui,'My Context')
assert.match(ui,'Мой контекст')
assert.match(ui,'Mi contexto')
assert.match(css,/max-width:\s*430px/)
```

- [ ] **Step 2: Run them**

Run: `node --test tests/context-cloud-api.test.mjs tests/my-coaching-plan-context-mobile.test.mjs`

Expected: FAIL because the endpoints and tab do not exist.

- [ ] **Step 3: Add owner-only endpoints and third tab**

Expose list/review/grant/revoke/erase operations via authenticated routes using only server actor identity. Add a third tab after goals/reports with provenance, provider notice, explicit enable/revoke and empty/loading/error UI. Do not render source content that is not a Context item.

- [ ] **Step 4: Run responsive and keyboard checks**

Run: `node --test tests/context-cloud-api.test.mjs tests/my-coaching-plan-context-mobile.test.mjs tests/my-coaching-plan-mobile.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/app/[...path]/route.js components/app/my-coaching-plan.jsx components/app/my-coaching-plan.module.css tests/context-cloud-api.test.mjs tests/my-coaching-plan-context-mobile.test.mjs
git commit -m "feat: add My Context controls"
```

### Task 6: P1 selected assessments and reviewed session memory

**Files:**
- Modify: `lib/app/context-cloud-store.js`
- Modify: `lib/clients/assessment-store.js`
- Modify: `components/app/my-coaching-plan.jsx`
- Test: `tests/context-cloud-assessments.test.mjs`
- Test: `tests/context-cloud-session-review.test.mjs`

- [ ] **Step 1: Write failing P1 safety tests**

```js
assert.equal(snapshot.items.some(item=>item.category==='assessments'), false)
await selectFinalizedScale(A, resultId, scaleKey)
assert.equal((await snapshotFor(A)).items[0].evidenceKind, 'validated_test_score')
assert.equal((await createSessionDraft(interruptedTurn)).status, 'candidate')
```

- [ ] **Step 2: Run them**

Run: `node --test tests/context-cloud-assessments.test.mjs tests/context-cloud-session-review.test.mjs`

Expected: FAIL because selected-assessment and review adapters do not exist.

- [ ] **Step 3: Add explicit opt-in adapters**

Allow only finalized allowlisted scales with source/date/methodology/limitations. Store no answer payload. Convert a reviewed session summary to editable candidate Context items; only a client save creates confirmed items. Interrupted voice/text segments create no candidate.

- [ ] **Step 4: Run P1 safety suite**

Run: `node --test tests/context-cloud-assessments.test.mjs tests/context-cloud-session-review.test.mjs tests/context-cloud-coach-request.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/app/context-cloud-store.js lib/clients/assessment-store.js components/app/my-coaching-plan.jsx tests/context-cloud-assessments.test.mjs tests/context-cloud-session-review.test.mjs
git commit -m "feat: add reviewed Context Cloud sources"
```

### Task 7: P2 business-context evaluation and release acceptance

**Files:**
- Create: `docs/coaching/CONTEXT_CLOUD_V2_PRIVACY_AND_RELEASE.md`
- Test: `tests/context-cloud-release-contract.test.mjs`

- [ ] **Step 1: Write release contract test**

```js
assert.match(source('docs/coaching/CONTEXT_CLOUD_V2_PRIVACY_AND_RELEASE.md'),/no retrieval or embedding provider/i)
assert.match(source('docs/coaching/CONTEXT_CLOUD_V2_PRIVACY_AND_RELEASE.md'),/physical iPhone/i)
```

- [ ] **Step 2: Implement release documentation**

Document retention, export/erase, provider-specific notices, human sharing boundary, policy version renewal, P2 measurement criteria and the prohibition on retrieval/Telegram until separate approval. Record the #5236 addendum boundary: business meeting/project data requires a separate workspace grant, stays out of personal coaching, begins Fireflies-first/read-only, and never assumes a Plaud cloud API.

- [ ] **Step 3: Run release suite**

Run: `npm run test:coaching:release && node --test tests/context-cloud-*.test.mjs`

Expected: PASS before PR review.

- [ ] **Step 4: Commit**

```bash
git add docs/coaching/CONTEXT_CLOUD_V2_PRIVACY_AND_RELEASE.md tests/context-cloud-release-contract.test.mjs
git commit -m "docs: define Context Cloud release gates"
```

### Task 8: P2 separate business source contract (only after P1 acceptance)

**Files:**
- Create: `lib/business-context/source-contract.mjs`
- Create: `lib/business-context/reconciliation.mjs`
- Test: `tests/business-context-source-contract.test.mjs`
- Test: `tests/business-context-isolation.test.mjs`

- [ ] **Step 1: Write failing isolation tests**

```js
assert.equal(classifyRecord(personalCoachingRecord, tenantAllowlist).domain, 'personal')
assert.equal(reconcileIssue(ambiguousInsight, openIssues, peopleMap, projectMap).operation, 'no_action')
assert.equal(await businessStore.readForCoachingActor(clientActor), null)
```

- [ ] **Step 2: Run them**

Run: `node --test tests/business-context-source-contract.test.mjs tests/business-context-isolation.test.mjs`

Expected: FAIL because the business-context modules are absent.

- [ ] **Step 3: Implement no-mutation contract**

Implement pure validation for tenant/provider/grant revisions and deterministic classification/reconciliation. Treat transcript content as quoted untrusted data. Return only `link_existing`, `propose_create`, `propose_complete` or `no_action`; no implementation in this task may call Linear or an external source provider.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/business-context-source-contract.test.mjs tests/business-context-isolation.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/business-context/source-contract.mjs lib/business-context/reconciliation.mjs tests/business-context-source-contract.test.mjs tests/business-context-isolation.test.mjs
git commit -m "feat: add isolated business context contract"
```

## Self-review

- P0.A–P0.D and P1 requirements map to Tasks 1–6. Task 7 is the P2 evaluation/release gate; Task 8 covers only the #5236-addendum's isolated, no-provider/no-mutation business contract.
- The plan has no retrieval provider, duplicate source archive, frontend-owned private context, extra inference request, implicit test import or silent session-memory write.
- Every task contains an executable test command and a scoped commit boundary.
