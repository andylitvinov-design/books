# Public Book Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing Alchemy, Dao, and Maya corpus as one searchable, public Next.js library with real covers and readable book routes.

**Architecture:** `data/library.js` is the canonical, traceable catalogue of 20 source records. Server book routes load and normalize original source files at render time; a strict media route turns known corpus paths into public assets. Client catalog code only receives metadata and search fields, while raw author text remains server-side.

**Tech Stack:** Next.js 15 App Router, React 19, JavaScript source parsing, Node built-in test runner, Tailwind CSS.

---

### Task 1: Add the canonical library data and testable source parser

**Files:**
- Create: `data/library.js`
- Create: `data/source-parser.js`
- Create: `tests/source-parser.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing parser test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSourceHtml } from '../data/source-parser.js'

test('normalizes source images and removes local-only links', () => {
  const output = normalizeSourceHtml(
    '<html><head><script>bad()</script></head><body><h1>Глава</h1><img src="media/post_10_01.jpg"><a href="file:///Users/a/book.html">Local</a></body></html>',
    'alchemy',
  )
  assert.match(output, /src="\/media\/alchemy\/post_10_01\.jpg"/)
  assert.doesNotMatch(output, /<script|file:\/\/|\/Users\//)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/source-parser.test.mjs`

Expected: failure because `data/source-parser.js` does not exist.

- [ ] **Step 3: Implement the smallest parser and metadata contract**

```js
export function normalizeSourceHtml(html, series) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s(href)=["'](?:file:|https?:\/\/(?:127\.0\.0\.1|localhost)|\/Users\/)[^"']*["']/gi, '')
    .replace(/\bsrc=["'](?:\.\/)?(?:media|photos)\/([^"']+)["']/gi, `src="/media/${series}/$1"`)
}
```

```js
export const books = [
  {
    id: 'alchemy-homeopathy-foundations',
    title: 'Книга 01. Гомеопатия: основы и метод',
    category: 'Алхимия души',
    culture: 'Alchemy',
    sourceSeries: 'Алхимия души',
    originalSourceFile: 'source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_foundations.html',
    mediaSeries: 'alchemy',
    cover: 'post_10_01.jpg',
    status: 'published',
    tags: ['гомеопатия', 'метод'],
    chapters: [{ id: 'book', title: 'Полный текст методички' }],
  },
]
```

Expand that same complete shape to the nine verified Alchemy guides, ten verified Dao books, and one Maya manuscript. Use only real source file paths, pre-existing photographs, explicit chapter headings, and Maya source labels.

- [ ] **Step 4: Make the test pass**

Run: `node --test tests/source-parser.test.mjs`

Expected: `pass 1`, `fail 0`.

- [ ] **Step 5: Add the package command and commit**

```json
{ "scripts": { "test:unit": "node --test tests/**/*.test.mjs" } }
```

Run: `git add data/library.js data/source-parser.js tests/source-parser.test.mjs package.json && git commit -m "feat: add canonical book source model"`

### Task 2: Build public reader and safe media routes

**Files:**
- Create: `app/books/[bookId]/page.tsx`
- Create: `app/books/[bookId]/not-found.tsx`
- Create: `app/media/[series]/[file]/route.ts`
- Modify: `next.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing static-route expectation**

Add a Node test which imports `getBookById` from `data/library.js` and asserts that `getBookById('maya-tradition-methodology').originalSourceFile` points to `manuscript/MAYA_TRADITION_UNIFIED.md` and that every `cover` is non-empty.

- [ ] **Step 2: Run it to verify failure**

Run: `npm run test:unit`

Expected: failure because the canonical collection is not yet complete.

- [ ] **Step 3: Implement page and media allowlist**

```ts
export async function GET(_: Request, { params }: { params: Promise<{ series: string; file: string }> }) {
  const { series, file } = await params
  if (!/^[a-z0-9_.-]+$/i.test(file) || !mediaRoots[series]) return new Response(null, { status: 404 })
  const asset = path.join(process.cwd(), mediaRoots[series], file)
  if (!asset.startsWith(path.join(process.cwd(), mediaRoots[series]))) return new Response(null, { status: 404 })
  return new Response(await readFile(asset), { headers: { 'Content-Type': mimeFor(file), 'Cache-Control': 'public, max-age=31536000, immutable' } })
}
```

The book page must use `notFound()` for missing IDs, add per-book metadata, render a cover at `/media/{series}/{cover}`, expose source series/category/status, provide a visible back link, and render parsed content in a constrained `article` column. Markdown Maya is transformed into semantic headings and paragraphs before rendering; all other books use normalized source HTML.

- [ ] **Step 4: Style responsive reading**

Add warm paper variables, readable serif typography, cover overlay, sticky desktop contents, and mobile normal-flow contents. Keep the route free of gradients used as covers; gradients may not be a primary image substitute.

- [ ] **Step 5: Verify and commit**

Run: `npm run test:unit && npm run lint`

Run: `git add app/books app/media next.config.ts app/globals.css data tests package.json && git commit -m "feat: add public book reader routes"`

### Task 3: Replace the dashboard catalog with the visual library

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/book-catalog.tsx`
- Modify: `app/globals.css`
- Remove: `data/books.json`
- Remove: `data/books.ts`

