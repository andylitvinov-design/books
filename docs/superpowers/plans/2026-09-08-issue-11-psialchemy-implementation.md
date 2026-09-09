# PsiAlchemy Mobile, PWA, and Native Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing bilingual Next.js library into a mobile-first, installable PsiAlchemy PWA with a thin Capacitor shell, while preserving one source-backed public library and keeping every private prescription request network-only and non-persistent.

**Architecture:** `codex/public-book-library` remains the sole web/content source. The PWA adds a localized app shell, public-only saved state, and an allowlisted offline cache without copying remedy data. Capacitor loads the same canonical web origin and adds native deep links and share only after the PWA and cache/privacy gates are green; private prescription deep links remain web fallback until isolated-session instrumentation proves no persistence.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript/JavaScript modules, existing canonical remedy Markdown/data, Web App Manifest, hand-maintained service worker, browser Cache Storage, Capacitor, Xcode/Android Studio only where those real toolchains exist.

---

## Non-negotiable scope and approval boundaries

- The 94 RU + 94 EN canonical remedy records, Book 02, image/provenance mappings, existing book routes, and their canonical slugs remain the sole public content source. No mobile-only remedy copy is created.
- The implementation begins in a new integration branch from the then-current `codex/public-book-library`; historical source branches are never treated as a production base.
- `psialchemy.vercel.app` is only a future configured host. This plan includes preview and migration preparation, but no alias attachment, project rename, redirect activation, production deployment, domain cutover, or store submission without a separate explicit approval.
- A private prescription URL, public ID, patient data, instructions, internal notes, and PDF response are prohibited from service-worker caches, local storage, IndexedDB, Capacitor Preferences, native logs, test screenshots, fixtures, and app bundles.
- iOS/Android build claims require the actual Xcode and Android SDK/JDK toolchains. A missing toolchain is a documented blocker, never a synthetic pass.

## Current reconciliation record

The source of PR #12's misleading application diff was established before this plan was written:

| Layer | Authoritative state | Required reconciliation action |
| --- | --- | --- |
| Phase O remedy completeness | `f47a00e` is included in the canonical ancestry | Preserve the 94/94 source-complete records and 16 supplementary items with the existing validators. |
| Phase P compact layout | merged to canonical as squash commit `2fd576f` | Treat the merged canonical tree as the layout source; do not reapply `42bd409`, `e0fa8c`, or `b42e62`. |
| Issue #8 prescriptions | `codex/issue-8-prescriptions`, currently unmerged | Reconcile its private route, storage, PDF, and CSS/config changes into a new integration branch only after the baseline gate below. |
| PR #12 docs | `codex/issue-11-psialchemy` | Its branch was based on Phase P commits. Merge canonical `2fd576f` into it so GitHub's PR diff contains documentation only; retain the merge commit as provenance. |

The implementation branch must therefore begin from canonical, import only the Issue #8 delta, resolve overlapping CSS/config files deliberately, and prove that Phase O/P behavior and Issue #8 privacy behavior coexist. It must not merge an old Phase P branch as a shortcut.

## Gate matrix

| Gate | Entry evidence | Exit evidence | Blocks if failed |
| --- | --- | --- | --- |
| G0 — baseline | clean integration worktree from canonical | 94/94, 188 routes, 23 books, 108 public images, Book 02, Phase P layout, and Issue #8 test suite all pass together | all product work |
| G1 — public mobile state | G0 | malformed slugs ignored; public-only saved/recent state works in RU/EN | PWA caching and mobile UI |
| G2 — PWA/privacy | G1 and active/revoked Issue #8 fixtures | manifest/installability valid; public cache allowlist works; private HTML/API/PDF are `private, no-store, max-age=0` and never enter Cache Storage | hosted preview, Capacitor, private deep links |
| G3 — hosted preview | G2 | preview routes, offline public reading, cache inspection, and mobile visual QA pass | domain-preparation and Capacitor |
| G4 — host preparation | G3 | host configuration is deterministic; migration report and rollback steps exist; old host behavior unchanged | production-domain decision |
| G5 — public native shell | G3 and real native toolchain | public remedy Universal/App Link, share, saved state, safe areas, and back behavior pass | private native links and store readiness |
| G6 — private native proof | G5 plus per-platform ephemeral-context instrumentation | close/relaunch proves no private URL, response, cookie, cache, Service Worker entry, storage, history, or log survives; revoked/unavailable links stay unavailable | registering private app links |
| G7 — release QA | G4 and, where applicable, G5/G6 | full regression, platform evidence, release checklist, and explicit production/store approvals | production cutover or submission |

