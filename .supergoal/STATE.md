# Supergoal state

**Status:** PREVIEW_READY_PR_OPEN
**Goal:** Bilingual Homeopathy implementation for Issue #3.
**Branch:** `codex/issue-3-library-integration`
**Base:** `codex/public-book-library`

## Decisions

- The user’s detailed implementation request is the approval to execute this roadmap inline.
- Structured Markdown is the canonical published remedy content; the runtime catalog is derived from its frontmatter.
- Only 38 inventory rows marked `confirmed` receive pages. The grouped heading and duplicate rows remain out of routing.
- Existing English source is absent for all 38 rows; every English body records that it is a translation of the paired Russian source file.
- Educational presentation excludes dose, potency, regimen, and diagnostic-selection instructions.

## Failure log

- Phase-plan structural check initially lacked mandatory-command and evidence sections; corrected before implementation.
- Content validator initially compared raw HTML against decoded Markdown; corrected to compare normalized source text.
- Content generator initially emitted trailing whitespace for empty metadata; corrected and regenerated all pairs.

## Local evidence

- `validate:remedy-inventory`: confirmed=38, duplicates=8, grouped=1, EN missing source=38.
- `validate:remedy-content`: RU=38, EN=38, pairs=38, source references=38.
- `test:unit`: 29 passing tests.
- `lint` and `build`: passing; build statically generated 76 remedy routes and retained 23 book routes.
- Local HTTP verifier: 4 localized indexes, 76 remedy routes, 23 book routes, sitemap, robots, and 404 all passed.
- Preview deployment: `https://codex-public-book-library-2nox5uf9l-super10.vercel.app` (`dpl_FkV85DZR3knwGVnX2osYQktayojj`, target `preview`, Ready).
- Pull request: `https://github.com/andylitvinov-design/books/pull/4`, base `codex/public-book-library`.
- No production promotion, merge, or production deployment was performed.
