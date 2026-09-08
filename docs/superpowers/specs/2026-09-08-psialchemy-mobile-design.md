# PsiAlchemy Mobile Product Design

**Issue:** #11 — Rebrand as PsiAlchemy + installable iOS/Android app

**Status:** approved for implementation by the task owner on 2026-09-08; production cutover and store submission remain explicitly out of scope.

## Goal

Turn the existing bilingual Next.js book and remedy site into the mobile-first PsiAlchemy product without creating a second content repository or caching private recommendation data offline.

## Decisions

### One source of truth

The Next.js application, `data/remedies.js`, Book 02 metadata, and the existing source-backed remedy Markdown remain authoritative. The PWA and Capacitor shell consume those same routes and data; saved state contains only public remedy slugs and never a copied remedy record or a prescription payload.

### Integration base

Implementation starts from `codex/phase-p-compact-remedy-layout` and reconciles `codex/issue-8-prescriptions` before PWA cache or native-shell work. The reconciliation must retain the 94 RU + 94 EN inventory, Book 02, search/A-Z, image provenance, SEO routes, and every Issue #8 privacy property. It is deliberately a controlled integration rather than treating the unmerged branches as interchangeable baselines.

### Information architecture

Small screens use a fixed bottom navigation with Home, Remedies, Books, Saved, and More. It is hidden on desktop, which keeps the current website navigation usable. Home has search, recent remedies, and Book 02; Remedies uses the existing searchable A-Z directory; Books reuses the existing library; Saved reads local favorite/recent slugs; More holds locale, author, disclaimer, privacy, and install/app information.

Remedy pages gain compact back/save/share actions, phone-first reading typography, safe-area padding, and collapsed supplementary material. They retain source text, RU/EN routes, images, and canonical slugs.

### PWA and offline privacy boundary

The app has an App Router manifest, generated app icons, Apple touch icon, theme metadata, and a hand-maintained service worker. The worker precaches only the shell and static assets. It handles a user-initiated message to cache a saved public remedy route and lightweight public metadata.

The service worker must use network-only behavior and avoid creating cache entries for all of these route families:

- `/{ru,en}/prescriptions/**`
- `/api/prescriptions/**`
- `/admin/**`

Private prescriptions stay dynamic and server-backed. The existing `noindex`, `no-store` PDF response, unavailable/revoked state, and server status lookup are retained. The offline fallback never displays a previously fetched prescription.

### Saved and recent state

`saved-remedies` is a versioned browser/native storage model containing canonical slugs, locale preference, and timestamped recent public route visits. It de-duplicates RU/EN by slug and validates a saved slug against the canonical directory before display. In browsers it uses local storage; Capacitor supplies the same adapter through Preferences. There is no patient name, public prescription ID, instructions, telemetry, or remedy assignment in client state.

### Native shell

Capacitor is the thin shell. It opens the same canonical web origin rather than a separate React Native application or a static duplicate of the remedy corpus. Native value is provided by App/Universal Links, native share for public remedies, a shared saved-state adapter, offline saved public reading via the PWA policy, safe areas, Android hardware Back, external-link handling, icon, and splash configuration.

The native shell accepts a PsiAlchemy public remedy URL and navigates its web view to the exact same route. A private prescription URL is passed through unchanged to the online route; the server decides whether it is active or revoked. Association files contain only package/team IDs and public route patterns — never patient or prescription data.

### Canonical-domain migration

The existing Vercel project `codex-public-book-library` remains the only production project. `psialchemy.vercel.app` returned `DEPLOYMENT_NOT_FOUND` during the audit and is not presently attached to the project; this is not proof of global availability. No rename or alias operation occurs during implementation.

The migration report must document the current host, Vercel project, non-mutating availability evidence, explicit alias reservation step, preview validation, host-aware permanent redirects, canonical/hreflang/sitemap change, rollback, and the requirement for separate production approval. If Vercel cannot attach the target alias to the existing project without changing old-host behavior, cutover stops rather than creating a second production project.

### SEO and routing

Public routes remain server-rendered/crawlable. Site metadata derives from the configured canonical host; public remedy routes retain titles, canonical URL, RU/EN alternates, and sitemap entries. Prescriptions remain noindex and absent from sitemap. Old host redirect logic is feature-gated and will not be enabled on preview or production without the cutover approval.

## File boundaries

| Area | Responsibility |
| --- | --- |
| `app/manifest.ts`, `app/icon.*`, `public/icons/`, `public/sw.js` | install metadata, visual assets, cache policy |
| `components/mobile-*`, `components/site-navigation.tsx` | app shell and responsive navigation |
| `lib/saved-remedies.*` | versioned slug-only saved/recent state |
| `components/remedy-*` | public save/share and mobile reading controls |
| `capacitor.config.ts`, `ios/`, `android/` | thin native package and platform configuration |
| `public/.well-known/*` | Universal Links and Android App Links assertions |
| `data/site-metadata.*`, `app/sitemap.ts`, redirect configuration | canonical host and controlled migration |
| `docs/psialchemy-*.md`, `docs/mobile-*.md` | audit, migration, development, and release evidence |

## Failure handling and verification

- A malformed saved slug is ignored rather than rendered or fetched.
- A failed public offline fetch shows a generic offline message, never a cached private document.
- A deep link uses the network route; active/revoked access is rechecked server-side.
- Native builds may be generated only when full Xcode and Android SDK/JDK exist. Their absence is reported as a tooling blocker, not a passing build.
- Every behavioral unit begins with a failing test. Full verification includes unit tests, lint, production build, remedy validators, route smoke, PWA asset/cache checks, mobile screenshots, and platform-specific deep-link/manual checks.

## Non-goals

- No production alias, redirect, Vercel project rename, or store submission.
- No copying source remedy content into a mobile repository or native bundle.
- No automatic diagnosis, treatment claims, patient telemetry, or persistence of prescription data offline.
