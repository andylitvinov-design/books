# Holistic House GBP Local Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing public Holistic House application a truthful, bilingual Maps entry path to services, the real guest self-check, Andrey, and an enquiry channel.

**Architecture:** Add an immutable public acquisition model that centralizes approved, non-clinical service copy and UTM attribution. Render that model in the existing Home and Services surfaces; use the established `/[locale]/app` guest runner and existing direct-contact CTA rather than creating a second app or lead store. A client-side event helper emits only allowlisted, consent-gated event names and no personal or assessment content.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Node test runner, existing Tailwind/CSS.

---

### Task 1: Lock the acquisition contract with tests

**Files:**
- Create: `tests/local-acquisition.test.mjs`
- Create: `data/local-acquisition.ts`

- [ ] Write a failing Node test that imports the model and asserts four service cards, `/en/app` as the self-check target, GBP UTM preservation, no regulated title, and no medical diagnosis language.
- [ ] Run `node --test tests/local-acquisition.test.mjs`; expect module-not-found failure.
- [ ] Implement the smallest frozen model needed by the test.
- [ ] Re-run the test; expect PASS.

### Task 2: Render the local public journey

**Files:**
- Modify: `components/holistic-house-home.tsx`
- Modify: `app/[locale]/services/page.tsx`
- Modify: `app/holistic-house-home.css`
- Test: `tests/local-acquisition.test.mjs`

- [ ] Extend the failing test to assert that Home and Services consume the shared model and link to the existing guest runner/contact route.
- [ ] Run the test; expect the source assertions to fail.
- [ ] Replace obsolete public service emphasis with the four approved acquisition offers and a clear non-booking contact CTA; preserve the existing Cabinet and contact implementation.
- [ ] Re-run the test and `npm run lint`; expect PASS.

### Task 3: Add privacy-safe, consent-gated event instrumentation

**Files:**
- Create: `components/acquisition-event-link.tsx`
- Modify: `components/holistic-house-home.tsx`
- Modify: `app/[locale]/services/page.tsx`
- Test: `tests/local-acquisition.test.mjs`

- [ ] Extend the failing test with allowlisted event names and a prohibition on payloads containing form or assessment data.
- [ ] Run the test; expect missing helper failure.
- [ ] Implement a link wrapper that only queues an event when an existing `analytics_storage` consent signal is granted; otherwise it stays a normal link.
- [ ] Re-run the test and lint; expect PASS.

### Task 4: Deliver controlled GBP support artifacts

**Files:**
- Create: `docs/gbp/2026-10-05-content-and-review-pack.md`
- Create: `public/gbp/holistic-house-review-qr.svg`
- Create: `docs/gbp/2026-10-05-asset-inventory.md`
- Test: `tests/local-acquisition.test.mjs`

- [ ] Extend the test to require an owner-supplied review URL placeholder is not shipped as a usable public QR destination.
- [ ] Run the test; expect artifact absence.
- [ ] Add eight factual GBP post drafts, neutral review copy, response policy, exact owner-only publishing field checklist, asset provenance inventory, and executable shot list. Do not invent a review URL; include a non-publishable placeholder SVG only.
- [ ] Re-run the test; expect PASS.

### Task 5: Verify and release through the normal review path

**Files:**
- Modify: changed files above only

- [ ] Run `npm run lint`, `node --test tests/local-acquisition.test.mjs`, and `npm run build`.
- [ ] Start the production build locally and check EN/RU Home, Services, and `/en/app` at 320/390/430/desktop with no horizontal overflow or console error.
- [ ] Commit focused changes, push the branch, create a PR, wait for CI, deploy via normal merged canonical policy, and read back the exact public revision before declaring Production complete.
