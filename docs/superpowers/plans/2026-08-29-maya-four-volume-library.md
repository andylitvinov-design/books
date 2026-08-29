# Maya Four-Volume Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the verified Maya/Aztec reader as four non-overlapping, illustrated source-backed volumes in DOCX, PDF, and the existing public library.

**Architecture:** Keep the raw archives and canonical article curation unchanged. Add an explicit four-volume editorial manifest to the existing Maya builder; it partitions the already curated articles and drives HTML, DOCX, PDF, public reader routes, catalog records, and cover assets. The former single-volume edition remains an archival output, but is no longer the public card.

**Tech Stack:** Python 3 with python-docx, HTML/CSS, existing Next.js static catalog, bundled document renderer, Vercel preview deployment.

---

### Task 1: Specify and verify the four editorial volumes

**Files:**
- Modify: `source-books/book-3-maya-tradition/test_build_maya_book.py`
- Modify: `source-books/book-3-maya-tradition/build_maya_book.py`

- [ ] **Step 1: Write the failing partition test**

```python
def test_four_volume_manifest_partitions_every_reader_article_once(self):
    volumes = BUILD.volume_articles(self.reader_articles)
    article_ids = [article["article_id"] for articles in volumes.values() for article in articles]
    self.assertEqual(set(article_ids), {article["article_id"] for article in self.reader_articles})
    self.assertEqual(len(article_ids), len(set(article_ids)))
    self.assertEqual(tuple(volumes), tuple(spec["id"] for spec in BUILD.VOLUMES))
```

- [ ] **Step 2: Run the new test and confirm it fails because the volume manifest is absent**

Run: `python3 -m unittest source-books/book-3-maya-tradition/test_build_maya_book.py -v`

Expected: FAIL with `AttributeError` for `volume_articles` or `VOLUMES`.

- [ ] **Step 3: Add the minimal volume manifest and partition helper**

```python
VOLUMES = (
    {"id": "maya-egregor-gods", "chapters": READER_CHAPTERS[:2]},
    {"id": "maya-calendar", "chapters": READER_CHAPTERS[6:]},
    {"id": "maya-exorcism", "chapters": READER_CHAPTERS[2:3]},
    {"id": "maya-mysteries", "chapters": READER_CHAPTERS[3:6]},
)

def volume_articles(articles):
    return {
        volume["id"]: [article for article in articles if reader_chapter(article) in volume["chapters"]]
        for volume in VOLUMES
    }
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `python3 -m unittest source-books/book-3-maya-tradition/test_build_maya_book.py -v`

Expected: PASS.

### Task 2: Generate four self-contained reading editions

**Files:**
- Modify: `source-books/book-3-maya-tradition/test_build_maya_book.py`
- Modify: `source-books/book-3-maya-tradition/build_maya_book.py`

- [ ] **Step 1: Write failing output and illustration assertions**

```python
def test_each_volume_has_a_reader_html_and_every_article_has_source_media(self):
    for spec in BUILD.VOLUMES:
        self.assertTrue(BUILD.volume_output_path(spec, "html").is_file())
        for article in BUILD.volume_articles(self.reader_articles)[spec["id"]]:
            self.assertIsNotNone(BUILD.reader_media_path(article, self.media))
```

- [ ] **Step 2: Run the test to confirm the volume output API is absent**

Run: `python3 -m unittest source-books/book-3-maya-tradition/test_build_maya_book.py -v`

Expected: FAIL with `AttributeError` for `volume_output_path`.

- [ ] **Step 3: Refactor the existing HTML/DOCX functions to accept one volume specification**

```python
def build_html(articles, media, description, volume):
    ...
    volume_output_path(volume, "html").write_text(document, encoding="utf-8")

def build_docx(articles, media, description, volume):
    ...
    document.save(volume_output_path(volume, "docx"))
```

Include a cover/title page, compact and expanded hyperlinked contents, right-aligned page number, running header, a new page for each article, upper-right source image, and source references. Build every volume from the manifest without changing raw or canonical source text.

- [ ] **Step 4: Run the focused tests and rebuild the HTML/DOCX editions**

Run: `python3 source-books/book-3-maya-tradition/build_maya_book.py && python3 -m unittest source-books/book-3-maya-tradition/test_build_maya_book.py -v`

Expected: all targeted tests PASS and four HTML/DOCX output pairs exist.

### Task 3: Integrate the four public reader cards and asset routes

**Files:**
- Modify: `build/test_unified_library.py`
- Modify: `build/build_unified_library.py`
- Modify: `build/publish_library_assets.py`
- Modify: `data/books.ts`
- Modify: `components/book-catalog.tsx`

- [ ] **Step 1: Write failing catalog and asset publication tests**

```python
def test_public_catalog_contains_each_maya_volume(self):
    ids = {book["id"] for book in BUILD.BOOKS}
    self.assertTrue({"maya-egregor-gods", "maya-calendar", "maya-exorcism", "maya-mysteries"} <= ids)
```

- [ ] **Step 2: Run the test and confirm it fails because the new records are not in the unified library**

Run: `python3 -m unittest build/test_unified_library.py -v`

Expected: FAIL with missing Maya volume ids.

- [ ] **Step 3: Add four reader records and safe public asset publication**

```python
MAYA_READERS = {"maya-egregor-gods": "Maya_Aztec_Egregor_Gods.html", ...}

def publish_maya_readers():
    for volume_id, filename in MAYA_READERS.items():
        publish_reader(volume_id, MAYA / "outputs" / filename)
```

Use four real local Telegram-media images as covers, map cards to `/library/<volume-id>/`, and keep category/search behavior inclusive of every `maya-` volume.

- [ ] **Step 4: Rebuild the catalog and run its focused tests**

Run: `python3 build/build_unified_library.py && python3 build/publish_library_assets.py && python3 -m unittest build/test_unified_library.py -v`

Expected: PASS; public HTML contains no local paths and every reader path is generated.

### Task 4: Render PDFs and perform production-equivalent validation

**Files:**
- Create: `source-books/book-3-maya-tradition/outputs/*.pdf`
- Modify: `source-books/book-3-maya-tradition/outputs/QA_REPORT.md`

- [ ] **Step 1: Mark the document authoring operation**

Run the required document-operation marker exactly once immediately before building DOCX artifacts.

- [ ] **Step 2: Render each generated DOCX to PDF and page PNGs sequentially**

Run: `render_docx.py <volume.docx> --output_dir <temporary-output> --emit_pdf`

Expected: A PDF and page images for each volume; inspect cover, expanded contents, one illustrated article, and final page at 100% zoom before deleting only the temporary PNG directory.

- [ ] **Step 3: Run full verification**

Run: `python3 -m unittest source-books/book-3-maya-tradition/test_build_maya_book.py source-books/book-3-maya-tradition/test_verify_corpus.py build/test_unified_library.py && npm run lint && npm run build`

Expected: all Python tests pass; lint has no errors; production build succeeds.

- [ ] **Step 4: Create a Vercel preview for the feature branch**

Run: `vercel deploy . -y`

Expected: Vercel preview URL for all four public readers. Do not merge or promote to production automatically.