## File map for the implementation branch

| Path | Responsibility |
| --- | --- |
| `data/site-metadata.js`, `data/seo.js`, `app/robots.js`, `app/sitemap.js` | one configurable canonical public host; public-only metadata/sitemap/robots behavior |
| `app/manifest.ts`, `public/icons/*`, `public/sw.js`, `components/pwa-registration.tsx` | installable public PWA shell, icons, registration, and bounded cache behavior |
| `lib/public-reading-state.ts`, `components/saved-remedies.tsx`, `components/mobile-bottom-navigation.tsx` | versioned public-only saved/recent/locale state and small-screen navigation |
| `app/[locale]/page.tsx` or existing localized home entry, `app/[locale]/homeopathy/*`, `components/site-navigation.tsx` | PsiAlchemy mobile shell while retaining desktop navigation and existing routes |
| `lib/pwa/cache-policy.ts`, `scripts/validate-pwa-policy.mjs`, `tests/pwa-*.test.mjs` | one testable route classifier and privacy/cache validation |
| Issue #8 paths: `app/[locale]/prescriptions/[publicId]/*`, `app/api/prescriptions/[publicId]/pdf/route.js`, `lib/prescriptions/*`, `components/prescription-*.jsx` | private server-backed prescription behavior; retain and harden headers without copying payloads to the client |
| `capacitor.config.ts`, `ios/`, `android/`, `scripts/mobile-*.mjs` | thin native shell, generated projects, repeatable sync/build/deep-link checks |
| `public/.well-known/apple-app-site-association`, `public/.well-known/assetlinks.json` | public route association only after verified identifiers and domain approval |
| `docs/psialchemy-domain-migration.md`, `docs/mobile-development.md`, `docs/mobile-release-checklist.md`, `docs/psialchemy-private-context-verification.md` | operator, migration, native-toolchain, privacy, and release evidence |

### Task 1: Create and verify the canonical integration baseline (G0)

**Files:**
- Create: `docs/issue-11-baseline-reconciliation.md`
- Modify: only conflict files required while importing Issue #8: `app/globals.css`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- Test: existing `tests/remedy-*.test.mjs`, `tests/book-02-*.test.mjs`, `tests/homeopathy-*.test.mjs`, `tests/prescription-*.test.mjs`

- [ ] **Step 1: Create `codex/issue-11-psialchemy-integration` from the current `origin/codex/public-book-library`.**

  Run:
  ```bash
  git fetch origin --prune
  git switch -c codex/issue-11-psialchemy-integration origin/codex/public-book-library
  git rev-parse HEAD
  ```
  Expected: the starting commit contains Phase O and the Phase P squash merge; it is not any historical Phase P SHA.

- [ ] **Step 2: Record the exact Issue #8 import set before applying it.**

  Run:
  ```bash
  git diff --name-only origin/codex/public-book-library...origin/codex/issue-8-prescriptions
  git log --oneline origin/codex/public-book-library..origin/codex/issue-8-prescriptions
  ```
  Write the observed commits, prescription paths, overlapping configuration files, and the pre-import canonical counts into `docs/issue-11-baseline-reconciliation.md`.

- [ ] **Step 3: Import Issue #8 as one reviewed change set, resolving only real overlaps.**

  Apply the Issue #8 change set on the integration branch. For every conflict in `app/globals.css`, preserve Phase P remedy/Book 02 selectors and add only prescription selectors. For `next.config.ts`, `tailwind.config.ts`, and `tsconfig.json`, retain the canonical settings and add the smallest Issue #8 requirements. Do not resolve a conflict by replacing a whole canonical file with the historical branch version.

