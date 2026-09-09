# Maya Tradition / Maya Magic — Source-Backed Book Design

## Purpose

Recover the user-authored public Telegram corpus from `https://t.me/mayaismagic`, preserve it without alteration, and turn only the recovered material into a traceable first edition of a Maya Tradition / Maya Magic methodology.

## Source-first data flow

`recovery inventory → raw archive → source index → classification → duplicate/series map → fact-check notes → manuscript → DOCX/PDF/HTML`

The raw archive is the authority. The manuscript may edit typos, combine a source series, add headings, and remove repeated text, but each substantive segment links back to one or more indexed Telegram post IDs. External historical sources are used only for fact-check status; they never fill missing author material.

## Corpus layout

`source-books/book-3-maya-tradition/`

- `raw/`: one lossless record per recovered post and media reference manifest.
- `SOURCE_INDEX.csv` and `SOURCE_INDEX.md`: post metadata, themes, knowledge levels, series, duplicates, and chapter routing.
- `classification/`: topic map, series map, duplicate decisions, and recovery inventory.
- `cleaned-corpus/`: minimally normalized text, still post-addressable.
- `manuscript/`: traceable Markdown source, chapter map, glossary, source notes, and coverage report.
- `FACT_CHECK.md`: claim-specific status—confirmed, broadly correct, disputed, author interpretation, or unsupported/source needed.
- `outputs/`: the final DOCX, PDF, and self-contained HTML reading edition.

## Book structure

Chapter order is inferred from recovered material, rather than imposed. The anticipated headings—cosmology, sacred geography, time/calendars, gods and archetypes, death/rebirth, temples/initiation, ritual practices, symbols, sacred sites, Maya magic, and archetypal/therapeutic interpretation—will only appear where source posts support them. Thin themes remain indexed and are reported as incomplete rather than expanded with generated material.

Each chapter separates the knowledge level used in a block:

1. Historically established information
2. Archaeological or academic interpretation
3. Traditional mythology
4. Modern reconstruction
5. Contemporary Maya practice
6. Author interpretation
7. Archetypal or therapeutic model
8. Hypothesis or speculative reconstruction

## Reading-layout contract

The visual language follows the repository's existing article books: quiet warm paper palette, readable sans-serif text, article cards, post metadata, and image-led entries. Each separate article starts on a new page in DOCX/PDF and starts a clearly separated page/section in HTML.

For an article with a primary image, the image is placed in the **upper-right corner**, with text flowing beside/below it. On narrow screens it moves above the text at full width. Captions, post ID, date, and source URL remain visible; later gallery images follow the article body. The final DOCX is rendered to PNG pages and inspected before delivery; PDF is generated from the verified document.

## Failure handling

If no complete export is found, the recovered public history is labelled partial unless post-ID continuity and a source endpoint prove otherwise. Any inaccessible, missing, deleted, or media-only posts are recorded in the coverage report. The result will not claim full archival completeness without evidence.

## Acceptance criteria

- Raw records retain channel, ID, URL, date, original text, media, caption, and known series links.
- Source index contains all user-required fields and manuscript citations resolve to index records.
- Every chapter has only corpus-supported material; fact-check is separate from author voice.
- DOCX and PDF visually place one article per page and primary image upper-right.
- HTML catalogue and repository maps list `mayaismagic` as the primary author source.
- A PR reports recovery completeness, coverage, gaps, fact checks, and open questions.
