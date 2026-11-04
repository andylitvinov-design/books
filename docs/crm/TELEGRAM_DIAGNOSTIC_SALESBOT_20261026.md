# Holistic House · Telegram diagnostic intake and CRM SalesBot

26 October 2026. Source: codex/public-book-library. Related issues: books #985, #990, #2058, #1302.

## Public reverse-engineering evidence

At EzoHata the public diagnostic CTA opens @ezohata_diagnostics_bot and asks for a photo and a request. Its private SalesBot rules and proprietary CRM UI are not publicly accessible. This is a clean-room functional equivalent, not a code copy.

## Telegram buttons shown ABOVE the input · 26 October 2026

For @holistichouse_bot the previous Telegram **ReplyKeyboardMarkup** was
displayed under the message composer. New messages with choices now use
**InlineKeyboardMarkup** (buttons attached immediately below the latest bot
message, in the chat area and above the text input), as requested by the owner.
Buttons include **Да, начинаем / Не сейчас**, the exact four topics, and
**Пропустить фото / Пропустить рисунок**, mirrored in EN/RU/ES. V1 technical
buttons are localized as ordinary human labels, while legacy command text
remains accepted only for backward compatibility; command syntax is not shown
in buttons.

- Use only Telegram's static **callback_data** action IDs, no URLs, scripts,
  chat IDs or sensitive client fields.
- After verifying the official Telegram webhook secret, accept
  `callback_query` only for a bot-authored message in a private chat with
  matching human sender and recipient; enforce stage and locale, ignore stale
  button presses before any CRM mutation, preserve update ID idempotency,
  opt-in, STOP, RLS, per-chat rate limits and encrypted media handoff.
- Acknowledge each valid button tap via `answerCallbackQuery`; remove
  stale inline controls via `editMessageReplyMarkup` after its committed
  state transition. These are official Telegram Bot API methods, not new
  marketing or scheduled sends. A tap is NOT a verified delivery receipt.
- Existing webhook configured with `allowed_updates=['message']` is upgraded
  **on the next signed inbound message** to also accept `callback_query`,
  after verifying that the current callback URL is exactly the first-party
  Holistic House URL. Never hijack a foreign webhook or drop pending updates.
  Future explicit owner Connect also subscribes to both types.
- Old Telegram clients can cache an older reply keyboard from messages
  sent before rollout; only fresh bot messages use the inline-button UI.
  No existing chat, signed invitation, portrait/drawing, or pending request
  is deleted for this change.
- Acceptance: deterministic real Bot API mocks, client/foreign-message
  rejection, signed owner pilot callback flow, V1 compatibility,
  `node --conditions=react-server --test tests/crm-telegram-inline-buttons.test.mjs`,
  CRM lint/build, READY production SHA, and separate real iPhone Telegram
  end-to-end before declaring external delivery complete.

## Owner-authored conversation V2 · 26 October 2026

**New Telegram conversations use exactly six owner-authored replies from Andrey. The Russian messages follow the owner's supplied wording without paraphrase; no visible `/agree`, `/stop` or topic slash commands.** The old command-based V1 engine is retained exclusively for already-running consented V1 sessions (`flow_version=1`). An intentional new Telegram **Start** begins the V2 intro. The additive production migration `20261026171737_hh_crm_telegram_dialogue_v2_20261026.sql` adds an allowlisted `drawing` stage, version and broad topic, retaining existing encrypted CRM messages, contacts and RLS FORCE.

1. **Greeting + explicit, narrow personal-response consent:** “Приветствую! Спасибо за интерес к экспресс-диагностике.” with one visible button **Да, начинаем**, or **Не сейчас**. Consent mentions Telegram photo processing and no marketing; no CRM lead is written before affirmative choice. No implied health diagnosis.
2. **One topic:** Деньги / работа, Энергия / самочувствие, Отношения, Другое. This is a simple broad category in the private session, not a clinical score.
3. **Optional recent portrait:** a voluntary Telegram photo (≤5MB JPEG/PNG), or **Пропустить фото**. Telegram as third-party media processor is disclosed. Photo bytes are fetched **only** by an authorized owner through the existing secure image proxy; the Telegram file ID stays encrypted in a private CRM message.
4. **Goal and difficulty:** one free-text message answering “цель / сложность / любые детали” (max 1200 chars), stored as one new incoming message in the existing owner CRM contact/thread. No symptoms, diagnoses, lab results or test scores should be submitted to Telegram.
5. **Optional hand-drawn ME–GOAL–OBSTACLE diagram:** a separate second JPEG/PNG (≤5MB) or **Пропустить рисунок**. In CRM the two encrypted media messages carry **portrait** / **drawing** distinction and display different accessible labels; no new media table or public URL.
6. **Personal acknowledgment + first-party coaching questionnaire:** link to the existing `/{en|ru|es}/coaching/intake?topic=<allowlisted category>` (verified route), with instructions to **explicitly submit** answers using the secure questionnaire. Saving a draft or opening the link does not send answers, create a new request, confirm a booking or prove a payment. The questionnaire is its own separately consented CRM intake: **do not claim an automatic link to the Telegram CRM thread**, and do not put contact/chat identifiers into its URL.

