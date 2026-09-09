# Prescription Fragment Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace prescription bearer IDs in request paths with a non-secret selector plus URL-fragment secret exchanged for a short server-side session.

**Architecture:** A pure access module owns selector/secret/session formats and constant-time verification. The encrypted record stores only a secret hash; Redis stores selector indexes, bounded rate counters, and opaque short-lived sessions. A neutral client gate exchanges the fragment, erases it from history, and reloads; page/PDF rendering then requires selector plus HttpOnly session.

**Tech Stack:** Next.js 15 App Router, React 19, Node crypto, Upstash-compatible REST Redis, Node test runner, existing custom PDF generator.

---

## File structure

- Create `lib/prescriptions/access.js`: cryptographic formats, access issuance, secret verification, session creation/authorization, and strict input validation.
- Modify `lib/prescriptions/store.js`: selector index, encrypted records, expiring session records, rate limiting, old-index cleanup, memory parity.
- Modify `lib/prescriptions/service.js`: stop creating new path bearers and remove all public credential fields from client projection.
- Create `components/prescription-access-gate.jsx`: fragment-only exchange and immediate history cleanup.
- Create `components/prescription-link-issuer.jsx`: one-time admin copy flow without persisted client state.
- Modify `components/prescription-form.jsx` and admin pages: issue/rotate UI and no recoverable old link.
- Create `app/api/prescription-access/route.js` and `app/api/prescription-access/logout/route.js`: exchange/logout with no-store, origin validation, generic failures, and secure cookie.
- Create `app/api/admin/prescriptions/[id]/access/route.js`: authenticated same-origin issue/rotate endpoint.
- Replace dynamic route parameter names in the client page and PDF route with `selector`, enforcing session authorization.
- Modify `middleware.ts`, `public/sw.js`, and `lib/pwa/cache-policy.js`: headers/CSP and network-only access paths.
- Modify prescription tests and documentation; add browser-smoke helpers only if needed for hosted verification.

### Task 1: Define access cryptography and record lifecycle

**Files:**
- Create: `lib/prescriptions/access.js`
- Modify: `lib/prescriptions/service.js`
- Test: `tests/prescription-access.test.mjs`
- Test: `tests/prescriptions.test.mjs`

- [ ] **Step 1: Write failing tests for strict formats, one-way storage, constant-time validation, and client projection**

```js
test('issues selector plus fragment secret but stores only its hash', () => {
  const { record, selector, secret } = issuePrescriptionAccess(activeRecord)
  assert.match(selector, /^[A-Za-z0-9_-]{22}$/)
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(record.access.selector, selector)
  assert.equal(record.access.secretHash.includes(secret), false)
  assert.equal(verifyPrescriptionSecret(record, secret), true)
  assert.equal(verifyPrescriptionSecret(record, `${secret.slice(0, -1)}A`), false)
})
```

- [ ] **Step 2: Run the focused tests and confirm missing access APIs fail**

Run: `node --test tests/prescription-access.test.mjs tests/prescriptions.test.mjs`
Expected: FAIL because `access.js` and the new lifecycle do not exist.

- [ ] **Step 3: Implement the minimal pure access API**

```js
export function issuePrescriptionAccess(record, now = new Date().toISOString())
export function verifyPrescriptionSecret(record, secret)
export function createPrescriptionSession(record, nowMs = Date.now())
export function authorizePrescriptionSession(record, selector, session, nowMs = Date.now())
export function isSelector(value)
export function isBearerSecret(value)
export function isSessionToken(value)
export function digestSessionToken(value)
```

Use `randomBytes`, `createHash('sha256')`, and fixed-length `Buffer` values with `timingSafeEqual`. New records have no `publicId`; existing records retain it only until the next save/rotation so its legacy mapping can be removed. `getClientPrescription` must contain no `id`, `publicId`, `internalNotes`, access hash, or session field.

- [ ] **Step 4: Run focused tests and confirm PASS**

Run: `node --test tests/prescription-access.test.mjs tests/prescriptions.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/prescriptions/access.js lib/prescriptions/service.js tests/prescription-access.test.mjs tests/prescriptions.test.mjs
git commit -m "feat: add fragment prescription credentials"
```

