# Proposed Bach report layout acceptance

Status: local proposal only. Prepared against the frozen PR706 integration source tree `05c1f7b5d6addda902da1918dd8c98e6e61cec9f`. No publication, current-CI restart, app/runtime change, browser launch, database access, client record, or notification is part of this work.

## What would run

Append `verify-bach-personal-report-browser` to the existing hosted `extended` suite in `.github/workflows/hh-app-browser.yml`. Both existing Chromium and WebKit jobs would execute it and upload evidence through their existing artifact step. No additional workflow, browser dependency, server route, account, API, database fixture, quota change, or production deployment is needed.

The script refuses local/self-hosted/deployed execution. It requires the existing isolated runtime plus GitHub Actions on a GitHub-hosted runner. This proposal does not authorize publication or a hosted run, and the closed local browser-launch route must not be retried or worked around.

## Actual component, isolated fixture

The fixture server-renders `components/app/personal-result-report.jsx` using React's real SSR renderer and the real `buildAssessmentResultReport` / Bach guidance path. The compact report and Next Link branches deliberately throw if reached. It renders only freshly scored, deterministic synthetic results.

It reads the unchanged report CSS, scopes class selectors without changing declarations, compiles actual global CSS with the repository's installed PostCSS/Tailwind toolchain, and includes root/route CSS in source import order. Static `.hh-app` and `.hh-result-page` wrappers preserve the relevant inherited font/wrapping rules and content width. Report module CSS is appended after those styles. The source proof records SHA-256 values for the component, stylesheet inputs, guidance, scoring and both Bach definitions.

This is actual report-component/CSS acceptance. It is not the full authenticated cabinet, Next's emitted CSS-bundle order, hydration, save/reload flow, production deployment, PDF layout, physical-device font rendering, or cabinet navigation. The static wrapper omits the rest of ResultView and the site shell. Existing authenticated journey and provenance tests remain responsible for their separate coverage.

The fixture document exists only inside Playwright `route.fulfill` on a reserved loopback path. Every other request is aborted. Service workers are disabled; CSP disables scripts, connections, forms and frames. Source links are checked without following them. There is no network passthrough, no local app API call, and no browser-side JavaScript needed for native details.

## Matrix and assertions

Per browser: 2 saved versions × 2 instrument languages × 2 display languages × 3 patterns × 3 widths = 72 cases. Across Chromium/WebKit: 144 cases.

- Versions v1/v2, EN/RU instrument and display combinations
- Zero, maximum and deterministic mixed answers, including fractional weighted matches
- Viewports 320, 390 and 1280 px
- All 38 ranked theme titles and full construct labels, unchanged values, lower/upper bounds, numbering, advice, limitations and source URLs
- Visible purpose, scale warning, methodology, safety note and support text where present
- Maximum/mixed: first 7 cards visible, remaining 31 under native details
- All zero: 0 highlighted cards, all 38 under details; no invented positive matches
- Summary reached through Tab, visible focus, Enter expansion, Space collapse/reopen, Enter close, retained focus and no navigation
- Both collapsed and expanded/reopened states: no document/body horizontal overflow, no hidden required title/construct/score/source, no overlapping card-head labels, no overflowing text column or title, no element/content horizontal overflow, no text clipping by an ancestor

One pixel of rounding tolerance is used. Content may be below the viewport and vertically scrollable; it may not be clipped inside a container. Geometry stores all visible elements/text fragments, plus every card/header/text-column/title rectangle. Bounds are collected before assertions so failures retain diagnostics.

## Evidence

Existing artifact root: `artifacts/app-r1/bach-personal-report-{chromium|webkit}/`.

- `source-proof.json`: exact input hashes and declared scope
- `verification.json`: commit/browser versions, expected and completed case count, checks and first failure
- Every case: `closed`, `open`, `collapsed-again`, `reopened` full geometry JSON
- Bounded successful screenshots: same-language v1/v2 mixed cases at all three widths, plus same-language zero/maximum cases at 320 px (20 cells per engine, 3 viewport images each)
- Explicit screenshot names: `closed-first-theme.png` (or `closed-all-zero-disclosure.png`), `open-longest-title.png`, `open-last-theme.png`
- Failure screenshot plus attempted requests/page errors

Screenshots are sampled viewport captures at named positions, not one oversized image of the complete 38-card page or an image for every matrix/state combination. Failure screenshots are captured in the failing viewport before any subsequent scrolling, resizing or cleanup. Geometry covers all 38 expanded cards, including offscreen content. Nothing is labeled passed until all 72 cases for that engine finish. The existing matrix gate remains fail-closed.

## Local verification performed

No browser was launched. No actual clipping/overflow result is available yet. In particular, the nested card-head `min-width` risk is a hypothesis, not a confirmed defect. No CSS repair is included.

- Changed-file ESLint: passed
- New fixture contracts + existing Bach actual-route provenance + matrix partition checks: 73/73 passed
- Expanded relevant assessment/report checks: 103/103 passed
- Browser script and geometry helper syntax checks: passed
- Full application build, full repository lint, and hosted browser geometry: not run for this proposal

The new unit tests validate real SSR output, source hashes, matrix coverage, selector-only CSS scoping, hosted-only guards, network isolation contracts, geometry rejection logic, and fail-closed workflow integration. They do not substitute for browser geometry.

## Decision after approval

If this proposal is separately approved for publication, publish only the test/helper/workflow/document changes and let the hosted jobs establish geometry. If they prove a specific overflow, use the saved element/text rectangles and screenshots to prepare a narrowly scoped CSS fix separately. Do not pre-emptively change CSS, scoring, cutoffs, result data, or assessment registrations.
