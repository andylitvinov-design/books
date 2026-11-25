# Video Studio · approved beige iPhone Goal page (2026-11-19)

**Reference:** private owner-supplied mobile screenshot in the design conversation. Do not upload screenshots with personal account UI to this repository. **Target:** `/{en,ru,es}/holistic-support/mandala`, guest mobile, Goal selected (not Ideas or PRO). Source branch `codex/public-book-library`. Screenshot dimensions / iOS chrome are not CSS viewport coordinates; compare at matched browser 320/354/390/430 CSS px and true DPR.

## Reference → existing selector map

| Order | Block / screenshot target | Existing state + action / implementation |
| --- | --- | --- |
| 1 | Compact Holistic House header, credits, Profile | existing quickBrandBar and HeaderCreditProfile |
| 2 | Six Goal/Ideas/Montage/PRO/Ready/Therapy tabs | one existing `data-video-quick-controls`, preserved |
| 3 | Warm landscape heroine/video with green editorial headline | quickHeader with first-party support mock hero and **real** existing preview `data-video-quick-hero-play`, no autoplay |
| 4 | Nearly full-width warm white 4-row text composer (~150px mobile high) | **one** `data-auto-video-input` textarea in existing Director portal, capped at 160 chars, Ctrl/Cmd+Enter submits, no external AI send |
| 5 | Footer inside composer: attach +, underlined Free/Pro and Guide me/Just make it dropdowns, mic, green ▶ submit | real native photo picker, PRO workspace, step-based planning (instant only after complete goal), existing audio controls, local taxonomy classifier |
| 6 | Three quick wishes | native locally-updated request; privacy unchanged |
| 7 | Quick Start Life/Work and four illustrated tiles in 2×2 | same four taxonomy IDs and first-party WEBP images, 3-step quiz kept; Work only changes category text |
| 8 | Green Create Video CTA | safe focus/advance into existing Ideas; does **not** render, charge or bypass Ready consent |
| 9 | Bottom nav | existing single app dock; no second fixed bar |

**Behavior review:** No added API, paid generation, credit debit, auto-download, duplicate player, new data store or upload. Pro only navigates to established PRO tab; real rights/auth/payment gates still apply. “Just make it” can skip optional planning only after goal is complete; other inputs retain three-step selection. Free remains real local video. EN/RU/ES. Experimental wellness effects must not be presented as diagnoses or medical treatments.

**Visual QA pending:** exact matched browser screenshot, overlay/diff, keyboard/caret, iPhone Safari screenshot, side-scroll/safe-area check, 320/354/390/430, and full page identity/EN/RU/ES. **Function QA pending:** core browser, credit/Ready, real local video playback, microphone consent and photo selection. **CI pending:** native protected PR head tests, lint, typecheck, build. **LIVE pending:** Vercel READY deployment serving exact production SHA via existing hourly publisher; no manual Production deploy.

Visual status: NOT RUN. E2E status: NOT RUN. LIVE status: NOT VERIFIED.