### Task 2: Add selector indexes, opaque sessions, rate limits, and fail-closed cleanup

**Files:**
- Modify: `lib/prescriptions/store.js`
- Test: `tests/prescription-access.test.mjs`
- Test: `tests/prescriptions.test.mjs`

- [ ] **Step 1: Add failing memory and REST harness tests**

```js
await store.save(issuedRecord, legacyRecord)
assert.equal((await store.findBySelector(selector))?.id, legacyRecord.id)
await store.createAccessSession(session, 900)
assert.deepEqual(await store.findAccessSession(session.digest), session)
assert.equal(await store.consumeAccessAttempt(rateKey, 12, 300), true)
await store.save({ ...issuedRecord, status: 'revoked' }, issuedRecord)
assert.equal(await store.findBySelector(selector), undefined)
```

Assert REST commands use `SET ... EX`, `INCR`, `EXPIRE`, delete old `prescription:public:*` and selector mappings, and keep the clinical record in an AES-256-GCM envelope.

- [ ] **Step 2: Run focused store tests and confirm FAIL**

Run: `node --test tests/prescription-access.test.mjs tests/prescriptions.test.mjs`
Expected: FAIL on missing selector/session/rate methods.

- [ ] **Step 3: Implement identical memory and REST store contracts**

```js
findBySelector(selector)
save(record, previousRecord)
createAccessSession(session, ttlSeconds)
findAccessSession(digest)
deleteAccessSession(digest)
consumeAccessAttempt(digest, limit, windowSeconds)
```

Session values contain only record ID, selector, access version, and expiry. Memory entries track expiry; REST sessions use Redis TTL. Save the encrypted record before publishing a new selector, and delete old/legacy mappings before a non-active record is retained.

- [ ] **Step 4: Run focused tests and confirm PASS**

Run: `node --test tests/prescription-access.test.mjs tests/prescriptions.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/prescriptions/store.js tests/prescription-access.test.mjs tests/prescriptions.test.mjs
git commit -m "feat: persist prescription access sessions"
```

### Task 3: Build the neutral bootstrap and secure exchange

**Files:**
- Create: `components/prescription-access-gate.jsx`
- Create: `app/api/prescription-access/route.js`
- Create: `app/api/prescription-access/logout/route.js`
- Create: `lib/prescriptions/session.js`
- Modify: `app/[locale]/prescriptions/[publicId]/page.js`
- Test: `tests/prescription-pages.test.mjs`
- Test: `tests/prescription-access.test.mjs`

- [ ] **Step 1: Write failing route/source tests**

```js
assert.match(gate, /window\.history\.replaceState/)
assert.doesNotMatch(gate, /localStorage|sessionStorage|indexedDB/)
assert.match(exchange, /timingSafe|verifyPrescriptionSecret/)
assert.match(exchange, /sameSite: 'strict'/)
assert.match(exchange, /httpOnly: true/)
assert.match(page, /authorizePrescriptionRequest/)
```

Add direct handler tests for malformed body, wrong origin, wrong secret, rate limit, success cookie, expired session, logout, and identical generic invalid response bodies.

- [ ] **Step 2: Run focused tests and confirm FAIL**

Run: `node --test tests/prescription-access.test.mjs tests/prescription-pages.test.mjs`
Expected: FAIL because gate/session/routes are absent.

- [ ] **Step 3: Implement session boundary and exchange**

`lib/prescriptions/session.js` exports cookie options, strict same-origin validation, safe JSON parsing capped at 2 KiB, `establishPrescriptionSession`, `authorizePrescriptionRequest`, and `clearPrescriptionSession`. Use a session cookie (no persistent `Max-Age`) plus a 15-minute server TTL. The exchange route returns `204` on success and a single `404` JSON shape otherwise; rate-limit exhaustion uses that same shape.

The client gate performs this exact order:

```js
const secret = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
if (!isStrictSecret(secret)) return setUnavailable()
const response = await fetch('/api/prescription-access', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  cache: 'no-store', credentials: 'same-origin',
  body: JSON.stringify({ selector, secret }),
})
if (response.ok) window.location.replace(`${window.location.pathname}${window.location.search}`)
```

