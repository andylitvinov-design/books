# Remaining public Image Optimization hot spots — 2026-10-16

An anonymous rendered-public-page HTML audit found no `/_next/image` candidates among image links on `/`, `/en/services`, and `/en/services/free-situation-review` after PR #728. Additional pages still emitted candidates:

| Public destination | Candidates in extracted image links | Verified source |
|---|---:|---|
| /en/about | 7 | `/images/holistic-house/andy-about.png` (~2,076,018 bytes), responsive static WebP variants already exist |
| /en/academy/reiki/tantra-reiki/free-initiation | 8 | Same Andy portrait |
| /en/academy/reiki/tantra-reiki | 8 | Same Andy portrait |
| /en/academy/reiki/yggdrasil/basic-course | 8 | `/academy/reiki-yggdrasil/source/basic-program.jpg` (103,744 bytes in GitHub) |
| /en/academy/reiki/yggdrasil/free-initiation | 7 | `/academy/reiki-yggdrasil/source/school-introduction.jpg` (175,409 bytes in GitHub) |
| /en/books | 48 | Large library cover sources from dynamic media redirects; original file sizes not independently verified |
| /en/homeopathy | 46 | The same dynamically served book/media corpus |

The counts above are HTML `src/srcset` candidates, not proof that every variant is requested or that every candidate is billed. Actual transfer counts depend on responsive browser selection and use. The site owner reported 5000/5000 transformations; the Vercel connected billing/observability endpoint returned 404, so no post-change quota reset is asserted.

## Applied narrow mitigation
- Reuse existing `StaticPortrait` with responsive prebuilt, source-verified WebP on EN/RU/ES About, Tantra Reiki personal/teacher sections.
- Use `unoptimized` for two proven-small static Yggdrasil JPGs. Preserve intrinsic sizing, text and eager/lazy loading.
- Keep book-reader image optimization in place instead of serving potentially huge unverified originals. Later work should measure real transferred bytes and build a tested static multi-size thumbnail corpus before removing it.
- Do not change any client-private image routes, global `images.unoptimized`, metadata, scripts, paid plans or media publication.

## Acceptance
Source contracts and local asset bytes, TypeScript, lint, Next production build, public responsive browser and existing video playback, then production release exact-SHA/alias readback. Validate remaining `/_next/image` candidates through a public browser check after deployment.
