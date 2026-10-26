# Holistic House · Telegram diagnostic intake and CRM SalesBot

26 October 2026. Source: codex/public-book-library. Related issues: books #985, #990, #2058, #1302.

## Public reverse-engineering evidence

At EzoHata the public diagnostic CTA opens @ezohata_diagnostics_bot and asks for a photo and a request. Its private SalesBot rules and proprietary CRM UI are not publicly accessible. This is a clean-room functional equivalent, not a code copy.

## Customer journey (EN / RU / ES)

1. Visitor chooses the guided Telegram diagnostic on the free situation review page. This button is OFF until the dedicated Telegram CRM bot is connected and owner approves public rollout. The deep link contains only a static language code, no personal data.
2. /start hhreview_ru (or en/es) explains how data is used. A lead is NOT created yet.
3. /agree creates the one-time-consent record and a lead in the EXISTING encrypted CRM inbox. No marketing consent is inferred.
4. /situation or /energy selects the focus; the client writes a short question, or /skip.
5. Optional one photo, maximum 5 MB, or /skip. Telegram processes the client-submitted photo. Sensitive documents should instead use the protected website upload.
6. Request is handed off to Andrey in My Practice → CRM → Messages, where he can read it, see the photo privately, change stage, add follow-up, and manually reply to the Telegram contact.
7. /stop blocks further replies and records suppression, also for conversations that predate this intake. No appointment, payment or diagnostic result is automatically confirmed.

## Architecture, security, cost

- Official Telegram secret-header verification before any webhook processing.
- Dedicated bot credentials, no reuse or webhook hijacking of the existing owner/practice bot.
- Restricted hh_app_inbox DB role; app_private.crm_tg_diagnostic_sessions state with FORCE RLS and hashed chat identity. No duplicate CRM Contacts, CRM Messages or user health storage.
- Consent and CRM incoming message are saved atomically. Monotonic update ID protects against replay. Maximum 10 fixed, preapproved guidance messages per UTC day per chat.
- Owner-only photo access through authenticated CRM endpoint, with a 5 MB limit and JPEG/PNG sniffing. Telegram bot token, file ID and file URL never exposed to the browser.
- Manual responses retain the existing CRM provider acceptance, suppression, owner session, limits and idempotency checks.
- No new paid API, mass send, marketing campaigns, AI model calls, test results or medical information in outbound prompts.

## Production rollout (fail closed)

Vercel server-only settings (never paste tokens into GitHub issues or chat):
- HH_CRM_MSG_TELEGRAM_TOKEN: BotFather secret from a NEW dedicated bot.
- HH_CRM_MSG_TELEGRAM_BOT_ID: OPTIONAL. The numeric ID is derived server-side from the non-readable BotFather token prefix, then MUST match Telegram's official getMe response when owner connects. A supplied mismatched ID fails closed.
- HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET: separate random secure webhook secret.
- HH_CRM_MSG_TELEGRAM_USERNAME: verified BotFather username without @.
- HH_CRM_MSG_TELEGRAM_ENABLED=true
- HH_CRM_MSG_TELEGRAM_PILOT_ENABLED=true
- HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID: owner's one allowlisted private chat.
- HH_CRM_TG_DIAGNOSTIC_ENABLED=true
- HH_CRM_MSG_PRODUCTION_APPROVED and HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED: KEEP DISABLED UNTIL E2E.

1. Review and apply 20261026143713_hh_crm_telegram_diagnostic_intake_20261026.sql ONLY to Holistic House Supabase; check restricted grants and RLS.
2. Redeploy production branch, confirm Vercel READY and SHA. Owner signs in to https://holistichouse.vercel.app/ru/app/practice?panel=clients → CRM → Messages and connects dedicated Telegram. Provider getMe and getWebhookInfo must confirm correct bot and callback; do NOT replace other app's webhook.
3. From allowlisted owner chat, run /start hhreview_ru, /agree, /situation, short note, photo, /skip, private photo opening in CRM, manual owner answer, second unauthorized chat refusal, /stop and duplicate-update tests. Confirm client Telegram RECEIVED reply (provider accepted != delivered). Repeat mobile EN/RU/ES.
4. Only AFTER owner approval and E2E evidence, enable HH_CRM_MSG_PRODUCTION_APPROVED=true and HH_CRM_TG_DIAGNOSTIC_PUBLIC_ENABLED=true and redeploy. This reveals public CTA. No activation of WhatsApp/Meta, automation marketing or bulk sends.

Emergency disable HH_CRM_MSG_TELEGRAM_ENABLED=false and redeploy. The feature-only kill switch is HH_CRM_TG_DIAGNOSTIC_ENABLED=false.

## Evidence still required

Real BotFather credential and owner pilot, production DB migration, provider acceptance plus client receipt, mobile 320–430px live tests, exact deployed SHA. A green unit test or HTTP 200 alone does not prove E2E.