The page renders only the gate unless `authorizePrescriptionRequest(selector)` returns an active record. Rename the dynamic parameter in code to `selector`; the directory may be renamed in Task 4 without changing the public shape.

- [ ] **Step 4: Run focused tests and confirm PASS**

Run: `node --test tests/prescription-access.test.mjs tests/prescription-pages.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/prescriptions/session.js components/prescription-access-gate.jsx app/api/prescription-access app/[locale]/prescriptions tests/prescription-access.test.mjs tests/prescription-pages.test.mjs
git commit -m "feat: exchange prescription fragments for sessions"
```

### Task 4: Protect PDF, locale switching, print, and private headers

**Files:**
- Create: `app/[locale]/prescriptions/[selector]/page.js`
- Delete: `app/[locale]/prescriptions/[publicId]/page.js`
- Create: `app/api/prescriptions/[selector]/pdf/route.js`
- Delete: `app/api/prescriptions/[publicId]/pdf/route.js`
- Modify: `components/prescription-document.jsx`
- Modify: `components/prescription-actions.jsx`
- Modify: `middleware.ts`
- Modify: `public/sw.js`
- Modify: `lib/pwa/cache-policy.js`
- Test: `tests/prescription-pages.test.mjs`
- Test: `tests/psialchemy-pwa.test.mjs`

- [ ] **Step 1: Write failing tests for selector-only denial and header policy**

Assert page/PDF code invokes session authorization, PDF never calls `findBySelector` directly, language links contain only selector, sitemap has no prescription route, private service-worker policies include both exchange endpoints, and middleware applies no-store/noindex/no-referrer/nosniff/frame/CSP headers.

- [ ] **Step 2: Run focused tests and confirm FAIL**

Run: `node --test tests/prescription-pages.test.mjs tests/psialchemy-pwa.test.mjs`
Expected: FAIL on session enforcement and the expanded headers.

- [ ] **Step 3: Implement authenticated rendering and private headers**

The document receives `selector`, not a credential. Locale links use `/${locale}/prescriptions/${selector}`; PDF uses `/api/prescriptions/${selector}/pdf?locale=${locale}`. Middleware generates a nonce and applies a restrictive prescription CSP with `default-src 'self'`, nonce-based `script-src`, `connect-src 'self'`, `base-uri 'none'`, `form-action 'self'`, and `frame-ancestors 'none'`. Keep style allowances limited to the existing Next/Tailwind runtime requirement.

- [ ] **Step 4: Run focused tests and confirm PASS**

Run: `node --test tests/prescription-pages.test.mjs tests/psialchemy-pwa.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/prescriptions app/api/prescriptions components/prescription-document.jsx components/prescription-actions.jsx middleware.ts public/sw.js lib/pwa/cache-policy.js tests/prescription-pages.test.mjs tests/psialchemy-pwa.test.mjs
git commit -m "fix: require sessions for prescription documents"
```

### Task 5: Add one-time admin issue/rotate flow

**Files:**
- Create: `components/prescription-link-issuer.jsx`
- Create: `app/api/admin/prescriptions/[id]/access/route.js`
- Modify: `components/prescription-form.jsx`
- Modify: `app/admin/prescriptions/[id]/page.js`
- Modify: `app/admin/prescriptions/actions.js`
- Test: `tests/prescription-admin.test.mjs`
- Test: `tests/prescription-access.test.mjs`

- [ ] **Step 1: Write failing tests for protected issuance and non-persistence**

Assert the route checks admin auth and same origin, rotates `access.version`, returns `Cache-Control: private, no-store`, exposes the secret only in its JSON response, and never returns internal notes or a DB ID. Assert the client copies `/${locale}/prescriptions/${selector}#${secret}` without state, Web Storage, query parameters, or DOM rendering of the secret.

- [ ] **Step 2: Run focused tests and confirm FAIL**

Run: `node --test tests/prescription-admin.test.mjs tests/prescription-access.test.mjs`
Expected: FAIL because the issuance endpoint/component do not exist.

- [ ] **Step 3: Implement issue/rotate and fail-closed activation**

