# Holistic House Messenger — iPhone unified bottom navigation and viewport acceptance

**Date:** 2026-11-04. **P0:** owner-approved screenshot request. **Branch:** codex/public-book-library at e8f8f494981324746f9488c0faea288a0ecb6555.

## Source and state identity gate

- Reference: owner's first screenshot of Practice mobile dock. Broken observation: second screenshot, Messenger AI/Chat in an iPhone embedded browser with native browser toolbar.
- The screenshots have different routes/view types and browser chrome; **whole-screen pixel matching is invalid**. Compare only the global bottom dock's six destinations, geometry and fixed positioning at the visible viewport edge.
- Entry: `/{ru,en,es}/holistic-support/mobile` → `/{ru,en,es}/app/messages?section=ai`; Messenger views: AI, Orders, Clients. Guest, signed-in client and practitioner must retain permissions and correct content.
- The iOS application's native browser toolbar (Back/Share/Refresh/Open in Safari) is not controlled by site CSS or JavaScript; it may only disappear when installed as standalone PWA or opened in a host that supports hiding its browser chrome.
- Connected Mac was offline at authoring. No fake E2E screenshot comparison or client login is claimed.

## Mapping, source of truth and fixes

| Region/route | Owner | Action |
|---|---|---|
| Six-button bottom dock | `components/unified-mobile-dock.tsx`, `lib/unified-mobile-dock.mjs` | Keep existing approved design and Next same-tab links; no second app or popup |
| Messenger page | `app/[locale]/app/messages/page.tsx` | Remove obsolete five-button `MessagesBottomNavigation` mount (was CSS-hidden) |
| iOS browser toolbar/keyboard | `lib/mobile-visual-bottom.mjs`, `UnifiedMobileDock` | Measure VisualViewport; distinguish software keyboard using unfocused baseline when both viewports shrink |
| Messenger height | `app/unified-mobile-dock.css` | No reserved global bottom nav padding while editor/keyboard hides dock |
| AI / Orders / Clients | `components/app/messages-orders-clients.jsx` | Keep real AI chat and unsent draft mounted under a hidden tabpanel; do not duplicate or reset CRM |
| Protected/public transition | `components/csp-navigation-boundary.tsx` | Preserve intentional same-window document reload across security policy classes (no unsafe bypass) |
| PWA | existing manifests, apple metadata | Already standalone; no new install flow or paid dependency |

## Expected operation

1. Practice, AI/Chat, Video, MyTube, Master, Profile all render the shared fixed dock with one active tab and links from `lib/unified-mobile-dock.mjs`. Safari/Telegram/ChatGPT native browser controls remain outside the webpage.
2. Messenger AI → Orders → Clients → AI preserves the AI thread and unsent draft. Hidden panels take no space and do not cover buttons.
3. Open the iPhone keyboard while editing: global dock hides, bottom reservation is removed, composer stays reachable. Blur closes keyboard and dock returns to visual bottom, including scroll/orientation restoration.
4. Preserve Google OAuth, page CSP, protected sessions, client/owner role checks, consent, Telegram/CRM delivery, access to older orders and the existing notification links.

## Validation and explicit blockers

- Unit and source contracts: `tests/mobile-visual-dock.test.mjs`, `tests/messages-approved-entry.test.mjs`. Existing `tests/messages-iphone-keyboard-layout.test.mjs`, `tests/holistic-house-standalone-messenger.test.mjs` also relevant.
- Browser matrix: Chromium + WebKit, 320/354/390/430px phone, 768px tablet; RU/EN/ES; unsigned public Practice and authenticated synthetic Messenger as permitted. No horizontal overflow, no obscured composer, no duplicate nav, no extra window targets.
- End-to-end private and actual iOS embedded-browser UX need real authorized browser/device. Screen-identity mismatch prevents valid diff until matched Messenger states are captured.
- **Release gate:** existing exact-HEAD Core/Specialist/hh-merge-check, protected merge, Vercel READY project `prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b`, serving SHA and same-domain smoke. Never equate successful CI with live/private E2E.
- **Costs:** no new provider, API key, paid runner, workflow schedule, notification push or subscription. Existing branch/PR release automation only.

Status at creation: source change prepared; visual QA and live confirmation pending independent evidence.
