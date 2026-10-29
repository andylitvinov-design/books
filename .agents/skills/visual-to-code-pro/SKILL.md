---
name: visual-to-code-pro
description: Rebuild or update an existing Holistic House page from an owner-approved screenshot, mockup, or Figma export. Requires exact page/component mapping, measurable visual decomposition, real browser screenshots and overlays, iPhone Safari geometry, preserved auth/data flows, and verified release.
---

# Visual-to-Code Pro — Holistic House

Use this skill whenever a request includes a website screenshot, photograph of a screen, reference image, mockup, or Figma export and asks to create, redesign, match, improve or publish a page. This is a **working UI implementation skill**, not a request to replace the UI with a generated picture.


## Critical gate — identify the right screen BEFORE matching pixels

A screenshot is a **page state**, not just a skin. Record the exact canonical route, query, role, guest/signed-in state, selected tab, and whether the screen is a dashboard, editor, detail page, dialog or flow step. Compare these invariants **before** measuring the screenshot: \`reference route + state + view\` must match \`actual route + state + view\`. If they differ, **STOP pixel matching and fix routing/OAuth/automatic navigation first**. Never copy a dashboard over a legitimate working editor or mislabel the editor as a failed dashboard screenshot.

**Real owner example (28 Oct 2026):** the approved RU **Кабинет практика** is the existing \`/ru/practice\` \`PracticeShowcase\` dashboard with identity, six creation tiles, hero, offer rail and five-tab dock. The reported second screenshot shows the distinct protected **Мои услуги** three-step editor, normally reached via \`/ru/app/practice?panel=services&create=1&starter=session\`. Different route, function and image dimensions: do **not** calculate pixel fidelity between the two. Existing issue #55 and corrective PR #2498 address the Google-return / automatic-editor navigation; inspect and reconcile them rather than duplicating the fix. The editor still needs the same palette, navigation and typography, but retains its real form and save action.

For an existing **live** source page, use read-only browser DOM and computed styles (box rectangles, CSS variables, fonts, background-image URLs, image object-position) alongside screenshots. A screenshot alone loses precise DOM and navigation facts. Use the approved website itself as the source of truth; Figma is optional, not a prerequisite. See [browser tool choices](references/browser-tools.md).

## 0. Identify the actual page and source of truth

1. Identify the approved **reference** and the **current/broken screen**; when several images are supplied, label each and never reverse their roles. Record route(s), locale, guest/client/practitioner state, viewport content width and DPR when available.
2. Inspect existing components, CSS, assets, tests, the issue's latest comments, PRs and relevant AGENTS.md. Verify production branch, READY Vercel deployment and source SHA. The repository default branch codex/bootstrap-books is **not** automatically production; codex/public-book-library has historically served production.
3. Find the smallest canonical existing component owning the UI. **Do not** create a duplicate demo route, static screenshot pretending to be a page, second shell, CRM, API or separate application.
4. Identify iOS Safari bars, scrolling, keyboard, crop, zoom, time-sensitive or personal data. Compare **page content** against page content rather than phone/browser chrome.

## 1. Read the picture as a measurable layout

Fill in references/visual-spec-template.md **before** implementation. Decompose the picture from top to bottom: global chrome, header, profile, hero, CTAs, cards, progress, bottom navigation, overlays and footer. Estimate x/y, width/height, gaps, typography, line-height, border/radius, background, shadow, icon sizes, object-fit/image crop, and sticky positioning. Distinguish actual copy and user flows from appearance.

Map every visible region to an existing React component/CSS selector; label **keep**, **move**, **resize**, **restyle**, **remove** or **missing**. Note unintended banners, duplicate navigation, excessive padding, giant controls and hidden buttons. Prefer approved site assets and tokens. Do not invent real names, client metrics, prices, course claims or photo licenses.

Prioritize visual corrections in this order:
1. **Page structure:** section order, content density, major proportions, and removing unrelated chrome.
2. **Real content/interaction:** buttons, routes, state, meaningful labels, accessibility and privacy.
3. **Visual detail:** imagery and crop, typography, spacing, color, borders and shadows.
4. **Responsive states:** no crowding/clipping when EN/RU/ES strings vary.

## 2. Preserve behavior and privacy

Write the current flow map: visible action → handler → API → auth/RLS/DB/CRM (if applicable) → success/error/navigation. Test guest, client and practitioner states that are relevant. Keep per-request CSP nonce/dynamic pages, OAuth continuation, upload/save flows, private media, course progress, service IDs and opt-in. A click is not a saved file, sent message, reservation or completed payment. **Never** turn an active button into a fake static control just to match the image.

Make the smallest targeted edits in the real page/component and module CSS. Do not remove a protected capability simply because it is outside a cropped screenshot. Preserve EN/RU/ES parity.

## 3. Implement with mobile-first measurements

Match the approved hierarchy; use existing design tokens and optimized assets. Test CSS widths **320, 354, 390 and 430 px**, plus 768 and 1440 where the page is relevant. Account for iOS safe areas, keyboard, bottom tabs, focus states, touch controls, scrollbar width, content overflow and image object positioning. Use isolated CSS rules rather than unpredictable global overrides.

## 4. Browser screenshot → overlay → fix (required)

1. Capture a **rendered** page at the same width, DPR, browser content crop, locale, stable font and page state as the approved reference. Use safe synthetic content for public CI artifacts. Prefer Chromium and WebKit coverage; iPhone Safari owner QA remains separate where needed.
2. Crop phone/browser chrome, align dimensions **without silently resizing** either screenshot. Mask only genuinely dynamic content and document every masked region. Never mask away poor layout.
3. Inspect side-by-side, 50% overlay and heatmap. Use the repository's dependency-free PNG comparison helper:

   ~~~bash
   node scripts/compare-ui-screenshots.mjs \
     --reference /tmp/approved.png \
     --actual /tmp/browser-capture.png \
     --reference-view '/ru/practice|signed-in|dashboard' \
     --actual-view '/ru/practice|signed-in|dashboard' \
     --out artifacts/visual-to-code/practice
   ~~~

   It rejects mismatched reference/actual view identity before diffing; always pass both view arguments for screenshot-based UI work. It emits overlay.png, diff.png and comparison.json. Add repeated --mask x,y,width,height only for volatile content. --pixel-threshold 32 is the default channel threshold. Use --max-changed 0.08 as an **optional agreed gate only** for precisely controlled browser/DPR/font/data/crop conditions. Otherwise the difference percentage is diagnostic, not a pass/fail. Input files must be non-interlaced 8-bit RGB/RGBA PNG; convert other formats without changing dimensions.
4. Fix the three largest visible discrepancies, capture again, and repeat. Geometry contract tests, source assertions, HTTP 200 or a green build do **not** establish visual fidelity.
5. Add Playwright bounding-rectangle checks for section positions/size, overflow, clipping, scroll/fixed nav overlap and CTA visibility. For stable designs aim for major landmarks within approximately **8 CSS px** of the reference, subject to a documented tolerance. Where practical keep touch targets at least 44 CSS px. Cross-OS screenshots cannot promise pixel identity.

Existing reusable browser infrastructure: .github/workflows/hh-support-mobile-mock-browser.yml and scripts/verify-holistic-support-mock-fidelity.mjs. Extend it for the target page instead of duplicating browser installs.

## 5. Functional and release gates

- Run focused tests, ESLint, TypeScript, browser QA and Next build. Check real navigation, Google OAuth continuation, photo/file upload, saves, course actions, CTAs, disabled/error states, EN/RU/ES and protected access as relevant.
- PR must link the canonical route and owning component; attach only public/synthetic reference/actual/overlay/diff images or a private review link, state the viewport and crop, biggest discrepancies and remaining limitations. Do not publish client health or test data.
- Check CI/diff, merge only into the **verified** production branch under the existing permission. Confirm Vercel READY, production SHA including merge, canonical domain and meaningful interactions on mobile. **Merged != live != functional E2E**.
- If rendering, private login, iOS Safari, provider or deployment checks are blocked, report **CODE READY / VISUAL QA BLOCKED**, or the exact applicable state. Never say pixel-perfect, production verified or end-to-end working without evidence.

## Completion response

In Russian: actual changes → PR/commit → CI → production URL/SHA → visual widths and overlay evidence → real interactions verified → blockers → up to three owner actions. Distinguish **render verified**, **functional E2E verified**, **live verified**.

Complete references/visual-spec-template.md for every owner-initiated screenshot redesign. Record route/state parity and user journey explicitly; a failed page-identity gate blocks visual acceptance regardless of pixel score. No paid APIs or avoidable video renders/deploy loops for screenshot comparison.
