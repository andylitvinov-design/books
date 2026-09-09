# Issue #3 bilingual Homeopathy design

## Scope

Build a localized Homeopathy publication surface alongside the existing book library. It contains exactly the 38 source-confirmed remedies; inventory duplicates and the grouped non-remedy heading remain visible only as audit provenance, never as pages.

## Visual and interaction direction

- **Visual thesis:** a calm, warm editorial index that reads as a source archive, not a clinical product.
- **Content plan:** section introduction, remedy directory/search, alphabetical trail, source-attributed individual reading page, small educational notice.
- **Interaction thesis:** instant client-side narrowing for search, active A–Z anchor state, and locale links that retain the current slug.

## Architecture

Each language has one Markdown file per confirmed slug. Its frontmatter includes title, source label, source reference, aliases, optional source-mapped relations, and provenance. A server-side parser builds a typed catalog for static route generation, metadata, sitemap, and tests. Client UI receives an already-safe directory projection only.

The route tree is `app/[locale]/homeopathy`, `app/[locale]/homeopathy/remedies`, and `app/[locale]/homeopathy/remedies/[slug]`. Locale is constrained to `ru` and `en`; unknown locales and slugs use Next’s 404 path. A shared navigation component preserves existing `/books/[id]` links.

## Search and localization

Search is diacritic/case insensitive and partial. It indexes the source-backed canonical Latin title, Russian/common source name, and aliases. It also accepts non-content, mechanically derived spacing variants such as `nat mur` for multi-word Latin titles; source aliases remain distinguishable in metadata. A missing inventory member such as Aurum is never silently introduced as a result.

All English pages are translations of their paired Russian content because inventory records no English source. English frontmatter records `translation_provenance: translated-from-ru` and the paired file; it never claims to be an original English source.

## SEO and safety

Every locale/page creates unique metadata with canonical and `ru`/`en` alternates. `app/sitemap.ts` exposes both localized section/index pages and 76 remedy URLs; `app/robots.ts` points crawlers to the sitemap. Pages show a quiet educational disclaimer, avoid dose/potency/regimen content, and link source records instead of external medical claims.

## Test contract

Node tests validate content pairs and sources; component/data tests validate search and route derivation; build and preview prove rendering. Existing 23 library routes are rechecked during the integration phase.
