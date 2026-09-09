# Issue 3 Maya Assets and Remedy Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the source-backed Maya static readers and PDFs on an isolated integration branch, then record a reproducible, source-only homeopathy remedy inventory without publishing remedy pages.

**Architecture:** Keep the `codex/public-book-library` Next.js reader architecture and its `/books/[bookId]` routes unchanged. Copy only the four updated Maya HTML editions, their referenced public reader assets, and four PDFs from `codex/maya-tradition-corpus`; inventory only the Russian Andrii Litvinov Book 02 HTML source as the content authority and encode duplicates/grouped headings explicitly in CSV.

**Tech Stack:** Next.js 15, Node built-in test runner, static public assets, Node ESM validation script, CSV.

---

### Task 1: Restore static Maya PDFs and source-backed reader assets

**Files:**
- Modify: `tests/maya-volumes.test.mjs`
- Modify: `source-books/book-3-maya-tradition/outputs/Maya_Aztec_Egregor_Gods.html`
- Modify: `source-books/book-3-maya-tradition/outputs/Maya_Calendar_Energies.html`
- Modify: `source-books/book-3-maya-tradition/outputs/Maya_Exorcism_Settings_Energies.html`
- Modify: `source-books/book-3-maya-tradition/outputs/Maya_Mysteries.html`
- Modify: `public/library/maya-egregor-gods/**`, `public/library/maya-calendar/**`, `public/library/maya-exorcism/**`, `public/library/maya-mysteries/**`

- [ ] **Step 1: Add a failing public-PDF regression test**

Append a test that asserts each `public/library/maya-*/book.pdf` is tracked and begins with the PDF signature:

```js
for (const id of ['maya-egregor-gods', 'maya-calendar', 'maya-exorcism', 'maya-mysteries']) {
  const file = path.join(projectRoot, 'public', 'library', id, 'book.pdf');
  assert.equal(existsSync(file), true, `${id} PDF must be present`);
  assert.equal(readFileSync(file).subarray(0, 4).toString('ascii'), '%PDF');
}
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/maya-volumes.test.mjs`

Expected: failure because no `book.pdf` exists in the base branch; retain the existing missing-public-asset failure as independent evidence.

- [ ] **Step 3: Copy only the verified Maya source/public paths from the preview branch**

Run the following without merging commits or route code:

```bash
git checkout codex/maya-tradition-corpus -- \
  source-books/book-3-maya-tradition/outputs/Maya_Aztec_Egregor_Gods.html \
  source-books/book-3-maya-tradition/outputs/Maya_Calendar_Energies.html \
  source-books/book-3-maya-tradition/outputs/Maya_Exorcism_Settings_Energies.html \
  source-books/book-3-maya-tradition/outputs/Maya_Mysteries.html \
  public/library/maya-egregor-gods public/library/maya-calendar \
  public/library/maya-exorcism public/library/maya-mysteries
```

Do not copy `app/`, `data/`, `components/`, `next.config.*`, or `package.json` from the preview branch.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `node --test tests/maya-volumes.test.mjs`

Expected: all Maya tests pass, including direct route assets and PDF signatures.

- [ ] **Step 5: Commit the source/payload recovery**

```bash
git add tests/maya-volumes.test.mjs source-books/book-3-maya-tradition/outputs public/library/maya-egregor-gods public/library/maya-calendar public/library/maya-exorcism public/library/maya-mysteries
git commit -m "fix: restore Maya reader PDFs and assets"
```

### Task 2: Add a source-only remedy inventory and validator

**Files:**
- Create: `data/remedy-source-inventory.csv`
- Create: `scripts/validate-remedy-source-inventory.mjs`
- Create: `tests/remedy-source-inventory.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add a failing inventory contract test**

Create a Node test that expects CSV rows sourced only from `alchemy_soul_guide_homeopathy_remedies.html`, requires the exact columns, validates source headings against the HTML, and expects these audited counts:

```js
assert.equal(rows.length, 47);
assert.equal(counts.confirmed, 38);
assert.equal(counts.duplicate, 8);
assert.equal(counts.grouped, 1);
assert.equal(new Set(confirmed.map((row) => row.slug)).size, 38);
assert.equal(confirmed.every((row) => row.ru_source_exists === 'yes'), true);
assert.equal(confirmed.every((row) => row.en_source_exists === 'no'), true);
assert.equal(confirmed.every((row) => row.needs_translation === 'yes'), true);
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/remedy-source-inventory.test.mjs`

Expected: failure because the CSV and validator do not exist.

- [ ] **Step 3: Add the curated CSV and minimal validator**

The CSV contains one row per remedy-like source heading: 38 `confirmed` records, eight `duplicate` records whose canonical name/slug match a confirmed record, and one `grouped` record for the unparsed `X-ray, Северный Полюс` heading. Use exact source spellings for canonical Latin names and aliases; do not correct, enrich, translate, or infer external materia medica. The validator must reject a missing source file, an unmatched source heading, an invalid status, a duplicate confirmed slug, or an EN/translation contradiction.

Add this package command:

```json
"validate:remedy-inventory": "node scripts/validate-remedy-source-inventory.mjs"
```

- [ ] **Step 4: Run validator and targeted test to verify GREEN**

Run:

```bash
npm run validate:remedy-inventory
node --test tests/remedy-source-inventory.test.mjs
```

Expected: validator prints `confirmed=38 duplicates=8 grouped=1 en_missing=38` and the targeted test passes.

- [ ] **Step 5: Commit the inventory**

```bash
git add data/remedy-source-inventory.csv scripts/validate-remedy-source-inventory.mjs tests/remedy-source-inventory.test.mjs package.json
git commit -m "feat: add source-backed remedy inventory"
```

### Task 3: Verify the integration branch without deploying

**Files:**
- Test: `tests/maya-volumes.test.mjs`
- Test: `tests/library.test.mjs`
- Test: `tests/remedy-source-inventory.test.mjs`

- [ ] **Step 1: Run all unit and inventory checks**

Run:

```bash
npm run test:unit
npm run validate:remedy-inventory
npm run lint
```

Expected: all checks pass; `tests/library.test.mjs` preserves the 23 canonical records and `tests/maya-volumes.test.mjs` proves the reader routes remain present.

- [ ] **Step 2: Prove route structure was not replaced**

Run:

```bash
test -f 'app/books/[bookId]/page.tsx'
test -f 'app/media/[series]/[file]/route.ts'
git diff --name-only codex/public-book-library..HEAD -- app data components next.config.ts package.json
```

Expected: no preview hash-routing code is imported; only `package.json` may appear because of the inventory validator command.

- [ ] **Step 3: Commit any final verification-only adjustment**

If and only if a verification changes a tracked test or script, commit it with a focused message. Do not deploy, promote, modify Vercel settings, or create a production alias.
