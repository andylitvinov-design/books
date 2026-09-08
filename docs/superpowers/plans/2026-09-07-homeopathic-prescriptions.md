# Homeopathic Prescription / Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual, private recommendation module that resolves remedies from the existing canonical catalogue without ever storing copied remedy content.

**Architecture:** A server-only prescription domain validates records and exposes only active public projections. A REST-KV storage adapter persists records when its explicit environment variables are present; otherwise client pages fail closed, apart from the non-sensitive preview fixture. Admin routes are HTTP Basic protected and use server actions. The PDF route renders the same public projection and never receives internal notes or internal IDs.

**Tech Stack:** Next.js App Router, React 19, Node built-ins, existing remedy catalogue, Vercel/Upstash-compatible REST KV.

---

### Task 1: Test the server-only prescription domain

**Files:**
- Create: `tests/prescriptions.test.mjs`
- Create: `lib/prescriptions/types.ts`
- Create: `lib/prescriptions/service.ts`

- [ ] Write failing tests for random public IDs, lifecycle projection, canonical slug validation, locale route resolution, and exclusion of internal notes/IDs.
- [ ] Implement validated record creation and the client-safe projection.
- [ ] Run `node --test tests/prescriptions.test.mjs` and confirm the domain tests pass.

### Task 2: Add secure storage and admin boundary

**Files:**
- Create: `lib/prescriptions/store.ts`
- Create: `lib/prescriptions/admin.ts`
- Create: `app/admin/prescriptions/new/page.tsx`
- Create: `app/admin/prescriptions/[id]/page.tsx`
- Create: `app/admin/prescriptions/actions.ts`

- [ ] Test the in-memory adapter and configuration fail-closed behavior without credentials.
- [ ] Implement a Vercel/Upstash REST-KV adapter using only server environment variables; retain no client data in source or fixture files.
- [ ] Require `PRESCRIPTIONS_ADMIN_TOKEN` before rendering or mutating admin routes.

### Task 3: Build localized client and document delivery surfaces

**Files:**
- Create: `app/[locale]/prescriptions/[publicId]/page.tsx`
- Create: `app/[locale]/prescriptions/[publicId]/not-found.tsx`
- Create: `app/api/prescriptions/[publicId]/pdf/route.ts`
- Create: `components/prescription-document.tsx`
- Create: `components/prescription-actions.tsx`
- Modify: `app/globals.css`

- [ ] Test RU/EN labels, route preservation, client-safe rendering, `noindex`, print CSS, and PDF headers.
- [ ] Render a dynamic, noindex page whose linked remedies always use the canonical locale route.
- [ ] Add a clean A4 PDF response and print-only rules with no navigation, admin controls, or debug/provenance fields.

### Task 4: Verify integration and delivery evidence

**Files:**
- Modify: `tests/prescriptions.test.mjs`
- Modify: `README.md`

- [ ] Confirm sitemap does not enumerate dynamic prescription URLs.
- [ ] Run focused tests, full unit tests, lint, production build, and local route smoke.
- [ ] Capture only non-sensitive preview fixture screenshots and PDF, then open a PR without merging or promoting production.
