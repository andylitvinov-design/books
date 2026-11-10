# Practice signed-in visual parity — owner iPhone screenshots, 29 Oct 2026

## Reference and page-identity gate

- Approved **image 1**: public `/ru/practice` guest dashboard at iPhone screenshot width 706 device pixels (browser chrome cropped conceptually). It shows one profile row, two compact counters, six creation tiles, scenic hero, six offer covers, and a fixed five-tab dock. Screenshot is a private conversation upload; **do not commit or distribute the image**.
- Broken **image 2**: same dashboard after Google sign-in, with a large `Вы вошли в Практику / Продолжить: Создать` continuation panel. Source: `confirmSignIn` sends `profi:create`, callback builds `/ru/practice?ready=create`, frontend `setNextAction(ready)` renders the panel.
- **Image 3**: `/ru/app/practice?panel=services`, the legitimate existing protected `Мои услуги` view. **Different view type from image 1**. Do not compare pixels or replace the service list/editor with a dashboard. Fix unrequested navigation first, keep an obvious way back.
- Canonical locales: `/{ru,en,es}/practice` (dashboard), `/{ru,en,es}/app/practice?panel=services[&create=1]` (protected list/editor).
- Owner component: `components/practice-showcase.jsx`, `components/practice-showcase.module.css`; protected panel: `components/app/practice-workspace.jsx`, `components/app/practice-inner-navigation.jsx`. Server continuation: `app/api/app/[...path]/route.js`.
- Verified pre-change production: branch `codex/public-book-library`, commit `819078b968be955ac549a9dc1ab2b1c633adc1ca`, deployment `dpl_DAeKBxL83gEoVW3VCrwVw9vt5tb4`, Vercel READY, canonical `holistichouse.vercel.app`. These values are historical snapshot, **not post-change proof**.
- Browser/content metrics: screenshot provided with iOS browser chrome, no independent DPR, CSS box or private DOM extraction. Do not pretend exact pixel overlay was completed. Relative mobile landmark targets are covered by the existing synthetic browser verifier.

## Route and auth-state mapping

| Entry | Expected result | Root fix |
| --- | --- | --- |
| Guest `/ru/practice` → Create → Google sign-in | Return to **same clean** `/ru/practice` with real account profile/counters; user taps action again | `auth/start` without `profi`, callback always returns clean home |
| Old `/ru/practice?ready=create` bookmark | Same clean dashboard, no welcome panel, clean address | Strip historical `ready` without redirect/extra editor |
| Dashboard → Active services / All offerings | Protected `/ru/app/practice?panel=services`, list/filter/status | Reuse current protected panel; no auto-create |
| Dashboard → explicit Add service | Protected `/ru/app/practice?panel=services&create=1&starter=session` | Reuse existing editor and authorization |
| Protected My Services → back / Practice tab | `/ru/practice` with six tiles/hero/offer rail | Existing `showcaseEntry` back link |
| Pro explicit `?start=...` deep-link | Existing opt-in explicit Continue remains; no surprise OAuth `ready` | Preserve `start` semantics |

## Visual block map (approximate; not browser measurements)

| Region | Reference on iPhone | Selector | Decision |
| --- | --- | --- | --- |
| Header | Compact title and notifications, warm cream/green | `.header` | Keep |
| Identity + metrics | Single horizontal card, photo or initials, **real** active/request counts after login | `.identity`, `.metrics`, `.avatar` | Keep proportions; use actual account photo when safely supplied |
| Six create tiles | 3 × 2 with compact mint/violet/pink icons | `.quickGrid` | Keep in both auth states |
| Scenic hero | Wide green overlay with create CTA | `.hero` | Keep placement immediately below tiles |
| Six offer covers | Single row and horizontal category discovery | `.offerRail` | Keep |
| Dock | 5 fixed tabs and iPhone safe area | `.bottomNav` | Keep |
| Wrong welcome block | Occupies >200 px and pushes tiles/hero below the fold | `.resumePanel` | Prevent for Google callback; keep only intentional Pro `start` |
| My Services | Distinct protected filtered list, genuine saved service counts | `MyServicesDashboard` | Preserve functionality; return link to original dashboard |

## Behavioral and privacy contracts

- `PracticeShowcase` uses server-owned `/api/app/bootstrap`, `/api/app/practice` and `/api/app/auth/contact-profile`; guest sees unknown counts, signed-in shows real records. No user metrics stored in query/analytics.
- OAuth `practice-preview` receives only locale and allowlisted action (legacy compatible); no client data or arbitrary return URL. Google server session and protected panel remain unchanged.
- Do not change RLS, database, CRM, invoices, uploads, publication status, paid API, or browser authentication cookies.
- Protected `My Services` filters, real status counts, drafts, explicit Add, editing, photo upload and save still use existing private APIs. No mock counts.

## Acceptance and limits

- [x] Page identity mismatch diagnosed: screenshot 2 is dashboard plus injected OAuth banner; screenshot 3 is legitimately a different panel.
- [x] Source fix: callback, frontend sign-in and legacy `?ready` cleanup; original six tiles/hero/offer shelf/dock unchanged.
- [x] Expanded existing Chromium/WebKit browser script: signed-in 320/390/430 EN/RU/ES, legacy ready URL, guest public Create→Google payload, protected editor action, no horizontal overflow.
- [ ] CI source tests, lint, typecheck, browser script and production build on **exact new PR head**.
- [ ] Real private Google OAuth → same home → My Services list → Add → save/reload photo → return to home; synthetic browser is not provider E2E.
- [ ] Reference and candidate identical-content cropped PNG overlay + reviewed delta (uploaded owner screenshot contains Safari UI; not a comparable programmatic capture).
- [ ] Merge, Vercel production READY, exact source SHA, canonical domain + live routes confirmed.

**Visual status:** IN REVIEW; **functional E2E:** BLOCKED on owner authenticated session; **live status:** NOT DEPLOYED (as of opening this patch).

See tracking issue #55, prior PR #2498 and current parity PR.
