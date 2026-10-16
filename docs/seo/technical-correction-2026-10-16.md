# Holistic House — SEO / multilingual correction (16 October 2026)

Scope: https://holistichouse.vercel.app, source `andylitvinov-design/books`,
production branch `codex/public-book-library`. This change is prepared on
`fix/seo-i18n-20261016-site-audit`.

## Source-verified corrections

- **P0 / ES home:** Added a free-tools and learning section with explicit limitations
  for partly translated tests, links to the ES Academy/Library, and source-language-labelled
  testimonials. Consistent visible author name: **Andrey Litvinov** (home and About).
  Full editorial parity is a continuing review, not a verified word-for-word translation.
- **P0 / H1:** Reviewed real source components; `BookCatalog`, `LibraryHub`,
  `AcademyHub`, `RemediesPage`, and ES books/remedies pages already render H1.
  `/books` is a redirect, not a page; adding an H1 to a redirect would create an
  indexable duplicate. Keep one H1 per rendered page.
- **P0 / descriptions:** Replaced raw `.slice(0,155)` for RU/EN/ES remedies
  with sentence-aware editorial fallback. Book descriptions are also bounded to
  complete sentences instead of truncated fragments. Default root description is EN.
- **P1 / sitemap:** Drop redirect `/books`; include `/en/books`, `/ru/books`,
  indexed ES sections, multilingual service details, academy paths, and ES remedy
  catalog. Compose reciprocal hreflang only for URLs present in sitemap.
  Add x-default when English sibling exists and lastmod for every entry.
- **P1 / language:** EN / RU book catalog and ES home metadata stay in their own
  language. `/en/library` and `/en/books` are **not duplicates**: the former is
  the cross-format library hub (books, video, guides) while the latter is the
  searchable book catalog. Canonical URLs remain distinct.
- **P1 / 404:** Localized EN/RU/ES 404 with consistent title and links back to
  the respective homepage, services, remedy directory and language switcher.
- **P2 / legacy CTA:** Permanent aliases for old `/:locale/tests`,
  `/:locale/cabinet`, `/:locale/review`. Destinations are working defined
  routes but must still be checked live for auth/interaction acceptance.

## Acceptance and remaining gates

1. Run `npm run build`, `npm run lint`, `npm run test:unit` and
   `npm run verify:seo` in a real checkout/CI.
2. On the production deployment, fetch `/sitemap.xml`; verify 200 responses
   for every URL, `lastmod`, reciprocal hreflang, and no redirect URLs.
3. Verify HTTP status 404, single H1, correct `<html lang>`, title/description
   on `/en/nonexistent`, `/ru/nonexistent`, `/es/nonexistent`.
4. Verify CTA flows including Google sign-in and ES test language limitations
   on mobile; check old aliases return permanent redirects.
5. Browser-level audit: OG/Twitter previews, Core Web Vitals mobile/desktop,
   language QA of the most visited ES remedy records, ES home editorial parity.
6. Confirm the Vercel production deployment has the exact tested/merged commit
   before reporting this as **LIVE**.

No clinical outcome claims, new remedies, private routes, public videos or secrets
are added by this change. Never mark complete based on GitHub source edits alone.


## SEO live follow-up — 2026-10-16 (post-#741/#743)

Production audit is tied to the exact Vercel source SHA, not the repository
default branch. On 16 October 2026 the verified production deployment was
\`4c7e64dd3a6e7cdeaa5389731eedfa58db3d790a\` (READY, aliased to
\`https://holistichouse.vercel.app\`).

- The public sitemap fetch returned **604 distinct URLs**: **196 EN, 197 RU,
  187 ES**, plus **24 unprefixed** (mostly canonical book-reader paths).
  Old \`/books\` redirect and client/admin routes were absent.
- Source/live spot checks: ES homepage language metadata is Spanish; EN Books
  canonical/OG/Twitter are present; \`/en/tests\` resolves to
  \`/en/client/tests\`; random RU missing route returns real HTTP 404.
- In the sample, EN/RU/ES remedy Arnica descriptions are complete, localized
  and 126–134 characters. The legacy EN/RU Books descriptions were only
  67 characters; ES Services description was 229; EN Library 165. This
  follow-up adds human-written 120–160-character replacements.
- **Google Search Console:** the earlier *historical baseline* on this date
  remains 594 submitted, 0 indexed, 0 errors, 0 warnings. Updated sitemap
  was **re-submitted successfully at 2026-10-16 19:44:25 UTC**. Google
  confirmed receipt, with a new download pending. Do not confuse the live
  604-URL sitemap with a confirmed Google fetched/indexed count.
- The dedicated public-only live auditor checks *every* indexed route for
  HTTP 200, sitemap lastmod/hreflang reciprocity, redirects and sampled
  page title/description/H1/lang/canonical/OG/Twitter plus 404. It stores a
  JSON report as a GitHub Actions artifact. An independent Lighthouse workflow
  measures mobile/desktop performance, LCP, CLS, TBT and lab SEO, with INP
  only if actually available.
- CrUX field data **not configured** in the connected GSC Wizard (no CrUX
  API key). Google mobile performance >=90 and field INP are **not verified**;
  do not assert a performance score without a real Lighthouse report.
- Historical broad test-suite failures include pre-existing brittle
  Services/Nav assertions; acceptance must distinguish them from actual code
  regressions. Separate SEO/live tests remain mandatory, not silently waived.

**Remaining pass gate:** Live audit artifact must show all 604+ canonical
sitemap URLs = HTTP 200 and no invalid hreflang/metadata; then check the
updated Vercel SHA/alias, mobile Lighthouse score and real ES source quality
on the most frequently visited pages.
