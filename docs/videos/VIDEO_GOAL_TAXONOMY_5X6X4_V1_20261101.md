# Holistic House Video Studio — 5 × 6 × 4 narrative goal taxonomy

Date: 2026-11-01. Status: **catalog / data architecture only; not yet connected to video cards or published on LIVE**. Owner reference: supplied iPhone mock, canonical guest video editor route `/{ru,en,es}/holistic-support/mandala` (do not confuse with general Support, Meditation finder or a practitioner view).

## Purpose and hierarchy

**Life category → client topic / desired outcome → four distinct narrative scenarios → four symbolic storyboard beats → later licensed media binding and audio/montage.**

* Five life categories: Body, Work, Energy, Love, Stress. Stress is a distinct user navigation category; it maps internally to old video theme `health` until dedicated filming exists.
* Six focused topics per category = **30 topics**.
* Four separately named stories per topic = **120 scenarios**.
* Four ordered conceptual beats per story = **480 beats**. These are **not** 480 stock clips and do **not** imply 120 already playable films.
* Category/topic/scenario titles and all beat labels/visual motif descriptions are localized RU/EN/ES.
* An unbound scenario is *not exportable*. The existing Auto Video Director may still offer a separately and honestly marked fallback with current licensed four-MP4 presets; this must not be presented as an exact production of the unbound scenario.

## Taxonomy coverage and editorial map

| Public category | Six client topics | Old video renderer themes used by individual topics |
| --- | --- | --- |
| **Тело** / Body | Телесное расслабление; Сон и отдых; Свободное дыхание; Комфорт в теле; Забота о теле; Телесная уверенность | health, goals |
| **Дело** / Work | Опора в работе; Деньги и стабильность; Концентрация; Решительность; Новые возможности; Уверенное выступление | money, goals |
| **Энергия** / Energy | Вернуть силы; Утренняя энергия; Вдохновение; Внутренняя опора; Новый этап; Смысл и направление | energy, life, goals |
| **Любовь** / Love | Больше близости; Доверие; Открытое сердце; Личные границы; Любовь к себе; Гармоничное общение | relationships |
| **Стресс** / Stress | Меньше тревоги; Быстрое успокоение; После сложного дня; Отпустить напряжение; Перед важным событием; Ощущение безопасности | health |

Ten established discovery groups are retained as topic-level crosswalks: `business/{work,money}`, `relationships/connection`, `energy_health/{emotions,recovery,body}`, `personal_growth/{traits,support,meaning,goal}`. They are **not** new clinical assessments or new media sources. Prior facets (62 filter values) remain orthogonal preferences, not 62 categories. Goals such as «Обрести уверенность», «Больше близости», «Опора в работе», «Энергия и сила» may appear as shortcuts into the correct category/topic but never define a second incompatible taxonomy.

## Files and API

* `data/video-catalog/video-goal-taxonomy-{body,business,energy,love,stress}-v1.json`: one editorial file for each public category; each embeds 6 topic items and 4 stable scenario IDs with titles, distinct symbolic image sequences, narrative arc and explicit `sourceStatus: unbound`.
* `lib/mandala/video-goal-taxonomy.mjs`: canonical read-only registry and local matching. Exports `listVideoGoalCategories`, `listVideoGoalTopics`, `getVideoGoalTopic`, `listVideoGoalScenarios`, `buildVideoGoalScenarioPlan`, `resolveVideoGoalTopic`, `auditVideoGoalTaxonomy`. No fetch, no AI billing, no user message persistence.
* `tests/mandala-video-goal-taxonomy.test.mjs`: count, multilingual completeness, four unique arcs and motif sequences, existing renderer compatibility, explicit overrides, invalid cross-category choices, unknown request («еда») and no invented MP4 paths.

A scenario ID is stable: `{topicId}-s{1..4}`. Do not change the order/IDs of existing story objects after user drafts start storing scenario IDs; append new scenarios with a migration if changing the catalog later. Client input is ephemeral and never logged or transmitted by this registry. The best topic match does not constitute a mental health assessment.

Example:

