# Re-audit of mention-only remedy sources

Baseline: production `3e8bed6`, before Aconitum correction. All **22** baseline `mention_only` entities were searched independently of the old `remedy_focus` labels.

## Scope and method

Searched the complete message texts in the actual local Telegram export (`Telegram Desktop/ChatExport_2026-09-04/messages.html`) and the author HTML guides under `source-books/`; reviewed matched passages in context and read standalone candidate bodies in full. Search covered Latin names, Russian names, stems and explicit author aliases. Reviewed matches in context: generic moon imagery, dolphin music, culinary saffron and Nux moschata are not evidence for Luna, Dolphin Milk, Crocus Sativus or Moschus respectively. Book-guide copies of Telegram posts are not counted as additional independent sources. This audit is bounded to these available author sources; no external materia medica was used.

The source-status registry is administrative metadata, separate from canonical content. Its status snapshot is overridden by actual canonical profile existence at runtime. Editorial spelling aliases are search aids, not extra source assertions. All named inventory rows are represented; duplicate rows sharing a slug are merged. The grouped X-ray / North Pole heading supplies two additional known-source names, without creating profiles.

## Results

- 22 previous mention-only entities reviewed.
- 4 standalone candidates found: Aconitum, Cineraria, Lac Caninum (high confidence), Plumbum (medium confidence; naming/scope review required).
- Only Aconitum is promoted in this change. **21 of the audited entities remain source-only**, including the three pending candidates.
- Registry: 118 entities = 95 canonical profiles + 23 source-only names (21 audited + 2 grouped-source names).
- Medorrhinum is the source-only workflow example: messages67,312,757 and the Dao141 list; no canonical page.

## Per-remedy decisions

“Proposed status” distinguishes editorial source quality; both `source-only` and `mention-only` resolve to runtime `source_only`. A candidate is not permission to publish a card.

| Remedy | Previous status | Psychic Alchemy messages | Standalone found | Proposed status | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Aconitum | mention_only | message23, message31, message34, message47, message48, message76, message137, message185, message209, message276, message312, message439, message693, message757, message1018 | yes: message31 | canonical candidate | high | Standalone substance, Guardian archetype, states and transformation; author does not establish the species napellus. |
| Medorrhinum | mention_only | message67, message312, message757 | no | source-only | high | Case and multi-remedy thematic lists; no standalone portrait found. |
| Aqua Marina | mention_only | message194 | no | source-only | high | Short entry in a four-remedy comparison (message194), not a standalone card. |
| Luna | mention_only | message194, message857 | no | source-only | high | Short comparison in message194; generic lunar imagery/astrology excluded. message857 names a lunar preparation in a planetary group. |
| Anandamide | mention_only | message757 | no | mention-only | high | Named only in the early-trauma remedy list. |
| Cineraria | mention_only | message757, message793 | yes: message793 | canonical candidate | high | Complete Cineraria Maritima portrait in message793: substance, archetype, states, effects, transformation, meditation and ritual. Also misplaced in the oils source guide. |
| Amniotic Fluid | mention_only | message411, message757 | no | source-only | high | Short description in a multi-remedy source/attachment list; no individual portrait. |
| Placenta | mention_only | message411, message442, message757 | no | source-only | high | Placenta/Placentum observations in multi-remedy posts. Placenta Humana and Placenta Totalis are not silently equated with this generic record. |
| Lac Amnioticum | mention_only | message757 | no | mention-only | high | Named in message757 only; not merged with Amniotic Fluid without author identity evidence. |
| Aquamarinus | mention_only | message757 | no | mention-only | high | Named in message757 only; not merged with Aqua Marina without author identity evidence. |
| Lac Caninum | mention_only | message151, message411, message482, message757 | yes: message151 | canonical candidate | high | message151 explicitly introduces the remedy, identifies dog milk, states, archetypes and effect: standalone source missed by the classifier. |
| Berberis | mention_only | message711, message757, message808 | no | mention-only | high | Thematic multi-remedy lists; botanical Berberis vulgaris in Dao source retained as context, not used to infer a canonical species. |
| Plumbum Metallicum | mention_only | message232, message312, message320, message441, message482, message720, message757, message988, message990 | yes: message232 | canonical candidate | medium | message232 is a coherent standalone lead/Plumbum therapeutic narrative (substance, symbolism, states, effect). Candidate requires naming/scope review: author also discusses symbols, not only preparations. |
| Helium | mention_only | message757 | no | mention-only | high | Named only in early-trauma list. |
| Dolphin Milk | mention_only | message411, message757 | no | source-only | high | Dolphin Milk in message757; Lac Delphinum explicitly glossed as dolphin milk in message411. Dolphin music in message413 excluded. |
| Crocus Sativus | mention_only | message742, message757 | no | mention-only | high | Multi-remedy thematic comparisons. Culinary/aromatherapy saffron in message9 excluded. |
| Tuberculinum | mention_only | message757, message1057 | no | mention-only | high | List in message757 and miasm terminology in1057, no standalone remedy portrait;1056 adjective alone not treated as remedy evidence. |
| Moschus | mention_only | message757 | no | mention-only | high | Only message757 establishes Moschus; Nux moschata occurrences are a different name and excluded. |
| Anacardium | mention_only | message312, message482, message712, message742, message757 | no | mention-only | high | Multiple comparisons/lists but no standalone portrait found. |
| Magnesium Sulphiricum | mention_only | message757 | no | mention-only | high | Source spelling Sulphiricum retained; Sulphuricum/Sulfuricum added only as editorial search spelling variants. |
| Aspen | mention_only | message1026 | no | source-only | high | Comparative observations with Rock Rose and White Chestnut in1026; Dao thematic lists add context, not a standalone card. |
| White Chestnut | mention_only | message1026 | no | source-only | high | Comparative observation in1026 and Dao thematic list; no standalone card found. |