- [ ] **Step 4: Add a reconciliation test that asserts both feature families are present.**

  Create `tests/issue-11-baseline-reconciliation.test.mjs` with assertions equivalent to:
  ```js
  import { getBook02Remedies, getRemedyRouteParams } from '../data/remedies.js'
  import { readFileSync } from 'node:fs'

  assert.equal(getRemedyRouteParams().length, 188)
  assert.equal(getBook02Remedies('ru').length, 94)
  assert.match(readFileSync('components/remedy-content.tsx', 'utf8'), /RemedyContent/)
  assert.match(readFileSync('app/\[locale\]\/prescriptions\/\[publicId\]\/page\.js', 'utf8'), /noindex|robots/)
  ```
  Use these existing `data/remedies.js` exports directly; do not invent a second remedy fixture.

- [ ] **Step 5: Run the complete baseline gate.**

  Run:
  ```bash
  npm run test:unit
  npm run lint
  npm run validate:remedy-content
  npm run validate:remedy-images
  npm run build
  npm run verify:homeopathy-routes -- http://127.0.0.1:3103
  ```
  Expected: 94 RU, 94 EN, 188 remedy routes, 23 books, 108 public remedy assets, 0 source-completeness losses, and the Issue #8 private route tests all pass.

- [ ] **Step 6: Commit the reconciled baseline.**

  ```bash
  git add docs/issue-11-baseline-reconciliation.md app components lib tests next.config.ts tailwind.config.ts tsconfig.json
  git commit -m "feat: reconcile prescriptions with canonical remedy library"
  ```

### Task 2: Add an explicit public-state boundary (G1)

**Files:**
- Create: `lib/public-reading-state.ts`, `tests/public-reading-state.test.mjs`
- Modify: `components/remedy-page.tsx`, `components/remedy-directory.tsx`, `components/book-02-reference.tsx`

- [ ] **Step 1: Write failing public-state tests.**

  The tests must define and enforce this persisted schema:
  ```ts
  type PublicReadingStateV1 = {
    version: 1
    locale?: 'ru' | 'en'
    savedSlugs: string[]
    recent: Array<{ slug: string; viewedAt: string }>
  }
  ```
  Assert malformed, unknown, and duplicate slugs are removed; `ru` and `en` visits to one slug result in one saved entry; no key or serialized value accepts `prescription`, `publicId`, `patient`, `notes`, or arbitrary payload fields.

- [ ] **Step 2: Implement one browser adapter with an optional native adapter seam.**

  Export `readPublicReadingState`, `savePublicReadingState`, `toggleSavedSlug`, `recordRecentSlug`, and `setPreferredLocale`. Validate every slug against the canonical directory before storage and cap recent entries at 20. Browser persistence uses one versioned local-storage key; no remedy prose or image binary is stored.

- [ ] **Step 3: Add Save/Recent UI using only canonical slugs.**

  Add an accessible save control to standalone remedy pages, record a visit after a canonical remedy route renders, and render a Saved list using the existing directory entry/title lookup. The same saved slug must resolve to the localized current route rather than generate a second language-specific record.

- [ ] **Step 4: Verify the state gate.**

  Run:
  ```bash
  node --test tests/public-reading-state.test.mjs
  npm run test:unit
  npm run lint
  ```
  Expected: only valid public remedy slugs and a locale preference are persisted.

- [ ] **Step 5: Commit.**

  ```bash
  git add lib/public-reading-state.ts components/remedy-page.tsx components/remedy-directory.tsx components/book-02-reference.tsx tests/public-reading-state.test.mjs
  git commit -m "feat: add public saved remedy state"
  ```

### Task 3: Build the mobile-first PsiAlchemy shell without replacing desktop navigation

**Files:**
- Create: `components/mobile-bottom-navigation.tsx`, `components/psialchemy-home.tsx`, `tests/mobile-shell.test.mjs`
- Modify: `app/layout.tsx`, `components/site-navigation.tsx`, `app/globals.css`, localized home/remedy entry components

- [ ] **Step 1: Write mobile-shell route and accessibility tests.**

  Assert five small-screen destinations exist with localized labels: Home, Remedies, Books, Saved, More; they target existing public routes or new public shell views. Assert the bottom navigation is absent from desktop layout, uses `aria-current` for the active route, has 44px-or-larger tap targets, and does not appear in prescription/admin routes.

- [ ] **Step 2: Implement the shared shell.**

  Use `PsiAlchemy` for shell metadata/labels, keep historical book titles and author name unchanged, and render desktop `SiteNavigation` normally. On widths below 768px, render a fixed safe-area-aware bottom bar; add bottom content padding so it never covers text. The Home view reuses the canonical directory for quick search, saved/recent slugs, and Book 02/book links rather than duplicating data.

