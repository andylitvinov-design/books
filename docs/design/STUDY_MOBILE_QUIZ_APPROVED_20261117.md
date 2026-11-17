# Holistic House · Study mobile quiz + original Academy · approved 17 November 2026

## Reference and identity
- Owner's screenshot A (current): guest mobile `/{locale}/holistic-support/mobile` shows the separate `HolisticStudyAcademy` first screen, three schools, and eight real learning options.
- Owner's screenshot B and subsequently approved combined image: same guest Study route, same seven-tab dock, **five-step green photographic quiz first**, personalized recommendations immediately below, then the existing Academy program cards.
- Page identity: PASS. Route/default view `pump`; no Account/editor or new app.
- Canonical URL: `/{ru,en,es}/holistic-support/mobile` (no query). Explicit `?view=meditation` remains a separate functioning legacy experience.
- Production source: `codex/public-book-library`, base snapshot `ed31fc5e97817681b90003ee28c6f67360878dfa`. UI owners: `HolisticStudyAcademy`, `HolisticStudyJourney`, their scoped CSS modules.
- Guest phone viewport 320/354/390/430 CSS px; iOS status bar is **not** part of the implemented page. Reference imagery is the existing approved sunrise portrait.
- No client records or private test scores in this public wizard; answers remain only client-side component state.

## Visual block map
| Order | Approved mobile content | Implementation |
| --- | --- | --- |
| 1 | Green photographic hero, large title 'Ваш путь обучения', subtitle, 1–5 progress circles | Existing `HolisticStudyJourney` promoted to the default page, primary heading `h1` |
| 2 | Compact cream question surface; one question, 2×2 selectable answers, green selected state, one primary Next | Existing wizard, seeded editable Stress choice to match reference; hydration gate |
| 3 | 'Рекомендовано для вас', four tabs, source-backed recommendations | Existing local ranking seeded with OPORA + eight real Academy program URLs |
| 4 | Three actual school sections, eight source-backed programs, real links | Unmodified `HolisticStudyAcademy` group/course markup |
| 5 | Single fixed seven-item bottom dock | Existing global `UnifiedMobileDock`, untouched |
| 6 | Language navigation and enrollment caveat | Original Academy language links and disclaimer kept below courses on mobile |
| Desktop | Existing photo hero and three school shortcuts | Remains unchanged at >=760px |

## Behavior contract
- First answer preselected Stress as shown in approved reference; still freely editable. Energy prioritizes Reiki, other goals re-rank **only** authentic offerings; no invented courses/prices.
- Next remains disabled until client hydration and choice; one of five questions shown at once. Finish and restart are local only. Course links navigate to actual routes; no automatic enrollment, lead creation, payment or initiation.
- Published URLs and the real three-school groups remain intact, with all eight cards and source-language exceptions.
- Legacy meditation/reiki/talisman browser scripts remain targeted at `?view=meditation`; no API/auth/CSP code changed.

## Acceptance / evidence
- Focused in-place Chromium/WebKit browser test for 320/390/430 EN/RU/ES: quiz position, steps and answer state, ranking, five-step completion/reset, all three schools/eight courses, no duplicate dock, no horizontal overflow, legacy transitions.
- Require exact-HEAD Core/TypeScript/Next, Public Services, Specialist and `hh-merge-check` without bypass.
- Screenshots/overlays: owner reference contains iOS chrome and illustrative offerings; a pixel-perfect diff against a real mobile browser is not meaningful without aligned crop and matching content. Independently report rendered geometry and real click tests; do not claim pixel identity from CSS or source.
- Merge and Production READY are distinct. Only the existing budget-guarded hourly publisher may release; verify alias SHA containing PR and served RU/EN/ES response after deploy.
