# Phase 3 — SEO and automated evidence

SUPERGOAL_PHASE_START

## Work

Add localized title/description/canonical/hreflang metadata, `sitemap.ts`, and `robots.ts`. Add tests for localized pages, all 76 remedy routes, search, language switch, 404, sitemap, content pairs, and source links.

## Acceptance criteria

- Sitemap includes localized Homeopathy index and all remedy URLs.
- Robots exposes the sitemap.
- Tests assert route and metadata contracts without network access.

## Verify

`npm run test:unit && npm run lint`

## Mandatory commands

- `node --test tests/homeopathy-seo.test.mjs`
- `npm run test:unit`
- `npm run lint`

## Evidence required

- Sitemap count and localized-alternate assertions.
- Robots sitemap assertion and fresh lint output.
