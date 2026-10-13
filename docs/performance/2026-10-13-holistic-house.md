# Holistic House public performance audit — 2026-10-13

Scope: public website only. Client cabinet, report/PDF endpoints, invoices, auth, admin, signed links and private data are **excluded** from any public cache.

## What already shipped (#409)
- Published-public-video metadata: `unstable_cache` with 60-second revalidation and explicit admin invalidation. No cached drafts.
- Public homepage has a book-consultation CTA and approved HeyGen/YouTube fallback links.
- Already-compressed owned WebP posters avoid Vercel Image Optimization.

## Additional conservative fixes
1. On public Home, make the paid booking button the only burgundy first action; route directly to the paid option chooser at `/{locale}/services#consultation`, not the generic service cards. The Services page renders its stable `service` variant immediately, with 60-minute (€100), 30-minute (€50) and free written review choices. Paid handoff opens a prepared WhatsApp enquiry and requires an explicit Send; it is not a confirmed booking.
2. Reuse the exact source-verified local first-party YouTube testimonial still whenever available. Do not concurrently load an optimized external YouTube thumbnail. If the local WebP fails, fall back to the existing external thumbnail chain. Two legacy Russian testimonials without verified stills keep the existing external path.
3. Bypass Next image transformation for the existing ~30 KB WebP card stills on the Services page. Keep larger original portrait PNGs optimized and never silently degrade their resolution.
4. Set an explicit, bounded browser/CDN cache header for two PUBLIC artwork-only folders. Published filenames carry versions or immutable YouTube IDs. Private responses and dynamic HTML retain per-request CSP nonces and `no-store`.
5. Run the read-only production TTFB script in CI on PRs and after merges; record first request and warm median for both `/?lang=en` and `/?lang=ru`.

## Known technical limitation (no unsafe forced ISR)
The shared Next.js 15 layout uses `headers()` to generate a per-request CSP nonce and public language metadata; the homepage also reads locale cookies/search parameters. Calling `dynamic = "force-static"` or enabling CDN caching for HTML would break nonce validation and/or language/auth isolation. Full HTML ISR requires a separate architecture change and browser-CSP proof before it can be enabled. It is NOT claimed here.

## Usage and measurement accuracy
- During a public page audit, numerous `/_next/image` URLs appeared in responsive `srcset` listings. They are POTENTIAL widths, **not evidence that every width was requested, nor a monthly billing counter**.
- The reported "90% of Vercel limit" is unverified from available usage APIs. Hobby image quota excess normally returns 402 for new image variants; it does not inherently pause the entire site.
- 0.2–0.3 seconds is a target, not a measured success. CI uses a public no-cookie header-arrival TTFB measurement; separately measure real-user LCP/INP before claiming faster page load.
- Full natural playback of 16 approved public videos passed production browser CI [run #38347500996](https://github.com/andylitvinov-design/books/actions/runs/38347500996), in Chromium and WebKit; the current change does not modify provider IDs, source video, voice or ratio.
