# Phase 1 — content contract and data layer

SUPERGOAL_PHASE_START

## Work

Create a deterministic generator that reads the confirmed inventory and the cited HTML articles, filters non-descriptive operational material, and writes 38 Russian Markdown files. Create 38 paired English Markdown files whose bodies are direct translations of the stored Russian descriptions and whose frontmatter records translation provenance. Add a parser/catalog and validation script for 38/38 pairs, unique slugs, source existence, source heading presence, and local route links.

## Acceptance criteria

- Exactly 38 `content/remedies/ru/*.md` and 38 `content/remedies/en/*.md` files exist.
- Each pair has matching slug and a valid inventory/source reference.
- Each English entry says no English source existed and identifies its Russian source pair.
- Duplicate and grouped inventory rows do not create pages.

## Verify

`npm run validate:remedy-content`

## Mandatory commands

- `node --test tests/remedy-content.test.mjs`
- `npm run validate:remedy-content`

## Evidence required

- Validator output with the RU/EN pair counts and zero integrity errors.
- A file listing proving that only confirmed inventory rows created Markdown pairs.
