# Holistic House — Multilingual SEO remediation (16 October 2026)

**Source:** owner audit dated 2026-10-16. **Canonical public site:** https://holistichouse.vercel.app.
**Production branch:** `codex/public-book-library` (repository default `codex/bootstrap-books` is NOT the production branch).
**Implementation branch:** `codex/seo-multilingual-audit-20261016`.
**Scope:** public SEO only; private client cabinet and medical information are out of scope.

## Observed before changes

- EN/RU book catalog, Academy hub, Library hub and remedy index already have real H1 elements (no duplicate H1 inserted).
- `/books` is an existing preference-based redirect, while `/{locale}/books` is the localized catalog. The library hub `/{locale}/library` is a separate cross-category landing page, not a copy of book catalog.
- ES homepage had a shorter conversion journey and the heading `Andrii Litvinov`.
- Some EN/RU public metadata omitted ES hreflang. The Spanish metadata helper already supplied complete alternatives on supported ES routes.
- Existing remedies and ES translated remedies had descriptions truncated using `slice(0, 155)`.
- Sitewide fallback metadata in root layout was Russian while the canonical / root is English.
- Existing static legacy `/books` URL was included in sitemap despite redirect.
- Static public Spanish routes exist for `/es/services`, `/es/books`, `/es/homeopathy`, and `/es/homeopathy/remedies` (audit count may refer to an earlier deployed build). All existing real routes, not an assumed 87 URL count, are the basis for validation.
- ES remedy archive is source-backed machine translation with limited manual correction. Do not label all translated content as human-reviewed.

## Change log

| Requirement | Implementation | Status until CI/live checks |
| --- | --- | --- |
| P0 ES parity | Homepage self-check/course/library entry and source-identified testimonial videos; consistent public name Andrey Litvinov; ES cards link to existing section anchors | In branch; full editorial parity needs human content review |
| P0 Missing H1 | H1 verified in source for cited index components; leave one meaningful H1, no extra markup | Source verified; rendered DOM QA still open |
| P0 descriptions | Replace cut-off remedy/reader descriptions with complete 120–160-character localized sentences or fallback; books/remedies social cards | In branch; full page crawl pending |
| P1 sitemap | Include EN/RU book indexes, remove redirect-only /books, attach actual language peers and x-default, ensure lastModified on all entries | In branch; XML/regression/Google fetch pending |
| P1 mixed locale | English root default metadata; ES-specific content links; public catalog EN and RU remain separately localized | In branch; crawl pending |
| P1 404 | Shared localizable page with language switch, homepage/services/remedy links; noindex, common 404 title | In branch; route-level metadata/response checks pending |
| P2 CTA | Redirect old /tests /cabinet /review links for three locales; direct Spanish service card anchors, legacy URL redirects | In branch; click/HTTP tests pending |
| P2 Library collision | Keep /library as broad hub, /books as specialized catalog, /books legacy redirects to localized catalog | Intentional separation, no canonical conflicts |
| P2 previews | Per-remedy and books OG/Twitter metadata, as well as library and catalog hubs | In branch; validator pending |
| P2 CWV | Mobile/desktop LCP, CLS, INP, Lighthouse/PSI 90+ | Not yet measured; no unsupported performance claims |

## Release acceptance

1. Run `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run verify:seo`, `npm run build`; fix compilation regressions before production.
2. Browse or crawl `/sitemap.xml` and check: valid XML; all unique indexable URLs return 200; no redirects/private routes; per-page alternate peers are live and reciprocal; lastmod present. Count must reflect real source corpus, not the old 87-URL audit snapshot.
3. Browse sample URL triplets: `/{en,ru,es}/about`, `/services`, `/books`, `/homeopathy`, `/homeopathy/remedies`; make sure there is exactly one rendered H1, matching language, complete meta description and OG/Twitter tags.
4. Check a known remedy, e.g. Arnica, and at least 10 random ES remedy pages for terminology (do not assert comprehensive human review).
5. Trigger unknown routes under EN/RU/ES; verify **HTTP 404** rather than only a visual page, title 404, noindex, localized body/description, functioning navigation. Next.js streamed not-found can return HTTP 200; verify from browser/network.
6. Verify `/en/tests`, `/ru/cabinet`, `/es/review`, and the old Spanish service deep links permanently redirect to real pages; test all homepage/service CTA links, mobile and desktop.
7. Run PageSpeed Insights mobile/desktop after deployment and record real LCP/CLS/INP. No score >=90 claimed prior to measurements.

## Constraints

- Never expose client/test results in sitemap, public OG or public content.
- No health diagnosis, cure, prescription or treatment-substitution claims.
- Preserve public 404 language and canonical host even when serving from a preview.
- Do not interpret a source commit or PR as a deployed production release. Confirm Vercel deployment exact SHA and live hostname after merge.
