# Maya Tradition source corpus

This directory is an editorial working corpus built from the primary `raw/posts.jsonl` / `SOURCE_INDEX.csv` archive and a clearly labelled public supplemental archive. The raw archives and indexes were not edited. No external historical text, translations, or fact corrections were introduced.

## Provenance and editorial rule

- Channel: `mayaismagic`; preserved source URLs use `https://t.me/mayaismagic/<post_id>`.
- Archive extent: 236 posts, IDs 2–246; numeric gaps: 10, 54, 70, 71, 88, 92, 96, 236, 237.
- `manuscript/MAYA_TRADITION_UNIFIED.md` is the canonical manuscript: 122 reader articles in seven shared themes. Wording is preserved as captured; editorial work is limited to headings, source labels, grouping, and duplicate notes.
- 154 posts are deferred: 121 image/media-only, 19 low-text/link-only, and 14 exact reposts. Media references appear on 197 posts.
- `FACT_CHECK.md` is a verification queue, not a rewrite or correction of source claims.
- `raw/templetherapy/` is a supplementary public archive for `@TempleTherapy`, never a replacement for the primary `mayaismagic` corpus. Its 158 selected Maya/Aztec records are represented either as separately labelled integrated articles or as retained source links on canonical duplicates; the former Appendix VIII is not part of the reader edition. Downloaded and locally restored source images remain separately in `media/templetherapy/`.

## Files

- `DEDUPLICATION_REPORT.md` — exact and near-duplicate audit and canonical-source relationships.
- `CONTENT_MAP.md` — canonical article ID policy and count.
- `classification/` — topical map and exact duplicate/series inventory.
- `corpus/cleaned-corpus.md` — transcription inventory of every text-bearing post.
- `manuscript/` — source-labelled draft, chapter map, coverage, glossary, and source notes.
- `FACT_CHECK.md` — claims that require external checking before publication.

Run `python3 verify_corpus.py` from this directory to validate the preserved archive and source index.
