# Phase 2 — routes and discovery

SUPERGOAL_PHASE_START

## Work

Add locale-aware Homeopathy routes, shared top-level navigation, remedy index search and A–Z browsing, detail pages, language switch, source reference display, only source-mapped related remedies, and a discreet educational disclaimer.

## Acceptance criteria

- All six requested route families render and unknown remedies return 404.
- Search matches source names, aliases, abbreviations, case-insensitively and partially.
- The locale switch keeps the remedy slug.
- Existing book routes remain unchanged.

## Verify

`npm run test:unit`

## Mandatory commands

- `node --test tests/homeopathy-routes.test.mjs`
- `npm run test:unit`

## Evidence required

- Static-param count for both locales.
- Search assertions for Latin, source Russian terms, abbreviations, and partial query behavior.
