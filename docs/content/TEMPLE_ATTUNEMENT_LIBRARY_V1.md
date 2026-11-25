# Temple channel attunements — integrated source-backed card library (v2)

## Canonical model
**Temple tradition → deity/channel → any number of individual attunement cards**.
The records are in `data/temple-attunements.mjs`; the TS public contract is `data/temple-attunements.d.mts`.
Each attunement has its own stable ID, original Russian verse, kind, localized title, source identity, author-described country/city/site, optional location discrepancy, optional *verified matched* images, visibility, and display order. Do **not** store a deity's many verses as one concatenated field.

A channel can exist with **zero** published attunements (e.g., Zeus). The catalogue must show an honest empty state, never auto-compose, fabricate or silently translate a verse. Future media types: audio narration, video, ritual/meditation, and multiple photographs can be attached to the same record. The current searchable route is `/{ru|en|es}/temple-channels` with GET parameters `tradition`, `channel=tradition:deity`, and `q`. Filtering is server-side and works without client JavaScript.

## Confirmed original sources
1. Private author material **«Античность-Модуль 1–2.docx»**, held in owner's Drive. Used for Asclepius (Sofia, Perge-described Asclepion, Priene, Antalya, Izmir), Hygieia (Side), and Dionysus (Sozopol, Pergamon, Ephesus, Kaunos, Side). Poem line breaks preserved; historic translated Orphic hymns were *not imported*.
2. Private author material **«3_Античность (1).docx»**. Used for Hera (Perge) and Serapis (museum, unknown city). Do not expose private Drive URLs, access tokens or unrelated original file contents in public bundles.

All coordinates are intentionally absent: site and city labels are **according to the author's source**, not independently confirmed historical temple locations. The Dionysus/Pergamon source section calls the city «Пергамо» but the poem heading says «Перге». The UI surfaces that discrepancy rather than silently choosing one. The Serapis museum location is not specified; do not invent a city.

## Image mapping and publishing hygiene
Images extracted from the original DOCX's embedded `word/media/` files; each selected JPEG had **no EXIF/GPS tags** on inspection. One matching context image per listed card. Never replace an unavailable source photo with a random stock temple image; show a neutral icon instead.

| Public asset | Original embedded image | Section |
|---|---|---|
| asclepius-sofia.jpg | image1.jpeg | Sofia museum |
| asclepius-asclepion.jpg | image7.jpeg | Asclepion (author's Perge account) |
| asclepius-sanctuary.jpg | image8.jpeg | Asclepion sanctuary section |
| asclepius-priene.jpg | image16.jpeg | Priene |
| hygieia-side.jpg | image22.jpeg | Side Museum |
| dionysus-sozopol.jpg | image26.jpeg | Sozopol |
| dionysus-pergamon.jpg | image43.jpeg | Pergamon theatre section |
| dionysus-ephesus.jpg | image48.jpeg | Ephesus |
| dionysus-caunos.jpg | image55.jpeg | Kaunos section |
| dionysus-side.jpg | image61.jpeg | Side |

## Next ingestion rules
- Review ownership/permissions and original location/temple metadata before making a new record public.
- Keep original Russian full text verbatim; translations must have separate locale/provenance and must not overwrite the original.
- One `id` per **attunement**, not per channel; multiple records per deity and repeated visits should remain distinct.
- A source photo may be attached only after it is matched to a nearby original source section and checked for EXIF, people/privacy, rights, size and alt text. Multiple photos are supported.
- No automated public import from third-party magic manuals, random AI-generated photos, personal Google Drive links or invented dates.
- Add a focused Node test for any newly introduced channel, duplicate ID or source/media class.
- Site-visible completion requires protected PR merge plus actual Vercel production SHA and page smoke; PR creation alone is not LIVE. No new payment or scheduler.

## V2 · 5 November 2026 — further source recovery
Canonical public page `/{locale}/temple-channels` now combines three independently preserved sources; never imply the first source was the entire author archive:

| Source | Verified cards | Existing provenance |
|---|---:|---|
| Original manuscript «Античность-Модуль 1–2» + 2 excerpts from «3. Античность» | 15 | Original full Russian text + 10 matched DOCX JPEGs |
| Further 39 excerpts from «3. Античность» | 39 | Original Russian text + author-described city/temple or explicitly unknown; no unverified image |
| Existing AATA Telegram archive already published in Academy | 16 | Existing original message IDs, publication dates, photographs; reused as source, **not copied or paraphrased** |

**Totals:** 70 distinct texts after exact normalization (54 from manuals + 16 Telegram), 7 tradition roots, at least 40 named channels. The 39 additional manuscript entries include the Greek Zeus (Nessebar), Athena (5), Artemis (3), Aphrodite (4), Apollo (11), Hermes (2), Pan (2), Heracles (2), Leto, Ares, plus Egyptian Serapis (2), Roman Fortuna and Roman Emperor/Hadrian (4). Category names and disputed site descriptions follow the original archive, and are not asserted as externally verified historical facts. Original translated ancient hymns are excluded.

The one public search unifies manual and AATA source results without duplicating Telegram images or verse storage. There is a capped 12-card server-rendered page for mobile loading, stable `page` GET pagination preserving the selected tradition, channel and query, and optional original gallery photos. No paid APIs, new crons, external asset generation, or sensitive browser data.

**Pending editorial work:** map and review embedded JPEGs for the 39 newly extracted cards. The documents contain images but their attachment provenance/rights and individual placement should be checked before export. Photo-less cards remain valid; do not substitute other temples. Extracted transliterations in EN/ES are *titles only*; original verse is RU. Variant manuscripts must be cross-referenced before they can count as additional independent material.

**Acceptance:** exact-head Core/Guard/Specialist and targeted Node tests, protected merge, Vercel READY with descendant ancestry, and real URL checks (EN/RU/ES filters, Zeus, Athena, pagination, original image gallery). Passing checks != proven mobile screenshot fidelity.

## V3 · Original source photo review (25 photos)
The original `3_Античность (1).docx` has 257 image objects; photographs/images were associated with 25 newly added attunements by paragraph proximity plus a contact-sheet visual review. These are **illustrations embedded beside the source text**, not independently authenticated archaeological site photographs or proof of the stated temple history. Text-only cards remain text-only where images could not be safely matched.

- New public assets: `public/library/temple-channels/expanded/archive-*.jpg` (24) and `archive-fortuna-perge.png` (1).
- All image bytes came from the original author's connected manuscript (no stock, generation or unrelated gallery). Each was checked for valid JPEG/PNG signature and absence of embedded EXIF/GPS metadata; images are not presumed separately rights-cleared beyond the owner's instruction to reproduce his archive photography.
- The matching text, city, and author-described temple name are not altered; captions explicitly say "source manuscript illustration" rather than certifying a photographed location.
- 25 cards display one source image, while the remaining 14 document-only expansion cards retain the quiet neutral fallback. Existing 10 source DOCX photos and 16 original Telegram photo sets remain untouched and their public archive references are reused.
- Responsive lazy media layout, ordinary original-photo alt text, 12 cards per server response and no automatic popup.
