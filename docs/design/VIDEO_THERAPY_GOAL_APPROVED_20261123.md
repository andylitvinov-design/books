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

## Superseding owner approval · 23 November 2026 · Goal Screen 2

The existing Magic Mirror landing is Screen 1. Immediately after selecting
For Me / Others / Work, Goal Screen 2 displays the photo-based **three-step
category → subcategory → topic quiz**. It is a single cohesive composition:
the original global brand/XP, six workspace tabs (Goal active), the SAME
native 16:9 source-backed video player on **every** quiz stage, ONE question
with three numbered lightbulbs indicating the current stage, four large
scenic 2-column image cards, and unchanged global mobile dock.

Stage 1 Me card order is **Love / Money / Stress / Personal Growth** with
pink flowers / blue mountains / sea sunrise / green hills. Stage 2 and 3
change only the question, active lightbulb, and real taxonomy choices;
the shared original video is never replaced, duplicated or played by default.
An optional disclosure below the four cards preserves the genuine free-text
goal composer, existing mic/image buttons, AI Ideas, Guide me and Next.

After stage 3, the canonical existing **Purpose** selection and
**250 / 500 / 2000 XP planning Format** screens remain; only choosing a
Format after both steps enters the original Montage/Personal/Ready workflow.
Direct typed intent follows the same downstream confirmation. This revises
the earlier ordering and no-video directives in this document, not the
first landing screen. There is no new API/render/credit charge/CRM action.

Acceptance: exact-head EN/RU/ES and mobile 320/354/390/430 Chromium/WebKit;
real taps category→sub→topic→Purpose→Format→Montage, photo loading, video
playback, hidden/expanded optional typed composer, no overflow and dock
overlap. Physical iPhone Safari and final canonical READY/SHA require
separate proof; CI alone is not LIVE.
