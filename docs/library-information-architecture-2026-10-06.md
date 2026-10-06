# Holistic House Library & Materials — Information Architecture

Last reviewed: 2026-10-06

## Goal

Keep the public library easy to browse without turning the source archive into a hierarchy of folders.

The public model is:

```
Library
├─ All books & guides — one flat searchable catalog
├─ Remedy catalogue — working reference
└─ Wu Xing guide — working methodology
```

Alchemy of the Soul, Daoist tradition, and Maya tradition are **source-series labels**, not mandatory navigation levels.

## Current public corpus

- 23 published books / manuals in `data/library.js`
- 104 canonical remedy cards in the standalone remedy catalogue / Book 02 reference layer
- Wu Xing client methodology as a standalone working guide
- video materials remain a separate Library view

### Alchemy of the Soul

The sequence is intentionally readable as paired material:

1. Homeopathy — foundations and method → **Foundation**
2. Homeopathic remedies and profiles → **Reference**
3. Naturopathy: supplements/minerals/hormonal support → **Reference**
4. Naturopathy: oils/herbs/natural carriers → **Reference**
5. Bach essences: introduction and practice → **Foundation**
6. Bach essences: profiles → **Reference**
7. Brain work: theory/models/neurophysiology → **Theory**
8. Brain work: assessment/protocols → **Practice**
9. Services/workflow/support → **Project guide**

### Daoist tradition

The sequence is a learning path rather than separate folders:

- Introduction to Daoist alchemy → **Foundation**
- Tradition, temples and symbolic world → **Theory**
- Daoist magic foundations → **Foundation**
- Talismans and sacred signs → **Reference**
- Rituals and altars → **Practice**
- Yijing and divination → **Practice**
- Daoist healing foundations → **Foundation**
- Wu Xing: five elements and states → **Theory**
- DAO Wu Xing model and stages → **Theory**
- Practicum: assessment, cases and remedies → **Practice**

### Maya tradition

The four published volumes remain separate because they represent distinct reading purposes:

- Egregore and gods → **Theory**
- Calendar energies → **Reference**
- Exorcism / attunements / energies → **Practice**
- Maya mysteries → **Theory**

## Source-only files that should NOT become duplicate public books

The source archive intentionally contains editorial/build artifacts in addition to published books.

Keep these as source or editorial helpers unless their content becomes materially distinct from the published corpus:

- `source-books/book-1-alchemy-soul/alchemy_soul_guides.html` — source landing/index for the Alchemy guide set.
- `source-books/book-2-dao-books/dao_model_mini_guide.html` — compact DAO helper that overlaps the public Dao/Wu Xing volumes.
- `source-books/book-2-dao-books/dao_wuxing_steps.html` — visual step guide overlapping `dao-wuxing-model-steps`.
- `source-books/book-3-maya-tradition/outputs/Maya_Tradition_Methodology.html` — consolidated methodology/source edition overlapping the four public Maya volumes.
- `agents_config.html`, `book_build_guide.html`, QA reports, source maps, recovery inventories, raw exports and build manifests — editorial/engineering artifacts.

These files are valuable provenance. They should not be deleted, but publishing them as extra books would create duplicate navigation and competing “canonical” versions.

## How new material should be placed

### New Telegram/publication material

Prefer extending an existing manual when the new post belongs to an established theme.

Examples:

- a new homeopathy-method observation → Book 01;
- a full remedy profile → remedy catalogue + Book 02 reference;
- a comparison across remedies → supplementary material on all directly related remedy cards;
- a Wu Xing conceptual update → Wu Xing guide and, when useful, the relevant Dao/Wu Xing manual;
- a Maya calendar post → Maya calendar volume;
- a genuinely new coherent subject → only then consider a new manual.

### New manuals

Create a new manual only when the material has its own reading purpose and would otherwise make an existing manual confusing. Do not create a new book only because a new source file exists.

### Relationships

Use explicit related-material links instead of duplicating content:

- foundations ↔ reference;
- theory ↔ practice;
- Wu Xing books ↔ standalone Wu Xing guide;
- homeopathy books ↔ remedy catalogue.

## Public navigation rules

1. All books remain in one searchable catalog.
2. No Alchemy / Dao / Maya folder is required before opening a book.
3. Series is shown as metadata.
4. Material role is shown as a lightweight label: Foundation / Theory / Practice / Reference / Project guide.
5. A short reading path can recommend an entry sequence without hiding any other books.
6. Existing direct book URLs remain canonical and stable.
7. Old `?section=` links may continue to resolve, but they must not hide books.

## Source-of-truth rules

- `source-books/**` preserves source/editorial material.
- `data/library.js` defines published books.
- `data/library-structure.ts` defines reading roles, recommended path and relationships.
- `content/remedies/**` is the canonical public remedy-card layer.
- `data/remedy-source-inventory.csv` and related provenance files define remedy source status.
- Standalone working guides such as Wu Xing should link back to source material rather than duplicate an entire book.

## Health/editorial safety

Health-related source texts may be preserved as authorial educational/archive material, but public structure must not convert source observations into diagnoses, prescriptions, dosing instructions, medication changes, cure guarantees, or claims that homeopathy replaces standard or urgent care.
