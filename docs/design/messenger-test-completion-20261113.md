# AI Messenger · test completion state · visual specification (2026-11-13)

- Owner reference: supplied iPhone screenshot of the **EN AI Assistant, last question answered (10/10)**. Image is not committed; user answers remain private.
- Real component: `components/app/messenger-test-journey.jsx` inside compact `HolisticAgentChat`, with its existing CSS module. Preserve the current selected test, server guest session, locale and chat context. The screenshot alone does not establish a verified route URL or login status.
- Source/target type: **in-chat assessment completion** (not a full results report, Cabinet dashboard or editor). Page identity is component-matched; route-level visual gate needs browser evidence at the exact state.
- Before: redundant pause/cancel controls at 10/10, last-answer transcript, standard violet assistant bubble, two same-weight actions and neutral result button.
- After: one ivory/soft-green rounded celebratory card, green check icon, localized 10/10 status, short congratulations, **one emerald full-width View result CTA (58px)**, subtler Previous question action; diagnostic disclaimer stays below.
- Keep: existing Messenger shell/header and bottom dock, progress/answers for all earlier questions, safety prompt, server-backed submit, retry/revision handling, optional guest account save on result and EN/RU/ES.
- Layout goals: no horizontal overflow at 320/354/390/430; no overlapping sticky composer or bottom dock. Avoid decorative popups and autoplay. Titles wrap; all buttons remain keyboard accessible.
- Actions: View result → existing `finish()` → existing `guest/runs/{id}/submit`; Previous question → existing `previous()` → secure saved run. No fake report, new tracking, new route or auth bypass.
- Tests: `tests/messenger-test-completion-ux.test.mjs` locks the copy, final-only card, source-backed actions, localized CTA, correctable previous answer, safety guard and responsive CTA.
- Browser evidence: **not yet run**. Need same-view anonymous/signed-in synthetic assessment completion on iOS WebKit + Chromium widths 320/354/390/430; screenshot/overlay and real CTA to secure result; separate authenticated private result verification. Do not call source assertions visual fidelity.
