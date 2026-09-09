# Prescription Owner UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner create a three-remedy recommendation and copy its secure client link in under one minute, without exposing technical fields or weakening the existing secure-link boundary.

**Architecture:** Keep the encrypted storage, opaque public ID mapping, canonical remedy catalogue, public projection, and PDF renderer unchanged. The admin boundary accepts a configured owner PIN first and the existing access token as a compatibility fallback, then issues a signed `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/admin` for 30 days. The form reduces visible inputs to client/date/remedies/instructions; the existing server model retains compatibility defaults and never projects internal notes.

**Tech Stack:** Next.js 15 App Router server actions, React 19, Node `crypto`, existing canonical remedies, existing PDF renderer and test suite.

---

### Task 1: Make owner authentication simple and durable

**Files:**
- Modify: `lib/prescriptions/admin.js`
- Modify: `app/admin/login/page.js`
- Modify: `app/admin/login/actions.js`
- Create: `app/admin/logout/actions.js`
- Modify: `tests/prescription-admin.test.mjs`

- [ ] **Step 1: Write the failing authentication/UI tests**

Assert that the login identifies its field as `PIN / Access code`, that `PRESCRIPTIONS_ADMIN_PIN` is checked before the legacy `PRESCRIPTIONS_ADMIN_TOKEN`, and that the session cookie options include `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/admin'`, and `maxAge: 60 * 60 * 24 * 30`. Assert that a logout action clears the same cookie and returns to `/admin/login`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: FAIL because the owner PIN, fixed Secure cookie duration, or logout UI/action is absent.

- [ ] **Step 3: Implement only the safe boundary change**

In `admin.js`, compare the submitted value in constant time against `[PRESCRIPTIONS_ADMIN_PIN, PRESCRIPTIONS_ADMIN_TOKEN]`, omit empty values, sign the credential actually accepted, and validate the cookie against either currently configured credential. Always set the admin cookie with the fixed 30-day options and clear it with the same `/admin` scope. Add a server logout action that calls `clearAdminSession()` and redirects to the login route. Rename only the login field and add a visible Logout button inside the authenticated admin shell.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: PASS.

### Task 2: Reduce the authoring form to the owner workflow

**Files:**
- Modify: `components/prescription-form.jsx`
- Modify: `app/admin/prescriptions/new/page.js`
- Modify: `app/admin/prescriptions/[id]/page.js`
- Modify: `app/admin/prescriptions/actions.js`
- Modify: `tests/prescription-admin.test.mjs`

- [ ] **Step 1: Write the failing form contract tests**

Assert that the editor shows `Client name`, `Date`, `Add remedy`, autocomplete backed by `remedySlug`, `potency`, `dosage`, `frequency`, `duration`, `notes`, and `General instructions`. Assert it does not render patient DOB, language preference, practitioner profile, internal notes, unlinked items, lifecycle draft/archive controls, raw public path text, internal record ID, or status selector.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: FAIL because legacy technical and secondary authoring controls are still in the form.

- [ ] **Step 3: Implement the compact form**

Keep the existing `itemsJson` contract and canonical matching logic, but remove non-owner fields from the DOM. Use server-side defaults for practitioner identity and language, submit active records directly on Create/Save, use `Client name` in the UI while preserving `patientName` in storage, and omit internal notes entirely from the server action input. Retain one obvious `Add remedy` button and the explicit item fields requested by the owner.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: PASS.

### Task 3: Put the six delivery actions first after save

**Files:**
- Modify: `components/prescription-form.jsx`
- Modify: `app/admin/prescriptions/[id]/page.js`
- Modify: `app/globals.css`
- Modify: `tests/prescription-admin.test.mjs`

- [ ] **Step 1: Write the failing delivery-action tests**

Assert that an active saved prescription has exactly the visible owner actions `Copy client link`, `Open client page`, `Download PDF`, `Print`, `Edit`, and `Revoke link`, and that no raw public token/path or backend status is rendered as copyable UI.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: FAIL because the current action block mixes draft/archive and raw link text into the authoring form.

- [ ] **Step 3: Implement a dedicated saved-state action strip**

After create/update, redirect to the existing edit URL and render the six delivery actions above the compact form. Copy derives the full client URL only at click time. Open, download, and print use the existing public page/PDF endpoints. Revoke remains a distinct destructive server action and, after revocation, replaces delivery actions with a clear unavailable state rather than exposing a link.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test tests/prescription-admin.test.mjs`

Expected: PASS.

### Task 4: Polish client document, PDF, and proof surfaces

**Files:**
- Modify: `components/prescription-document.jsx`
- Modify: `components/prescription-actions.jsx`
- Modify: `app/globals.css`
- Modify: `tests/prescription-pages.test.mjs`
- Create: `output/playwright/prescription-owner-login.png`
- Create: `output/playwright/prescription-owner-new.png`
- Create: `output/playwright/prescription-owner-created.png`
- Create: `output/playwright/prescription-owner-client.png`
- Create: `output/playwright/prescription-owner-client.pdf`

- [ ] **Step 1: Write failing client/document tests**

Assert the public document keeps only patient, date, canonical remedy links, remedy details, instructions, PDF download, and print. Assert technical strings such as internal IDs, storage adapters, bearer credentials, and internal notes are absent from public components and PDF route.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test tests/prescription-pages.test.mjs`

Expected: FAIL if any required professional-document label/action is missing or a forbidden technical field is exposed.

- [ ] **Step 3: Implement restrained document presentation and visual proof**

Preserve the existing localized professional document and canonical links, adjusting labels and spacing only as needed for a clear receipt/prescription hierarchy. Start the local production server with a non-sensitive fixture, capture the five required login/new/created/client/PDF views, and inspect each rendered image/PDF page.

- [ ] **Step 4: Run final verification**

Run: `npm run test:unit && npm run lint && npm run build`

Expected: every test passes, lint has no errors, and the production build exits zero.
