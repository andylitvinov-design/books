# Holistic House · Telegram diagnostic intake and CRM SalesBot

26 October 2026. Source: codex/public-book-library. Related issues: books #985, #990, #2058, #1302.

## Public reverse-engineering evidence

At EzoHata the public diagnostic CTA opens @ezohata_diagnostics_bot and asks for a photo and a request. Its private SalesBot rules and proprietary CRM UI are not publicly accessible. This is a clean-room functional equivalent, not a code copy.

## Owner-authored conversation V2 · 26 October 2026

**New Telegram conversations use six natural, first-person stages from Andrey; no visible `/agree`, `/stop` or topic slash commands.** The old command-based V1 engine is retained exclusively for already-running consented V1 sessions (`flow_version=1`). An intentional new Telegram **Start** begins the V2 intro. The additive production migration `20261026171737_hh_crm_telegram_dialogue_v2_20261026.sql` adds an allowlisted `drawing` stage, version and broad topic, retaining existing encrypted CRM messages, contacts and RLS FORCE.

1. **Greeting + explicit, narrow personal-response consent:** “Приветствую! Меня зовут Андрей…” with one visible button **Да, начинаем**, or **Не сейчас**. Consent mentions Telegram photo processing and no marketing; no CRM lead is written before affirmative choice. No implied health diagnosis.
2. **One topic:** Деньги / работа, Энергия / самочувствие, Отношения, Другое. This is a simple broad category in the private session, not a clinical score.
3. **Optional recent portrait:** a voluntary Telegram photo (≤5MB JPEG/PNG), or **Пропустить фото**. Telegram as third-party media processor is disclosed. Photo bytes are fetched **only** by an authorized owner through the existing secure image proxy; the Telegram file ID stays encrypted in a private CRM message.
4. **Goal and difficulty:** one free-text message answering “цель / сложность / любые детали” (max 1200 chars), stored as one new incoming message in the existing owner CRM contact/thread. No symptoms, diagnoses, lab results or test scores should be submitted to Telegram.
5. **Optional hand-drawn ME–GOAL–OBSTACLE diagram:** a separate second JPEG/PNG (≤5MB) or **Пропустить рисунок**. In CRM the two encrypted media messages carry **portrait** / **drawing** distinction and display different accessible labels; no new media table or public URL.
6. **Personal acknowledgment + first-party coaching questionnaire:** link to the existing `/{en|ru|es}/coaching/intake?topic=<allowlisted category>` (verified route), with instructions to **explicitly submit** answers using the secure questionnaire. Saving a draft or opening the link does not send answers, create a new request, confirm a booking or prove a payment. The questionnaire is its own separately consented CRM intake: **do not claim an automatic link to the Telegram CRM thread**, and do not put contact/chat identifiers into its URL.

All text and buttons are mirrored in EN/RU/ES. Server sends only the owner's preapproved text/keyboard, no paid AI, unsolicited outreach or arbitrary external URLs. Legacy Telegram `/agree`, `/skip`, `/stop` remain accepted as safety/backward-compatibility commands **but not shown as the primary user interface**; human-language “Стоп” / “Stop” / “Parar” still suppresses contact. No marketing opt-in is inferred. If no authorized delivery test has taken place, **status remains BLOCKED for external E2E**, even when CI and Vercel READY are green.

**Technical acceptance gates:** versioned migration applied and reconciled with recorded schema version, active legacy sessions left at version 1; `node --test tests/crm-telegram-natural-conversation-v2.test.mjs tests/crm-telegram-diagnostic.test.mjs`; CRM focused CI, eslint, production Next build, WebKit/Chromium EN/RU/ES; guest/private authorization and per-owner RLS; Telegram signed webhook + pilot inbound photo/drawing + owner reply + STOP verified in Telegram itself. Public onboarding, campaigns and paid providers remain OFF until separate approval.

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

### Step A · Verify the existing @holistichouse_bot without a chat ID

The bot's token, configured username and webhook secret live **only** in Vercel Sensitive Production variables. The numeric Bot ID is derived server-side from its signed BotFather token and independently checked against `getMe`; don't copy a numeric ID manually or reveal the token.

1. Sign in as the verified owner and open [CRM → Messages](https://holistichouse.vercel.app/ru/app/practice?panel=crm&crmTab=messages). Expand **Channels**, find Telegram, press **Verify Telegram bot** / **Проверить Telegram-бота**.
2. This guarded owner-only button calls Telegram `getMe` and `getWebhookInfo` using **GET only**. It confirms that the ID and username exactly match the stored values and reports webhook state `not_set/connected/in_use_elsewhere/unknown`. It never installs a webhook, creates a contact or sends a message. A foreign webhook must **not** be replaced.
3. The separate **Connect** button remains disabled until the owner-only pilot is allowlisted: `HH_CRM_MSG_TELEGRAM_PILOT_ENABLED=true` and `HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID` set to the owner's confirmed personal numeric Telegram chat ID. The latter is the *person's chat ID*, **not** the BotFather bot ID. Bot ID is derived automatically; chat ID is not.
4. The only required owner step that cannot be replaced by a safe read-only API is to initiate the private conversation from [@holistichouse_bot](https://t.me/holistichouse_bot?start=hhreview_ru) and confirm their numeric personal Telegram chat ID from a trusted source. Never enable public sending before the pilot gives an actual client-received message and owner CRM/photo/STOP evidence.


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
