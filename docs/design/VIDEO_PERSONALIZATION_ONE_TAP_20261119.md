# Video Studio — Personalization: one-tap six-step quiz (19 November 2026)

## Owner-approved same-view contract

- **Canonical route:** `/{en,ru,es}/holistic-support/mandala` → Video Studio → Ideas → Personalization.
- **Reference:** private iPhone screenshot (English step 1), natural photo header, warm cream, mood icons, emerald selection and fixed MyVideo dock. The image is not uploaded to GitHub.
- **Page identity:** existing guest Video Studio editor, not profile/settings. Reuse `components/mandala-video-personalization.tsx`, profile and original Concept generator without duplicate routes or service calls.

## Six separate steps (one action per screen)

1. **How do I feel now?** Choose exactly one word; advance immediately. Mood faces filter, not answers.
2. **How would I like to feel?** Choose exactly one word; advance immediately.
3. **What would I like to strengthen?** Choose one meaning axis; advance immediately.
4. **How much energy do I have now?** Ten prominent 1–10 numerical buttons (five columns × two rows); one tap sets the existing `energy` value and advances immediately.
5. **How much energy would I like?** Ten prominent 1–10 numerical buttons; one tap sets `desiredLevel` and advances immediately.
6. **What is your name?** Optional first name with keyboard Done/Enter or the single explicit “Review video concept” handoff to Concept. No required Continue on steps 1–5.

Existing slider controls are removed from steps 1–2; energy is requested **only** as individual questions 4–5. Back keeps previously selected words, meaning axis, energy numbers and name. All six steps share one progress bar. Energy choices can be changed by returning and selecting another score; a previous/default score alone does not trigger auto-advance.

## Localization, mobile and privacy

- RU/EN/ES labels and error-free navigation. Keep licensed first-party photo card art and emerald/ivory styling.
- 320/354/390/430px phone: 10 44px+ touch targets fit in five columns without horizontal overflow; keyboard safe area and bottom dock remain usable. No new image/video file and no paid rendering.
- The existing in-browser `VideoGoalProfile` retains `current`, `desired`, `axes`, `energy`, `desiredLevel`, `name`. No API, database, CRM, health payload delivery, external AI provider or separate state store.

## Verification

- Exact-source focused regression `node --test tests/mandala-ideas-personalization-concept.test.mjs`: 6 distinct questions, one-word answers, both 1–10 button groups, auto-navigation 4→5→6, saved numeric summary and name-last Concept handoff.
- Existing Chromium/WebKit browser suite `scripts/verify-affirmation-voice-browser.mjs`: exercise clicks 1→2→3→4→5→6, no early Continue, widths 320/354/390/430, Back/reselect for energy and focus, retained name, Concept. No fake video render.
- CI must check exact current HEAD, mandatory Core, Mandala Specialist, browser, TS, lint and Next build. Source assertions do not prove visual or physical iPhone acceptance.
- **Do not claim LIVE** before protected merge, existing hourly Vercel production publication, READY/SHA/alias and real click-through verification. No manual Vercel deployment.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=1; extra_waves=OWNER_REQUESTED_SIX_QUESTIONS_AND_PREVIOUS_BASE_ADVANCED; cost_new_spend=NO_NEW_SERVICES
