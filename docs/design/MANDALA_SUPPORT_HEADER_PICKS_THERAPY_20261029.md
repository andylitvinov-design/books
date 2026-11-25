# Holistic House · Video editor support header, Picks of the Day & contextual therapy

Date: 29 October 2026 · owner iPhone comparison (three supplied screenshots + follow-ups).

## Identity and source of truth
- **Target** `/ru/holistic-support/mandala` (same `/en`, `/es` route); public guest, video editor, ordinary video selected by default.
- **Reference** third owner screenshot: visible 3-column Support header ("Оцени себя" 4 sliders / avatar and Tests / meditation, session, talisman, Reiki), green selection controls and native single Support dock. First/second screenshots show the regression: panel collapsed into the bottom settings, so the page starts at video-mode segmented toggle.
- **Important:** reference includes the video catalogue, not a protected practitioner dashboard. Do not overlay one view on another or invent dashboard state.
- **Canonical components** `MandalaFreeVideoStudio` and `HolisticSupportMandalaDock`. **No second player / renderer / navigation / store**.

## Screen order and measurable mobile landmarks
1. Existing site shell. Narrow **navy** free-diagnostic promo `[data-video-diagnostic-banner]`, ~48 CSS px vs owner's earlier ~96px; original free review route and maroon CTA (44px target).
2. `[data-video-daily-picks]`: one compact horizontal rail with four **existing routes**: My Test (allowlisted Test Explorer focus based only on chosen theme, never a score), Meditation, Free Diagnostic and Study Program. Scrollable 320–430px, safe low-height label. No false completion badges.
3. **Visible** `[data-video-support-layout]`: same three cards as owner reference and prior working component, with four real local scores, avatar, tests, current focus, recommendation and helpful actions. No `details` collapsed wrapper.
4. In the existing right tools card, formerly `Видео-мандала` is renamed **`Видео-терапия`**, EN `Video therapy`, ES `Videoterapia`. One `[data-video-therapy-toggle]` button, min 44px tap area, **neutral when ordinary video is active**, forest-green gradient **only** if `aria-pressed=true`. Clicking toggles between ordinary local cinematic video and the existing eight-session guided-imagery planner, preserving one renderer and no autoplay.
5. Four existing topics (energy, money, love, goals/meaning), then two independently controlled photo/goal and affirmation opt-ins (two compact 44px controls per card), then real scenic 16:9 video with one Play.
6. Guided eight-session content appears immediately after hero only when therapy is active, and existing settings, audios, local export, opt-in and dock remain untouched.

## Flows and privacy
- Test `/client/tests?focus=...` uses only the existing allowlisted `body/clarity/relationships/meaning/health` editorial filter. No raw score, self-rating, health answers, photo, client ID or private data in URL or analytics.
- Meditation links to existing `/holistic-support/mobile?view=meditation`; diagnostic to existing `/services/free-situation-review`; courses to `/courses` redirecting to Academy.
- Photo remains opt-in and local until explicit protected Save; no third-party render; no auto-provider playback or paid credit use.
- A toggle is not a therapy outcome, booking, conversion, file export or verified clinical benefit.

## QA and delivery gates
- Source contract in `tests/mandala-mobile-video-design.test.mjs`: 48px promo, Picks, visible header, one therapy button, correct order and color only when selected; no old `data-video-mode-switch`.
- Existing `scripts/verify-holistic-mandala-browser.mjs`: Chromium + WebKit 320/390/430 EN/RU/ES, real DOM bounding boxes, 4 recommendation links, click through to therapy and back, 4 controls >=44px, no duplicate Support dock or horizontal overflow. Original local media audio and downloadable video tests remain, not mocks.
- Scoped lint, TypeScript and Next build; exact-HEAD GitHub CI before production merge. Then Vercel READY *exact merged SHA*, canonical domain `https://holistichouse.vercel.app` and interaction verification. Independent physical iPhone Safari photo/sound/export remains separate.
- Visual overlays must compare the same route, locale, viewport and view mode; the screenshot phone chrome is excluded. If browser screenshots are inaccessible, **do not claim pixel-perfect parity**.

Status: code candidate on `fix/mandala-picks-header-compact-20261029` (not accepted until CI and live checks).
