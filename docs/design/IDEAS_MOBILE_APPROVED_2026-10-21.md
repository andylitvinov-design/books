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


## Owner revision · 2026-10-23 — three fresh aphorisms on every Ideas opening

The initial marked educational preview now draws three **random, distinct** sayings from the existing 142-entry EN/RU/ES catalog on every new visit or reload, retaining source provenance and original language. The following visit excludes all three previous public catalog IDs. Store only those three public IDs in browser local storage (never the visitor question, contact, identity or topic); blocked storage still shows a valid random trio. Hydrate from the stable SSR sample and rotate on client mount. Keep topic-matched answers, Dao and offers unchanged. Test repeat visits in local isolated WebKit and Chromium at mobile widths, plus unit tests.


## Owner revision · 2026-10-23 — one scenic first screen + immediate test

Replace the separated banner and form with **one picture-backed Ideas hero**: the existing first-party pine artwork covers the entire hero (not just the title), while the real textarea, local .txt/.md attachment and privacy disclosure sit on top of the photo. Use a warm gradient to preserve legible text and focus outlines. Put two equally accessible 44px+ actions next to each other in that same photo hero: brown primary **Get guidance** (existing browser-only question → Dao) and ivory secondary **Take a free test**. The latter launches the real rights-cleared guest `hh-current-state` assessment directly via `/en/client?startTests=hh-current-state` (RU on `/ru/client`; ES routes to the existing EN runner until a Spanish guest client is implemented). Do not send visitor questions, create a new form, infer a lead or skip the test runner's normal session/consent guards. Retain the three Dao/Aphorisms/Personal modes and the quote→Dao→offers layout below. Test responsive 320/375/390/430px, 44px touch targets, no overflow, EN/RU/ES label coverage and real next-route E2E separately.


## Owner-approved follow-up · 2026-10-23 — brighter tree + stacked CTAs + contextual tests

This revision replaces the side-by-side CTA instruction above. Keep the scenic pine across the **entire** first-screen hero with visible green foliage and layered mountains, using very light edge gradients rather than an opaque whitening filter. Preserve editable question input over the photo and the existing local .txt/.md attachment. On mobile show two **full-width buttons in one column**: walnut **Get Taoist Insight**, then ivory/outlined **Explore yourself / Take a free test** (EN/RU/ES mirrors, 44px minimum targets).

**Behavior:** With empty input, the secondary action continues to launch the already-cleared free `hh-current-state` guest questionnaire. With any nonblank input, it opens a **small in-place choice of three real, guest-eligible tests** ranked from the existing local `matchIdeasTopic` five-topic classifier. Unknown wording gets transparently labeled generic starters, never a false personalised analysis. Each row launches an existing test with only its public key; `All matching tests` opens the existing explorer, passing only preapproved public focus categories. The visitor's actual words stay entirely in browser state, never in URL/API/CRM/analytics/storage. Keep existing Dao / Aphorisms / Personal choices and consent-gated offer pathways unchanged.

**QA gates:** focused Ideas guidance/DOM contract tests, real WebKit/Chromium 320–430px test-picker open/close, keyboard and focus, no horizontal overflow, direct guest test links and EN/RU/ES. Production requires GitHub PR/CI review plus Vercel READY, exact deployed descendant SHA and `holistichouse.vercel.app` alias; physical Safari test start and provider/CRM workflows remain independent checks.

## Owner revision · 2026-10-23 — sharp pine image and free personal coaching

The previous `ideas-pine-reference.webp` was only 4,004 bytes; stretching it to the full iPhone hero produced visible blur. Show the scene from the newly approved mockup as a dedicated, sharper first-party `ideas-pine-sharp.avif` (scenery only, no screenshot-baked controls). Tone down the old exaggerated saturation and wash overlays; preserve crisp text and accessible contrast.

The second full-width action is now a real direct link to the already-existing free **Personal Coaching Session**. EN owner-approved copy: **Explore yourself / Take a coaching free personal session**. RU/ES have localized text; Spanish private course entry currently uses EN until ES protected onboarding exists. It starts an authenticated self-guided coaching course, **not** a human appointment, booked call or CRM lead. Never include the private Ideas question in a URL, analytics event or course handoff.

Keep the previous local topic→3 public tests function accessible via a smaller separate **Or explore a free test** button immediately below the privacy note. With an empty question it launches the existing guest Current State test; with text it expands the original in-place list. No duplicate matching engine, forms, billing provider, analytics or backend changes.

QA: focused Ideas source tests, route and image checks, EN/RU/ES iPhone 320–430px browser behavior, TypeScript, lint, build; then verify production branch, SHA, READY and canonical domain. Real authenticated coaching persistence is a separate E2E gate.


## Owner revision · 2026-10-24 — Ideas & Coaching public first-step selector

- Rename the existing EN/RU/ES Ideas page and mobile navigation to **Ideas & Coaching / Идеи и коучинг / Ideas y coaching**; preserve its illustrated pine question, Taoist insight, sourced aphorisms, approved public tests, and consent-gated written enquiries.
- The first-screen question has two adjacent, minimum-44px primary choices in this exact visual and DOM order: **Get free coaching session** → public \`/{locale}/coaching\` model selector; **Get free Taoist insight** → existing in-browser I Ching flow. Neither action routes directly to \`/app/coaching\`.
- The public coaching page shows real **published and editorial-reviewed** GROW, TGROW, OSKAR, CLEAR, FUEL, WOOP, Solution-Focused, Appreciative Inquiry model/scheme cards directly from the current backend library; no duplicate static question bank or migrations. Query-based suggestions use the existing deterministic in-browser matcher, human-readable fit copy, optional topic/style/time filters, and allow a free manual selection.
- **Guest flow:** start and complete the selected scheme one question per mobile screen, including appropriate close-choice options and custom WOOP plan. Input and responses exist only in the current React tab, with user-invoked copy on completion. Do not create account, CRM contact, local/session storage, analytics event, SMS, external LLM call, or payment. Closing/reloading loses unsaved progress; do not misrepresent this as cabinet persistence. The protected private account player and encrypted sessions remain unchanged.
- **Personal coaching choice:** existing enquiry route at \`/{locale}/services#consultation\` with current verified service prices **€50 / 30 min** and **€100 / 60 min**. CTA is a request, not a booking or paid order; real delivery, payment and provider events need separate E2E proof.
- Backend: allow a server-only anonymous read transaction for published editorial coaching reference data; no new DB grants or Data API. Cache just the non-sensitive public catalog for 15 minutes. If unavailable, show a truthful temporary-unavailable state rather than inventing models.
- Release: focused Ideas/Coaching source contracts, full TypeScript/Next build, 320/375/390/430px EN/RU/ES navigation & tap verification; preview → merge only after checks → Vercel READY exact SHA. Authenticated save/reload, provider booking and live mobile Safari remain separately unverified unless actually tested.
