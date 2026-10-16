# Holistic House performance and media audit — 2026-10-16

Scope: public pages, with zero changes to authentication, private client video playback, publication, storage, user data, or paid plans.

## Image Optimization limit: 5000/5000 reported by owner monitoring

We could not independently read Vercel account image-usage counters through the connected Observability API (schema returned 404). Treat 5000/5000 as a reported monitoring figure, not a fresh billing API measurement. A filled transformation quota cannot be cleared by a source commit; the mitigation prevents further unnecessary optimized variants.

**Changes**
- Third-party `i.ytimg.com` poster stills now load straight from YouTube without `/_next/image`. YouTube already provides fixed `hqdefault` and `maxresdefault` formats. Existing poster-error fallbacks and click-to-play are preserved.
- The approved first-party Andy portrait in the site video player now uses `StaticPortrait` with prebuilt responsive variants and no runtime image transformations.
- Both occurrences of the same Andy portrait on the free situation review landing now use `StaticPortrait`.
- Keep Next Image Optimization for book readers and large originals where requested resizing is still purposeful. Do not globally set `images.unoptimized`.
- Existing versioned WebP course/testimonial/video stills and their bounded CDN cache headers remain unchanged.

**Follow-up measurement:** In an anonymous browser, inspect HTML/network on /, /ru, /en/services/free-situation-review and key book reader routes. Separate true network calls from unused `srcset` candidates. Confirm no `/_next/image` on the three converted media classes and check mobile transfer sizes. Recheck the Vercel billing/usage counter after its next period reset. Do not claim the 5000/5000 quota already reset.

## Public homepage cache and CSP

The shared `app/layout.tsx` calls `headers()` for URL language, nonce and CSP mode. `middleware.ts` generates a new per-request CSP nonce. Published video metadata already uses a 60-second safe `unstable_cache`, but `lib/site-videos/public.ts` keeps request-specific HTML dynamic via `noStore()`. Do **not** add blanket `s-maxage` or `force-static` to public HTML: the nonce in body and response CSP must match, and private URLs must remain `no-store`.

A safe future full-HTML ISR project would split public-static layouts from auth/private layouts, replace per-request nonce requirements on cacheable HTML with a reviewed hash-based CSP/build-time script strategy, audit locale separation, and pass anonymous Chromium/WebKit CSP/SEO/video tests before rollout.

## Video checks

A series of earlier `Website video browser verification` failures was observed. Examined failure [38927262823](https://github.com/andylitvinov-design/books/actions/runs/38927262823) stopped in the Spanish/component test step, before playback. Later production-branch run [38929388564](https://github.com/andylitvinov-design/books/actions/runs/38929388564) passed all steps, including public read-only checks and eight full natural video playback verifications. This does not attest to every visitor's device; keep the anonymous mobile acceptance checks in CI.

## Editorial and CTA

`lib/home-seo.ts` already uses consistent title/description/OpenGraph/Twitter metadata, with EN/RU canonical paths. Existing homepage hero renders a dedicated burgundy personal-consultation CTA and a separate free written review entry. Verify prominence in anonymous mobile browser before changing approved page copy or paid/free routing.

## Release safety

No videos are rendered, uploaded or published; no Vercel upgrade or billable purchase. Check GitHub CI, preview, exact production commit and canonical hostname after merge.
