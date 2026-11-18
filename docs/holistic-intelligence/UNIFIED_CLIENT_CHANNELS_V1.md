# Holistic House · shared Consultant Mind in three client channels

Date: 2026-11-13. Scope: browser Services + already deployed authenticated AI chat + separately owned Telegram Business work (#4549).

## Architecture (no second model)

The source-bounded first-party `consultServiceQuestion` and `service-match.mjs` are the **same algorithm and published-price catalogue** as the authenticated `/api/holistic-agent/turn` route. Services now calls that same Consultant Mind directly inside the existing compact browser conversation on explicit price, comparison, quality and service-choice questions, including recent USER turns. This replaces canned answers *only for supported service intents*, not empathy or safety gates. It reorders only eligible top-three product cards, so confirmed affordability, format and channel restrictions always outrank recommendations. All current public resource and Telegram Request links remain unchanged.

The browser does not upload personal situation text, add a model download or call any third-party API; running first-party consultation logic locally is deliberate for the existing guest privacy promise. The native RU/EN classifier and separately-consented Qwen **are not loaded into the browser**. Therefore these are shared decision skills, not proof that a generative Qwen runs on every client action. The verified first-party model is still used in the authenticated Messenger server route; Telegram Business #4549 reuses the same Consultant/Assist catalogue with an optional gated owned Qwen only for public service titles.

## Telegram and LIVE distinction

The existing service link opens human `@holistichouse` with an approved service code. #4522 handles signed service interest, one format question, explicit confirmation and protected CRM. #4549 owns the intelligent product replies, persistent STOP and optional first-party Qwen path, and #4554 owns generic service Telegram links. Do **not** duplicate these PRs or enable `HH_CRM_TG_CHAT_AUTOMATION_ENABLED` without authorized BotFather Business mode, matching Supabase private migration and real two-account end-to-end proof. A GitHub merge and a Vercel READY status alone do not prove a physical Telegram reply.

## Acceptance

- Focused: `node --test tests/services-assist-unified-secretary.test.mjs tests/assist-service-match.test.mjs tests/consultant-mind.test.mjs`
- Protected exact-HEAD Core + Services specialist + `hh-merge-check`, review/lease and mobile Chromium/WebKit tests
- After protected merge: independently confirm production serving SHA, RU/EN/ES guest Services price/compare/recommendation and follow-up, hard budget exclusion, urgent symptoms, real Request link and no duplicate service recommendation cards
- Telegram physical Business chat + CRM check only after separately authorized platform connection and schema verification

No paid service, new inference gateway, DB, secret, permission, tracking or cron.