- [ ] **Step 3: Apply phone reading rules only to public content.**

  Add CSS that keeps body text within 17.5–18.5px and 1.45–1.55 line height on phone, uses 16–18px side padding, stacks the existing paired sections, makes primary images near full width, and keeps supplementary material collapsed. Retain Phase P desktop float/compact behavior without introducing a dashboard layout.

- [ ] **Step 4: Verify at 390px, 900px, and 1440px.**

  Capture public pages for a long remedy, short remedy, Book 02, Saved, and More. Check existing search, A–Z, image rendering, RU/EN slug-preserving links, and that private prescriptions have no bottom navigation.

- [ ] **Step 5: Commit.**

  ```bash
  git add app components app/globals.css tests/mobile-shell.test.mjs
  git commit -m "feat: add mobile PsiAlchemy navigation shell"
  ```

### Task 4: Add manifest, owned icon assets, and public-only service worker (G2)

**Files:**
- Create: `app/manifest.ts`, `components/pwa-registration.tsx`, `public/sw.js`, `public/icons/psialchemy-192.png`, `public/icons/psialchemy-512.png`, `public/icons/psialchemy-maskable-512.png`, `public/icons/apple-touch-icon.png`, `tests/pwa-manifest.test.mjs`, `tests/pwa-cache-policy.test.mjs`
- Modify: `app/layout.tsx`, `app/globals.css`, `package.json`

- [ ] **Step 1: Create owned, provisional icon artwork and test it.**

  Add a simple abstract/typographic PsiAlchemy mark created for this repository; do not crop a Telegram/remedy image or use third-party artwork. Test that each icon exists, has the expected pixel size, and is referenced by the manifest and Apple metadata.

- [ ] **Step 2: Implement the App Router manifest.**

  Return this public contract from `app/manifest.ts`:
  ```ts
  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: 'PsiAlchemy', short_name: 'PsiAlchemy',
      display: 'standalone', start_url: '/ru/homeopathy',
      theme_color: '#f3ecdf', background_color: '#f3ecdf',
      icons: [/* 192, 512, maskable */],
    }
  }
  ```
  The layout must expose theme color, Apple touch icon, and registration without changing historical book metadata.

- [ ] **Step 3: Implement one shared, pure cache classifier before writing worker fetch logic.**

  In `lib/pwa/cache-policy.ts`, expose `classifyRequest(url)` with the only cacheable classes: shell assets, public images/fonts, public remedy index, and explicitly saved public remedy routes. It must return `network-only` for normalized, percent-encoded, and query-string forms of:
  ```text
  /ru/prescriptions/**, /en/prescriptions/**,
  /api/prescriptions/**, /admin/**
  ```
  Treat unknown routes as network-first with no cache write, not as a broad cacheable class.

- [ ] **Step 4: Implement the service worker from the classifier.**

  Precache only versioned shell assets. Accept an explicit `CACHE_PUBLIC_REMEDY` message containing a canonical public remedy URL after the user saves it; reject every other URL. On cacheable fetch failure, return a neutral public offline response. On private/admin requests, call `fetch(request, { cache: 'no-store' })`, do not use Cache Storage, and never return an offline document.

- [ ] **Step 5: Harden prescription response headers and test every state.**

  Ensure active, revoked, unavailable, and not-found private HTML/API/PDF responses all send:
  ```http
  Cache-Control: private, no-store, max-age=0
  ```
  Preserve existing `noindex` and sitemap exclusion. Tests must request normal, encoded, and query-string private URLs and assert: response header, no worker cache entry, no offline fallback, and no internal notes/IDs in HTML or PDF.

- [ ] **Step 6: Add repeatable PWA commands.**

  Add `pwa:check` to `package.json`, running manifest/icon/cache-policy checks. Do not claim Lighthouse installability until it has been run against a hosted preview.

- [ ] **Step 7: Run G2.**

  ```bash
  npm run pwa:check
  npm run test:unit
  npm run lint
  npm run build
  ```
  Expected: manifest and icons valid, private route classifier denies all variants, `no-store` assertions pass, and no private path appears in generated assets or sitemap.

- [ ] **Step 8: Commit.**

  ```bash
  git add app components lib public package.json tests
  git commit -m "feat: add privacy-bounded PsiAlchemy PWA"
  ```

### Task 5: Prove the hosted PWA preview and cache boundary (G3)

**Files:**
- Create: `scripts/verify-pwa-preview.mjs`, `docs/psialchemy-pwa-preview-verification.md`
- Modify: `package.json`

- [ ] **Step 1: Deploy the integration branch as a Vercel preview only.**

  Record the immutable deployment URL, commit SHA, and timestamp in the verification document. Do not alias it to production or change an existing domain.

- [ ] **Step 2: Automate public preview checks.**

  `scripts/verify-pwa-preview.mjs <preview-url>` must check manifest MIME/content, every icon, service worker registration, 94 RU + 94 EN remedy routes, Book 02, search/A–Z, sitemap/robots, 23 books, and 108 public image URLs.

- [ ] **Step 3: Perform browser Cache Storage and offline checks.**

  In an installed/controlled preview tab: save one remedy, confirm its public route works after network is disabled, and inspect Cache Storage to show only allowed public URLs. Open active, revoked, unavailable, normalised, query-string, and percent-encoded private prescription routes; then inspect Cache Storage, local storage, IndexedDB, and service-worker responses. The required result is zero private URL/payload entries and offline private requests unavailable.

- [ ] **Step 4: Capture mobile visual evidence.**

  At 390px, capture Home, Remedies, Book 02, Saved, More, a long remedy, a short remedy, and the private prescription document. Confirm private routes retain a document-like UI and no PWA offline/save control.

- [ ] **Step 5: Commit evidence only after all commands pass.**

  ```bash
  npm run verify:pwa-preview -- <immutable-preview-url>
  git add scripts/verify-pwa-preview.mjs docs/psialchemy-pwa-preview-verification.md package.json
  git commit -m "test: verify PsiAlchemy PWA preview boundary"
  ```

### Task 6: Prepare configurable canonical host and migration evidence (G4)

**Files:**
- Create: `docs/psialchemy-domain-migration.md`, `tests/canonical-host.test.mjs`
- Modify: `data/site-metadata.js`, `data/seo.js`, `app/robots.js`, `app/sitemap.js`, public metadata call sites

- [ ] **Step 1: Write failing canonical-host tests.**

  Test `PSIALCHEMY_CANONICAL_HOST` as the sole valid `https` host input; invalid/non-HTTPS values fall back to the current host. Assert public canonical, hreflang, robots, and sitemap use the configured host. Assert prescription routes remain absent from sitemap and `noindex` regardless of host.

- [ ] **Step 2: Replace scattered host defaults with one validated configuration function.**

  Export a function with this behavior:
  ```js
  export function canonicalPublicOrigin(value = process.env.PSIALCHEMY_CANONICAL_HOST) {
    // accept one https origin without path/query/fragment; otherwise use current production host
  }
  ```
  Do not set `PSIALCHEMY_CANONICAL_HOST` in Vercel, rename a project, attach an alias, or enable redirects in this task.

- [ ] **Step 3: Write the migration report.**

  `docs/psialchemy-domain-migration.md` must name the existing project (`codex-public-book-library`, `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`), old host, desired host, non-mutating availability evidence, alias-on-existing-project strategy, pre-cutover preview checks, explicit approval required for cutover, old-host 308 redirect behavior after approval, and rollback commands/decision points. State plainly that `DEPLOYMENT_NOT_FOUND` did not reserve or prove availability of the target host.

- [ ] **Step 4: Verify G4 without changing Vercel.**

  ```bash
  PSIALCHEMY_CANONICAL_HOST=https://psialchemy.example.test npm run test:unit
  npm run lint
  npm run build
  ```
  Expected: generated metadata uses only the test host in the build context; the public production host and Vercel configuration remain untouched.

- [ ] **Step 5: Commit.**

  ```bash
  git add data app docs tests
  git commit -m "feat: make PsiAlchemy canonical host configurable"
  ```

### Task 7: Add Capacitor only after G3 is green (G5)

**Files:**
- Create: `capacitor.config.ts`, `scripts/mobile-toolchain-check.mjs`, `scripts/mobile-sync.mjs`, `tests/mobile-config.test.mjs`, `docs/mobile-development.md`
- Generate: `ios/`, `android/` only on a host that passes the toolchain check
- Modify: `package.json`