The admin route reads the existing record, calls `issuePrescriptionAccess`, and `save(updated, existing)`. It returns only `{ selector, secret }`. The browser constructs and copies the absolute link in a local function variable and then drops it. `PrescriptionForm` shows `Issue private link` or `Rotate private link`; it never receives `publicId`, secret, or full client link as a prop. Activating without issuance remains inaccessible until the admin explicitly issues a link.

- [ ] **Step 4: Run focused tests and confirm PASS**

Run: `node --test tests/prescription-admin.test.mjs tests/prescription-access.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/prescription-link-issuer.jsx components/prescription-form.jsx app/api/admin/prescriptions app/admin/prescriptions tests/prescription-admin.test.mjs tests/prescription-access.test.mjs
git commit -m "feat: rotate private prescription links"
```

### Task 6: Document migration and complete local verification

**Files:**
- Modify: `docs/homeopathic-prescriptions.md`
- Modify: `docs/superpowers/specs/2026-09-08-prescription-fragment-session-design.md` only if implementation requires a documented deviation
- Test: all existing prescription/security suites

- [ ] **Step 1: Update operator documentation**

Document selector/fragment/session formats, one-time issuance, 15-minute server TTL, cookie scope, rotation/revoke semantics, old-link fail-closed behavior, legacy count procedure using Redis `SCAN` without `GET`, isolated Preview storage, and synthetic-data cleanup.

- [ ] **Step 2: Run security scans and focused tests**

Run:

```bash
rg -n "console\.(log|info|debug)|localStorage|sessionStorage|indexedDB|publicId|prescription:public" app components lib public middleware.ts
node --test tests/prescription-*.test.mjs tests/prescriptions.test.mjs tests/psialchemy-pwa.test.mjs
npm run test:unit
npm run lint
npm run build
```

Expected: intentional legacy cleanup references only; all tests/lint/build pass.

- [ ] **Step 3: Run local browser and route smoke**

Create only synthetic records. Verify fragment removal before reload, refresh via session, RU/EN pages and remedy links, authenticated RU/EN PDFs including multi-page first/final markers, print desktop/mobile, generic unknown/wrong-secret behavior, revoke/logout/expiry denial, headers, sitemap exclusion, service-worker storage, and no internal fields.

- [ ] **Step 4: Commit**

```bash
git add docs/homeopathic-prescriptions.md
git commit -m "docs: document prescription access rotation"
```

### Task 7: Preview-first release and live proof

**Files:**
- No production source changes unless a reproduced failure receives a failing regression test first.

- [ ] **Step 1: Push branch and open a PR against `codex/public-book-library`**

Run: `git push -u origin codex/prescription-fragment-session` and create the PR with the security contract and local evidence.

- [ ] **Step 2: Configure isolated Preview storage and deploy the exact PR HEAD**

Use the canonical Vercel project only. Create/connect a Preview-only Upstash database if the provider safely permits a free non-upgrading resource; otherwise stop with the exact minimal owner action. Generate fresh Preview-only admin/encryption secrets without printing them. Never connect Production Redis to Preview.

- [ ] **Step 3: Execute hosted synthetic security smoke**

Create a unique synthetic active prescription through admin, issue a link, and verify browser/network/storage/history/PDF/print/status cases from the design. Inspect raw Preview Redis to prove ciphertext. Verify a second independent process reads the record. Scan Vercel runtime logs for the exact synthetic secret and require zero matches; the selector may appear.

- [ ] **Step 4: Clean synthetic Preview data and require all CI checks**

Revoke and delete synthetic Redis record/index/session/rate keys without printing them. Require PR mergeability and all checks green.

- [ ] **Step 5: Merge and verify canonical Production**

Merge only the reviewed PR HEAD. Wait for READY, verify the deployment source is the merge commit, then repeat the complete synthetic smoke against the canonical production domain and scan production logs for the synthetic bearer. Count legacy link keys with `SCAN` only and report the count without identifiers.

- [ ] **Step 6: Clean synthetic Production data and produce delivery gate**

Revoke first, then remove every synthetic record/index/session/rate key. Verify inaccessible afterward. Report each original requirement as PASS/PARTIAL/FAIL/NOT VERIFIED and explicitly state `bearer secret present in provider logs: YES/NO`.
