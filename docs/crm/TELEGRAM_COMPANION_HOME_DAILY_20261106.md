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
