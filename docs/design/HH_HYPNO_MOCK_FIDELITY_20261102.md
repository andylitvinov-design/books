# Hypno Effects — owner-approved iPhone design correction · 2 November 2026

## View identity and inputs

- **Current:** owner iPhone Safari screenshot 1, guest, RU, selected third workspace “Гипноэффект”; page content in the middle of a scrolled `/ru/holistic-support/mandala#video-hypnocorrection-mobile` view. Browser chrome and dock are not part of this component.
- **Reference:** owner screenshot 2, intended warm-light mobile Hypnocorrection mock. It includes a brand bar, title, Wave, **one** film player, a six-choice goal row, audio/visual settings, personal meditation, optional advanced controls and two meaningful end actions.
- Both images depict the **same guest video-effects editor**, not the Practitioner dashboard or a separate meditation app. Preserve all six existing Video Studio tabs and the fixed mobile dock.
- Target responsive viewports: 320, 354, 375, 390, 430 CSS px, plus 768 and 1440 sanity. No assumed pixel-perfect match across screenshot DPR, device chrome or fonts.

## Measurable mobile plan

| Region | Before screenshot / previous PR | After this change |
|---|---|---|
| Entry scroll | Hash landed on effect cards, hiding title/Wave/player | Keep PR #3146 Effects-only scroll offset, original tab rail + portaled title/Wave before the same hero |
| Goal | Existing theme controls hidden in Effects | Expose the existing **six real category controls** in 3 × 2 compact coloured chips under step 1, including distinct RU/EN/ES labels; same handlers/scenes |
| Audio | Large image tile eats ~27% width, cards only occupy remaining area | Section header full width with step 2; three 156px-tall cards each ~1/3 of full inner width, 44px native switch targets |
| Visual | Image tile plus three narrow cards | Step 3, three full-bleed original-media cards across full width; real settings, scene selection and photo handlers untouched |
| Meditation | Narrow side column; repeated purple fills | Full-width lavender editor entry followed by three duration/style/voice editor shortcuts; editor still opens existing practices workspace |
| Additional | Phrases and optional features overly tall | One 3-column row with clear disabled/unverified states and live on-screen text / frame settings |
| End actions | Only full-width Create | Two side-by-side real actions: existing personal meditation editor and **same original local Create**. Keep preview and privacy disclosure |
| Mobile navigation | Fixed five-/six-tab shell may be present | Keep global navigation and safe-area; no shell or player duplication |

## Interaction and privacy map

Selected goal chip → existing `selectCategory` handler / local theme + scene; Wave → existing locally recommended light and visible phrases; speech → existing Audio editor and authorisation checks; unverified binaural/audio repeats remain **disabled**; visual light → existing Canvas overlay and 44px switch; choose scene → original licensed catalog; photo → existing local chooser with rights; meditation → existing Practices editor; Create → original Canvas/MediaRecorder and Save. No new API, AI charge, voice clone, storage, CRM writes, upload or payment.

## QA / release acceptance — not assumed complete

1. Source invariants and unit tests include the six choices and 3-column full width, same Create callback, no duplicate recorder.
2. Exact-head ESLint, TypeScript, build and `hh-merge-check`; focused Mandala / Public Services.
3. **Required:** actual Chromium + WebKit at 320–430 RU, 390 EN/ES: click goal, Wave, original switches, visual scene, meditation, phrases, Create → video bytes → Save. Inspect responsive geometry, safe area and no overflow. Use #3136 independent browser acceptance; it may need rebasing on this change.
4. **Required visual evidence:** capture guest rendered same-route same-state screenshot; compare reference/candidate side by side and produce a documented overlay. The owner's mock is not a fixed 390 CSS-px browser capture, so raw JPG pixel scoring is diagnostic only.
5. Protected squash merge into `codex/public-book-library`, current Vercel project READY / actual merged SHA / `holistichouse.vercel.app` alias. Physical iPhone Safari Save to Files remains a separate real-device check.

Do not label source-only tests as pixel fidelity, real iPhone proof or production.
