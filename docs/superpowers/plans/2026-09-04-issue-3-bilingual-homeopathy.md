# Bilingual Homeopathy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 38 source-backed Russian and English remedy pages through localized routes without changing existing book routes or production.

**Architecture:** Markdown holds locale-specific content and provenance. `data/remedies.ts` parses and validates it into one catalog consumed by static Next routes, metadata, sitemap, search UI, and tests. The browser receives only directory entries and filters those entries locally.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utilities, node:test, Vercel preview.

---

### Task 1: Prove the desired content contract before implementation

**Files:**
- Create: `tests/remedy-content.test.mjs`
- Create: `scripts/validate-remedy-content.mjs`

- [ ] **Step 1: Write the failing test**

Assert that `content/remedies/ru` and `content/remedies/en` each contain 38 Markdown files, matching slugs, matching inventory rows, valid source file/heading references, no duplicates, and English translation provenance.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/remedy-content.test.mjs`
Expected: FAIL because the content directories and validator do not exist.

- [ ] **Step 3: Add the deterministic source-to-Markdown generator and catalog parser**

Use only confirmed inventory rows, their cited source articles, and source-derived metadata. Generate paired Markdown files and expose the catalog API required by routes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/remedy-content.test.mjs`
Expected: PASS with 38 Russian and 38 English entries.

- [ ] **Step 5: Commit**

Commit: `feat: add source-backed bilingual remedy content`

### Task 2: Prove route and search behavior before UI implementation

**Files:**
- Create: `tests/homeopathy-routes.test.mjs`
- Create: `data/remedies.ts`
- Create: `components/site-navigation.tsx`
- Create: `components/remedy-directory.tsx`
- Create: `components/remedy-page.tsx`
- Create: `app/[locale]/homeopathy/page.tsx`
- Create: `app/[locale]/homeopathy/remedies/page.tsx`
- Create: `app/[locale]/homeopathy/remedies/[slug]/page.tsx`
- Create: `app/[locale]/homeopathy/remedies/[slug]/not-found.tsx`

- [ ] **Step 1: Write the failing test**

Assert locale/slug static params contain 76 pairs, valid locale switching preserves `slug`, unknown slug has no catalog entry, each required index route has data, and search returns `natrum-muriaticum` for `nat mur`, `arsenicum-album` for `arsenicum`, and source-backed Russian aliases when available.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/homeopathy-routes.test.mjs`
Expected: FAIL because localized Homeopathy routes and search catalog do not exist.

- [ ] **Step 3: Implement minimal localized routes and UI**

Generate route params from the catalog, render localized source details/disclaimer, preserve `slug` in locale links, and use client-side partial search plus A–Z anchors.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/homeopathy-routes.test.mjs`
Expected: PASS for both locales, all routes, search, switch, and 404 lookup behavior.

- [ ] **Step 5: Commit**

Commit: `feat: add bilingual Homeopathy routes and search`

### Task 3: Prove SEO output before metadata implementation

**Files:**
- Create: `tests/homeopathy-seo.test.mjs`
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the failing test**

Call sitemap/robots functions and assert 76 remedy URLs, localized alternates, and the sitemap URL are present.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/homeopathy-seo.test.mjs`
Expected: FAIL because sitemap and robots modules do not exist.

- [ ] **Step 3: Implement metadata, sitemap, and robots**

Use `generateMetadata` per route and `MetadataRoute` functions with localized alternates. Preserve root catalog metadata and direct reader canonicals.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/homeopathy-seo.test.mjs`
Expected: PASS with localized sitemap/robots contract.

- [ ] **Step 5: Commit**

Commit: `feat: add localized Homeopathy SEO`

### Task 4: Verify integration and publish review artifacts

**Files:**
- Modify: test/config files only if verification exposes a concrete issue

- [ ] **Step 1: Run full checks**

Run: `npm run validate:remedy-inventory && npm run validate:remedy-content && npm run test:unit && npm run lint && npm run build`
Expected: exit 0.

- [ ] **Step 2: Deploy preview only and inspect public routes**

Run a non-production Vercel deployment, then check the Homeopathy RU/EN indexes, sample remedy pair, existing `/books/maya-*` route, 404, sitemap, and robots.

- [ ] **Step 3: Push and create PR**

Push `codex/issue-3-library-integration` and create a PR targeting `codex/public-book-library`. Do not merge or promote.
