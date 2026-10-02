# Holistic House Final Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved Holistic House UX refinements cohesive without altering private client access or document authorization.

**Architecture:** Extend the existing public navigation, video player, and client-cabinet components rather than introducing a second UI system. Add one server-rendered Maya collection route that links only to the existing four public reader records. The shared consultation CTA is a small localized component used by existing public routes; no private state, client data, or session mechanics change.

**Tech Stack:** Next.js App Router, React, TypeScript/JSX, Tailwind/global CSS, Node test runner, Vercel Preview.

---

### Task 1: Add regression coverage for the approved public and private-surface changes

**Files:**
- Modify: `tests/navigation-cabinet.test.mjs`
- Create: `tests/maya-tradition-hub.test.mjs`
- Modify: `tests/page-video-release.test.mjs`

- [ ] **Step 1: Write failing source-level regression tests**

```js
assert.match(navigation, /language-menu-trigger/)
assert.match(cabinet, /client-cabinet-next-step/)
assert.match(videoCss, /site-video-poster-title/)
assert.match(hub, /maya-egregor-gods/)
```

- [ ] **Step 2: Run tests to verify they fail because the UI and route are absent**

Run: `node --test tests/navigation-cabinet.test.mjs tests/maya-tradition-hub.test.mjs tests/page-video-release.test.mjs`

Expected: FAIL for missing `language-menu-trigger`, next-step card, poster title, and `/books/maya-tradition` route.

- [ ] **Step 3: Keep the test assertions scoped to public labels and existing client authorization boundaries**

```js
assert.doesNotMatch(cabinet, /fragment.*localStorage/i)
assert.match(hub, /canonical/)
```

- [ ] **Step 4: Re-run the tests after each implementation task**

Run: `node --test tests/navigation-cabinet.test.mjs tests/maya-tradition-hub.test.mjs tests/page-video-release.test.mjs`

Expected: PASS after Tasks 2–5.

### Task 2: Compact public language selection without reducing Cabinet discoverability

**Files:**
- Modify: `components/site-navigation.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Implement an accessible menu trigger and a compact list of existing locale links**

```tsx
<details className="site-language-menu">
  <summary className="site-language-menu-trigger" aria-label={labels.language}>
    {activeLocale.toUpperCase()}
  </summary>
  <span className="site-language-menu-list">{languages.map(/* existing counterpart links */)}</span>
</details>
```

- [ ] **Step 2: Preserve EN/RU cabinet link behavior and the existing Spanish exclusion**

```tsx
{!spanish && <Link className="site-cabinet-link" href={`/${activeLocale}/client`}>{labels.cabinet}</Link>}
```

- [ ] **Step 3: Add 44px target, focus-visible and mobile positioning rules**

```css
.site-language-menu-trigger { min-height: 44px; }
.site-language-menu-trigger:focus-visible { outline: 3px solid #9b7056; }
```

- [ ] **Step 4: Run Task 1 tests and commit**

Run: `node --test tests/navigation-cabinet.test.mjs`

### Task 3: Unify video poster treatment and add a localized reusable final CTA

**Files:**
- Modify: `components/site-video-player.tsx`
- Modify: `app/site-videos.css`
- Create: `components/public-consultation-cta.tsx`
- Modify: `app/[locale]/about/page.tsx`
- Modify: `app/[locale]/books/page.tsx`
- Modify: `app/[locale]/homeopathy/page.tsx`
- Modify: `app/[locale]/services/page.tsx`
- Modify: `app/es/about/page.tsx`

- [ ] **Step 1: Add an on-poster title while preserving the existing keyboard play button and duration**

```tsx
<span className="site-video-poster-title" aria-hidden="true">{video.title}</span>
```

- [ ] **Step 2: Add warm overlay and readable title styles, retaining reduced-motion behavior**

```css
.site-video-shade { background: linear-gradient(180deg, rgba(54, 37, 28, .12), rgba(54, 37, 28, .62)); }
.site-video-poster-title { color: #fffaf3; text-shadow: 0 1px 18px rgba(38, 29, 23, .55); }
```

- [ ] **Step 3: Implement the shared CTA with EN/RU/ES labels and a local fragment target**

```tsx
export function PublicConsultationCta({ locale }: { locale: "en" | "ru" | "es" }) {
  return <aside className="public-consultation-cta"><a href={locale === "es" ? "/es/about#personal-consultation-title" : `/${locale}/about#personal-consultation-title`}>{copy[locale].action}</a></aside>
}
```

- [ ] **Step 4: Render the CTA at the end of each named public page and run Task 1 tests**

Run: `node --test tests/page-video-release.test.mjs tests/es-about.test.mjs`

### Task 4: Add the client cabinet next-step card without changing private access behavior

**Files:**
- Modify: `components/client-cabinet.jsx`
- Modify: `app/globals.css`
- Modify: `tests/navigation-cabinet.test.mjs`

- [ ] **Step 1: Derive card content solely from already authorized `documents`**

```jsx
const nextStep = latestDate ? { date: formatDate(latestDate), count: latest.length } : null
```

- [ ] **Step 2: Render contact and consultation actions with the existing WhatsApp destination**

```jsx
{nextStep && <section className="client-cabinet-next-step" aria-label={copy.nextStep}><h2>{copy.nextStep}</h2><p>{copy.nextStepDetail(nextStep.date, nextStep.count)}</p></section>}
```

- [ ] **Step 3: Add responsive, non-hover-only styles and test the EN/RU strings**

Run: `node --test tests/navigation-cabinet.test.mjs tests/client-cabinet-pages.test.mjs`

### Task 5: Restore a public Maya collection route using existing reader records

**Files:**
- Create: `app/books/maya-tradition/page.tsx`
- Create: `app/books/maya-tradition/maya-tradition.css`
- Create: `tests/maya-tradition-hub.test.mjs`

- [ ] **Step 1: Implement metadata with canonical `/books/maya-tradition` and no private data**

```tsx
export const metadata: Metadata = { alternates: { canonical: "/books/maya-tradition" } }
```

- [ ] **Step 2: Filter the existing book library for `mediaSeries === "maya"` and render four public reader links**

```tsx
const volumes = books.filter((book) => book.mediaSeries === "maya")
<Link href={`/books/${volume.id}`}>{volume.title}</Link>
```

- [ ] **Step 3: Add a responsive editorial hub layout with the established warm palette**

```css
.maya-tradition-hub { background: #fffaf3; color: #352b24; }
```

- [ ] **Step 4: Run Maya route tests and commit all implementation files**

Run: `node --test tests/maya-tradition-hub.test.mjs tests/maya-volumes.test.mjs`

### Task 6: Validate without local heavy build, publish Preview, and inspect the deployment

**Files:**
- Modify: no source files expected

- [ ] **Step 1: Run the focused Node tests and lint**

Run: `node --test tests/navigation-cabinet.test.mjs tests/maya-tradition-hub.test.mjs tests/page-video-release.test.mjs tests/client-cabinet-pages.test.mjs && npm run lint`

- [ ] **Step 2: Push the branch and wait for the Git-integrated Vercel Preview build**

Run: `git push -u origin codex/issue-55-final-polish`

- [ ] **Step 3: Inspect the Preview deployment and error logs; do not deploy Production**

Run: `vercel inspect <preview-url> && vercel logs <preview-url> --level error --since 1h`

- [ ] **Step 4: Browser-verify desktop and mobile public screens plus Maya route; report any unavailable protected route as unverified**

Run: browser checks at 1440px and 390px using synthetic/public-only content.
