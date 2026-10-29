# Screenshot-to-UI visual specification

> Fill in for the PR or issue before editing. Never commit private client screenshots or test results.

## Reference and target

- Approved reference: public/sanitized URL or private file reference
- Current/broken screenshot (if available):
- Reference exact route + query (verified), user role and view type (dashboard/editor/dialog/etc.):
- Actual exact route + query (verified), user role and view type:
- **Page identity gate:** PASS (same route/state/view) / FAIL (fix OAuth/navigation; do not run pixel comparison)
- Canonical route(s), EN/RU/ES:
- React owner component / CSS module:
- Verified production branch, SHA and Vercel deployment:
- Reference viewport content width × height (CSS px), DPR, browser and crop:
- Guest / client / practitioner state; synthetic fixture:
- Existing auth, API, RLS, payment, media and navigation to preserve:

## Screen and navigation mapping (MANDATORY)

| Entry | Real start route | Trigger/button | Expected resulting route and page type | Actual observed route and page type | Status |
| --- | --- | --- | --- | --- | --- |
| Guest → Google → dashboard | | | | | |
| Dashboard → service listing | | | | | |
| Explicit Add → protected editor | | | | | |
| Editor → original Practice home | | | | | |

Do not compare screenshot pixels across different UI view types. A service creation form is not a failed screenshot of the main dashboard; broken redirects and unrequested editor opening are navigation defects.

## Visual block map

| Order | Region | Reference x/y/w/h | Spacing / type / color / image crop | Existing selector | Keep/move/resize/restyle/remove | Verified? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Header and global shell | | | | | |
| 2 | Identity and metrics | | | | | |
| 3 | Primary CTA and filters | | | | | |
| 4 | Hero or video | | | | | |
| 5 | Cards and course/service shelf | | | | | |
| 6 | Progress / bottom navigation | | | | | |
| 7 | Footer / disclaimer | | | | | |

## Behavior contracts

| Control | Existing handler/API | Guest | Signed-in | Error/disabled | EN/RU/ES |
| --- | --- | --- | --- | --- | --- |
| Primary CTA | | | | | |
| Navigation | | | | | |
| Media/upload | | | | | |
| Save/complete/payment | | | | | |

## Browser evidence

| Viewport / engine | Layout and scroll | Screenshot | Overlay/diff reviewed | Real actions | Blocker |
| --- | --- | --- | --- | --- | --- |
| 320 Chromium | | | | | |
| 354 Chromium | | | | | |
| 390 Chromium | | | | | |
| 430 Chromium | | | | | |
| 390 WebKit | | | | | |
| 768 desktop | | | | | |
| 1440 desktop | | | | | |

## Acceptance

- [ ] **Page identity gate PASS:** same route, query intent, auth state, selected view, and viewport (else fix navigation before visual comparison).
- [ ] Correct sections/order; no extra shell, banner or duplicate bottom tabs.
- [ ] Accurate image crop, spacing, density, type and visible CTAs.
- [ ] No unintended horizontal scrolling or safe-area overlap.
- [ ] Reference and rendered PNG have matching crop, size, DPR and stable content.
- [ ] Reviewed overlay.png, diff.png and major geometry measurements; revised largest discrepancies.
- [ ] Difference score includes browser/crop/mask caveats; no score-only approvals.
- [ ] Real guest and signed-in actions verified with synthetic data.
- [ ] Relevant tests, lint, typecheck, browser QA and build passed.
- [ ] Production READY, correct source SHA and live canonical URL checked; private E2E marked if blocked.

Visual status: NOT RUN / IN REVIEW / VERIFIED

Functional E2E status: NOT RUN / BLOCKED / VERIFIED

Live status: NOT DEPLOYED / READY UNVERIFIED / VERIFIED

Remaining visual differences and requested owner action:
