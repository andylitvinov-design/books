# iPhone Safari — global six-tab dock bottom anchoring · 2026-11-03

## Correct view identity and owner screenshots
- Reference 1: `/ru/practice`, signed-in practitioner showcase dashboard, active **Мастер**.
- Reference 2: `/ru/app/messages?section=ai` (AI tab on Messenger), authenticated/personal UI, active **ИИ/Чат**.
- Both supplied iOS browser screenshots: **706 × 1536 physical pixels**, viewport CSS width / DPR unknown. Do not compare their pixels against each other as they represent different page states.
- Same shared `UnifiedMobileDock` with six destinations (MyTube, Video, AI/Chat, Practice, Master, Profile); keep its look, labels, accessibility and navigation unchanged.

## Observed defect
The pill-shaped fixed bottom bar floats substantially above the bottom visible web area in both captures, even though page contents continue below it. Native Safari browser toolbar is separate from the website and is not a place where the page can draw a dock.

## Root cause and minimum repair
- The shared dock CSS used the `max()` of a JS `VisualViewport` offset **and** a `100vh - 100dvh` offset. These are two competing estimates of the *same* iOS toolbar occlusion; on modern Safari `position:fixed` may already track the visual viewport, so both can over-raise it.
- Begin with `bottom:0`; compare the dock's actual `getBoundingClientRect().bottom` with `visualViewport.offsetTop + visualViewport.height`; compensate only a **measured** mismatch and reconcile prior inset, no cumulative drift.
- Reserve exactly the measured dock height plus actual applied offset and 22px breathing room, not another viewport/safe-area guess. The dock's height already includes `env(safe-area-inset-bottom)`.
- Hide the global dock while editing with a mobile keyboard; restore after blur and viewport changes.

## QA/acceptance
- WebKit and Chromium: widths **320, 390, 430 CSS px**, EN/RU/ES; `/mytube`, Video, Messenger, Practice and Master, exactly one visible global dock.
- At rest, after scroll to end, return, browser viewport shrink/expand, tab change: difference `|dockRect.bottom - visualViewportBottom| <= 3px`; horizontal overflow <=2px; six targets each >=44px tall.
- Verify CTA/text fields are reachable (no content behind the dock); keyboard editing hides the dock without losing entered content.
- Existing `scripts/verify-unified-six-dock-browser.mjs` covers synthetic WebKit/Chromium routes and a viewport height regression. It does **not** emulate the real expanding Safari browser chrome. Physical iPhone owner test and authenticated end-to-end remain separate release gates.
- No API, DB, RLS, payments, providers, copy or privacy settings change.
