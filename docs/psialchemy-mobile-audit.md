# PsiAlchemy Mobile and Domain Audit

**Date:** 2026-09-08
**Scope:** Issue #11 Phase A only. No production Vercel project, alias, redirect, environment variable, store account, or live route was changed.

## Authoritative product baseline

| Area | Verified state | Evidence |
| --- | --- | --- |
| Repository | `andylitvinov-design/books` | authenticated Git remote |
| Web stack | Next.js 15 App Router | `package.json`, `app/` |
| Remedy source | source-backed Markdown and `data/remedies.js` | 94 RU + 94 EN canonical routes |
| Book 02 | same 94 canonical remedy inventory | `data/book-02-remedy-toc.json` |
| Search / A-Z | client directory uses canonical slugs and aliases | `components/remedy-directory.tsx` |
| Current production | `https://codex-public-book-library.vercel.app` | Vercel inspection and live route response |

The clean baseline unit suite passed 45/45 before this audit branch changed application files.

## Current domain and SEO state

Vercel identifies the existing production project as `codex-public-book-library` (`prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`), with the old host and its team alias attached. The live remedy route `/ru/homeopathy/remedies/arsenicum-album` returned `200` and emitted canonical plus RU/EN alternate URLs on the old host. The live sitemap and robots policy also reference that host.

`https://psialchemy.vercel.app` returned Vercel `404 DEPLOYMENT_NOT_FOUND`; Vercel's domain inspection under the current scope reported no access. This proves only that the target is not currently attached to this project. It does not prove that the label is globally available, and no reservation attempt is made during this audit.

## PWA and native readiness

The deployed site returned `404` for `manifest.webmanifest` and has no linked manifest, Apple touch icon, or service worker. The repository has no Capacitor config, iOS project, Android project, association files, PWA storage module, or app-specific cache policy.

The current Next.js server architecture is compatible with a PWA plus remote-origin Capacitor shell. It is not compatible with a static export as the primary native runtime because Issue #8 prescription pages are dynamic/server-backed. A thin shell must therefore use the canonical origin and add native capabilities without duplicating routes or remedy data.

## Private prescription boundary

The unmerged Issue #8 branch already supplies dynamic prescription pages, server-side status lookup, `noindex`, a private `no-store` PDF response, and revoked/unavailable behavior. It must be reconciled before PWA cache work. The final design makes all private HTML/API/PDF responses `private, no-store, max-age=0`, treats every private route as service-worker network-only, and uses an ephemeral native context for private deep links. No prescription payload, public ID, patient identity, or instructions belong in PWA cache, browser storage, Capacitor Preferences, telemetry, screenshots, fixtures, or app bundles.

## Branch integration risk

`codex/issue-8-prescriptions` and `codex/phase-p-compact-remedy-layout` diverged after the Book 02 source base. Both modify remedy rendering, Book 02 data, CSS, and the 188 remedy files. The implementation branch must explicitly reconcile those changes and rerun the 94/94, Book 02, source-image, SEO, and prescription tests; neither branch may silently replace the other.

## Safe Vercel migration plan

1. Keep `codex-public-book-library` as the sole production project; do not create a naming-only project and do not rename it.
2. Deploy only a standard Vercel preview from the integration branch. Validate the PWA, public routes, private-cache denial, and mobile UI on its unique preview URL.
3. Only in a separately approved Vercel operation, attach `psialchemy.vercel.app` to one identified unique preview deployment of that same project — never the production deployment — after recording all existing aliases. Stop if Vercel reports the alias unavailable or an old-host behavior change; remove the temporary preview alias after validation.
4. Validate that unique preview host: canonical, hreflang, sitemap, robots, public remedy deep links, old-host redirect rules, and private prescription noindex/no-store behavior. This preview-alias test is not a production-domain mutation and does not alter the canonical host.
5. Only after explicit production approval, attach the target host to the production deployment, set the canonical-host configuration, enable host-specific permanent redirects from the old host, and re-run the production checks.
6. Roll back by removing the redirect/canonical-host configuration and restoring the old host as canonical. Keep the original project and old alias intact throughout.

## Current external blockers

This Mac has Command Line Tools only, no full Xcode/Simulator, no JDK or Android SDK/adb, and limited local disk. iOS and Android builds therefore cannot be claimed until a native build environment is available. This does not prevent documentation review or a remote Vercel preview once the implementation phase is authorized.
