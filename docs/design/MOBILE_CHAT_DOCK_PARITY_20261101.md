# Holistic House — Mobile Messenger dock parity (1 November 2026)

## Page identity from the three owner screenshots
- A: support/meditation mobile home with a separate bottom-navigation configuration; use it as a visual reference, not as proof of authenticated chat.
- B: `/ru/app/messages` in an authenticated iPhone browser view; canonical five destinations: **Главная · Практика · Сообщения · Материалы · Профиль**. Browser toolbar below the page is native UI.
- C: `/ru/practice` practitioner dashboard, guest and after Google login. Its third bottom tab was incorrectly **Заявки** (internal practice request management) rather than **Сообщения**.
- Protected `/ru/app/practice?panel=...` is a different real editor/requests page. Existing stacked PR #2940 already makes its protected dock reuse the Messages dock; do not reimplement the CRM or copy edits from that PR.

## Scope and invariants
- Keep the existing public PracticeShowcase: layout, data, action handlers and Google OAuth continuation unchanged. Its third primary tab now uses the already-existing `messages` route and authenticates normally; **Заявки** remains accessible inside the practitioner tools.
- In the private member Cabinet, align the five primary mobile destinations (one home link plus four entries) with the Messages design and EN/RU/ES copy. For practitioners, Materials/Profile open their real authorized private panels; members without practitioner access open their existing history/portrait. Progress/Tests/Courses remain in the Account menu; Settings remain under Account → More options.
- The fixed web dock retains `bottom:0`, native safe-area padding, focus visibility and rounded cream/green visual language. The authenticated messages composer continues to hide the dock while editing; reply/send UI must remain usable.

## Safari / iOS browser chrome
The toolbar in iOS Safari or an in-app browser is outside webpage DOM/CSS. Website dock **cannot** move below or overlay native browser controls. It can only sit flush with the bottom of the visible page, immediately above that toolbar; the site's already configured standalone PWA gives the intended app-like layout without Safari's bottom controls. Do not mark this constraint as a fixed CSS bug.

## QA acceptance / release
1. Match route, locale and authentication state before pixel overlay. Check widths 320/354/390/430 in Chromium and WebKit, for public Practice guest and after Google, authenticated Messages list/thread, member Profile and practitioner Materials/Profile.
2. Exactly five dock entries, third tab always **Сообщения / Messages / Mensajes**, no duplicated menu, correctly highlighted current tab, readable text, touch targets, adequate scroll padding.
3. Messages reply composer visible when keyboard opens; closing keyboard restores dock. Confirm real recipient access, Back/Forward, and no fake provider delivery claim.
4. Verify required exact-head GitHub CI before protected production merge. Separately verify Vercel READY exact merge SHA, canonical production alias and a real mobile Safari/PWA smoke. Browser screenshot acceptance and actual signed-in messaging E2E are independent.
5. Do not treat screenshot B's native Safari browser toolbar as a web app layout error.

No API, RLS, CRM schema, auth, credentials, payment, provider or client-data changes in this patch.

## Additional verified Reiki filter root cause
The mobile Reiki filter forcibly switched `.bottomNav` from `fixed` to `static`, which physically moved the menu away from the viewport bottom. Its filter now reserves bottom scroll padding instead; rendered Chromium/WebKit test requires fixed positioning, a visible-viewport bottom match, and a reachable Apply action. Other open six-tab AI changes (#2974/#2975) must preserve this fix when they merge. #2940 owns the separate protected Practice shared dock; its `workspace.css` edits overlap and require reconciliation.
