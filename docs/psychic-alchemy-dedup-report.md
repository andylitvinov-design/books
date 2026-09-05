# Psychic Alchemy — deduplication report (Phase K)

## Scope and method

The source is the complete local Telegram export `Telegram Desktop/ChatExport_2026-09-04/messages.html` and its `photos/` assets. The parser indexed every message container, retained its original ID, exported date, forwarded flag, text hash, image paths, and a 360-character source excerpt in [`data/telegram-psychic-alchemy-index.csv`](../data/telegram-psychic-alchemy-index.csv).

This is a source-resort proposal only. It does not rewrite public remedy content, correct author spellings from external references, or use clinical material from outside the author archive.

## Exact duplicates

There are two exact normalized-text duplicates. The later copy is marked `duplicate` and points at the earlier source message in the index:

| Keep | Later duplicate | Decision |
| --- | --- | --- |
| `message124` — 10.10.2024 | `message877` — 09.11.2025 | keep `message124`; do not reproduce the identical text twice |
| `message588` — 30.05.2025 | `message1015` — 22.04.2026 | keep `message588`; do not reproduce the identical text twice |

## Book 02 card families

There are 95 primary source-card posts: 38 already-confirmed cards, 54 new full-card proposals, and three full-card posts in two unresolved name groups. Fifteen further posts are meaningful variants, poems, or later updates. They are not deleted: they are preserved as `supporting_post` rows and have a canonical-card target.

| Canonical-card target | Supporting posts | Treatment in the proposed book |
| --- | --- | --- |
| Natrum Muriaticum (`message49`) | `message165` | merge as later author version |
| Sulphur (`message113`) | `message198`, `message199`, `message200` | merge as author variants; retain all source IDs |
| Kalium Sulphuricum (`message217`) | `message218` | merge as a supporting variant |
| Baryta Carbonica (`message114`) | `message481` | merge as a later card version |
| Testosteronum (`message838`) | `message842`, `message866` | merge as later card versions |
| Carbo Vegetables (`message244`) | `message245` | retain poem as supporting material |
| Sepia (`message247`) | `message249` | retain poem as supporting material |
| Kalium Phosphoricum (`message257`) | `message258` | retain poem as supporting material |
| Staphysagria (`message277`) | `message283` | retain poem as supporting material |
| Carsinosinum / Carcinosinum (`message429`) | `message430` | hold as a disputed source-name group |
| Cinchona (`message565`) | `message566` | retain poem as supporting material |
| Ambra Grisea (`message751`) | `message752` | retain poem as supporting material |

## Do not auto-merge

- `message37` calls the full card **Аурум**; `message1059` calls the comparison term **Aurum Metallicum**. The proposal therefore records `Aurum / Aurum Metallicum` with no slug.
- `message429` uses **CARSINOSINUM** and `message1053` uses **CARCINOSINUM**. Both full posts and `message430` are retained under one unresolved source-name group; no page slug is proposed.
- The source spellings `Carbo Vegetables`, `Mercurious Solubilis`, `Syzygiun Jambolanum`, and `Magnesium Sulphiricum` are preserved verbatim. They are review flags, not corrections.
- `Aqua Marina` / `Aquamarinus` and `Lac Humanum` / `Lac maternum` are separate source labels. They are not merged without an author decision.

## Result

The cleaned Book 02 layer has one primary source card per safe canonical proposal, with supporting posts attached rather than duplicated. Message IDs, dates, and every referenced non-thumbnail photo remain in the Telegram index; all 627 unique referenced full-size photos were present when indexed, with zero missing asset references.
