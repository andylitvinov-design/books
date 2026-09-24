# Localized About Biography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an editorial, fully localized About page for Andy at `/en/about` and `/ru/about`, while replacing the public Cabinet navigation entry with About and leaving private Cabinet authorization unchanged.

**Architecture:** Store the complete English biography and faithful Russian translation as structured editorial content in a dedicated data module. A locale App Router page validates the locale, supplies localized metadata, and renders reusable long-form sections; existing locale routing makes the language switcher retain `/about`. Public navigation links only to public routes, while the About footer sends missing-link clients to the existing contact channel instead of a Cabinet or `/admin` URL.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/image`, `next/link`, Node test runner, CSS in `app/globals.css`.

---

## File structure

- Create `data/about-biography.ts`: typed EN/RU editorial content, all biography paragraphs, public work links, and private-link Cabinet notice.
- Create `app/[locale]/about/page.tsx`: static localized route, metadata, hreflang/canonical values, and accessible long-form markup.
- Create `public/images/holistic-house/andy-about.png`: the supplied original image asset.
- Modify `components/mobile-bottom-navigation.tsx`: fifth item becomes About / Обо мне, retaining `UserRound` and five entries.
- Modify `components/site-navigation.tsx`: replace public `/admin` Cabinet link with localized About, so the header does not expose `/admin`.
- Modify `app/globals.css`: wide editorial photo, typographic long-form reading layout, restrained dividers, and mobile-first stack.
- Create `tests/about-page.test.mjs`: source-level contract tests for both locales, complete-content sentinels, navigation, metadata, and security exclusions.

### Task 1: Write the About route contract test

**Files:**
- Create: `tests/about-page.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../app/[locale]/about/page.tsx', import.meta.url), 'utf8')
const content = readFileSync(new URL('../data/about-biography.ts', import.meta.url), 'utf8')
const mobileNavigation = readFileSync(new URL('../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
const siteNavigation = readFileSync(new URL('../components/site-navigation.tsx', import.meta.url), 'utf8')

test('publishes paired localized About routes without public Cabinet access', () => {
  assert.match(page, /canonical: "\/" \+ locale \+ "\/about"/)
  assert.match(page, /languages: \{ ru: "\/ru\/about", en: "\/en\/about" \}/)
  assert.match(content, /Let me introduce myself\./)
  assert.match(content, /Я хочу представиться\./)
  assert.match(content, /Hanscarl Leuner/)
  assert.match(content, /Бодинамический анализ/)
  assert.doesNotMatch(page, /href="\/admin"/)
  assert.ok(existsSync(new URL('../public/images/holistic-house/andy-about.png', import.meta.url)))
})

test('keeps exactly five mobile public destinations with About as the profile-icon item', () => {
  assert.match(mobileNavigation, /label: 'About', href: '\/en\/about', icon: UserRound/)
  assert.match(mobileNavigation, /label: 'Обо мне', href: '\/ru\/about', icon: UserRound/)
  assert.doesNotMatch(mobileNavigation, /href: '\/admin'/)
  assert.doesNotMatch(siteNavigation, /href="\/admin"/)
})
```

- [ ] **Step 2: Run the new test to verify it fails**

Run: `node --test tests/about-page.test.mjs`

Expected: FAIL because the About page, content module, image, and navigation changes do not exist yet.

- [ ] **Step 3: Commit the focused failing-test checkpoint only if it does not break repository policy**

Run: `git add tests/about-page.test.mjs && git commit -m "test: define About page contract"`

Expected: a focused contract-test commit. If the project requires green commits, keep the test staged until Task 4 passes.

### Task 2: Add immutable editorial source content and image

**Files:**
- Create: `data/about-biography.ts`
- Create: `public/images/holistic-house/andy-about.png`

- [ ] **Step 1: Add the supplied image unchanged**

Run: `cp /var/folders/j3/pp2sf_1n4wz5y6fn7m6zcyc40000gn/T/codex-clipboard-3ea44fa6-94de-4491-b341-20604272c8d4.png public/images/holistic-house/andy-about.png`

Expected: a version-controlled 1079 × 1057 PNG under the existing Holistic House image root.

- [ ] **Step 2: Create typed, complete EN and RU biography content**

```ts
export type BiographySection = { heading: string; paragraphs?: string[]; items?: string[] }

export const aboutBiography = {
  en: {
    intro: ["Let me introduce myself.", "I’m Andy, a Jungian-oriented specialist and facilitator of archetypal practices.", "Raised in Ukraine but living for 20 years worldwide."],
    sections: [],
  },
  ru: {
    intro: ["Я хочу представиться.", "Меня зовут Andy; я специалист юнгианского направления и ведущий архетипических практик.", "Я вырос в Украине, но уже 20 лет живу в разных странах мира."],
    sections: [],
  },
} as const satisfies Record<"en" | "ru", { intro: readonly string[]; sections: readonly BiographySection[] }>
```

Fill the two `sections` arrays with the entire supplied biography: Experience (three dated lines); all four Specializations / Studies with descriptions; the complete Tantric Workshops narrative; ISTA; Guided Affective Imagery and Hanscarl Leuner; Jungian and Freudian reference; European School of Body Psychotherapy; Bodynamic Analysis; Greek mysteries, Dionysus, Demeter, Egyptian traditions, archetypes, transpersonal flow; and Reiki / Tantra Reiki / Kundalini Reiki / Runic Reiki / Osho. Keep every English paragraph and provide a Russian counterpart for every one. Do not add medical efficacy claims beyond the supplied first-person text.

- [ ] **Step 3: Add localized public-link and client-notice content**

```ts
explore: {
  heading: locale === 'ru' ? 'Исследуйте мою работу' : 'Explore my work',
  links: [
    { label: locale === 'ru' ? 'Книга' : 'Book', href: '/books' },
    { label: locale === 'ru' ? 'Препараты' : 'Remedies', href: `/${locale}/homeopathy` },
    { label: locale === 'ru' ? 'Услуги' : 'Services', href: `/${locale}/services` },
  ],
},
cabinet: {
  heading: locale === 'ru' ? 'Кабинет клиента' : 'Client Cabinet',
  body: locale === 'ru'
    ? 'Ваш личный кабинет доступен по индивидуальной ссылке, которую вы получили от Andy.'
    : 'Your personal Cabinet is available through the private link provided to you.',
  action: locale === 'ru' ? 'Связаться с Andy' : 'Contact Andy',
  href: 'https://t.me/AndyTherapist',
}
```

Do not create or reference a generic Cabinet route, `/admin`, registration, password, sign-in, or account state.

- [ ] **Step 4: Run the focused test to verify the content layer now satisfies its contract**

Run: `node --test tests/about-page.test.mjs`

Expected: still FAIL only for the route and navigation assertions, proving the test is checking both source and presentation work.

### Task 3: Implement the static localized About route

**Files:**
- Create: `app/[locale]/about/page.tsx`

- [ ] **Step 1: Add locale validation and metadata**

```tsx
export function generateStaticParams() { return getHomeopathyLocaleParams() }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isSupportedLocale(locale)) return { title: 'Not found' }
  const current = aboutBiography[locale as Locale]
  return {
    metadataBase: metadataBaseFor(),
    title: current.meta.title,
    description: current.meta.description,
    alternates: {
      canonical: '/' + locale + '/about',
      languages: { ru: '/ru/about', en: '/en/about' },
    },
  }
}
```

- [ ] **Step 2: Render semantic, long-form editorial markup**

```tsx
<main className="about-shell" lang={locale}>
  <PublicSiteHeader locale={locale as Locale} />
  <section className="about-introduction" aria-labelledby="about-title">
    <div className="about-portrait"><Image alt={current.photoAlt} fill priority sizes="(max-width: 767px) 100vw, 52vw" src="/images/holistic-house/andy-about.png" /></div>
    <div className="about-introduction-copy"><p>{current.eyebrow}</p><h1 id="about-title">Andy</h1>{current.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
  </section>
  <article className="about-biography">{current.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</article>
  <nav className="about-explore" aria-label={current.explore.heading}>{current.explore.links.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}</nav>
  <section className="about-client-cabinet" aria-labelledby="client-cabinet-title"><h2 id="client-cabinet-title">{current.cabinet.heading}</h2><p>{current.cabinet.body}</p><a href={current.cabinet.href} rel="noreferrer" target="_blank">{current.cabinet.action}</a></section>
</main>
```

Use no `article` card grid, badge, metric, or `/admin` href. For invalid locales, call `notFound()` before reading localized content.

- [ ] **Step 3: Run the focused test to verify the route contract now passes**

Run: `node --test tests/about-page.test.mjs`

Expected: PASS.

### Task 4: Update public navigation without touching private routes

**Files:**
- Modify: `components/mobile-bottom-navigation.tsx`
- Modify: `components/site-navigation.tsx`

- [ ] **Step 1: Replace the mobile fifth entry only**

```ts
{ label: 'Обо мне', href: '/ru/about', icon: UserRound }
{ label: 'About', href: '/en/about', icon: UserRound }
```

Keep the preceding destinations unchanged and retain the existing `grid-cols-5` layout. The localized regular expression for hiding the bar must continue to hide it only on private/admin and prescription routes.

- [ ] **Step 2: Replace the public desktop-header Cabinet link**

```tsx
const labels = activeLocale === 'ru'
  ? { home: 'Главная', library: 'Книга', remedies: 'Препараты', services: 'Услуги', about: 'Обо мне' }
  : { home: 'Home', library: 'Book', remedies: 'Remedies', services: 'Services', about: 'About' }

<Link href={'/' + activeLocale + '/about'}>{labels.about}</Link>
```

Do not modify `/admin`, `app/[locale]/client/**`, `app/[locale]/prescriptions/**`, session code, access checks, or private headers.

- [ ] **Step 3: Verify full localized navigation behavior**

Run: `node --test tests/about-page.test.mjs`

Expected: PASS, including no public `/admin` href and an EN/RU About item that retains `UserRound` in mobile navigation.

### Task 5: Add responsive editorial styling and validate assets

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add desktop editorial composition**

```css
.about-shell { max-width: 82rem; margin: 0 auto; padding: 0 32px 96px; }
.about-introduction { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(18rem, .9fr); gap: clamp(2rem, 6vw, 6rem); align-items: start; }
.about-portrait { position: relative; min-height: clamp(30rem, 58vw, 48rem); overflow: hidden; }
.about-portrait img { object-fit: cover; object-position: 48% 48%; }
.about-biography { max-width: 48rem; margin: clamp(3rem, 8vw, 7rem) auto 0; }
.about-biography section + section { margin-top: 3rem; border-top: 1px solid #d9cdbd; padding-top: 2rem; }
```

- [ ] **Step 2: Add readable mobile layout and bottom-safe spacing**

```css
@media (max-width: 767px) {
  .about-shell { padding: 0 16px calc(84px + env(safe-area-inset-bottom)); }
  .about-introduction { display: flex; flex-direction: column; gap: 1.5rem; }
  .about-portrait { width: 100%; min-height: 31rem; }
  .about-biography { margin-top: 2.75rem; }
  .about-explore a { min-height: 44px; }
}
```

Use quiet borders, serif headings, readable line length, and paragraph spacing. Do not add gradients, card shadows, profile-avatar treatment, or a dashboard-like metric strip.

- [ ] **Step 3: Check the image framing before browser QA**

Run: `sips -g pixelWidth -g pixelHeight public/images/holistic-house/andy-about.png`

Expected: `1079` × `1057`; the final browser inspection must visibly retain Andy, the library, desk, and interior.

### Task 6: Full verification, release, and live proof

**Files:**
- Modify if needed after evidence-based repair: files from Tasks 2–5 only

- [ ] **Step 1: Run the focused test, the existing Node test suite, lint, and build**

Run: `node --test tests/about-page.test.mjs`

Run: `node --test tests/*.test.mjs`

Run: `npm run lint`

Run: `npm run build`

Expected: About test, existing suite, lint, and build pass. If a pre-existing unrelated failure occurs, record and isolate it; repair only regressions caused by this work.

- [ ] **Step 2: Inspect local desktop and mobile pages**

Run the app, then inspect `/en/about` and `/ru/about` at 1440px and 390px wide. Verify complete respective-language text, image composition, editorial flow, 5 mobile entries, current-language About link, About-to-About switch, public links, and contact-only Client Cabinet notice.

- [ ] **Step 3: Commit, push, open/merge the PR, deploy, and verify the production URL**

Run: `git add data/about-biography.ts app/[locale]/about/page.tsx components/mobile-bottom-navigation.tsx components/site-navigation.tsx app/globals.css public/images/holistic-house/andy-about.png tests/about-page.test.mjs && git commit -m "feat: add localized Andy About biography"`

Then use the repository's existing GitHub/Vercel flow to push, merge when checks are green, and verify `https://holistichouse.vercel.app/en/about` and `https://holistichouse.vercel.app/ru/about` at desktop and mobile widths. Do not claim completion from source or Preview alone.

- [ ] **Step 4: Record the delivery contract evidence**

Mark each hard requirement PASS only with a concrete source, test, browser, and live verification method. If either live URL cannot be proved, mark it NOT VERIFIED or BLOCKED rather than reporting success.
