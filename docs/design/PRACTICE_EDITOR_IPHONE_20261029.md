# Practitioner Service Editor — iPhone visual/functional acceptance, 2026-10-29

## Owner evidence and actual fault

- **First screenshot (09:37):** authenticated `/ru/practice` with real photo Andy, 6 published services, 0 new requests. **APPROVED** main dashboard. The approved hierarchy: warm cream/emerald background, compact header/profile counters, 3 × 2 creation cards, scenic green hero, six cover cards, five-tab bottom dock.
- **Second screenshot (09:36):** real protected `/ru/app/practice?panel=services&create=1&starter=session` after an explicit service action. **BROKEN visually**: duplicate back affordances and “Мои услуги” heading, truncated three-step labels, oversized language and photo controls, service-form action bar offset by an obsolete 74px dock reservation, and fee disclosure leaking below the editor.
- These screenshots are **different routes and view types**. Page identity gate is FAIL for pixel-perfect comparison; redesign the existing editor in the approved visual language, **not** replace its actual API-backed fields with a static copy of the main screen.
- The previous acceptance was insufficient: `scripts/verify-practice-post-google-browser.mjs` only checked `waitForURL` after clicking Service, while its synthetic bootstrap used onboardingState `complete`, which does not render the protected app (requires `active`). Hence the previous 34/34 browser claim did not inspect the owner's second screen.

## Source-of-truth and scoped implementation

Canonical production branch: `codex/public-book-library`, pre-change exact READY deployment `dpl_CLNkKKGYfXNYftwQa8NDk3teUbeL`, SHA `d9c2801706ffb3ea91faea4027b9481f4df09276`, canonical `https://holistichouse.vercel.app`.

Reuse the real components and handlers:
- `components/app/practice-inner-navigation.jsx` — shared protected header; show “Новая услуга” in edit mode, retain return to Practice.
- `components/app/my-services-dashboard.jsx` / `.module.css` — real service list and explicit editor close/cancel, no automatic form.
- `components/app/simple-service-editor.jsx` / `.module.css` — three stages, real title/short description, photo upload, format/price, extra details, Save draft, Submit/Review. Do not remove validations, editing, moderations or uploads.
- `components/app/practice-dashboard.css` — scoped mobile integration, hide duplicate outer Back and fee notice *while editing*, preserve other panels.
- `scripts/verify-practice-post-google-browser.mjs` and existing scoped GitHub workflow — navigate **through the real protected React component**, not just URL.

No new database, account state, CRM, pixels, messaging, payment claims, additional external provider, or photo uploads in QA.

## UI specification

| Region | Required behavior |
| --- | --- |
| Header | First-screen cream/green colors, brief “Кабинет практика” eyebrow, “Новая услуга” instead of list-only title, notifications as before |
| Back | One clear close-to-service-list action; no duplicate circular Back that jumps out of an unsaved form |
| Language | One compact, accessible EN/RU/ES select; no two-line jumbo label |
| Progress | Three equal touch-friendly cards (About, Format/price, Details), numbers 1–3, **full readable text and aria labels**, no `text-overflow:ellipsis` |
| Photo | Same scenic green image language as first screen, real upload control ≥44px, never imply the placeholder is a saved public photo |
| Fields | One rounded cream/white editor card, readable 16px input text on iPhone to prevent native zoom; title and summary retained when switching stages |
| Footer | Real Save/Next and step navigation at bottom + safe-area, min 44px touch controls; no obsolete +74px dock offset; when keyboard is focused controls return to document flow |
| Commission | Existing terms remain on My Services overview; hidden during the creation form, no fake payment state underneath |
| Privacy/actions | Server-side authorization unchanged, real draft API and moderation unchanged; no login bypass or synthetic records saved |

## Acceptance paths

| Path | Expected | Evidence |
| --- | --- | --- |
| Guest enters Practice → Google OAuth | Returns same `/{locale}/practice` home, not surprise wizard | Earlier PR #2513 + live iPhone screenshot |
| Signed-in Practice → Service tile | Protected editor actually renders; 3 steps, full labels, no fee/footer gap | Existing Playwright workflow with `active` synthetic bootstrap |
| Editor → stages 2 → 1 | Typed title remains; no writing fake save state | Browser click + input |
| Editor language EN/RU/ES | Correct labels without horizontal overflow at 320–430px | Chromium/WebKit |
| User saves draft | Only private server-confirmed write counts; mock does not demonstrate persistence | Real account E2E **not yet verified** |
| Editor → My Services / Practice | No redundant page/chrome; real saved data remains | Browser/owner follow-up |

## Verification gates

