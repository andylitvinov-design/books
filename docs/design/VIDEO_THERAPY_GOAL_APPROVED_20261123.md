# Holistic House Video Studio · approved Goal Topic · 23 November 2026

## Source and page identity

Owner-approved final mobile mock is the **Goal** workspace, not Montage. The exact existing guest journey is `/{en,ru,es}/holistic-support/mandala` → Magic Mirror first landing → personal purpose → format → Topic (`data-active-workspace="video"` and `data-hh-mirror-screen="topic"`). The production shell already maps `video` to selected **Goal** in six feature tabs.

Keep the original Holistic House site header, utility controls, live XP badge/profile and shared seven-item bottom dock. Do not create a new app page, second editor, hardcoded fake XP, new player, or change the landing screen; related open landing PR #5460 works on a separate view.

## Owner-approved iPhone composition

- No second large hero/title, video preview, progress/submenu strip or full-width Get AI Suggestions & Script CTA in Topic.
- Large near-white 500-character goal textarea with original +, image, mic (keyboard focus), AI Ideas, Guide me and emerald send arrow. The arrow retains the existing typed-intent local classifier and Ideas handoff. Respect empty, filled, keyboard, disabled and pending states.
- Subtle example and “Or choose a topic through a short quiz”. Four 2-column real clickable scenic nature-photo cards: ocean sunset, pink blossoms, mountain, green hills. Large white icons, high-contrast bold captions over local dark photo gradient; selected card has emerald check and outline. Content remains EN/RU/ES; cards are responsive, allow wrapping and natural page scrolling.
- Original real intro video Play and Back to Format are moved into the **user-opened Guide me** panel, preserving existing player and navigation without autoplay, duplication or expensive provider call.
- Existing 4×4×4 taxonomy navigation remains category → subcategory → topic; no new API, XP debit, privacy tracking, contact/lead, health details or media upload workflow.

## Acceptance / release contract

Browser geometry + real taps for 320, 354, 390, 430 CSS px in Chromium/WebKit; EN/RU/ES and authenticated/guest where appropriate. The site shell remains visible, no horizontal overflow or covered input at safe area or when keyboard opens. Verify image crop and selected check, type → arrow → original Ideas Goal, tile → subcategory → topic, AI Ideas choices, Guide me → optional real video playback and Back. Same route/state screenshot overlay required to claim visual fidelity; source-only test, green build and HTTP 200 do not establish functional E2E.

One atomic protected PR from verified `codex/public-book-library`; Core, Specialist/WebKit and hh-merge-check; native protected auto-merge. Use the existing hourly Vercel production publisher only, **never** independently deploy or spend XP. Verify Vercel production READY and matching SHA on canonical `https://holistichouse.vercel.app` plus the meaningful Goal interactions before saying LIVE.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