- [ ] **Step 1: Detect real native toolchains before generating projects.**

  `scripts/mobile-toolchain-check.mjs` must report Node, CocoaPods/Xcode version and selected Xcode path for iOS, plus Java, Gradle, Android SDK, and adb for Android. A missing component exits nonzero with a precise missing-tool list.

- [ ] **Step 2: Write configuration tests before adding Capacitor.**

  Assert `appId` is a verified, non-placeholder identifier, `appName` is `PsiAlchemy`, the shell origin is the configured canonical HTTPS origin, production content is never copied into a native bundle, and public remedy URLs map to same-path web routes.

- [ ] **Step 3: Add the thin remote-origin shell.**

  Add Capacitor packages/configuration with an HTTPS `server.url` pointing to the configured canonical public origin. Add a safe-area/status-bar setup, native share for public `/{locale}/homeopathy/remedies/{slug}` routes, and external-link routing for Telegram/Designrr/other non-PsiAlchemy origins. Do not add a WebView bridge that transfers prescription HTML or logs URLs.

- [ ] **Step 4: Add public deep-link routing.**

  Normalize incoming links, accept only `ru|en` public remedy routes with a canonical slug, and navigate the existing shell to that exact route. Unknown, malformed, or external links open safely in the system browser. The unit test must cover the supplied Arsenicum URL and an invalid slug.

- [ ] **Step 5: Generate/sync only on supported hosts and verify G5.**

  Run:
  ```bash
  npm run mobile:toolchain-check
  npm run mobile:sync
  npm run mobile:test
  ```
  Expected: on this current Mac the toolchain check documents missing Xcode/Android SDK/JDK and prevents generated-build success claims. On a capable host, the projects sync and public deep-link/share tests pass.

- [ ] **Step 6: Commit.**

  ```bash
  git add capacitor.config.ts scripts tests docs package.json ios android
  git commit -m "feat: add PsiAlchemy public native shell"
  ```

### Task 8: Keep private native prescription links fail-closed until instrumented (G6)

**Files:**
- Create: `lib/private-link-policy.ts`, `tests/private-link-policy.test.mjs`, `docs/psialchemy-private-context-verification.md`
- Modify: native bridge files created in Task 7 only after the tests below are ready

- [ ] **Step 1: Write the fail-closed link-policy tests.**

  Test that `/ru|en/prescriptions/{publicId}` is classified `web-fallback` by default; it must not be claimed by a native intent, inserted into a public WebView history, sent to share/save handlers, or logged. Test normal, encoded, query-string, active, revoked, unavailable, and not-found examples.

- [ ] **Step 2: Implement the default web fallback.**

  Keep private association-path registration disabled. If the shell receives a private link, show a neutral no-data transition and delegate the unchanged URL to the system/web fallback; do not inspect or serialize the record.

- [ ] **Step 3: Specify and implement per-platform ephemeral instrumentation behind a disabled feature flag.**

  iOS uses a per-session non-persistent `WKWebsiteDataStore`; Android uses an isolated `:private` process and `WebView.setDataDirectorySuffix` before any WebView initialization. The instrumentation must capture only boolean lifecycle assertions, never URLs or response data: process/store created, server response `no-store`, cache empty after close, history empty after close, cookies/storage empty after close, and process terminated.

- [ ] **Step 4: Require device/simulator proof before enabling native private links.**

  For each active, revoked, unavailable, and not-found fixture: open link, close the private session, relaunch, inspect WebView history/cache/cookies/DOM storage/Service Worker state, and verify the server rechecks status online. Store the results in `docs/psialchemy-private-context-verification.md`. Any nonzero private artifact keeps the association path disabled and the web fallback active.

- [ ] **Step 5: Commit only the fail-closed policy and verified instrumentation.**

  ```bash
  git add lib tests docs ios android
  git commit -m "feat: enforce fail-closed private link policy"
  ```

### Task 9: Run native build and deep-link verification only where toolchains exist

**Files:**
- Create: `scripts/verify-ios.mjs`, `scripts/verify-android.mjs`, `docs/mobile-platform-verification.md`
- Modify: `package.json`, native project settings only after verified identifiers/domain association values are available

