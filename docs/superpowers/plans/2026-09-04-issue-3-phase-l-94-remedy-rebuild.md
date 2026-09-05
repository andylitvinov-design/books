# Issue #3 — Phase L: 94-card bilingual remedy library

## Goal

Rebuild Book 02 from the approved Psychic Alchemy source inventory without
changing production or merging PR #4. Publish 94 source-backed canonical
remedies in both Russian and English: the existing 38, 54 approved Telegram
full cards, `Aurum metallicum`, and `Carcinosinum`. The 22 mention-only rows
remain unpublished.

## Design decisions

- `data/remedy-source-inventory.csv` remains the auditable source register.
  The 54 approved full cards and the two resolved naming rows become
  `confirmed`; source spellings stay in aliases and provenance.
- Canonical content lives in paired Markdown files under
  `content/remedies/{ru,en}`. RU preserves source-derived author material;
  EN is marked `translated-from-ru` whenever no English primary source exists.
- No Telegram image is publicised until its visual relation has been reviewed.
  Source image paths remain provenance metadata, so a card can work without an
  uncertain image.
- The Book 02 TOC is generated from the same published remedy catalog rather
  than maintained as an independent list.
- `Aqua Marina`/`Aquamarinus` and `Lac Humanum`/`Lac maternum` remain separate
  source concepts; no alias joins either pair.

## Execution

1. Write failing contract tests for 94 paired routes, normalised canonical
   names, Book 02 TOC, and publication exclusions.
2. Normalize and regenerate the source inventory/index mappings, retaining
   original spellings and message provenance.
3. Generate 94 RU canonical cards and 94 EN paired cards from the existing
   manual pages and Telegram message material; add structured source metadata
   and a generated Book 02 alphabetical TOC.
4. Adapt content parsing and remedy UI so structured fields, source messages,
   translation provenance, directory search, SEO, and language-preserving
   routes work for all 94 cards.
5. Run source/content validators, focused tests, lint, production build, and
   a Vercel preview; manually inspect requested routes/search/mobile views.
6. Commit and push only the integration branch, update PR #4, and stop at the
   final review checkpoint.

## Verification

- 94 RU + 94 EN files, no duplicate slug or orphan pair.
- 22 mention-only items have no public pages.
- Source message and image references resolve to the Telegram audit index.
- Sitemap contains all 188 remedy URLs; legacy book routes remain intact.
