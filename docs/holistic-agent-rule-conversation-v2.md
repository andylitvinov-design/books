# Holistic House AI/Chat — Reviewed Rule Conversation v2

**Date:** 2026-11-05  
**Scope:** Existing `/{ru,en,es}/app/messages?section=ai` and the authenticated `/api/holistic-agent/turn`; not a second messenger or standalone model.

## Algorithm

1. Keep the existing same-origin, verified-session, bounded input, account RLS, per-minute/daily rate limits and complete safety preflight.
2. For a small allowlist of factual, no-side-effect intents, answer from the reviewed dictionary immediately after those checks; do not load personal measurements, render video, take payment or call a language model.
3. For other questions use the **canonical** selection/consent/safety engine, then its reply may be phrased by the deterministic dictionary if the question matches an explicit intent. Verified catalogue links remain owned by the canonical engine.
4. Match the **new user's explicit topic first**, then use up to the six recent bounded turns. Only prior **user** turns can establish the video/meditation medium. Stop/restart/refusal breaks inheritance. Never inherit medical conclusions, costs, provider or personal attributes.
5. Detect Russian input in an English interface and provide Russian text where clear; remain fully translated in RU/EN/ES. No random model calls or generated external URLs.
6. Unknown input must use the existing safe clarification path, never fabricate an order, a finished video, a diagnosis or a booking.

## Editorial intents

**56 intents × three reviewed languages = 168 fixed responses.** The exact definitions live in `lib/holistic-support/rule-conversation.mjs`.

```
hello, thanks, bye, restart, yes, no, confused, uncertain, identity, capabilities, language, price, privacy, login, human_help, technical, video_definition, video_start, video_both, video_story, video_scenes, video_audio, video_length, video_status, video_delivery, video_download, video_topic, video_context, meditation_context, video_emotion, meditation_emotion, video_minutes, meditation_start, meditation_custom, meditation_voice, meditation_duration, meditation_listen, meditation_minutes, meditation_state, stress, sleep, tired, relationship, confidence, work, purpose, practice, ritual, reiki, course, test, results, analysis, orders, booking, generic
```

## Supported dialogue examples

- “Привет Ау” → brief greeting in Russian, even from English UI.
- “Хочу создать видео про отношения” → clarify purpose; next “Про любовь” carries only video context, next “10 минут” sets duration in the text conversation, not an actual generation order.
- “Как написать сценарий ролика?” → topic → meaning axis → motive → script → tagged scenes.
- “Как скачать видео?” or “Отправь в Telegram” → explain real prerequisites, never claim download/send happened.
- “Помоги подобрать медитацию” → current and desired state, then duration and voice preference.
- Test questions, prices, privacy, bookings, practicing specialist, course, Reiki, relationship/stress and site errors → concise topical answer followed by at most one useful clarification.

## Acceptance / regression

Run `node --test tests/holistic-agent-rule-dictionary.test.mjs tests/holistic-agent-chat-first.test.mjs tests/messenger-ai-rail.test.mjs`, plus real protected Core/Specialist/CI and browser/WebKit checks at 320/354/390/430 px. On LIVE, verify a **signed-in** prompt-response in each language and iOS keyboard behavior; code merge and static tests are not proof of authenticated LIVE interaction.

**Privacy:** No new transcript storage, analytics, external call, secret, background service, paid LLM or automation is introduced by this dictionary. Historical intent logs must have a separate opt-in privacy design before implementation.

**Limitations:** A reviewed dictionary improves conversational coverage but is not open-domain reasoning. For novel, ambiguous or sensitive issues it asks a clarification or follows the existing human/safety path.