All text and buttons are mirrored in EN/RU/ES. Server sends only the owner's preapproved text/keyboard, no paid AI, unsolicited outreach or arbitrary external URLs. Legacy Telegram `/agree`, `/skip`, `/stop` remain accepted as safety/backward-compatibility commands **but not shown as the primary user interface**; human-language “Стоп” / “Stop” / “Parar” still suppresses contact. No marketing opt-in is inferred. If no authorized delivery test has taken place, **status remains BLOCKED for external E2E**, even when CI and Vercel READY are green.

**Canonical six Russian text anchors (full verbatim snapshots enforced in `tests/crm-telegram-natural-conversation-v2.test.mjs`):**
1. `Приветствую! Спасибо за интерес к экспресс-диагностике.` → explanation of work/money/relations/move, what is happening, cause, next steps, three-day personal analysis, `Подходит, начинаем?` and the necessary one-line consent/privacy footer
2. `Выбери, пожалуйста, с какой темой сейчас хотелось бы поработать:` → four exact buttons: `деньги/ работа`, `энергия/ здоровье`, `отношения`, `другое`
3. `Вышли, пожалуйста, свое фото (лучше недавнее ...` → voluntary portrait, up to 5 MB; photo does NOT end the request
4. `Спасибо. Фото принял. Напиши, пожалуйста, 1) в чем ключевая задача (цель) 2) в чем сложность 3) любые подробности, которые стоило бы добавить.` (skip-photo fallback omits the claim that a photo arrived)
5. `Спасибо за ответ. Теперь самое важное чтобы я мог разобрать ситуацию ...` → the three shapes `я / цель / сложность/ препятствие`, then separate photo of drawing
6. `Спасибо. Задача принята в работу. И последнее. ...` → real `/{lang}/coaching/intake?topic=business|wellbeing|relationships|other` route, explicit send action

**Restarting an existing pilot naturally:** Send **«Начать заново»** (RU), **“Start again”** (EN) or **“Empezar de nuevo”** (ES) in the same existing Telegram chat to explicitly restart the six owner-written messages. No new public client message, database migration, lead or marketing consent is created by the restart itself. No automated message is sent without this inbound. The STOP boundary remains terminal and cannot be bypassed by the phrase. This avoids requiring users to type a visible technical `/start` command.

The previously consented owner chat may have already reached **10/10 daily replies** in legacy V1. An explicit `/start` V1→V2 transition therefore resets the reply quota **once**, bounded by persistent `flow_version=2` in the same committed transaction. Further V2 restarts cannot reset it, STOP stays terminal and existing encrypted CRM messages/consent are never wiped. No automated bot sends before a new inbound Telegram message.

**Technical acceptance gates:** versioned migration applied and reconciled with recorded schema version, active legacy sessions left at version 1; `node --test tests/crm-telegram-natural-conversation-v2.test.mjs tests/crm-telegram-diagnostic.test.mjs`; CRM focused CI, eslint, production Next build, WebKit/Chromium EN/RU/ES; guest/private authorization and per-owner RLS; Telegram signed webhook + pilot inbound photo/drawing + owner reply + STOP verified in Telegram itself. Public onboarding, campaigns and paid providers remain OFF until separate approval.

## Archived V1 customer journey (ONLY already-running flow_version=1 sessions)

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


## Second Telegram account · controlled owner pilot (26 October 2026)

The first owner Telegram chat remains protected by the existing Sensitive
`HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID`. A different Telegram chat does not get
a response to its ordinary `/start` during this single-chat pilot; this is the
expected fail-closed behavior, not evidence that Telegram rejected the message.