```js
const topics=listVideoGoalTopics("stress","ru"); // 6 topic selectors
const stories=listVideoGoalScenarios("stress-anxiety","ru"); // 4 options
const plan=buildVideoGoalScenarioPlan({
  categoryId:"stress",topicId:"stress-anxiety",
  scenarioId:"stress-anxiety-s1",locale:"ru",
}); // 4 conceptual beats, canExport=false until media binding
```

## Editor integration (separate guarded step)

**Canonical owner:** `components/mandala-auto-video-director.tsx`, rendered by existing `components/mandala-free-video-studio.tsx` on `/{ru,en,es}/holistic-support/mandala`. Do not create a new mobile editor or render pipeline.

1. Top row: five compact category cards (one visible row on phone when possible, otherwise horizontally scrollable with accessible labels): Тело | Дело | Энергия | Любовь | Стресс.
2. Under category: six topic chips WITHOUT thumbnail photos; user may instead type a personal description. Topic suggestions must update with category. AI may classify free text but cannot silently override an explicit category/topic. Ambiguous text prompts one clarification; unknown text remains unclassified.
3. Four scenario cards show **different** editorial title, ordered four-beat outline and source availability. Selecting one updates shared canonical director state, without triggering render, XP charge or public API. If media not bound, the export CTA must not claim a film already exists.
4. Below scenario row, retain the single existing CTA: **«Подобрать слова поддержки, настроить аудиогид»**. It opens the current music/affirmations editor; do not create a duplicate microphone or audio form.
5. Keep all 6 current workspace tabs, verified video player, optional advanced editing, approved licensed source assets, existing `onApply` / `onCreate`, old deep links, RU/EN/ES and iPhone responsive behavior.

Current parallel UI work modifies the same file: PRs #2938 (mock parity), #2939 (iPhone decoder), #2913 (director chat). **Do not force rebase their branches or merge unreviewed overlapping edits.** Merge/consume this data-only catalog first, then wire the selectors into the canonical UI owner PR after source-preserving reconciliation. Other video features do not need to change.

### Screen reference specification (before UI changes)

Reference: owner-provided Russian iPhone mock; canonical guest video editor view, portrait approximately 390 CSS px. Preserve hero video, compact existing workspace tabs, 5 category chips as first selector, description with 6 text-only popular topics as second selector, 4 scenario cards as third selector, and one bottom green audio-guide CTA. New category chip adds one item relative to the four-goal mock: plan horizontal scroll or compressed row rather than making unreadably narrow 5 tiles. Compare same `/ru/holistic-support/mandala` view and auth state; run Chromium and WebKit at 320/354/375/390/430, screenshot overlay with cropped reference; user-provided image includes iPhone chrome and is not directly pixel comparable without aligned page-only crop. Until this happens, report **visual QA not verified**, not approved LIVE.

## Future licensed video and audio association — NOT implemented in this PR

Each story currently carries four independent **semantic visual motif IDs**, e.g. `["shore","stone","ocean","sunrise"]`. A later mapping table must attach exactly four verified media masters or a validated four-shot timeline:

```json
{
  "scenarioId": "stress-anxiety-s1",
  "shotBindings": [
    {"shot": 1, "assetId": "real-approved-asset-id", "inSeconds": 0, "outSeconds": 5}
  ],
  "mediaStatus": "needs_validation"
}
```

The example deliberately has one **illustrative** row and cannot be considered valid/renderable. Before marking a scenario `ready` require four non-repeated playable source assets, license and provenance, real media existence/codec/duration, user imagery exclusions, four-shot coverage of requested duration, approved voice/music rights, montage render QA and actual ffprobe/browser encoded video+audio checks. Do not reuse or download arbitrary YouTube or commercial music as a new source without the rights to do so. A `sourceStatus: unbound` record cannot be promoted just by selecting a poster.

## Test/release gates

Run locally: `node --test tests/mandala-video-goal-taxonomy.test.mjs`; `node --check lib/mandala/video-goal-taxonomy.mjs`. For any UI integration additionally run targeted Mandala tests, ESLint, TypeScript, Next build and actual Chromium/WebKit mobile flow. Production branch is `codex/public-book-library`; the default `codex/bootstrap-books` is different. Merge only after exact-head protected CI status, then separately verify Vercel READY and production alias/SHA. **Creating a source-controlled catalog/PR is not a LIVE deployment.**