## Additional book-source matches

These distinct Dao entries supplement the corresponding thematic evidence; they are not standalone remedy portraits. Source paths and IDs are retained in the registry.

| Remedy | Additional author entries |
| --- | --- |
| Aconitum | daomagic/139 |
| Medorrhinum | daomagic/141 |
| Amniotic Fluid | daomagic/145 |
| Berberis | daomagic/134, daomagic/141 |
| Dolphin Milk | daomagic/145 |
| Anacardium | daomagic/135 |
| Aspen | daomagic/139, daomagic/286, daomagic/312 |
| White Chestnut | daomagic/299 |

## Aconitum primary and supplementary material

Primary: **message31**, 01.09.2024, begins “Красивое высокогорное растение - Аконит”. It is a standalone substance/archetype/states/effect portrait. The canonical name is **Aconitum**, without inferring *napellus*.

Found **15 supplementary author entries**: 14 other Psychic Alchemy messages plus Dao139. They remain supplementary references, not copied wholesale into the primary profile. Labels describe the author text, not independently verified clinical outcomes. No client narratives or identifying details are reproduced here or used as test fixtures.

| Source | Classification |
| --- | --- |
| message23 | case |
| message34 | case |
| message47 | case |
| message48 | case |
| message76 | case |
| message137 | case |
| message185 | case |
| message209 | thematic mention |
| message276 | case |
| message312 | thematic mention |
| message439 | case |
| message693 | thematic mention |
| message757 | thematic mention |
| message1018 | comparison |
| daomagic/139 | thematic mention |

message276 is a case with comparisons; message1018 is a comparative observation. message23 was absent from the original example list. `daomagic/139` occurs in `source-books/book-2-dao-books/dao_practicum_cases_remedies.html` (01.08.2025).

## Candidate review boundaries

Cineraria message793 contains a complete structured portrait and the author explicitly uses both Cineraria Maritima and Cineraria. Lac Caninum message151 explicitly identifies dog milk and supplies states, archetypes and effect. Plumbum message232 predominantly concerns lead and its therapeutic symbolism, so it qualifies as a standalone-source candidate under the requested coherent-description criterion; it must not silently establish a more specific preparation name. Aqua Marina/Aquamarinus and Amniotic Fluid/Lac Amnioticum remain separate because source identity is not established. Placenta Humana/Totalis are not silently conflated with generic Placenta.

The negative finding “no standalone found” means none found in the audited corpus, not proof that the author has never published one.