- [ ] **Step 1: Write a catalogue behavior test**

Create a pure test for `filterBooks(books, query, category)` that asserts a chapter title is found by search and that an absent category has no generated filter chip.

- [ ] **Step 2: Run the test to verify failure**

Run: `npm run test:unit`

Expected: failure because `filterBooks` is not exported.

- [ ] **Step 3: Implement the discovery interface**

Render server data from `data/library.js` through a `use client` catalogue component. Build categories via `Array.from(new Set(books.map(book => book.category)))`; search lowercase title, description, tags, and chapter titles; use `Link` for a full-card click target to `/books/${book.id}`. Every card uses its public media cover, category/source label, description, chapter count, and `Читать` CTA.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit && npm run lint`

Run: `git add app/page.tsx components/book-catalog.tsx app/globals.css data tests && git commit -m "feat: build searchable public library"`

### Task 4: Add publication metadata and production safety checks

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`
- Create: `scripts/check-public-library.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing production-safety assertion**

Write `scripts/check-public-library.mjs` to exit non-zero if app/component/data files contain `file://`, `127.0.0.1`, `localhost`, or `/Users/`; exclude historical `source-books/` from this check.

- [ ] **Step 2: Verify the check detects a known injected fixture**

Run: `node scripts/check-public-library.mjs`

Expected: exit 0 after the application has no prohibited user-facing reference; use a temporary in-memory fixture in the unit test for the negative case rather than modifying corpus files.

- [ ] **Step 3: Add metadata**

Use `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://andylitvinov-books.vercel.app')`, Russian title/description defaults, Open Graph fields, and a canonical root URL. Generate the sitemap from `books.map(book => ({ url: `/books/${book.id}` }))`.

- [ ] **Step 4: Verify and commit**

Run: `npm run test:unit && npm run lint && npm run check:public`

Run: `git add app/layout.tsx app/robots.ts app/sitemap.ts scripts package.json && git commit -m "feat: add public library metadata"`

### Task 5: Build, deploy, and verify the live library

**Files:**
- Modify: `.vercel/project.json` only if produced by authenticated `vercel link` and appropriate for repository-local project association.

- [ ] **Step 1: Run local gates**

Run: `npm run lint && npx tsc --noEmit && npm run test:unit && npm run check:public && npm run build`

Expected: every command exits 0. If the local disk cannot accommodate `.next`, report the exact available capacity and use Vercel’s remote build as the build evidence instead of hiding the limitation.

- [ ] **Step 2: Inspect key local routes**

Run a local server only if the build fits, then verify `/`, `/books/alchemy-homeopathy-foundations`, `/books/dao-alchemy-intro`, `/books/maya-tradition-methodology`, and at least three `/media/...` URLs. Use a mobile viewport for root and Maya reader.

- [ ] **Step 3: Create/link and deploy Vercel project**

Run: `vercel link --yes --project books` or create a clearly named `andy-books` project only if `books` is unavailable, then `vercel --prod --yes`.

- [ ] **Step 4: Verify public deployment**

Confirm production state is READY, open the public root and the three book routes, verify media responses, search/filter behavior, chapter navigation, and absence of local-only links. Push branch, create PR, and leave it ready to merge unless repository policy permits a verified merge.
