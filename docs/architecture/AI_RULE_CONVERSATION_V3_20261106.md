# Holistic House — rule conversation v3: expanded editorial dialogue

Date: 2026-11-06
Route: `/ru|en|es/app/messages?section=ai` (existing signed-in / guest Messenger).
Production branch: `codex/public-book-library`.

## Design and scope

The existing `rule-conversation.mjs` retains its 56 reviewed intents and safety-first behavior. V3 adds 29 precise video-production intents and 32 meditation, messenger, course and test intents: **117 unique intents, 351 curated RU/EN/ES responses**. This is not an open-domain LLM. It makes no external calls, produces no video, performs no account action and does not create additional databases.

Pure modules:

- `lib/holistic-support/rule-video-v3.mjs`: video goals, category, subtopic, idea, meaning axis, motive, script, storyboard, emotional strategy, scene count and tags, orientation, unique footage, captions/text, voice, soundtrack, render/export and rights.
- `lib/holistic-support/rule-support-v3.mjs`: guided meditation creation, optional breath/imagery, voice/music, sleep, chat voice/Telegram/WhatsApp, guest and privacy states, keyboard errors, tests, Academy, OPORA, Reiki initiation and account routes.
- `lib/holistic-support/rule-conversation.mjs`: applies focused V3 cues **after** safe social greetings and explicit short follow-up context, **before** broad regex topic classification. Fallback stays the reviewed V2 reply.

Exact short follow-ups (yes/no, time, current/desirable state) retain up to six recent **user-chosen** turns, never assistant-derived sensitive traits or consent. New topic explicitly overrides previous topic; refusal/reset breaks inheritance.

## Quality gates

1. Explicit danger and human-review states continue through the canonical safety/consent preflight. The browser's existing `requiresProtectedReply` has priority over guest-safe editorial rules. No diagnosis, clinical guarantee or emergency instructions from the lexicon.
2. For private requests the API continues same-origin, verified session and account, input constraints, minute/day rate checks, safety preflight, RLS and opt-ins **before** deciding to answer. A narrow allowlist of 12 additional factual FAQ intents can respond without scanning the personal catalogue.
3. No status, booking, video output or payment is claimed without an actual checked server transaction. Rendering and Telegram delivery are described as separate stages.
4. Real video-wizard steps, categories, user selections, and signed-in handoff stay in their existing state machine; the vocabulary never silently edits it.
5. `tests/holistic-agent-rule-dictionary.test.mjs` now covers 85 new examples in RU/EN/ES, baseline 69 cases, ambiguity/regression, safety and no-I/O assertions. Run the existing source/CI suites, actual mobile browser checks and the protected Core/Specialist gate.

## LIVE release acceptance

Protected squash merge is required; production Vercel deployment must be READY with merge SHA (or proven descendant) on `holistichouse.vercel.app`. Validate real mobile typing and input geometry with/without keyboard, guest rule responses, linked order vs factual answers, RU/EN/ES short follow-ups, and video-director handoff. Passing static tests or a build alone cannot certify a real account or Telegram delivery.

No new paid inference, cron, workflows, storage of user conversation, notification permissions or additional services are introduced.