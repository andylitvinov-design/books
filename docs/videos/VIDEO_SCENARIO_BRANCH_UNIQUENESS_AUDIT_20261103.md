# Holistic House · category-by-category storyboard uniqueness audit

Date: 2026-11-03 · Repository: `andylitvinov-design/books` · Target: `codex/public-book-library`.

## What is verified from source

Canonical taxonomy: `lib/mandala/video-goal-taxonomy.mjs` and five `data/video-catalog/video-goal-taxonomy-*-v1.json` files.

| Root category | Six specific topics | Four scenario variants per topic | Four visual beats per scenario |
| --- | ---: | ---: | ---: |
| Body (`body`) | 6 | 24 | 96 |
| Work & money (`business`) | 6 | 24 | 96 |
| Energy (`energy`) | 6 | 24 | 96 |
| Love (`love`) | 6 | 24 | 96 |
| Stress (`stress`) | 6 | 24 | 96 |
| **Total** | **30** | **120** | **480** |

**Uniqueness after this change:** 120 distinct scenario IDs, 120 different ordered four-motif visual storyboards, and 120 unique scenario titles in each of RU, EN and ES. All 30 category/topic branches contain exactly four stories. The four narrative arcs per topic are distinct. This PR adds global regression guards, not just checks within one topic.

**Corrected editorial ambiguities:** two Russian titles were shared by different stories and were renamed without changing immutable IDs, selection order, media tags or phrase/audio bindings:
- `body-release-s3` → «Волна телесного покоя» (distinct from `stress-release-s3` «Мягкая волна»);
- `work-decision-s4` → «Дверь решения» (distinct from `energy-fresh-start-s2` «Открытая дверь»).

## Important distinction: unique concepts vs playable films

These 120 records are **editorial storyboards**: title, one of four common narrative arcs, and four distinct *semantic visual-motif sequences*. They are **not** 120 finished voice-ready scripts, nor 120 verified four-clip video masters. Their media status is explicitly `unbound` / `canExport:false`. A separate creative brief with topic-specific camera language, scene transitions, spoken text, rhythm and psychological safety must be approved before claiming fully scripted films.

Source-backed candidate work in [#3082](https://github.com/andylitvinov-design/books/pull/3082) measured 120 planned storyboards, 22 potential four-distinct-shot arrangements and 98 with incomplete coverage, with **zero executable** scenarios; its editorial/license review and protected deployment remain pending. The owner review interface is in dependent [#3103](https://github.com/andylitvinov-design/books/pull/3103). Do not silently mark those candidates rendered or LIVE.

## Cross-workspace integration gap

The `MandalaPhraseCatalog` already uses all five canonical categories / 30 topics / 120 scenario IDs for goal→topic→story→idea→phrases, with localized RU/EN/ES copy. Meanwhile, `MandalaAutoVideoDirector` in ongoing [#3242](https://github.com/andylitvinov-design/books/pull/3242) maintains its own compact goal shortcuts. The current branch has five shortcut buttons but permutes the same six `AUTO_VIDEO_GOALS` subchoices under every button. **Do not equate these shortcut groups with the canonical 30 distinct topics.**

For full user-facing coverage: reconcile the existing #3242 Director to canonical `VIDEO_GOAL_CATEGORIES` / `VIDEO_GOAL_TOPICS` selectors, preserve its single-row mobile layout and up-to-two topic selections, distinguish unbound editorial storyboards from physically licensed old-film presets, and keep export gated by real proof. Perform on the existing PR owner branch (do not fork another competing editor).

## Acceptance for any future scenario generation

1. Four distinct scenarios for **every** category/topic path; stable IDs and meaningful RU/EN/ES names.
2. Global title and ordered-storyboard uniqueness across all categories, not only among siblings.
3. A scenario-specific concept, four visually coherent beats, distinct camera/editing direction and a narrated script if a spoken meditative video is promised.
4. Match requested goal and user exclusions; no medical efficacy, forced breathwork or trauma exposure promises.
5. Four media assets with verifiable physical existence, independent visual and license review, verified soundtrack/voice and actual encoded export before `canExport` is true.
6. Mandala Core/Specialist CI and mobile 320–430px regression, protected merge, Vercel exact-SHA READY and user-visible smoke. A PR does not mean LIVE.