To verify a second account **without public rollout**, the signed-in owner opens
[CRM → Messages → Channels](https://holistichouse.vercel.app/ru/app/practice?panel=crm&crmTab=messages)
and selects **Copy test invitation / Копировать приглашение**. The server returns
an HMAC-bound 15-minute Telegram deep link for one additional tester. Send the
link to the second Telegram account and press Start in that account. It starts
the same explicit `/agree` → topic → question → optional photo flow.
A chat that redeems the link is permitted for **24 hours** or until
`/stop`; the bound identity is hashed, never exposed to browser URLs or logs.
Only one additional active test account is accepted per CRM Telegram channel.
Reusing the link with another account while that pilot is active is rejected.

The owner can then reply to this verified test thread in existing CRM Messages;
manual provider sending still requires an account-scoped committed thread,
latest consent, enabled channel, no STOP and unexpired guest invitation.
The second account must verify receipt on a real phone. No link creates a lead
without `/agree`; no additional public CTA, broadcast, marketing, payments,
SMS or unrelated provider is enabled.

New additive migration:
`20261026173446_hh_crm_telegram_second_pilot_20261026.sql`.
It adds one timestamp column to existing private session state and allows
**authenticated account-scoped, read-only** access to that state for CRM send
eligibility. No second Contacts/Messages database or raw Telegram identity is
stored. Verify FORCE RLS, authenticated-only owner role and wrong-owner denial
before releasing.

**Acceptance stays OPEN:** real second-account Start → consented CRM thread
→ optional photo privately accessible to owner → manual owner reply accepted
and physically received → /stop → blocked further sends. Only after real
provider evidence and separate owner approval may public availability be enabled.

## 27 October 2026 · CRM Automations must display the owner's *actual* six Telegram V2 messages
The owner noticed that CRM → Automations displayed a **generic SalesBot example**
("Start → Welcome → Choice → Offer") instead of the previously approved personal
express-diagnostic script. That generic dry-run graph is **not** the customer
Telegram conversation and cannot represent long text, consent, photo/drawing,
the optional no-photo branch, or the real per-topic coaching link.
**Source of truth remains `lib/crm/telegram-diagnostic-v2.mjs` `copy` and the existing transition function**:
the read-only `telegramDiagnosticV2Script` projects exactly its six outgoing
message texts and inline button labels, using the same canonical language data.
In CRM Automations this script is shown **first**, with full original texts
(EN/RU/ES), four genuine topic selections, both photo branches and the actual
topic-scoped questionnaire link. "Other CRM scenarios" remains collapsed by
default and is explicitly labeled **separate preview/internal flows**, never
the Telegram script. It cannot silently edit or replace the author's live texts.
No Telegram, Supabase, RLS, CRM contact, dispatch or environment flags changed.
A physical second-account recipient test is still independent.

## 27 October 2026 · Language-targeted public entry from EN/RU/ES free express-review pages
The owner-authored English (as well as RU and ES) six-message Telegram V2 script already
exists; it is **not rewritten here**. The free express-review landing now
reuses the existing `TelegramDiagnosticEntry` readiness check and displays the
appropriate **`?start=hhreview_en|ru|es`** public BotFather deep link. The
Telegram state machine takes this trusted static locale from the start payload,
not the user's device language; STOP/consent, optional portrait/drawing and
private intake remain unchanged. If public Telegram is not approved/ready, its
link is not shown and the page offers the secure website intake.

An existing, distinct **personal WhatsApp wa.me** link is offered with an
**explicitly manual** label. It carries only the static `HHREVIEW_EN|RU|ES`
language marker and the publicly safe service page in a customer-reviewed,
customer-sent first message. The existing Meta signed webhook, if a WhatsApp
Business account is ever genuinely connected, may recognize that marker **only
to label an incoming owner CRM enquiry in the source locale**. It does **NOT**
enroll/run a WhatsApp bot, create messaging consent, install a webhook,
auto-send, load a photo, replace the Telegram copy, or enable the Meta production
send gate. This separation is intentional while there is no verified WhatsApp
Business CRM account. The personal WhatsApp link is not evidence of Cloud API.

Acceptance: static links for EN/RU/ES, actual server-readiness fail closed,
Meta HMAC signature before processing an incoming locale marker, no wrong-lang
override or untrusted URL data, protected CRM owner scope; then GitHub focused
CI/build, live domain SHA and real recipient tests per provider. **Do not
claim WhatsApp automation or receipt works until the owner connects a real
Meta Business number, webhook and validates a separate device E2E.**
