# Maya Tradition Corpus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover the `mayaismagic` corpus and publish a traceable first edition in Markdown, HTML, DOCX, and PDF.

**Architecture:** Immutable JSONL post records are the source of truth. Indexes, editorial outputs, and generated reading editions retain post IDs and URLs, while external research only annotates fact-check status.

**Tech Stack:** Python standard library, `python-docx`, LibreOffice rendering, repository HTML/CSS, Next.js catalogue data.

---

### Task 1: Recover and inventory sources

**Files:**
- Create: `source-books/book-3-maya-tradition/classification/RECOVERY_INVENTORY.md`
- Create: `source-books/book-3-maya-tradition/classification/recovery-inventory.json`

- [ ] Search approved Mac locations for Maya/Telegram exports and safely inspect the public channel. Record path or URL, type, coverage, post-ID evidence, `usable_as_primary_source`, and observation time. Do not alter Telegram settings or session state.
- [ ] Verify each JSON inventory record has `location`, `usable_as_primary_source`, and `checked_at` with `rg -n 'location|usable_as_primary_source|checked_at' source-books/book-3-maya-tradition/classification/recovery-inventory.json`.
- [ ] Commit with `git add source-books/book-3-maya-tradition/classification && git commit -m "docs: inventory Maya source recovery"`.

### Task 2: Archive raw posts and index them

**Files:**
- Create: `source-books/book-3-maya-tradition/raw/posts.jsonl`
- Create: `source-books/book-3-maya-tradition/raw/media-manifest.json`
- Create: `source-books/book-3-maya-tradition/SOURCE_INDEX.csv`
- Create: `source-books/book-3-maya-tradition/SOURCE_INDEX.md`
- Create: `source-books/book-3-maya-tradition/verify_corpus.py`

- [ ] Create a failing `verify_corpus.py` that requires each record to contain `channel`, `post_id`, `url`, `date`, `raw_text`, `media_references`, `media_caption`, `previous_post_id`, and `next_post_id`.
- [ ] Populate one unmodified JSON object per recovered post. Index all user-requested dimensions with CSV columns `post_id,date,url,title_first_line,topic,subtopic,deity_archetype,place,ritual_practice,initiation_stage,cosmology,calendar_time,historical_material,mythology,author_interpretation,therapeutic_archetypal_interpretation,knowledge_level,duplicate_of,series_id,included_in_chapter`.
- [ ] Run `python3 source-books/book-3-maya-tradition/verify_corpus.py` and require `raw archive and source index: PASS`; commit with message `feat: archive and index Maya Telegram corpus`.

### Task 3: Classify and edit without adding material

**Files:**
- Create: `source-books/book-3-maya-tradition/classification/TOPIC_MAP.md`
- Create: `source-books/book-3-maya-tradition/classification/SERIES_AND_DUPLICATES.md`
- Create: `source-books/book-3-maya-tradition/cleaned-corpus/posts.md`
- Create: `source-books/book-3-maya-tradition/manuscript/CHAPTER_MAP.md`
- Create: `source-books/book-3-maya-tradition/manuscript/COVERAGE_REPORT.md`

- [ ] Derive topics solely from indexed text; list requested but absent topics as unrecovered.
- [ ] Detect exact duplicates, reposts, revisions, and series; retain all raw content and cite both versions where a cleaned article combines unique details.
- [ ] Map each chapter to source IDs, knowledge levels, editorial action, and coverage status. Report post/date range, ID gaps, recovery confidence, unique/duplicate/series counts, included/deferred materials, thin topics, and likely missing materials.
- [ ] Commit with message `docs: classify Maya corpus and map chapters`.

### Task 4: Produce source-backed manuscript and fact check

**Files:**
- Create: `source-books/book-3-maya-tradition/manuscript/MAYA_TRADITION.md`
- Create: `source-books/book-3-maya-tradition/manuscript/GLOSSARY.md`
- Create: `source-books/book-3-maya-tradition/manuscript/SOURCE_NOTES.md`
- Create: `source-books/book-3-maya-tradition/FACT_CHECK.md`

- [ ] Assemble chapters only when covered by posts. Begin each article with citation IDs; preserve wording except typo/format correction; label the eight knowledge levels explicitly.
- [ ] Put only source-present terms in the glossary. Make every entry in source notes resolve to an indexed URL.
- [ ] For questionable historical claims, record source post, paraphrased claim, status (`confirmed`, `broadly correct`, `disputed`, `author interpretation`, `unsupported / source needed`), and authoritative citation. Do not silently edit author prose.
- [ ] Extend `verify_corpus.py` to fail on cited but nonexistent post IDs, run it, and commit with message `feat: assemble traceable Maya methodology manuscript`.

### Task 5: Generate and render the reading editions

**Files:**
- Create: `source-books/book-3-maya-tradition/build_maya_book.py`
- Create: `source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.html`
- Create: `source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.docx`
- Create: `source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.pdf`

- [ ] Generate a page break before each article. Use a right-floating primary image at article upper-right; on screens below 720px place it above text. Include captions, dates, post IDs, and URLs.
- [ ] Build DOCX from the same manuscript; start each article on a new page and place the primary image in the right-side upper cell. Generate PDF from the rendered DOCX.
- [ ] Run `render_docx.py source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.docx --output_dir /tmp/maya-render --emit_pdf`; inspect every PNG and repair clipping, orphan pages, and image placement before committing `feat: generate Maya methodology reading editions`.

### Task 6: Integrate and publish reviewable work

**Files:**
- Modify: `SOURCE_MAP.md`
- Modify: `data/books.json`
- Modify: `data/books.ts`
- Modify: `build/build_unified_library.py`

- [ ] Register `https://t.me/mayaismagic` as primary author source and the raw archive as local authority.
- [ ] Add `maya-tradition-methodology` to the catalogue with its HTML reading edition and coverage link.
- [ ] Run `npm run lint && npm run build && python3 build/build_unified_library.py`; repair targeted failures at most four times.
- [ ] Commit, push, and open a PR whose body contains SOURCE RECOVERY, CORPUS STRUCTURE, BOOK STRUCTURE, FACT CHECK, COVERAGE, MISSING MATERIAL, and OPEN QUESTIONS.
