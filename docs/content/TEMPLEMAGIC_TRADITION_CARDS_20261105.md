# TempleMagic · restored searchable library cards · 2026-11-05

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES

## Editorial model

Two independent public destinations, without new duplicate books:
1. Descriptive tradition manual: `/{locale}/books/{bookId}` (existing canonical books). Maya `maya-egregor-gods`, Egypt `egypt-osiris-temple-magic`, Greece `greek-metaphysics-planning`.
2. Independently linkable attunement cards: `/{locale}/temple-channels?tradition={traditionId}&channel={traditionId}:{channelId}&q={cardId}#{cardId}`. Fulltext and tradition/channel filters return original texts, not invented poems. The library hub and three book collections link to cards.

## First-party author corpus incorporated

- Source Maya: authenticated author Telegram export `messages.html`, archival posts #41 (22 Feb 2021), #146 (2 Jan 2025), #161 (11 Feb 2025), #218 (16 Jan 2025), #220 (23 Jan 2025). Six original poems + one original prose-based Kaah practice, each independent and attributed to the exact archival message. Dangerous historical bloodletting steps are **not** republished in cards.
- Source Egypt: original author archive `Египетские традиции`, Google Doc: https://docs.google.com/document/d/1VxQEJTAXcDxb7vx1kQ-dtwIg0ZkPpwDAqx-SIYn__Kg/edit. Three distinct Ma'at poems including the dated 27 Feb 2023 piece, one original `Полет Ба к Первоотцам` poem.
- The existing Greek/Egyptian and author/Telegram card archive stays unchanged, including 39 Greek poems and 25 source-adjacent images in `data/temple-attunements-expansion.mjs`.
- Original Russian spelling remains untouched; English/Spanish card labels are editorial discovery aids rather than claimed translations of the author verses.
- Places, photographs and antique site identifications are not inferred. All newly recovered cards have `photos: []` until legally and editorially associated imagery can be checked. An unverified shrine or temple is not presented as a proven historical site.
- Named source channels with no verified independent poem remain navigable but do not receive invented cards.

## Public QA contract

Direct page `/{locale}/temple-channels` has separate `tradition`, `channel`, `q` form inputs, typed filter guards, pagination, one-card permalinks by stable ID, original Russian text and source labeling. New tests assert Maya/Egypt/Greek manuals, all 11 recovered entries, 2 Ik' and 3 Ma'at variations, exact-card queries, and links from Library and Books.

No new database, asset rehosting, secret, billing integration, GitHub Actions workflow or external service.
