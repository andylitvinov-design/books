# Support · approved mobile sunrise screenshot · 20 November 2026

## Reference and same-page identity
- Reference: final owner-provided EN iPhone screenshot in the conversation. Never publish that screenshot as a site asset.
- Target: real public anonymous /{en,ru,es}/services, first step of Support quiz. Not a private dashboard or a second demo route.
- Owner component and styles: components/services-assist-quiz.tsx + components/services-assist-quiz.module.css, rendered in app/[locale]/services/page.tsx and app/es/services/page.tsx.
- Production branch codex/public-book-library, Vercel project codex-public-book-library, canonical https://holistichouse.vercel.app.
- Screenshot viewport/DPR/browser chrome crop not independently verified; compare page only against the same guest route/state after rendering.

## Visual block map (keep/move/restyle)
| Order | Approved region | Existing owner / new selector | Action |
| --- | --- | --- | --- |
| 1 | Holistic House SUPPORT wordmark; language, help and profile | brandBar, brandActions | Keep; help links to existing Ali |
| 2 | Gold lotus, centered serif title, coaching subtitle | hero, lotusMark, heroTagline, heroLead | Restyle/add |
| 3 | Laptop/sunrise image, clickable play, small warm decorations | heroStage, laptop, playLink | Add; play navigates to real #meet-andrey introduction |
| 4 | Green For Me / For Business switch | audienceSwitch | Add; existing business topic state |
| 5 | Four progress dots + Question 1 of 4 | progress | Restyle |
| 6 | Four photo-led topic choices in large two-column cards | question, choiceMedia, choiceContent | Restyle; real quiz IDs |
| 7 | OR and Describe your goal input + mic | orDivider, goalComposer | Add; local-only input, mic focuses iPhone keyboard for native dictation |
| 8 | Emerald Next CTA | next | Add explicit next step action after selecting a choice |
| 9 | Areas of Support, All services, six original category links | categories, categoryGrid | Restyle; second row intentionally scrolls below fold |
| 10 | Shared sitewide dock and 3-offer lower catalog | original components | Keep untouched |

## Privacy, behavior and page state
- Four original steps, rankAssistProducts, business vs personal matching, budget, summary and actual published offer routes remain.
- A choice sets the current step's answer; Next is disabled until selected and advances one question. Last step shows original recommendations submit only after all four answers.
- For Business preselects business_support; For Me clears it. Changing the topic clears downstream choices, and progress dots can revisit completed steps.
- Goal text remains in React memory and is included in the local result summary. No storage, AI call, CRM submission, hidden tracking or unapproved microphone permission.
- The photo Play icon links to the existing public intro at #meet-andrey, not autoplay or a fake generated video.
- Lower order/details/WhatsApp/Telegram, optional Ali route ?assist=chat, shared mobile dock and desktop page are unchanged.
- Use first-party existing imagery and CSS tokens, no duplicate popup or external video rendering.

## Acceptance and limitations
- Real rendered Chromium + WebKit guest at CSS widths 320/354/390/430, EN/RU/ES; accessibility, all four quiz steps, progress backtracking, business budget, local goal input, six category anchors, existing Ali and seven-tab dock.
- Compare owner screenshot against matching crop/viewport/DPR and rendered page, review overlay and prevent horizontal overflow or fixed-dock overlap. An illustrative mock is not itself a browser screenshot.
- Focused Node and Next/TypeScript/lint/build via current mandatory CI; don't claim tested/visual/live before actual evidence.
- One coherent protected PR, mandatory Core/Specialist/hh-merge-check and native merge; only existing hourly production publisher. No new Vercel builds, paid providers or schedules.
