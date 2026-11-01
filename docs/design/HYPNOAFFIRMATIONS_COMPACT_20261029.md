# Holistic House — compact Hypnoaffirmations overview (29 October 2026)

## Reference and identity gate

- Approved source: 29 Oct ChatGPT cream/emerald one-page mobile concept, 941×1672 bitmap, no user health or test results. The mock is an in-conversation image, not a live screenshot.
- Canonical editor: /{en,ru,es}/holistic-support/mandala#video-hypnosis; guest/public single video editor, not a practitioner dashboard, not a new page.
- Identity gate: PASS for route family and editor role; browser pixel match/overlay pending.
- Production target: Vercel super10/codex-public-book-library, branch codex/public-book-library (NOT GitHub default). Initial source SHA a3e428199e15dd3e529f251b0e43e0c54ad91583.
- React owner: existing mandala-free-video-studio.tsx; existing original MandalaVideoAffirmations survives as full edit pane; MandalaHypnoCompact is a presentation wrapper, not a second video engine/player/route.

## Mobile block map

| Order | Region | Owner-approved intent | Source / behavior |
| --- | --- | --- | --- |
| 1 | Header and opt-in | Cream/green Hypnoaffirmations; enable in film | Existing video-hypnosis heading and synchronized enabled checkbox |
| 2 | My request | Two-column NOW → GOAL with small Edit | data-hypno-request; theme, 3 selectable issues, 3 selectable goals; optional local-only free-text details |
| 3 | My phrases | Three small modes: smart/from request, ready-by-theme, from eligible tests; selected chips | data-hypno-phrases; reuse existing auth-scoped profile opt-in and editing of preset/custom lines |
| 4 | Show in video | Three compact frequency/size/position tiles and Edit | data-hypno-display; real 8/5/3s, 3 sizes and 3 positions from shared Canvas renderer |
| 5 | Video design | Compact film poster rail, real theme/scene options and original audio link | data-hypno-design; actual moneyScenes/otherVideoScenes/getThemedRealFilm; no stock/imaginary clips |
| 6 | Scenic preview | Poster from selected local film and single Preview video action | data-hypno-preview; existing openAffirmationPreview, does not upload/render/download automatically |
| 7 | Existing video controls | Original Create+Download, permission checks, safe-area dock | Existing mandala studio; preserved rather than copied or replaced |

## Behavior, safety and privacy

- Request/goal editorial shortlist: hypnoRequestProblems + affirmationGoalCatalog, no diagnosis, treatment promise or new API. Selected theme/problem and goal shape real five-option local shortlist. Guest can continue without tests.
- Optional user-entered problem/goal notes live in React memory only. They are not automatically interpreted by a remote AI or uploaded. Do not falsely claim semantic interpretation of free text.
- From my tests: separate user click opens the existing secure MandalaPersonalAffirmations button. This only invokes verified same-owner profile endpoint upon deliberate click; no automatic import, raw psychometric scores, URL, CRM or pixels.
- Existing manual presets and up-to-five personal phrases unchanged. Enabling is explicit. Experimental 25th frame remains disclosed and unproven.
- Text position and scale affect the same paintVideoAffirmations used in the preview AND encoded MediaRecorder export. Existing scene selection and uploaded audio rights remain in force.
- No paid generations, duplicate storage, new media-provider calls, checkout, health CRM telemetry, or private client photo publication.
- EN/RU/ES, mobile 320/354/390/430, touch >=44px for principal actions; no horizontal whole-page overflow.

## Screenshot / review evidence

Reference image: 941x1672 bitmap generated in current owner conversation, not a native browser/DPR geometry. Do not stretch and falsely claim pixel matching. CI captures synthetic guest Hypno panel on actual Chromium and WebKit at RU 320/390/430, EN/ES 390; screenshots retained as short-lived GitHub workflow artifacts. Review same-route cropped rendered screenshot and overlay before calling visual fidelity verified.

Screen-level contract:
- Edit request opens editable theme/problem/goal options; optional input is not compulsory.
- Smart selection recomputes local phrases; manual restores themed suggestions; tests require authenticated consent.
- Frequency/size/position controls really update the shared renderer.
- Scene choice updates original video; Preview scrolls to existing film hero and starts player; Create+Download stays independent.
- E2E signed-in profile, physical iPhone Safari and pixel overlay of the same crop are separate real release checks.

## Release state
Feature-branch implementation, NOT production sign-off. Require targeted unit, ESLint, TypeScript, Next build, Chromium/WebKit browser and real encoded video checks; safe merge to codex/public-book-library; then independently verify Vercel READY, exact SHA, canonical alias and meaningful live interactions. Concurrent video PRs #2518 and #2520 must be reconciled, not overwritten.
