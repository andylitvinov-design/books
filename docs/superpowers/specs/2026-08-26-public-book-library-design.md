# Public Book Library Design

## Goal

Turn the existing Next.js catalog into one public, readable library of the 20 verified Alchemy, Dao, and Maya sources without generating, shortening, or relabelling author text.

## Audit baseline

- `data/books.json` lists 20 catalog entries, but 19 entries contain only overview/source placeholders rather than book text.
- The corpus contains nine independent Alchemy guides, ten Dao books, and a structured Maya manuscript; aggregate/index/export HTML files are retained as source material, not catalog duplicates.
- Alchemy, Dao, and Maya already contain real photographs. The current catalog uses generated gradient themes instead of them.
- Older artifacts contain local machine and loopback URLs. They must never appear in public navigation or rendered reader content.

## Chosen approach

Create a canonical metadata module containing one record for every independently readable source. Each record keeps the original source path, culture/category, real cover asset, status, tags, description, and an explicit table of contents. The existing raw sources remain authoritative.

Book pages are server-rendered at `/books/[bookId]`. A small source parser extracts author-owned body content from HTML, removes executable/technical document chrome, maps known relative source-media paths to public URLs, and neutralizes local-only links. Maya is rendered from its ready manuscript with its existing heading hierarchy and source labels; TempleTherapy material remains visibly supplemental.

The homepage is a client-side discovery surface: title/description/tags/chapter-title search, category chips generated only from occupied categories, and real-image book cards. It has no dashboard/sidebar pattern.

## Public media

`/media/[series]/[file]` serves only basenames from three known source directories. The route rejects traversal and unknown series; Next output tracing includes the three source media directories for production. This avoids duplicate media copies while making covers and inline source images public URLs.

## UI

The visual language follows `alchemy_soul_guides.html`: warm paper background, restrained ink/rust palette, generous serif reading type, large photographic crops with readable overlays, and a minimal header. A responsive reader uses a collapsible/normal-flow contents list on mobile and a sticky table of contents on larger screens.

## SEO and integrity

The root layout gets title, description, Open Graph defaults, and a production URL driven by `NEXT_PUBLIC_SITE_URL`; individual book pages generate canonical title/description/Open Graph metadata. Source paths are preserved only in code metadata, never printed as local machine links. No empty category, draft-only fabricated text, or Maya/Aztec/Inca conflation is introduced.

## Delivery and verification

Work is isolated on `codex/public-book-library`. The delivery includes a focused unit test for the source parser, lint, type check, build, route and rendered-link checks, then a Vercel project/deployment and public-route verification when disk capacity permits the local build and the authenticated Vercel CLI is available.
