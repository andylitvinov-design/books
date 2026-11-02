# Holistic House unified six-destination dock · owner screenshot #1

## Page identity / reference
- **Reference:** first user screenshot, anonymous Holistic Support mobile screen, Russian, a five-control bottom dock. It is the approved *visual vocabulary*, not an instruction to keep its five old destinations.
- **Rejected as visual references:** screenshot #2 is the *signed-in* app Messages dock (different UI state), screenshot #3 is the *legacy site-wide* seven-destination menu.
- **Target routes:** /ru/holistic-support/mobile (public), /ru/holistic-support/mandala (public video editor), /ru/mytube (public curated videos), /ru/practice (practitioner guest/signed-in dashboard), /ru/app/messages (authenticated orders/clients), /ru/app/portrait (authenticated profile), relevant app/practice continuation. EN/ES analogues, with /en/app/portrait as the existing Spanish account fallback.
- **View invariant:** never compare the public support home to a private Master editor as if they were the same screen. Keep real account auth and editor roles.

## Visual specification (estimated from 1206 × 294 owner screenshot crop)
- Full-width rounded top border at the very bottom; translucent warm ivory (#fffdf8), subtle gray-green 1px border and diffused upward shadow.
- Neutral gray stroke icons ~25 CSS px; selected icon and caption deep green (#087e60).
- Six equal-width slots, each independently at least 44 CSS px high; center text, responsive type ~9–13px, small icon-label gap.
- Selected route changes only active tint and warm mint tile. Preserve iOS safe-area left/right/bottom; never let the dock jump above the safe viewport after login.
- On phone keyboard editing, temporarily hide rather than float over conversation input; restore after blur, still fixed to bottom.
- Mobile 320/354/390/430, tablet 768, desktop 1440 require no horizontal overflow. No duplicate hidden-in-DOM dock may be visible or focusable.

## Canonical actions (left → right)
MyTube: /{locale}/mytube; Video: /{locale}/holistic-support/mandala;
AI/Chat: /{locale}/holistic-support/mandala#video-director-chat (original Video Director, opened via existing details and workspace state);
Practice: /{locale}/holistic-support/mobile; Master: /{locale}/practice (same auth-aware dashboard);
Profile: /{locale}/app/portrait (existing protected login/account; Spanish locale maps to English account).
Private messages retain original /{locale}/app/messages?section=orders|clients, CRM, sign-in/ownership and replies.

## Three secondary Chat tabs
- AI is the actual Video Director chat (no new self-hosted AI or second film backend).
- Orders is the pre-existing protected Orders panel.
- Clients is the pre-existing protected Clients panel.
- Preserve the exact order/recipient authorization; a guest sees the existing sign-in gate. No false submitted order/delivered message claims.

## Practice top choices
Courses -> current original guided practice selection, Services -> existing consultation choice,
Ideas -> current Temple Insights public editorial route. No shadow database or unreviewed media.

## Verification status contract
Tests should inspect six real visible links and route behavior in all three languages,
mobile keyboard/fixed footer geometry, real editor chatbot anchor, public reviewed
video catalogue with no autoplay, and protected Orders/Clients content separately.
Use existing Chromium/WebKit public browser CI and synthetic data. Exact screenshot
overlay requires route/state parity, not a screenshot of a different product surface.
No claim of real login, external YouTube playback, merged or LIVE based on code alone.