- [ ] **Step 1: Make platform commands honest.**

  Add `mobile:ios` and `mobile:android` commands that first run `mobile:toolchain-check`. They must fail with the recorded missing-tool reason instead of falling back to a web-only success.

- [ ] **Step 2: Verify iOS on a real Xcode environment.**

  Build/run the generated app, check safe areas, Home/Remedies/Books/Saved/More, public Arsenicum deep link, native share, external Telegram link, RU/EN, saved state, PDF handling, and system back/swipe behavior. Run private-link instrumentation only if Task 8's feature flag remains disabled until its proof succeeds.

- [ ] **Step 3: Verify Android on a real SDK/emulator/device environment.**

  Build/run the app, check the same public flows plus hardware Back and App Link behavior. Verify public deep links open exact internal routes and external links leave the app.

- [ ] **Step 4: Serve association files only after verified domain and identifiers.**

  `apple-app-site-association` and `assetlinks.json` contain only approved team/package fingerprints and public route patterns. Do not include `prescriptions` paths until G6 passes and an explicit security review approves them.

- [ ] **Step 5: Commit platform evidence.**

  ```bash
  git add scripts docs package.json public/.well-known ios android
  git commit -m "test: document PsiAlchemy native platform verification"
  ```

### Task 10: Execute final regression and establish separate release gates (G7)

**Files:**
- Create: `docs/mobile-release-checklist.md`, `docs/issue-11-final-qa.md`
- Modify: `README.md` or `docs/mobile-development.md` only to link the finalized workflow

- [ ] **Step 1: Create the release checklist with separate approvals.**

  Include Apple developer account, bundle ID, signing, associated domains, privacy manifest/disclosures, icon/screenshots, support/privacy URLs, review notes, and educational/reference positioning. Include Google Play account, package ID, signing key ownership, App Links, Data Safety, screenshots, and the same non-diagnostic positioning. The final lines must be distinct checkboxes: `Production web cutover approved by owner` and `Store submission approved by owner`.

- [ ] **Step 2: Run full automated regression on the integration branch.**

  ```bash
  npm run test:unit
  npm run lint
  npm run validate:remedy-content
  npm run validate:remedy-images
  npm run pwa:check
  npm run build
  npm run verify:homeopathy-routes -- <preview-url>
  npm run verify:pwa-preview -- <immutable-preview-url>
  ```
  Expected: Phase O/P, Book 02, 94/94, private prescription, public PWA, SEO, image, and cache-boundary tests pass as one suite.

- [ ] **Step 3: Perform manual final QA against the immutable preview.**

  Review 390px, 900px, and 1440px; Book 02 search `aurum`, `золото`, `nat mur`; RU/EN same remedy; saved/recent; offline saved public remedy; offline private/revoked unavailable; all public SEO routes; 23 books; four Maya PDFs; and the exact 108 public remedy images. Record screenshots without real patient data.

- [ ] **Step 4: Publish the review PR only, not production.**

  Push the integration branch and create/update an implementation PR with the preview URL and G0–G7 evidence. Do not merge, deploy/promote production, change domains, attach production aliases, or submit either store in this task.

- [ ] **Step 5: Commit the QA/release documents.**

  ```bash
  git add docs README.md
  git commit -m "docs: add PsiAlchemy release approval gates"
  ```

## Plan self-review

| Requirement | Covered by |
| --- | --- |
| Phase O, Phase P, and Issue #8 reconciliation | current reconciliation record, Task 1 / G0 |
| Mobile shell, bottom navigation, Saved/Recent, public offline reading | Tasks 2–5 / G1–G3 |
| Strict private network-only/no-store boundary | Tasks 4, 5, and 8 / G2, G3, G6 |
| Configurable host and migration preparation without domain mutation | Task 6 / G4 |
| Capacitor only after PWA | Task 7 / G5 |
| Public deep links/share/saved state | Tasks 2, 7, 9 |
| Private deep links only after persistence instrumentation | Task 8 / G6 |
| iOS/Android real-toolchain verification | Task 9 |
| Separate production and store approvals | Task 10 / G7 |
| No duplicated content, no patient data in artifacts, no production/store work now | non-negotiable scope and every gate |

The plan contains no production code, Vercel mutation, domain mutation, or store submission. Its next permitted action is review of this document and PR #12's now documentation-only diff.
