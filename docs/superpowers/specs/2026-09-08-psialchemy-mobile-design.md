# PsiAlchemy Mobile Product Design

**Issue:** #11 — Rebrand as PsiAlchemy + installable iOS/Android app

**Status:** architecture review artifact, not an implementation plan. Implementation remains gated on the separately reviewed implementation plan; production cutover and store submission remain explicitly out of scope.

## Goal

Turn the existing bilingual Next.js book and remedy site into the mobile-first PsiAlchemy product without creating a second content repository or caching private recommendation data offline.

## Decisions

### One source of truth

The Next.js application, `data/remedies.js`, Book 02 metadata, and the existing source-backed remedy Markdown remain authoritative. The PWA and Capacitor shell consume those same routes and data; saved state contains only public remedy slugs and never a copied remedy record or a prescription payload.

### Integration boundary

`codex/issue-8-prescriptions` and `codex/phase-p-compact-remedy-layout` require a future controlled reconciliation. The resulting product must retain the 94 RU + 94 EN inventory, Book 02, search/A-Z, image provenance, SEO routes, and every Issue #8 privacy property. The architecture does not prescribe the reconciliation tasks; those remain for the later reviewed implementation plan.

### Information architecture

Small screens use a fixed bottom navigation with Home, Remedies, Books, Saved, and More. It is hidden on desktop, which keeps the current website navigation usable. Home has search, recent remedies, and Book 02; Remedies uses the existing searchable A-Z directory; Books reuses the existing library; Saved reads local favorite/recent slugs; More holds locale, author, disclaimer, privacy, and install/app information.

Remedy pages gain compact back/save/share actions, phone-first reading typography, safe-area padding, and collapsed supplementary material. They retain source text, RU/EN routes, images, and canonical slugs.

### PWA and offline privacy boundary

The app has an App Router manifest, generated app icons, Apple touch icon, theme metadata, and a hand-maintained service worker. The worker precaches only the shell and static assets. It handles a user-initiated message to cache a saved public remedy route and lightweight public metadata.

The service worker must use network-only behavior, omit offline fallback, and avoid creating cache entries for all of these route families, including their query-string and percent-encoded forms:

- `/{ru,en}/prescriptions/**`
- `/api/prescriptions/**`
- `/admin/**`

Private prescriptions stay dynamic and server-backed. Every active, revoked, unavailable, or not-found prescription HTML/API/PDF response must send `Cache-Control: private, no-store, max-age=0`, and the browser fetch policy must not opt into a cache. The existing `noindex`, unavailable/revoked state, and server status lookup are retained. The offline fallback never displays a previously fetched prescription.

### Saved and recent state

`saved-remedies` is a versioned browser/native storage model containing canonical slugs, locale preference, and timestamped recent public route visits. It de-duplicates RU/EN by slug and validates a saved slug against the canonical directory before display. In browsers it uses local storage; Capacitor supplies the same adapter through Preferences. There is no patient name, public prescription ID, instructions, telemetry, or remedy assignment in client state.

### Native shell

Capacitor is the thin shell. It opens the same canonical web origin rather than a separate React Native application or a static duplicate of the remedy corpus. Native value is provided by App/Universal Links, native share for public remedies, a shared saved-state adapter, offline saved public reading via the PWA policy, safe areas, Android hardware Back, external-link handling, icon, and splash configuration.

The native shell accepts a PsiAlchemy public remedy URL and navigates its persistent web view to the exact same route. A private prescription URL is a fail-closed native capability: iOS uses a per-session non-persistent `WKWebsiteDataStore`; Android uses a separate `:private` process that sets an exclusive `WebView.setDataDirectorySuffix` before any WebView/WebKit initialization, creates no public-shell WebView, clears cookies, DOM storage, HTTP cache, Service Worker state, and history on close, then terminates the private process. It passes the unchanged URL to the online route and never logs it. The private App Link remains unavailable to the app until device instrumentation proves that a close/relaunch leaves no private URL or response in the isolated process; its fallback is a neutral no-data screen, never the prescription body. The server decides whether it is active or revoked. Association files contain only package/team IDs and public route patterns — never patient or prescription data.

### Canonical-domain migration

The completed pre-implementation audit is recorded in `docs/psialchemy-mobile-audit.md`. The existing Vercel project `codex-public-book-library` remains the only production project. `psialchemy.vercel.app` returned `DEPLOYMENT_NOT_FOUND` during the audit and is not presently attached to the project; this is not proof of global availability. No rename or alias operation occurs during implementation.

The migration report must document the current host, Vercel project, non-mutating availability evidence, explicit alias reservation step, preview validation, host-aware permanent redirects, canonical/hreflang/sitemap change, rollback, and the requirement for separate production approval. If Vercel cannot attach the target alias to the existing project without changing old-host behavior, cutover stops rather than creating a second production project.

### SEO and routing

Public routes remain server-rendered/crawlable. Site metadata derives from the configured canonical host; public remedy routes retain titles, canonical URL, RU/EN alternates, and sitemap entries. Prescriptions remain noindex and absent from sitemap. Old host redirect logic is feature-gated and will not be enabled on preview or production without the cutover approval.

## Safety acceptance boundary

- A malformed saved slug is ignored rather than rendered or fetched.
- A failed public offline fetch shows a generic offline message, never a cached private document.
- A public deep link uses the normal network route; active/revoked prescription access is rechecked server-side in an ephemeral private context.
- Native builds may be generated only when full Xcode and Android SDK/JDK exist. Their absence is reported as a tooling blocker, not a passing build.
- Later verification must include unit tests, lint, production build, remedy validators, route smoke, PWA asset/cache checks, mobile screenshots, and platform-specific deep-link/manual checks.
- Privacy acceptance must inspect Cache Storage before and after active, revoked, unavailable, and not-found prescription requests; assert their page/API/PDF `no-store` headers; prove the worker chooses network-only for normalized, query-string, and encoded private paths; prove offline private and revoked links remain unavailable; and inspect native WebView history/cache after closing a private session.

## Non-goals

- No production alias, redirect, Vercel project rename, or store submission.
- No copying source remedy content into a mobile repository or native bundle.
- No automatic diagnosis, treatment claims, patient telemetry, or persistence of prescription data offline.
