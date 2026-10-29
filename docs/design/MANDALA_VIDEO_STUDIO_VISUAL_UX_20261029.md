# Mandala video editor — screenshot-led mobile hierarchy (29 Oct 2026)

## Reference and target

- Reference: owner's 29 Oct in-chat iPhone screenshot of the existing Holistic House video-mandala editor; **not** a separate design/route.
- Owner revisions: mode switch **Video boost / Video therapy**, four primary themes (Energy / Money / Love / Goals & meaning), small photo checkbox + link **Add a photo of me / my goal**, video preview with in-frame format/length/motion filters, scene gallery, then **Audio track**, **Hypnosis & affirmations**.
- Reference URL bar: `holistichouse.vercel.app` (path not visible). Editor matched by the actual `Видео-мандала` / `Пульс океана` / `Вариант ролика` labels and owning source.
- Exact implementation route: `/{en,ru,es}/holistic-support/mandala`; guest, public/local editor, no account/API step required.
- Component: `components/mandala-free-video-studio.tsx`; parent `mandala-meditation-client.tsx`; CSS `components/mandala-video-mobile.module.css`. Single existing editor.
- Target branch: **`codex/public-book-library`** (Vercel `super10/codex-public-book-library`), **not** default `codex/bootstrap-books`. Source branch created from `f7c7db71e348af40b65b761b4b4da2fb6ff9c499`. Post-merge SHA/READY and live alias must be verified separately.
- Screenshot includes iPhone/Safari browser UI and bottom app navigation. Compare **page content only**, not browser chrome. Exact CSS viewport/DPR unknown; acceptance targets 320/354/390/430px Chromium and WebKit plus desktop.
- **Page identity gate:** PASS for *source-level matching* to the existing public editor; production browser identity/visual overlay NOT YET VERIFIED.
- Preserve: in-browser portrait/goal image and Blob privacy, 10 MB image limits, source-verified local footage, WebKit MediaRecorder, audio preview/player and sound track export, audio/photo rights checkboxes, existing eight-session guided-image course and gated private profile access, EN/RU/ES, existing persistent bottom dock. No new CRM, DB, payment, auth, AI provider or paid render.

## Navigation mapping

| Entry / action | Expected result | Implementation and status |
| --- | --- | --- |
| Public guest visit `/ru/holistic-support/mandala` | Existing editor; not Cabinet or practice dashboard | Existing route retained, browser QA pending |
| Mode `Видео-подкачка` | Single-clip video editor, normal template engine | Default selected, no extra render |
| Mode `Видео-терапия` | Same editor + existing 8-session imagery planner | Opt-in mode mounts `MandalaGuidedCourse`; no automatic treatment/recording |
| Theme Money/Love/Energy/Goals | Change corresponding genuine clip and scene gallery | Existing `selectCategory` preserved, does not erase optional photo choice |
| Checkbox + photo link | Off = background-only; On = use local photo, choose image if missing | New compact control; photo rights required before render; no server upload |
| Video preview + 3 selects | Format 9:16/1:1/16:9, 10/20/30/60 seconds, slow/dynamic | Same state that controls actual canvas and output |
| Gallery, sound preset/upload, affirmation blocks | Genuine local media and playback; optional text overlay | Reused production modules and media recorder |
| Additional settings | Legacy style/scene selector, uncommon categories, quality, brightness, captions, check-in | Moved into native disclosures below the key flow |

## Mobile visual block map

| Order | Block | Intent, approximate geometry for 390px | Selector/action |
| --- | --- | --- | --- |
| 1 | Mode switch | Two equal cells, mint active, 46px target, cream parent | `[data-video-mode-switch]` — new |
| 2 | Four topics | Four cards in a row with compact icons, two-line labels | `[data-video-category-rail]` — moved |
| 3 | Photo checkbox/link | Single 44px-height compact row; no two heavy choice buttons | `[data-video-photo-enabled]`, `[data-video-photo-picker]` — new |
| 4 | Preview | Dark teal scenic preview; in-frame 3 compact filter selects above video art and free create CTA | `[data-video-hero-filters]` — new; real canvas preserved |
| 5 | Video choices | Existing horizontal scene tiles, real MP4/Canvas thumbnails | `#video-templates` — retained |
| 6 | More styles | Collapsed; visual preset style/motion/length and Life/Wellbeing | `[data-video-advanced-filters]` — moved |
| 7 | Audio track | Separate cream panel for existing sound presets, user upload, play and volume | `[data-video-audio-section]` — moved |
| 8 | Hypnosis & affirmations | Separate warm card; phrases opt-in, no evidence-based subliminal/clinical claims; wish and scene suggestions | `[data-video-hypnosis-section]` — moved |
| 9 | Video therapy sessions | Only for chosen therapy mode; eight-session preview, explicit source consent and no auto-render | `#guided-video-series` — conditional |
| 10 | Extended setup | Collapsed format duplicates, brightness/caption, check-in tools; original access preserved | `[data-video-extra-settings]`, `[data-video-support-more]` |
| 11 | Export + download | Existing explicit create, progress/cancel, local play/share/download and privacy text | `[data-mandala-video-generate]`, `[data-mandala-video-download]` |
| 12 | Bottom navigation | Preserve existing five-tab dock and safe-area handling | `HolisticSupportMandalaDock` — unchanged |

## Behavior & privacy checks

- **No photo**: default unchecked; background movie can be generated with no portrait and no photo permissions.
- **Photo enabled**: native Photos/Files upload remains local, consent is **separate** from inclusion, and generating from either CTA requires rights confirmation; cancelling the picker does not silently render an unselected portrait.
- **Photo disabled after upload**: retain local photo state for later use but exclude from generated frames and scene thumbnails.
- **Changing theme**: preserve the photo checkbox choice; don't silently re-enable a portrait.
- **Audio**: built-in preset vs user file, native iOS playback and real track in MediaRecorder; explicit rights required for uploaded files, never fall back to misleading silent output.
- **Therapy mode**: optional local planning based on chosen goals, guarded test-score import in protected account only after explicit consent. No diagnosis, trauma exposure, therapy guarantee, autonomous practitioner or paid generation.
- **Affirmations**: opt-in; experimental brief-frame setting already discloses lack of evidence; do not claim subliminal efficacy.
- **Existing service and return navigation**: preserved; no duplicate page or second app shell.

## Browser evidence / release gates

| Test | Status |
| --- | --- |
| Static structural contract tests updated for new hierarchy and mode | Code written; CI pending |
| Playwright Chromium & WebKit, RU 320/390/430, EN 390, ES 390 | Browser script updated; run pending |
| Functional guest photo privacy, local video MP4/WebM, iOS sound and generated audio track | Existing E2E assertions retained/updated; run pending |
| Real iPhone Safari 320–430 and visual image comparison/overlay | **Not performed**; no authenticated iPhone session/hosted Playwright image capture yet |
| Preview deploy or source/browser screenshots | **Not verified**; no claim of pixel match |
| GitHub CI lint/typecheck/build | Pending actual workflow results |
| Vercel production READY + exact merged SHA + `https://holistichouse.vercel.app/ru/holistic-support/mandala` | Pending safe merge / release |

Do not mark this complete from source edits, static tests, HTTP 200 or preview alone.

**Visual status:** IN REVIEW / browser overlay not verified  
**Functional E2E status:** NOT VERIFIED  
**Live status:** NOT DEPLOYED from this PR at creation

Owner follow-up: after automated release gates, compare an actual iPhone Safari screenshot of the same public video editor against the intended hierarchy; confirm sound and local video saving from a real device.
