# Holistic House · My Coach · 8-session journey (owner-approved 2026-11-23)

## Identity of the approved view
- Canonical screen: `/{en,ru,es}/coaching/sessions?coach=sofia` (shared coach session component for all AI personae).
- Before Play: guest or signed-in visitor, selected coach expanded, existing large video/portrait and large overlay Play. Preserved current consent disclosure and voice toolbar.
- Approved mobile screenshot and generated visual mockup supplied by owner in the same conversation (reference), with no new poster/background image required. This is NOT a new landing page or a replacement of the coach screen.
- Insert a horizontal 8-session rail **after** the Play/Gemini disclosure, **before** the inline Coach Profile. Do not shrink the hero or reduce existing profile type size. Allow pre-start page scrolling.
- On Play, session journey and profile hide as the already-existing dialog progress/lamps become visible. Keep full size hero, duplex audio, interruption, speed/quality controls and all consent unchanged.

## Layout and interaction contract
1. Heading “Your Coaching Journey”, count `1 of 8`, cream/deep green; width of existing coach content. No floating popups.
2. Mobile swipeable, scroll-snap rail of rounded cards with large accessible localized titles; first three `01 · Life Direction`, `02 · Inner Compass`, `03 · Main Vector`.
3. Active item solid emerald gradient; inactive item ivory. Eight tappable indicator dots; a selected summary; hint “Choose any session, then press Play.”
4. Selecting item changes UI state only; Play remains sole microphone/provider entry gesture. Native Gemini token receives only an allowlisted immutable course ID, inserted server-side as **optional requested direction**, never client permission or achieved progress.
5. Every course topic permits explicit client choice to change to their goal/problem/profile, especially during structured opening. No completion credit is awarded merely for tapping a topic.
6. EN/RU/ES localization in titles/descriptions/hint, 8 IDs stable, unknown IDs rejected, no client data persisted, no new backend store or paid provider.

## QA acceptance and evidence limits
- Required: mobile 320/354/390/430, portrait unchanged before Play, scrolling/taps/swipes, selection highlights/count/summary, keyboard focus, EN/RU/ES; after Play rail/profile hide and existing progress appears.
- Mandatory: exact-head Core + Specialist + hh-merge-check, plus production Vercel READY and exact served canonical SHA; real microphone/Gemini speech is a distinct E2E claim requiring authorized signed-in testing.
- Independent Chromium/WebKit screenshots and overlays only if a compatible browser is available; static tests do **not** prove pixel match. No separate CI workflows, manual production builds, third-party spend, or new user-facing prompts.
