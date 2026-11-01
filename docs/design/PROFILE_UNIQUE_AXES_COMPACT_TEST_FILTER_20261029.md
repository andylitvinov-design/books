# Public profile wizard — unique axes and compact test kind filter (29 October 2026)

## Source of truth and precise screenshot mapping

- Product: Holistic House; existing route: `/{en,ru,es}/personality-profiles`; role: **anonymous guest**; wizard stages: **Scales** (step 2) and **Tests** (step 4).
- Owner references: two 29 October 2026 iPhone screenshots at 3:16 (Scales) and 3:17 (Tests). iPhone UI chrome and Gmail notification are not part of the website. Bottom site navigation must not be recreated.
- Canonical existing modules: `components/personality-profiles-builder.tsx`, its CSS module, and `lib/profile/profile-scale-selection.js`. No new route, form, score, database, CRM, paywall or video.
- Source-backed research axes and real questionnaire `testKind` stay unchanged; only *presentation labels and selectable discovery filter* change.

## Design and copy decisions

| Wellbeing main scale | English | Russian | Spanish |
| --- | --- | --- | --- |
| Emotions | Emotions & stress · Mood / regulation | Эмоции и стресс · Настроение / регуляция | Emociones y estrés · Ánimo / regulación |
| Recovery | Energy & rest · Recovery / sleep | Энергия и отдых · Восстановление / сон | Energía y descanso · Recuperación / sueño |
| Body | Body sensations · Awareness / comfort | Телесные ощущения · Контакт с телом / самочувствие | Sensaciones corporales · Conciencia / bienestar |

The source-defined body sub-axis still maps to energy when an original scored dimension supports it, but its public **label** is **Body comfort / Телесный комфорт / Confort corporal**; we do not mislabel, renormalize or merge any underlying score.

On Tests, show the **three primary recommendations first**, then a single compact type selector for *other tests*: **Все / Шкалы / Профессиональные** (EN: All / Scales / Professional; ES: Todas / Escalas / Profesionales). The prior two large mode cards and per-mode counts are removed. Type selector is a 44px-min-height segmented pill row, restrained sage/forest palette, 320–430px responsive, keyboard focus ring, with `aria-pressed`. Any text explanatory hint is small below.

There is **one selected list**, max 12 tests shared across monitoring and professional. Switching filter does not remove, hide from the plan, replace or deselect any selected test. The recommended top-three remain stable; the second five and expandable optional list respond to the filter. "All" lists only permitted *monitoring* and *professional*, not hobby/reference-only, opt-in, inaccessible, restricted or paid tests. Existing selected-topic facet matching, source version, percentage interpretation, Google save, protected cabinet and guest start flow stay intact.

## Geometry and acceptance

- Match screenshot **route and step**, not the notification/banner overlay.
- Mobile widths **320, 354, 390, 430 CSS px** (minimum implementation browser run covers 320/390/430), keyboard focus and touch. No horizontal scrolling, clipping, or oversized buttons.
- Real browser sequence: open public guest route → Begin → choose Wellbeing → see three distinct labels → select all three main groups → choose real source-backed topics → view recommended 3 → test **All / Scales / Professional**, preserve top-three and all checked keys while switching → remain on same protected-privacy flow.
- Automated source and handler tests: `tests/profile-unique-axes-compact-test-filter.test.mjs`, `tests/profile-construct-axes.test.mjs`, existing builder/topic/unit suites. Real Chromium and WebKit guest flow script: `scripts/verify-profile-unique-axes-filter-browser.mjs`. Workflow: `.github/workflows/hh-profile-unique-axes-filter.yml`.
- Privacy: guest discovery only; no personal answers, PHI, real providers or external sends in screenshots. Scorer values and wording are not translated/interpreted clinically.

## Release evidence gate

Only call the change **live** after exact PR head passes relevant tests + lint + typecheck + build + real browser QA, merge into verified production branch `codex/public-book-library`, Vercel READY deployment source SHA equals the merged SHA, alias `holistichouse.vercel.app` resolves to that deployment, and public page interactions are rechecked. If CI or deployment remains unavailable, report the precise blocker and leave a safe open PR; do not invent screenshots or launch a paid API.
