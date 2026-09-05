# Psychic Alchemy — proposed four-book resort (Phase K)

## Source boundary

This plan is derived only from Andrii Litvinov's complete Telegram export and the existing repository source books. It is a review checkpoint: it creates no public remedy pages, changes no live route, and makes no deployment.

## Existing series and replacement boundary

| Target book | Current repository source | Phase K action |
| --- | --- | --- |
| Book 01 | `source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_foundations.html` | retain as the existing foundations source; map Telegram theory/case additions for a later editorial pass |
| Book 02 | `source-books/book-1-alchemy-soul/alchemy_soul_guide_homeopathy_remedies.html` — 47 remedy-like headings audited as 38 canonical cards, 8 duplicates, 1 group | extend the same book proposal, never create a competing remedy book |
| Book 03 | no existing standalone Psychic Alchemy subpersonality book is replaced in this phase | reserve the classified subpersonality corpus for an approved new/revised edition |
| Book 04 | no existing standalone Psychic Alchemy deep/alchemical book is replaced in this phase | reserve the classified deep/alchemical corpus for an approved new/revised edition |

The raw Telegram export stays untouched. “Removed” below means excluded from a derived book, never deleted from the source archive.

## Archive allocation

| Destination | Indexed useful messages | Editorial role |
| --- | ---: | --- |
| Book 01 — theory and method of Systemic Homeopathy | 253 | method, diagnostics, stages, cases, and framework explanations |
| Book 02 — remedy cards | 110 | 95 primary cards plus 15 linked supporting variants |
| Book 03 — psychohomeopathy of subpersonalities | 133 | parts of the psyche, archetypes, developmental/trauma formulations |
| Book 04 — deep/alchemical psychohomeopathy | 278 | alchemy, miasms, Usin, meridians, runic and other deep-framework posts |
| Review / non-book material | 150 | 136 out-of-scope, 3 promotional boilerplate, 2 exact duplicates, 9 empty/media-only entries |
| Service history | 401 | channel history only; never book content |

The source index is the traceability layer for every allocation. A row is `useful=yes` only when it is allocated to one of Books 01–04; this yields 774 useful messages from 1,325 total parsed message containers.

### Source-message feed by editorial type

| Index `content_type` | Target | Handling |
| --- | --- | --- |
| `theory_method`, `case_observation` | Book 01 | retain method explanation and cases; remove scheduling/contact wrappers at assembly time |
| `remedy_card`, `remedy_card_support` | Book 02 | one canonical card plus linked supporting observations, poems, and later versions |
| `subpersonality` | Book 03 | move theory of parts/archetypes out of remedy-card prose and cross-reference cards |
| `deep_alchemical` | Book 04 | move miasm, alchemy, Usin, meridian, runic, and deep-framework material here |
| `promo_admin`, `duplicate_repost`, `service_history`, `empty_or_media` | no derived book | retain index/provenance only |

Use the `content_type`, `book_assignment`, `source_anchor`, and `photo_assets` columns in [`data/telegram-psychic-alchemy-index.csv`](../data/telegram-psychic-alchemy-index.csv) to retrieve every feeding message deterministically.

## Proposed Book 02 TOC

### Part I — established canonical cards (38)

Keep the existing 38 confirmed cards and their stable slugs unchanged. Their original Telegram primary-card anchors are recorded in the index; the current source book remains the source of truth for the already-published descriptions.

Five existing cards are marked **existing_to_enrich** from clearly richer or later Telegram card material: Natrum Muriaticum (`message49`, `message165`), Sulphur (`message113`, `message198–200`), Kalium Sulphuricum (`message217`, `message218`), Baryta Carbonica (`message114`, `message481`), and Testosteronum (`message838`, `message842`, `message866`). This is an editorial source flag only; no existing public page is changed in Phase K.

### Part II — new full-card proposals (54)

Add only after review, alphabetically by the author-source name:

1. Aethusa Cynapium
2. Alumina
3. Ambra Grisea
4. Apis
5. Arnica
6. Baptisia Tinctoria
7. Beryllium Metallicum
8. Borax
9. Bothrops Lanceolatus
10. Bovista Lycoperdon
11. Bryonia
12. Camphora
13. Carbo Animalis
14. Carbo Vegetables
15. Cinchona
16. Cobaltum Metallicum
17. Cocculus Indicus
18. Coccus Cacti
19. Colchicum Autumnale
20. Cyclamen Europaeum
21. Folliculinum
22. Helleborus Niger
23. Hydrastis Canadensis
24. Hydrogenium
25. Hypericum Perforatum
26. Kali Muriaticum
27. Kalium Arsenicosum
28. Kalium Iodatum
29. Lycopodium
30. Magnesia Phosphorica
31. Magnesium Carbonicum
32. Magnesium Muriaticum
33. Mercurious Solubilis
34. Natrum Carbonicum
35. Natrum Sulfuricum
36. Nitricum Acidum
37. Phosphoricum Acidum
38. Phytolacca Decandra
39. Platina Metallicum
40. Psorinum
41. Rock Water
42. Ruta Graveolens
43. Saccharum Lactis
44. Saccharum Officinale
45. Sanguinaria Canadensis
46. Secale Cornutum
47. Sepia
48. Silicea
49. Spongia Tosta
50. Staphysagria
51. Syzygiun Jambolanum
52. Teucrium
53. Thuja
54. Veratrum Album

The list has 54 addable cards. The definitive machine-readable count and source anchors are in [`data/remedy-source-inventory.csv`](../data/remedy-source-inventory.csv).

### Appendix — hold for author decision (2 groups)

- **Aurum / Aurum Metallicum** — full source card exists, but its two source forms are not auto-normalized.
- **Carsinosinum / Carcinosinum** — two full cards use conflicting forms; preserve all three related posts, but do not create a slug.

### Mention-only appendix (22)

These source labels are useful for cross-references but do not yet have a standalone card: Aconitum, Medorrhinum, Aqua Marina, Luna, Anandamide, Cineraria, Amniotic Fluid, Placenta, Lac Amnioticum, Aquamarinus, Lac Caninum, Berberis, Plumbum Metallicum, Helium, Dolphin Milk, Crocus Sativus, Tuberculinum, Moschus, Anacardium, Magnesium Sulphiricum, Aspen, and White Chestnut.

## Editorial assembly rules

1. One future remedy page is assembled from its primary-card post plus its explicit supporting posts; source text is not silently paraphrased.
2. Promotional calls to action and repeated boilerplate are removed from the book layer, but their source messages remain in the index.
3. Every card retains its source message ID, date, and non-thumbnail photo paths in its editorial provenance record.
4. The 38 current public pages remain stable. The 54 new full-card rows are proposals only; no public route is created in this phase.
5. A source-name conflict, group heading, or mention-only label never becomes a canonical card without an author decision.

## Image mapping summary

[`data/remedy-image-map.csv`](../data/remedy-image-map.csv) links 109 Telegram image associations to Book 02 provenance: 95 primary-card attachments and 14 supporting-post attachments. All map rows point to an existing source asset. No image is approved for public publishing by filename alone: every row is `editorial_visual_review_required`, which prevents generic promotional artwork from being copied automatically.

## Review decision needed

Approve or amend the two unresolved source-name groups, then review the 54 proposed full-card rows. On approval, the next phase can create a 92-page target (38 current + 54 new) while keeping the two disputed groups outside the route set.
