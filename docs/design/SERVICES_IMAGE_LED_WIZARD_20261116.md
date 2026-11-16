# Services / Assist — owner image-led mobile redesign (16 Nov 2026)

## Reference / scope
- **Actual screenshot (first attachment):** Holistic House guest Services, English, mobile, four simultaneous rows of questions, icon-only six category chips, seven-item dock.
- **Approved target (second attachment):** same **guest Services first screen**, displayed in Russian, warm ivory/emerald editorial design, top lotus wordmark and RU language picker/profile, natural-light hero, emerald question card showing **one of four** questions and a four-point stepper, photo-backed cards in a **three-column × two-row** grid, existing bottom navigation. Match the page/view/role; use same locale when comparing final pixels. The uploaded concept is phone artwork, not a real screenshot from the route, and does not establish a CSS viewport/DPR.
- **Canonical routes:** /ru/services, /en/services, /es/services. Original chat remains ?assist=chat. Desktop (>760px) and existing lower 14 service panels are not rewritten.
- **Conflict resolved by latest owner instruction:** PR #4772's "four questions all visible" was the previous approved version. This screenshot request supersedes that layout requirement. Keep all four substantive questions and the additional **money/business** and wellbeing options from #4772, visible as smaller secondary choices on the first step rather than deleting them.

## Measured design decomposition (phone CSS widths 320/354/390/430)
1. Existing mobile outer page padding ~16px; no new global header or duplicate dock. Quiz component owns one **mobile-only** brand row (~55–64px) with lotus, two-level Holistic House wordmark, RU/EN/ES dropdown and a real profile link.
2. Hero: wide shallow banner (~142–158px at 320–430px), 23px radius, existing optimized Holistic House sunrise/landscape photo fading behind ivory text, serif title 29–41px and short helper.
3. Question card: rounded 23–29px emerald gradient with quiet botanical texture, count “Question 1 / 4”, four real focusable progress buttons (only reached/answered steps may be revisited), heading 20–26px, **2×2** ivory answers with line icons and ~60–65px minimum height. First question has 4 large illustrative primary choices, plus money/business and wellbeing as compact secondary options. Later three questions each have 4 main answers.
4. Choosing a valid answer immediately moves the active question forward and focuses its heading for keyboard/screen-reader continuity; no new route or bottom overlay. Once all four are answered the final screen shows “See recommendations”; existing client-only ranker renders actual offerings and existing order/Details behavior.
5. Directions: title and “all services” link; six genuine linked cards displayed **3×2**, ~77–89px top photo band, floating service icon, short 1–3-line service name, varied warm neutral/pink category colors, soft elevation. Reuse existing public image assets through next/image; no new paid assets or media generation.
6. Seven-item **shared** site dock remains completely untouched. Responsive 320px text wrap and original /services?assist=chat link remain available. No unsolicited modal, no localStorage, no server-side collection of quiz replies.

## Functional acceptance
- One active question is rendered at a time; four progress circles; first four large choices plus extra business/health visible; choosing moves to next question; back to answered previous question works.
- /ru, /en, /es keep their translations. Spanish's dedicated route must include the identical quiz component. All six categories lead to their existing published destinations; business opens /{locale}/services/business-consulting.
- Last answer reveals CTA; CTA produces real ranking through rankAssistProducts and existing AssistTopRecommendations, without inventing a booking or sending user data.
- 44px header controls, visible focus, meaningful aria state/label, 320px no horizontal overflow or dock collision. For a phone height of 844 CSS px, the first card and category heading must be usable above fixed dock; lower photo tiles may require normal vertical scrolling — never crush the design to fit a tall mockup's differently sized phone.
- Retain all 14 lower service panels and their Details / Order & Messenger interactions. Do not alter Telegram/WhatsApp/CRM flows from other concurrent PRs.

## Verification and release gates
- Focused test: tests/services-four-question-quiz.test.mjs. Existing public Services browser acceptance now tests 1 → 2 → 3 → 4, business recommendation, actual photo cards, language variants and unified dock before continuing original Ali and 14-card regression.
- Compare **rendered** RU first-step candidate to same-state RU reference at 320/354/390/430 in Chromium and WebKit. Crop any phone chrome before image overlay and record differences. English first attachment is a historical actual, not a same-language reference for pixel overlay. **No live visual match is claimed until browser captures and real-phone interactions are completed.**
- One atomic source tree / one new PR HEAD. Protected exact-HEAD CI, Specialist and hh-merge-check must pass before native merge; ordinary Production release exclusively by the existing hourly Vercel control-branch publisher. A merged PR alone is not proof of LIVE.
- No new service, account, API, media provider, branch push loop, preview, Vercel deployment or CI workflow frequency.
