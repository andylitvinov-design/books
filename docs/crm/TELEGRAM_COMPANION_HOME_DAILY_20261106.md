# Holistic House Telegram home + companion daily greetings (source design, 2026-11-06)

## Exact user-reported problem

The screenshot is a **Telegram private chat with the CRM bot titled “Holistic House”**, showing the drawing-review stage, a single *Skip drawing* inline button and no persistent bottom navigation. The separate, feature-off client-notification AI Companion is not this chat. Do not reuse its tokens or claim that a web deployed source created a working CRM Bot API interface.

## User journey

- `/start`, `/menu`, `/help`, `hello`, `Привет`, `Privet`, `hola` opens a short localized greeting and a **persistent 4×2 Telegram reply keyboard**: AI chat, 0–10 check-in, meditation, create video, my materials, personal review, daily greetings, language. Labels are fixed, localized, and handled by the **same signed CRM webhook**. Telegram does not emit a “user opened chat” event, so a previously sent keyboard is the persistent navigation and `/menu` reopens it. Never claim that opening alone triggers server code.
- `🤝 Личный разбор` or `/review` enters the **existing** separate private six-step diagnostic and `/agree` path; `/start hhreview_ru|en|es` continues working, including original drawing and consent. A user's active diagnostic state is not erased by switching to Home, AI or Check-in; no new lead/contact created by the menu.
- AI chat: `/ai` shows a clear disclosure and consent button, `/ai_on` begins **reviewed deterministic dialogue** (no actual external LLM, no health diagnosis, no read of subscribed private files), `/ai_off` ends only AI mode. Plain text routes to the AI guide only while the explicit mode is active. Store no raw question/history.
- Check-in: asks for a single 0–10 energy number; replies with a public tests link and **does not save the number**, report results or claim psychological efficacy.
- Meditation, video, materials: safe published site links. Video text must explicitly state MP4 is **not** being generated/delivered by this CRM bot. All links are public; private subscription materials need independent verified authorization.
- `/daily` shows a separate consent explanation. Only a subsequent explicit `hhhome:<locale>:daily_on` callback or `/daily_on` within 15 minutes enables **one** general neutral 9:00 AM America/Toronto greeting on subsequent mornings. `/daily_off` withdraws; `/stop` erases destination and disables AI and daily greetings while retaining existing diagnostic/CRM STOP. No use of marketing/news consent or unrequested broadcasts.

## Implementation contract

- New private `app_private.crm_tg_companion_sessions` with HMAC bot+customer identity, never an arbitrary chat ID; AES-GCM sealed chat ID **only after daily opt-in**, per-chat strict monotonically increasing Telegram update deduplication, explicit consent timestamps, one day/pilot-bound delivery attempt, FORCE RLS and backend-only grants/GUC.
- The CRM webhook keeps existing owner video first, existing callback acknowledgments, and existing six-stage diagnostic. Home is checked only after signed secret verification; `/stop` passes to original CRM STOP. One ordinary message may not both create a companion reply and enter a CRM lead. Callback data has a fixed allowlist.
- The only new scheduled use is inside the existing CRON_SECRET-protected `practice-telegram-digest` slot at 13/14 UTC, internally admitted only at **09:00 Toronto** (DST-aware). At most five opted-in recipients per run to stay inside the existing 60s function budget. The stored attempt date is committed *before* Telegram send; unknown sends are never blindly replayed. A different timezone, larger batch, or exact 9 AM guarantee for more than five active accounts needs a separately approved worker/capacity change. No new cron, bot, provider, webhook, paid AI or bucket.
- All new customer messaging guarded by **`HH_CRM_TG_COMPANION_ENABLED=true`** and existing signed CRM transport approval; automatic delivery further requires **`HH_CRM_TG_COMPANION_DAILY_ENABLED=true`**. BOTH default off. Feature activation is not automatic from merge or Vercel READY; require actual bot getMe/getWebhookInfo and one opted-in real chat E2E first.
- No UI screenshot can prove delivery/acceptance. Production acceptance must verify exact Vercel deployment SHA and alias, real private phone Telegram `/menu` persistent reply keyboard, button routing, RU/EN/ES language, `/review` old diagnostic, `/stop` and `/daily_off`, daily cron slot + dedupe and no private content leaked.

## Risks and rollback

- If Telegram menus conflict with existing six-step diagnostic on any client, toggle `HH_CRM_TG_COMPANION_ENABLED=false`, redeploy without touching CRM webhook, token or diagnostic source. No automatic messages are sent when the flag is off.
- For daily capacity beyond a pilot of five, keep `HH_CRM_TG_COMPANION_DAILY_ENABLED=false` until a bounded, separately authorized per-chat scheduler is proven; do not spam or claim scaled reminders.
- If bot-only chats not connected to the verified CRM business account are encountered, do not create sessions, send reply or infer identity from name or username. Telegram's `@holistichouse_bot` remains independent from owner-only `@andydotbot` and the unapproved #3647 video pipeline.

GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=verified_for_pure_policy; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES

## Native Telegram menu bootstrap (second, independently verified UX layer)

Telegram's 4×2 **reply keyboard** is attached only when a bot actually answers
`/menu`, `/start` or another first-party choice. Telegram does not emit an
update on chat *open*, so an unsolicited on-open greeting is impossible.

To make the **built-in Menu button** useful even when the reply keyboard is
hidden, the existing 09:00 Toronto CRON_SECRET-protected
`practice-telegram-digest` now schedules a bounded metadata-only Telegram
command-menu reconciliation through Next `after()`. No new cron or Bot token.
The companion must be enabled, production CRM Telegram transport verified,
`getMe` must match the expected bot, and `getWebhookInfo` must show the exact
existing signed CRM webhook before any Bot API mutation.

- `getMyCommands` + `setMyCommands` operate only on
  `BotCommandScopeAllPrivateChats` (default, EN, RU and ES language variants).
  Earlier BotFather/default/diagnostic command descriptions and order are
  preserved, and any owner-specific `BotCommandScopeChat` override is untouched.
  The job refuses malformed, duplicate or over-capacity existing command lists.
- If the existing global menu is a Mini App `web_app`, do **not** replace it;
  log a sanitized `existing_menu_reserved` reason instead. If it is default,
  set/read back `MenuButtonCommands`. No `setWebhook`, `sendMessage`,
  `drop_pending_updates` or customer broadcast is performed.
- Each update is provider-readback-checked; repeated daily runs are idempotent
  and should make no changes once the menu is correct. A provider rejection,
  missing bot identity or deployment without scheduled execution is **not LIVE**.
- The native Menu lists: menu, AI, AI off, check-in, meditation, materials,
  video studio, personal review, daily opt-in/out, languages, and STOP.
  Tapping a command sends that command to the existing signed webhook; the
  4×2 reply keyboard still appears on the bot's first actual message response.

### Acceptance still required

Check Telegram `getMyCommands` / `getChatMenuButton` readback on the real
existing CRM bot (private scopes and RU/EN/ES), confirm that the daily cron
actually ran, and physically inspect the iPhone chat's native Menu plus
`/menu` greeting. A user must explicitly opt in to `/daily` before any
scheduled message is sent. Maximum five scheduled messages per morning remains
an intentionally limited pilot; do not promise delivery to unlimited clients.
No generative LLM or private subscription-material access is added here.

## Immediate signed first-home bootstrap (release follow-up)

The scheduled 09:00 America/Toronto command bootstrap is retained as a
fallback, **but a client no longer needs to wait until tomorrow** after
deployment. Once the existing signed CRM Telegram webhook has successfully
committed a Companion reply to a genuine private-chat `/menu`, `/start`,
`/home`, or supported short greeting, Next `after()` checks native Bot
commands against the **same existing** verified CRM bot. A fixed global
database rate bucket (maximum **one** manual bootstrap attempt per rolling
hour across serverless instances) prevents each `/menu` from generating
additional provider traffic. This operation is independent of newsletter
and `/daily` opt-ins; it calls only the metadata API
(`getMe` / `getWebhookInfo` / `getMyCommands` /
`setMyCommands` / `getChatMenuButton` /
`setChatMenuButton` when safe), never `sendMessage` or
`setWebhook`. It does not change owner-scoped or group commands,
or overwrite an existing Mini App menu.

Privacy-preserving diagnostic markers:
`HH_CRM_TG_COMMAND_MENU_READY` with `source: first_home` or
`source: morning_cron` and number of changed scopes (no bot token,
chat ID, private message or clinical data);
`HH_CRM_TG_COMMAND_MENU_NOT_READY` with an allowlisted reason;
`HH_CRM_TG_COMMAND_MENU_SETUP_FAILED` without any provider payload.
No provider receipt means no confirmed Telegram live behaviour.

**Live acceptance:** after exact protected PR merge + Vercel READY
deployment, user sends `/menu` on the existing Holistic House bot,
receives the 4×2 reply keyboard and checks the *native* Menu button.
After this customer-initiated exchange, inspect the sanitized setup marker
and same-bot readback. No bot API operation is triggered merely by
opening an existing Telegram chat. The daily greeting still requires
separate `/daily` consent and has the 09:00 Toronto,
max-five-per-morning pilot bound.
