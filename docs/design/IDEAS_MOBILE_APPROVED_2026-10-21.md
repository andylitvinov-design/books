# Ideas — approved mobile direction (2026-10-21)

Status: owner-approved reference for the public EN/RU/ES **Ideas** hub. Source: the final mobile mockup approved in the ChatGPT Homeo Video Site conversation on 2026-10-21. Implement as **real components**, never as a screenshot of UI. The original full-size screenshot remains in the design conversation; this repository preserves the implementation specification and the lightweight scenic hero artwork at `public/images/holistic-house/ideas-zen-landscape.svg`.

## Visual system
- Quiet, warm **ivory** `#fbf9f4` + **off-white** `#fffefd` surfaces; not an all-brown or cyan page.
- Main text `#2f2b27`, secondary text `#645f59`.
- Evergreen/petrol selection `#154f54`, selected card surface `#e2f1ed` and readable focus outline `#178289`.
- Warm walnut primary action `#79553c` / walnut gradient; fine sand borders `#e3d7c8`.
- Elegant Georgia headings and legible UI sans-serif. Scene is a **local SVG**, no third-party image, tracking, remote font, new storage or new provider cost.

## Responsive specification
- Mobile-first, **320–430px**. Compact scenic hero, short lead, one textarea, visible **Get guidance / Задать вопрос / Pedir orientación** submit button.
- Three accessible choices **remain in one horizontal row**, with 2-line labels and at least 44px touch targets. No tiny inline links replacing the buttons.
- The answer panel starts immediately below. Before the first question: clearly labeled editorial example (not a pretend personal answer). After submitting: genuine existing I Ching random draw, exactly three original topic aphorisms, or links to the three existing free entry points.
- Results retain clear typographic hierarchy, a compact hexagram glyph, readable 14–16px descriptions and touch-friendly actions.
- EN/RU/ES retain live catalog, original Library, public news/video feed, canonical paths and existing free intake forms.
- No question text sent to APIs, CRMs, analytics, search parameters or local storage. No false classical quote attributions, medical claims, paywall, new messaging or payment changes.

## Release and verification
Run targeted Ideas tests, typecheck, lint, Next.js build and relevant public feed tests; verify Vercel production READY with exact deployed SHA. Real iPhone/WebKit tap-through of each mode, the free form handoff and CRM submission remain separate E2E gates; a deployment or a preview is not evidence of those real actions.