- [ ] `node --test` focused contracts plus editor-source syntax, ESLint, TypeScript.
- [ ] Playwright Chromium/WebKit at RU 320, 390, 430 and EN/ES 390; actual protected editor visible and photographed with synthetic account, no side effects.
- [ ] Numeric geometry: no horizontal overflow, no clipped stage names, footer bottom ≤10 CSS px + safe-area from viewport and no fee behind.
- [ ] Step buttons, input persistence, real photo-gallery toggle; no private data uploaded.
- [ ] Full Next production build.
- [ ] PR code review and CI status; merge only if scoped regression/browser/build gates pass, then Vercel READY exact commit + domain readback.
- [ ] Real Google signed-in Safari on physical iPhone → service editor → save private draft/reload/back, separately from synthetic QA.

**No pixel-perfect claim from different page types.** Compare same-view/same-size renders only; personal owner screenshots are not included in public GitHub artifacts.

---

## Owner-approved three-screen services design · 29 Oct, 17:27 Toronto

**Approval:** user explicitly approved the preceding generated three-column **Russian** mobile design image and requested implementation in the existing Holistic House service page. The image is a visual reference **in the owner chat**, not a data fixture, uploaded service photo, production screenshot, or file committed to this repository.

### Page identity / actual surface
- Overview: `/ru/app/practice?panel=services`, **authorized practitioner**, list of the master's `app.service_offerings`; public `/ru/practice` dashboard remains separate and keeps its existing five-tab dock.
- Composer: `/ru/app/practice?panel=services&create=1&starter=session` or **Edit** from a real service card; same authenticated `MyServicesDashboard` → `SimpleServiceEditor` → owner API, no duplicate editor.
- EN and ES mirror the service copy; where protected ES cabinet routing is not available, existing authenticated EN cabinet remains the safe fallback, never a fake /es/app route.

### Visual landmarks, 320 / 354 / 390 / 430 CSS pixels
1. **My Services:** compact cream practitioner heading + green full-width "Add new service" action; actual-count pill filters All / Active / In review / Drafts; optional compact filter; full-width photograph-led cards with first-party category art **only when the owner has uploaded no photo**, real title + short description, format, duration, currency/price and moderation badge, **Edit** for every owned service, **View** only for genuinely published `practitionerSlug/slug`.
2. **Presentation:** horizontal progress circles for three stages, large 265–320px scenic cover (actual uploaded marketing photo wins; otherwise editor-only category art), clickable thumbnail strip from the owner's own uploaded images plus real Add control, title, short description, gentle editorial tip, editable category and client-goal chips.
3. **Format & price:** accessible three illustrated selection tiles (online / in-person / both); 30 / 60 / 90 minutes or custom 5–1440, mandatory location for offline/hybrid, service type, verified free / fixed / from / on-request mode, actual amount and currency EUR/CAD/USD, and a preview from entered values only.
4. **Details:** one-row accordion sections for long description, client benefits, methods/FAQ, gallery navigation, real optional audio/video field and languages/contacts; mobile full-width emerald Continue / Submit and white Draft bar above safe area. Previous stage remains reachable through the arrow and stage steps.
5. **No false commerce:** mock image's €100/€120/€150 are illustrative, never seeded; no fake heart/favorites, discount toggle, editable schedule/free-slot picker or "paid/confirmed" claim. Availability/calendar requires a separate real scheduling source, not an image-only button. 20% fee only after independently verified paid orders; no charging or lead is created by preview.

### Code and behavior mapping
- `components/app/my-services-dashboard.jsx` and module CSS: existing authorized list, status filters, public links, edit handlers; keep unsaved-change confirmation and stable service ids.
- `components/app/simple-service-editor.jsx` and module CSS: existing 3-step state, `makePayload`, `getServiceEditorIssue`, `PracticePhotoUpload`, `PracticeVideoField`, Save Draft and Submit/Moderation; goals/category relocated to Presentation and booking duration displayed as actual segmented controls.
- `scripts/verify-practice-post-google-browser.mjs`: production-mode Next React hydration and pointer events, synthetic authenticated service list and real three-step editor at iPhone widths, no horizontal overflow, visible photo and footer geometry; no seeded customer data and no mocked send/payment.
- Owners' private real-photo upload and saved/reload/Submit provider E2E **cannot be certified from synthetic Playwright fixtures**.

### Release gate
[ ] exact new HEAD CI: focused contract/unit + lint + TypeScript + production Next build + WebKit/Chromium actual overview and editor behavior, actionlint; [ ] visually inspect safe synthetic same-view screenshots; [ ] review existing open PR #2516 and production merge base/diff before merge; [ ] Vercel production READY exact merge SHA and canonical domain; [ ] owner iPhone Safari Google sign-in → real uploaded photo → saved draft/reload → moderation + published public view; no fake paid transactions.

**Reference rationale:** the mock's visual rhythm is adopted, but its placeholder prices and unimplemented availability, discounts and favorites are intentionally not copied as working controls.
