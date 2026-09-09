# Issue #3 bilingual homeopathy — roadmap

## Goal

Deliver a source-traceable bilingual Homeopathy section with 38 confirmed remedy pairs, searchable directories, locale-preserving navigation, SEO metadata, preview proof, and a PR. Production remains untouched.

## Phases

1. **Content contract and data layer** — materialize the 38 confirmed Russian source descriptions and their English translations as paired Markdown files; validate provenance, pairs, source references, and slugs.
2. **Routes and discovery** — implement localized section, directory, and remedy routes; add top-level navigation, A–Z browsing, partial search, locale-preserving switch, and source-mapped relations.
3. **SEO and automated evidence** — add page metadata, canonical/hreflang, sitemap and robots; cover route, search, locale, 404, source, and link contracts with tests.
4. **Integration proof** — run lint/tests/build, inspect every static route and output mapping, deploy a preview only, validate public preview paths, push and open a PR.

## Constraints

- No production deployment, promotion, or merge.
- Remedy text comes only from Andrii Litvinov source files; no external materia medica.
- Preserve all existing `/books/[id]` routes and restored Maya assets.
