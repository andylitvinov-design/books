# Holistic House — Subscriber AI Companion · P1 source release

Owner request: activate a lightweight assistant **inside the bot that already delivers subscriber materials**, without creating another bot or overriding the separate CRM webhook. Source scope: subscriber entry, independent consent/revoke, customer menu, reviewed multilingual rules, durable encrypted text outbox, safety/retention. This is intentionally distinct from Draft #3647's CRM-bound, unapproved video-render pipeline.

## First principles / what is intentionally NOT claimed

- Subscribed-client bot identity must be read back in Production (`getMe.id/username`, `getWebhookInfo.url`, latest real client material sender). `HH_CLIENT_TG_BOT_TOKEN`/`HH_PRACTICE_TG_BOT_TOKEN` is the source of actual bot ID; there is no hard-coded assumption about `@andydotbot` or `@holistichouse_bot`. Do not register another webhook, call `setWebhook`, or re-link another bot for this feature.
- The same existing signed route `POST /api/app/notification-channels/telegram/webhook` remains the only client webhook. Owner-video, owner-audio, owner-AI have priority. Client `/start <token>`, `/stop`, ordinary notifications, CRM and legitimate reply relay remain separate. Numeric owner pairing is checked in shared-practice mode.
- This phase is a **reviewed rule-based dialogue**; no external LLM, message history, account-linked private content, XP debit, personal video render, third-party data send or subscriber marketing. Public library, tests, practices, master-review form, and Video Studio links are honest navigations, **not evidence of orders or payments**.
- No new paid provider, bot, bucket or cron. Use existing production app DB and existing daily housekeeping as a recovery/retention backstop. Near-real-time production drain depends on `after()` and may need later verified fast worker, so neither queue p95 nor delivery rate is guaranteed.

## Feature flags (ALL default OFF)

1. `HH_SUBSCRIBER_AI_SCHEMA_READY=true` only after `20261106080000_hh_subscriber_ai_companion_v1.sql` applied to the authorized production app DB and SQL role/RLS privileges independently verified. This flag stays true even when the chat feature is paused so `/stop` can purge old AI sessions.
2. Existing `HH_CLIENT_TG_LINK_ENABLED=true` and exactly one verified, already-owned client bot mode with matching signed webhook and allowed updates (`message`, `callback_query`). No overwriting foreign webhooks.
3. `HH_SUBSCRIBER_AI_ENABLED=true` only after signed same-bot test, staff numeric identity exclusion, verified database and privacy audit.
4. `HH_SUBSCRIBER_AI_SEND_ENABLED=true` only for explicitly consented canary chat(s) after send budget and Telegram rate preflight. **Current code has no per-chat pilot allowlist**; therefore enable only after owner approves unrestricted opt-in public access and first-party tests. Do not substitute a bot username for verified client identity.
5. `VERCEL_ENV=production`. Preview must never send Telegram messages.

## API contract / UX

- `/ai`, `/start hhai_ru|en|es`: versioned `hh-subscriber-ai-v1` explanation with `hhai:agree/decline` buttons. One explicit button confirms consent; the initial `/ai` is **not consent**. No customer free text before opt-in is persisted.
- `/ai_off` or `hhai:off`: revokes only this AI consent and suppresses unsent AI replies; material subscription and client link remain intact.
- `/stop`/`/unsubscribe`: AI chat and queued sends are erased/suppressed first, then existing global subscription STOP flow executes unchanged; no client re-consent is inferred from a historical chat.
- Once active: plain text, `Ау`/`hello`/`hola`, questions about stress, confidence, money, learning etc. respond using the existing `lib/holistic-support/rule-conversation.mjs` editorial corpus, with immediate-risk safety preflight from `resolveHomeGuideQuestion`. No conversation is sent to a hosted model; responses are not personalized diagnoses.
- Menu: `materials`, `practice`, `video`, `tests`, `master` links are public first-party resources only. Private material and XP are never inferred from Telegram username/chat or a forwarded screenshot.
- Client button callback must originate from a private chat with matching `from.id==chat.id`, current bot identity and fresh message. Callback data is finite, fixed action tokens: no content or account IDs.

## Storage, delivery, failure modes

- `app_private.subscriber_ai_sessions`: HMAC bot+chat key, encrypted Telegram ID (AES-GCM AAD per UUID), locale, consent_version/time, 15-minute pending consent, STOP/last-update ordering. No raw questions in DB/logs.
- `app_private.subscriber_ai_outbox`: one encrypted fixed/reviewed answer per Telegram `update_id`, unique per session/update, capped at 50 chat responses/day, separate `pending/leased/done/dead/unknown/suppressed` state; no automatic retry after an uncertain provider response or lease expiration.
- A single small drain runs via existing `Next.after()` after signed webhook accepts the input transaction. `hh_app_backend` FORCE RLS tables and special transaction-local flag; no direct `anon`/`authenticated` grants. Held session row lock while sending serializes `/ai_off` / `/stop` commits behind any in-flight request. A definite HTTP 429 is retried by provider delay; 4xx rejected; 5xx/timeout unknown, never re-sent automatically.
- Existing daily housekeeping retries pending deliveries when enabled and deletes stale outbox rows after 30 days, inactive/pending sessions after 7 days and long-idle sessions after 90 days. A daily cron is **not** near-real-time crash recovery.

## Acceptance gates

- [ ] Local `node --check`, focused policy tests; full required protected Core, Guard and Messenger Specialist on exact first PR HEAD.
- [ ] Apply migration with verified FORCE RLS, no anonymous/authenticated grants, session/outbox unique constraints, consent status.
- [ ] Verify actual bot identity/active webhook and confirm it is the same sender as one previously delivered subscriber material.
- [ ] Enable canary opt-in and perform true `/ai` → consent → ordinary text RU/EN/ES → `/ai_off`, confirm material delivery survives.
- [ ] Confirm `/stop` suppresses AI and ordinary subscription; owner-only `/audio`, `/combine`, `/video`, `/ai` unaffected.
- [ ] Force duplicate updates, stale callbacks, STOP race, 429/5xx/timeout; actual provider receipt is NOT `read` or proof of user consumption.
- [ ] Check no secret/chat ID/raw question in logs, no unexpected paid usage; finally verify protected merge, Vercel production READY serving exact merged SHA and real opt-in Telegram receipts.

## Not yet in this phase

P2 authenticated material-delivery ledger + content rights and actual per-material `Обсудить с AI` callback; P3 optional real free-model reply with independent external inference consent; P4 approved #3647 video/XP plan/nonce, durable worker/recovery/ffprobe/account-bound delivery and real MP4 readback. Do not flip feature flags or declare end-to-end product finished until these gates are met.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES
