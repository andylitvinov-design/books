# Holistic House editorial homepage — 2026-09-23

Owner requested the supplied editorial mockup and explicitly authorized release to live.
Base branch: `codex/public-book-library`; starting commit: `c440521`.
Rollback: retain READY production deployment `dpl_DP1eacL5NEuS9myp6FFFga2H73wL`
(`codex-public-book-library-98sivsxzu-super10.vercel.app`).

## Scope and design

Warm cream, brown typography, integrated photographic hero, three compact service
cards, and a secondary photographic library banner. Use existing system serif and
Arial for the homepage. Keep subtle entrance/hover/arrow transitions, with reduced
motion support. Preserve localized routes and existing locale preference handling.

Only three application files change: the homepage component, its stylesheet, and
the mobile navigation item order. Books, remedies, service pages, cabinet, private
storage, credentials, and deployment settings are unchanged.

Both photographs are user-supplied attachments (hero portrait and library landscape),
encoded to WebP without changing their composition; no generated replacement assets.
Local assets: `public/images/holistic-house/hero-olive-incense.webp` (136,960 bytes)
and `books-library.webp` (146,898 bytes), served through `next/image`.

## Acceptance and release checklist

- [x] Replace schematic SVG hero and CSS book stack with supplied photographs.
- [x] Apply the specified English headline/body/CTAs and natural Russian copy.
- [x] Localize all homepage and navigation labels; preserve cabinet access.
- [x] Inspect RU/EN at 390, 430, 768, and 1280px; no horizontal overflow.
- [x] Refine mobile cards to 238px EN / 254px RU at 390px; both CTAs in first viewport.
- [x] `npm run build`: passed (Next.js 15.5.21).
- [x] `npm run lint`: zero errors; 13 existing warnings.
- [x] Focused navigation/services suite: 11/11 passed.
- [ ] Preview deploy READY and hosted checks.
- [ ] Merge into production branch after successful build and visual review.
- [ ] Production READY plus public RU/EN, route, image, and guest-admin checks.

## Existing test debt

The full suite has 241 passes and six failures in unchanged backend code:
four `canonical-pdf` content assertions, the `consultations` explicit-type rejection,
and the `signed-pdf` one-page assertion. These tests, their implementation, and assets
match the starting production commit. Do not report the full suite as green.

Two pre-existing failures relevant to the public UI were corrected: obsolete
homepage copy assertions, and an over-escaped template-literal regex in the related
book-link test. Neither correction changes backend behavior.

Local screenshots, viewport measurements, build/lint/test output, and deployment
metadata are in ignored `output/homepage-qa/`.
