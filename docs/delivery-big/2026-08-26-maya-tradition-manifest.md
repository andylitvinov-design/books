# Maya Tradition Corpus — Task Manifest

## Scope contract

**Included:** recovery, immutable raw archive, traceable index, topic-led classification, duplicate/series analysis, source-backed manuscript, fact-check notes, DOCX/PDF/HTML outputs, catalogue integration, branch, and pull request.

**Excluded:** Telegram account configuration changes, destructive source cleanup, publishing or sending content to Telegram, and treating external research as author source material.

**Risk gates:** raw source is append-only; every manuscript segment must cite a source post; fact-check findings annotate rather than silently rewrite author text; no claim of complete recovery without export-level evidence.

| Task ID | Requirement | Source | Verification |
|---|---|---|---|
| MAYA-01 | Find local and public source material safely | User request | Recovery log and source inventory |
| MAYA-02 | Preserve each recovered post unchanged | User request | `raw/` records include required fields |
| MAYA-03 | Create a traceable source index | User request | Index fields and post URLs checked |
| MAYA-04 | Classify factual themes without inventing gaps | User request | Classification and coverage report |
| MAYA-05 | Detect duplicates and post series | User request | Duplicate and series fields populated |
| MAYA-06 | Produce source-backed Maya methodology | User request | Citations from manuscript to source index |
| MAYA-07 | Mark knowledge levels and fact-check historic claims | User request | `FACT_CHECK.md` and annotations |
| MAYA-08 | Produce DOCX, PDF, and HTML using agreed layout | User request | Rendered DOCX/PDF and browser inspection |
| MAYA-09 | Integrate the book into this library | User request | `SOURCE_MAP.md`, `data/books.json`, build/catalogue checks |
| MAYA-10 | Commit, push, and open a PR | User request | Branch and PR URL |

## Status

`MAYA-01` is in progress. All later work depends on a source recovery result.
