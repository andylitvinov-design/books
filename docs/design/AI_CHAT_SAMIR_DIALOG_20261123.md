# Samir AI Chat, reconciled with merged PR #5476 · 2026-11-23

Route `/{en|ru|es}/app/messages?section=ai` stays the existing real AI Messenger, not a duplicate chatbot.

Merged #5476 already owns the approved genie-scene hero, WhatsApp-like welcome, two goal actions, responsive CSS and optional menu. **Preserve its exact layout**. This delta only assigns the existing default male presenter ID `alex` the user-approved editorial display name Samir, reuses the existing genie artwork and unchanged voice ID/provider, adds dynamic EN/RU/ES greeting, and connects BOTH existing goal actions to `sendSelectedTurn`. Previously the buttons only populated the draft; now they start the actual Free conversation or show existing Pro Gemini consent.

Keep the other three personas, history, locale switching, microphone/STT, single mobile dock, original video and optional topics intact. Direct user-entered text must still require usual provider consent; no new API, TTS tier, service, auto-orders or spending.

Acceptance: existing exact-head Core/Specialist, TypeScript/Next, responsive iPhone 320/354/390/430 and real click/keyboard/voice tests. Reconcile any overlap with open voice PRs #5466/#5447. A protected merge is not evidence of LIVE; existing hourly Vercel publisher is the only routine release path.
