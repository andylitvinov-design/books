# Ali · Inner Alchemist — AI Chat mobile entry

Approved visual reference: 18 November 2026, latest "Личный путь" mock.

## Scope
`/en/app/messages`, `/ru/app/messages`, `/es/app/messages`: new conversation-first landing inside the existing authenticated/guest AI Messenger. The other Orders/Chats/News tabs stay unchanged.

## Layout
1. Preserve the four existing top tabs, unified seven-destination bottom dock, history/new chat actions, and in-place language picker.
2. AI header: "Ali · Inner Alchemist" with localized EN/RU/ES subline.
3. Compact 170px hero with a warm, modern wizard guide. Use local `ali-inner-alchemist-hero.webp`, not an external dependency; image is optimized (~3.5 KB). Existing original HeyGen intro remains playable only on explicit tap.
4. Main conversational card: a large heading explaining the purpose, one sentence inviting a goal/difficulty, and the **single real chat composer**, 112px high, with working mic/submit and existing + menu.
5. Eight editable problem starter chips. A tap fills (does not automatically send) the real composer in the current language and focuses it.
6. Compact three-step journey: understand the situation → find fitting support → choose the next step.
7. Main "Start personal analysis" button: send drafted text through existing dialogue pipeline, or open the existing guided support quiz if empty.
8. Existing six service tools are preserved in a collapsed "More ways Ali can help" disclosure, not six big cards on the main entry.
9. After the first message, the standard scrolling chat transcript takes over, with original pinned composer, history, auth and keyboard behavior.

## Constraints
- No new chatbot, vendor, credential, LLM API, video generation, paid infrastructure, or automatic playback.
- Respect original AI guest/consent/secure conversation routes and locale auto-detection.
- Do not convert symbolic/holistic support into diagnosis, medication prescription or guarantees of cure.
- At <=355px and <=740px height, hero/cards/typography scale down; all interactive targets remain around 42–44px; transcript scrolls within existing phone viewport.
- Bottom dock is not duplicated and remains hidden when the iOS keyboard is open according to existing code.
- Original HeyGen EN/RU files, fallback iframe, mic/voice, history, orders and six project actions remain available.

## Release and QA
- `node --test tests/messenger-inner-alchemist-landing.test.mjs tests/messenger-ai-landing.test.mjs` plus existing applicable checks.
- Visual review at 320, 354, 390 and 430px widths and short iPhone heights on PR preview; test actual tap-to-fill, submit, original video, mic, language, Chat/Orders/News and keyboard.
- Protected PR auto-merge, no direct Production deploy. Production via the existing approved hourly Vercel workflow only. Flag new image and text separately for cache checks.
