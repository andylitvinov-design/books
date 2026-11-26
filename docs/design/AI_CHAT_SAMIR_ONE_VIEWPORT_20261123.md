# AI Chat Samir · iPhone one-viewport geometry · 2026-11-23

Canonical first-view route: `/{ru|en|es}/app/messages?section=ai` (empty guest AI conversation). Preserve the already-merged #5476 and #5479 flow, not a second chatbot.

A local **synthetic** Chromium model reproducing the existing scene/composer mobile CSS, with a 65px header and 96px dock, found an overlapping sticky composer and off-screen second choice. After the proposed responsive layout adjustments:

| CSS viewport | Before scroll / viewport | Local candidate scroll / viewport |
|---|---|---|
| 320×667 | 731/498 | 498/498 |
| 354×740 | 680/571 | 571/571 |
| 390×844 | 771/675 | 675/675 |
| 430×932 | 763/763 | 763/763 |
| 390×740 | 691/571 | 571/571 |

Numbers are measured in the representative test fixture, **not** the real Next.js app or iPhone Safari. No real-site or physical-device visual pass is claimed.

Fix structure: scene art fills spare height; greeting is readable; two goal choices are 43px+; single Free/Pro input moves into normal flow with 16px text and 44px Send; optional topics move into an on-tap compact menu; the + menu opens upwards. Open privacy/Gemini/microphone consent panels remain unconstrained and may scroll. Never crop consent or create a new dock.

Release acceptance: exact-HEAD protected Core/Specialist, route-matched Chromium/WebKit at 320/354/390/430, real interaction and mic QA, Vercel READY served SHA on the canonical alias. Existing hourly Vercel production publisher only.
