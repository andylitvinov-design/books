# Ideas — approved mobile direction (2026-10-21)

Status: owner-approved reference for the public EN/RU/ES **Ideas** hub. Source: the final mobile mockup approved in the ChatGPT Homeo Video Site conversation on 2026-10-21. Implement as **real components**, never as a screenshot of UI. The original full-size screenshot remains in the design conversation; this repository preserves the implementation specification and the cropped owner-approved scenic artwork at `public/images/holistic-house/ideas-pine-reference.webp`.

## Visual system
- Quiet, warm **ivory** `#fbf9f4` + **off-white** `#fffefd` surfaces; not an all-brown or cyan page.
- Main text `#2f2b27`, secondary text `#645f59`.
- Evergreen/petrol selection `#154f54`, selected card surface `#e2f1ed` and readable focus outline `#178289`.
- Warm walnut primary action `#79553c` / walnut gradient; fine sand borders `#e3d7c8`.
- Elegant Georgia headings and legible UI sans-serif. Scene is a tiny **local WebP** cropped and feathered from the owner-approved image, no third-party image, tracking, remote font, new storage or new provider cost.

## Responsive specification
- Mobile-first, **320–430px**. Compact scenic hero, short lead, one textarea, visible **Get guidance / Задать вопрос / Pedir orientación** submit button.
- Three accessible choices **remain in one horizontal row**, with 2-line labels and at least 44px touch targets. No tiny inline links replacing the buttons.
- The answer panel starts immediately below. Before the first question: clearly labeled editorial example (not a pretend personal answer). After submitting: genuine existing I Ching random draw, exactly three original topic aphorisms, or links to the three existing free entry points.
- Results retain clear typographic hierarchy, a compact hexagram glyph, readable 14–16px descriptions and touch-friendly actions.
- EN/RU/ES retain live catalog, original Library, public news/video feed, canonical paths and existing free intake forms.
- No question text sent to APIs, CRMs, analytics, search parameters or local storage. No false classical quote attributions, medical claims, paywall, new messaging or payment changes.

## Release and verification
Run targeted Ideas tests, typecheck, lint, Next.js build and relevant public feed tests; verify Vercel production READY with exact deployed SHA. Real iPhone/WebKit tap-through of each mode, the free form handoff and CRM submission remain separate E2E gates; a deployment or a preview is not evidence of those real actions.

## Approved visual fidelity pass · 2026-10-21
- Source reference: owner-provided `E4E3488E-C8A9-4249-A99F-62B89C815226.jpeg` mockup. Reuse **its own landscape with the pine tree** as feathered first-party WebP; this is the image, not a recreation of controls as static pixels.
- Compact question field now includes an actual working browser-only **.txt/.md attachment** chooser (16KB limit and 500-character in-memory cap), not an inert fake paperclip. No files are transmitted or retained.
- Daoist result features the real random 1–64 I Ching draw and original essence, with expandable **Meaning / Key message / Practical step**. A sample first card is visibly labelled as an **example** and shows its detailed interpretation.
- Directly below: three topic-matched real aphorism catalog items, sourced with verified links for original paraphrases, or clearly labelled Holistic House editorials. Never use the mockup's unverified verbatim historical or contemporary attribution as a real quote.
- Existing Aphorisms mode preserves its **next three** pagination; Personal guidance preserves the real free-intake links; EN/RU/ES remain mirrored. Answer language follows the question's basic text language detection.
- Real UI is touch-usable down to 320px. Buttons fit one row; Dao details are initially collapsed after a real question to keep the first meaningful paragraph visible immediately.

## Reconciliation with latest production
- Reused the already approved PR #1483 rather than duplicating components.
- Kept both consent-free handoff promo cards from PR #1499 in the expanded Dao result, after the short reflective paragraph; a click is not a CRM lead.
- Preserved the 14 provenance-checked historic proverbs from PR #1498, including linked source/original language under new three-column visual tiles.
- New compact 320px horizontal swipe affordance for sourced aphorism tiles; no tiny text or horizontal page overflow.


## Owner revision · 2026-10-22 — vertical sequence and inline enquiries

This section supersedes the 2026-10-21 three-column quote treatment and embedded Dao promo layout above.

1. Immediately after the question and existing topic-mode selector, present **three full-width horizontal aphorism rows**, one below another (not three narrow columns and not a horizontal swipe carousel), with readable attribution. Render this order both for the visibly marked educational preview and for a real submitted question.
2. Next present the **Daoist block**, retaining random 1–64 selection after the question, collapsed long reading, optional full interpretation, and honest example labeling before a question.
3. After Dao display **two existing photographic promotional cards**. The card's primary button ("Заказать" for the personal interpretation; "Получить в подарок" for the free written review) opens a **small inline contact/consent form immediately below that card**. Only one inline form stays expanded at a time. The detailed first-party service routes remain accessible beneath each expanded form.
4. Reuse the existing CompactLeadCapture and /api/service-enquiries → encrypted public enquiry + CRM lead transaction; never create another lead endpoint. The private question text is **not** included in the enquiry. Form submission requires explicit visitor contact, opt-in and a confirmed saved:true reference receipt; clicking a button is not a booking, delivery or payment.
5. Keep EN/RU/ES equivalents, 320/375/390/430px responsive rows, legible typography, keyboard/focus, screen-reader expanded states, and all existing Books/Library/latest-publications sections.

**Acceptance gates:** tests/ideas-mobile-ui.test.mjs and scripts/verify-ideas-mobile-browser.mjs cover vertical ordering, page overflow and form disclosure; focused lint/typecheck/build/Chromium/WebKit must pass before asserting production. Server/CRM end-to-end delivery can only be claimed after a consented real test through the live provider; do not submit a visitor enquiry as a synthetic test or close the funnel issue based on UI checks alone.
