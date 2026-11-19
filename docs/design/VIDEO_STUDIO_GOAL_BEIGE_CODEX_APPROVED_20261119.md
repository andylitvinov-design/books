# Video Studio / Goal — beige Codex-style mobile layout, approved 19 Nov 2026

Reference: owner's approved iPhone screenshot in the current conversation, with iOS chrome included. Do not publish that screenshot or compare entire phone chrome to page pixels. Browser content-only view should be aligned at matching viewport/DPR.

## Page identity and ownership
- Canonical public editor: `/{en,ru,es}/holistic-support/mandala` (no query), Goal workspace, guest and signed-in. Photo mode `?mode=photo`, practitioner dashboard, CRM, Ideas, Montage and Ready are **not** the reference screen.
- Source: `andylitvinov-design/books`, protected branch `codex/public-book-library`; Vercel team/project `super10/codex-public-book-library`; canonical domain https://holistichouse.vercel.app. Repository default `codex/bootstrap-books` is different.
- One existing `MandalaFreeVideoStudio` + `MandalaAutoVideoDirector` portal and original Canvas/MP4 encoder. Original Goal page and 4x4x4 taxonomy stay authoritative; no second renderer or duplicate page.

## Approved mobile layout
| Order | Area | Approximate width/height | Behavior |
|---|---|---|---|
| 1 | Header/brand/credits | existing compact row | Preserve iHelp, photo, credits, profile |
| 2 | Six tabs | 6 compact buttons/2-line labels | Goal / Ideas / Montage / PRO / Ready / Therapy |
| 3 | Hero | 212 CSS px on 320–430 phone | Existing video Play; warm scenic image, dark-green legible text |
| 4 | Prompt composer | almost full available width; multiline 132px textarea + 44px toolbar | Photo +, underlined Free/Pro and Guide me/Just make it dropdown links, Mic opens real Audio, green arrow |
| 5 | Shortcuts | three equal pill chips | Typed request stays local until explicit AI consent; real wish state |
| 6 | Quick Start | two columns × two rows | Life/Work switch changes captions while retaining exact four canonical category handlers and images |
| 7 | CTA | one full-width emerald Create Video | Original protected express action and credit/media/privacy checks; Goal → Ideas stays available when valid |
| 8 | Dock | existing seven-entry dock with raised AI/Chat | No duplicate navigation |

## Behavior
- Free defaults to current on-device mode. Choosing Pro opens the existing PRO workspace, not an immediate purchase or unsupported model call.
- Guide me (default) matches locally, asks to review the canonical category/subcategory/topic and only advances when the quiz is complete. Just make it initiates only the existing guarded Express flow from a deliberate submit.
- Enter adds a linebreak; Ctrl/Command + Enter submits. Empty requests cannot trigger the green submit arrow.
- Plus uses the existing local private photo picker; microphone opens the existing audio editor (no unsolicited microphone capture).
- Preserve For myself / For others toggle and the separate gift, audio, portrait-video flow, name-last personalization, rights/consent, RLS, credits and verified footage gate.
- EN/RU/ES display and actual mobile tap/focus behavior must be verified; do not claim treatment efficacy or a generated MP4 from a static mock.

## QA and release criteria (not yet evidenced)
1. Existing Node source tests + targeted UI regressions, TS noEmit, lint and Next build on the exact PR HEAD.
2. Actual Chromium and WebKit screenshot capture of same guest page at 320/354/390/430 CSS px, plus tablet/desktop. Check card crop, textarea/keyboard menu, no horizontal overflow, bottom dock and viewport safe area, compare screenshot/overlay/diff.
3. Real route: initial Goal → quick category → subcategory → topic → Ideas → Montage → Ready; Free/Pro, Guide/Express, input, plus, mic, Life/Work and For others; signed-in iPhone playback/save remains a separate provider/device acceptance.
4. Protected PR exact-HEAD checks/CI, `hh-merge-check`, native safe squash merge. **Only existing hourly Vercel production workflow** publishes. Confirm READY + canonical alias + deployed exact SHA and actual mobile behavior. Merge ≠ LIVE.

Visual status: NOT RUN. Functional E2E status: NOT RUN. Live status: NOT DEPLOYED.
