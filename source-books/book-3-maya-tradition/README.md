# Maya Tradition source corpus

This directory is an editorial working corpus built from the primary `raw/posts.jsonl` / `SOURCE_INDEX.csv` archive and a clearly separated public supplemental archive. The raw archives and indexes were not edited. No external historical text, translations, or fact corrections were introduced.

## Provenance and editorial rule

- Channel: `mayaismagic`; preserved source URLs use `https://t.me/mayaismagic/<post_id>`.
- Archive extent: 236 posts, IDs 2–246; numeric gaps: 10, 54, 70, 71, 88, 92, 96, 236, 237.
- The manuscript reproduces 82 substantive, non-duplicate source texts. Wording is preserved as captured; editorial work is limited to headings, source labels, grouping, and duplicate notes.
- 154 posts are deferred: 121 image/media-only, 19 low-text/link-only, and 14 exact reposts. Media references appear on 197 posts.
- `FACT_CHECK.md` is a verification queue, not a rewrite or correction of source claims.
- `raw/templetherapy/` is a supplementary public search archive for `@TempleTherapy`, never a replacement for the primary `mayaismagic` corpus. Its 29 deduplicated substantive Maya/Aztec posts appear verbatim (HTML entities normalized only) in Appendix VIII; no link-only or media-only record was included. Downloaded public image responses remain separately in `media/templetherapy/`.

## Files

- `CONTENT_MAP.md` — disposition of all 236 archived posts.
- `classification/` — topical map and exact duplicate/series inventory.
- `corpus/cleaned-corpus.md` — transcription inventory of every text-bearing post.
- `manuscript/` — source-labelled draft, chapter map, coverage, glossary, and source notes.
- `FACT_CHECK.md` — claims that require external checking before publication.

Run `python3 verify_corpus.py` from this directory to validate the preserved archive and source index.
