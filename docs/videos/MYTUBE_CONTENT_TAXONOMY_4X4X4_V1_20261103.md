# MyTube content taxonomy v1 — 4 × 4 × 4

Date: 2026-11-03  
Status: editorial master catalogue added; existing editor integration and media binding are separate release steps.

## Decision

The new MyTube content tree is exactly:

- 4 public categories;
- 4 subcategories per category;
- 4 topics per subcategory;
- 4 story concepts per topic;
- 64 topic records and 256 scenario records total.

The canonical data is `data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json`. The read-only access layer is `lib/mandala/mytube-content-taxonomy.mjs`.

## Categories

| Category | Four subcategories |
| --- | --- |
| Цели и деньги / Goals & Money | Цели и дисциплина; Предназначение и перемены; Деньги и изобилие; Бизнес и карьера |
| Любовь и уверенность / Love & Confidence | Поиск любви; Отношения; Одиночество и расставание; Самооценка и уверенность |
| Стресс и тревога / Stress & Anxiety | Стресс и выгорание; Тревога; Паника и страхи; Травмы и настроение |
| Энергия и здоровье / Energy & Wellbeing | Тело и осознанность; Энергия и силы; Усталость и восстановление; Сон и отдых |

Every topic has localized RU/EN/ES names, search-intent phrases and four scenario concepts. Scenario titles and IDs are globally unique. Search phrases are metadata for discovery/SEO; they do not create duplicate topic branches.

## Scenario rules

The four scenario archetypes are:
1. Journey — an achievable next step;
2. Shelter — a supportive space and sense of choice;
3. Reframe — a kinder or alternative perspective;
4. Integration — a small optional real-life action.

Each scenario has a localized creative brief. These are editorial story concepts, **not** finished scripts, licensed footage, or export-ready videos. `sourceStatus` remains `editorial_only_unbound`; the API always returns `canExport: false`. Media binding must independently prove real playable assets, rights/provenance, duration, soundtrack/voice rights and export QA.

## Backwards compatibility

The existing canonical `lib/mandala/video-goal-taxonomy.mjs` tree is the older 5 × 6 × 4 catalogue (Body, Work, Energy, Love, Stress), already used by Mandala phrase/video workflows. It is intentionally **not overwritten** and its stable IDs are untouched. The new catalogue is versioned separately and carries legacy category crosswalks for later controlled UI migration.

Do not connect the new data to UI by replacing old IDs. A subsequent editor PR must reconcile current category shortcuts, preserve user drafts/deep links, mobile layout, RU/EN/ES, and the distinction between editorial scenarios and playable media.

## Safety and editorial rules

- Mental-health search topics are content-navigation labels, not diagnoses or validated screeners.
- Do not claim videos treat or cure depression, PTSD, panic disorder, chronic fatigue or other medical conditions.
- Trauma-oriented stories must be choice-led and grounding-focused; no forced exposure, coercive recall or mandatory breath holds.
- Search-intent terms are not clinical endorsements and must be reviewed per target country/language before public SEO pages are indexed.

## Verification

`tests/mytube-content-taxonomy.test.mjs` checks exact 4 × 4 × 4 counts, localized metadata, stable unique IDs/titles, exact search resolution and safe non-export status.

This PR adds a separate editorial data layer and read-only API. It does not publish new public pages, change current MyTube UI, generate media, or deploy LIVE.
