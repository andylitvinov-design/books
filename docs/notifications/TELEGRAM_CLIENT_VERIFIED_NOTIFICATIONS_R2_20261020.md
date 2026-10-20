# Holistic House — verified client Telegram notifications (R2)
Date: 2026-10-20, Toronto. Tracks [#1302](https://github.com/andylitvinov-design/books/issues/1302).

## Shipped source scope
- A signed-in client requests notifications by topic and taps Connect Telegram. No username required.
- Server verifies a dedicated owned bot and its webhook, creates an opaque 32-character one-time token (HMAC stored only), expires after 15 minutes.
- The private-chat Start command proves ownership; Telegram's verified webhook binds an encrypted chat ID to the exact client account. No matching by usernames.
- Client can check status, change topics, disconnect. The private Telegram Stop command revokes the link.
- Saved in-app consultation messages trigger a neutral Telegram notice only after recipient ownership, account status, explicit topics and verified recipient are checked by restricted database function.
- One committed message creates at most one dispatch claim. Accepted Telegram API call is not evidence of delivered/read. Provider failures never cause unsolicited retries.
- All existing Web Push, native notifications, master digest and CRM inbox remain unchanged.

## Production prerequisites (NOT provisioned by GitHub code)
A separate, newly created, owner-controlled Holistic House notification bot is required. Do not reuse HH_PRACTICE_TG_BOT_TOKEN, CRM bot, existing webhooks or Ezohata bot.

Server-only Vercel environment variables:
- HH_CLIENT_TG_BOT_TOKEN — new BotFather bot secret
- HH_CLIENT_TG_BOT_USERNAME — matching bot username
- HH_CLIENT_TG_WEBHOOK_SECRET — independent 32+ character random secret
- HH_CLIENT_TG_LINK_ENABLED=true — only after setup and ownership verification
- HH_CLIENT_TG_SEND_APPROVED=true — only after explicit approval and a successful owner-controlled delivery pilot; keep unset/false otherwise

A privileged same-origin request to POST /api/app/notification-channels/telegram/setup registers the callback only when the existing Telegram webhook is empty or already belongs to this app. It refuses to replace any unrelated webhook. The exact callback is https://holistichouse.vercel.app/api/app/notification-channels/telegram/webhook .

## Database and privacy
Applied Supabase migration: 20261020162323_hh_client_telegram_verified_notifications_20261020.
Tables: app_private.notification_telegram_challenges, app_private.notification_telegram_links, app_private.notification_telegram_dispatch.
All three: FORCE RLS, no direct anon/authenticated access, per-account grants only for necessary operations, restricted SECURITY DEFINER functions with explicit privilege revocation. Chat IDs AES-GCM encrypted; no plaintext chat, health text, session tokens or medication details in notification logs.
Account removal cascades. No marketing permission inferred from account creation, course enrolment or Telegram Start.

## Test and release gates
1. Tests and production Next.js compilation pass at exact GitHub SHA.
2. Two controlled accounts: A links and B cannot claim A's chat; expired/replayed tokens rejected; foreign account data cannot be read.
3. Stop and web unlink suppress future sends; changed topic suppresses, repeated source event does not resend.
4. Confirm bot getMe and getWebhookInfo without printing credentials; observe accepted Telegram receipt for one approved test account, not delivered/read status.
5. Match production Vercel READY SHA, verify public login and protected deep link, inspect errors.
6. WhatsApp Cloud API templates, Meta access and expenses remain strictly OFF pending independent approval.

If the owner has not created a separate bot, the actual linking and external delivery are blocked, regardless of green tests. Do not silently set env send approval.


## Owner handoff: two inputs still required (20 October 2026, Toronto)

Read-only source-of-truth check: the Vercel Production project already has:
- `HH_CLIENT_TG_WEBHOOK_SECRET` — randomly generated and stored as protected/sensitive environment variable; **do not display or copy its value**
- `HH_CLIENT_TG_LINK_ENABLED=true` — clients can link only after bot credentials and exact callback exist
- `HH_CLIENT_TG_SEND_APPROVED=false` — automatic sends remain disabled, including after bot creation

Only `HH_CLIENT_TG_BOT_TOKEN` and `HH_CLIENT_TG_BOT_USERNAME` are not provisioned. The existing `HH_PRACTICE_TG_BOT_TOKEN` belongs to another workflow and **must not** be reused.

**Owner actions**

1. Open [BotFather](https://t.me/BotFather). Send `/newbot`; name the bot `Holistic House Notifications`; choose an available unique username ending with `bot` (e.g., `HolisticHouseNoticesBot` if available). Copy the real BotFather token in a secure place, not in chat or GitHub.
2. Open [Holistic House Vercel environment settings](https://vercel.com/super10/codex-public-book-library/settings/environment-variables). Add *Production-only*: `HH_CLIENT_TG_BOT_TOKEN` (type Sensitive/Encrypted, token value) and `HH_CLIENT_TG_BOT_USERNAME` (username **without** @). Do not edit the three already installed keys. Deploy a fresh production build from the approved source branch after changing env variables.
3. Open [Holistic House My Practice](https://holistichouse.vercel.app/ru/app/practice) under owner account → CRM → Integrations/Connections → Client Telegram Bot. The panel reports **only missing key names**. Click `Refresh setup status`, then `Verify and connect webhook`. The protected route checks `getMe` and refuses to overwrite an unrelated webhook.
4. Open [Client Cabinet Settings](https://holistichouse.vercel.app/ru/app/settings) → Telegram → Connect Telegram → tap Start in the new bot → return and Check connection. The client should see a verified Telegram status.
5. Leave automatic sending OFF for now. Once the owner-controlled two-account /start /stop + privacy pilot passes, enable only an owner-authorized delivery test, verify a provider accepted receipt for one synthetic message, then approve a separate customer rollout.

Provider prerequisites for WhatsApp remain absent. The current WhatsApp card can store only an **unverified encrypted number**; it cannot send, deliver or verify on its own. Meta Business/WABA, a verified sender number, approved templates, separate marketing consent and a controlled budget remain future prerequisites. Do not advise using an unofficial personal WhatsApp-Web automation.

Links for the owner: [BotFather](https://t.me/BotFather) · [Vercel environment](https://vercel.com/super10/codex-public-book-library/settings/environment-variables) · [CRM Integrations](https://holistichouse.vercel.app/ru/app/practice) · [Client notification settings](https://holistichouse.vercel.app/ru/app/settings).


## One-click owner pilot — no general client-send approval required

The owner can test an individual Bot API delivery **after** the separate client bot is configured, its HTTPS webhook is verified, and the owner's own authenticated account completes Telegram /start linking.

Go to [My Practice → CRM → Integrations](https://holistichouse.vercel.app/ru/app/practice) → **Telegram-бот для клиентов**. The owner-only diagnostics now show whether the bot webhook and **the owner's own** Telegram connection are verified. Click **«Отправить тест себе в Telegram»**. This sends only one fixed, harmless RU/EN/ES test message to the owner's own encrypted, verified chat. It cannot select a CRM contact or arbitrary destination.

The pilot API requires a verified owner session, a matching account header, same-origin POST, an empty request body, active account, correct consent/topic, verified webhook and server-derived verified chat. It rechecks channel consent just before sending and is limited to **one test every 10 minutes**. Response `providerAccepted=true` means that Telegram's Bot API accepted the call, **not** that it was delivered or read.

Leave `HH_CLIENT_TG_SEND_APPROVED=false` during pilot: this button works independently and **does not activate messages to customers**. After a successful real pilot, separate two-account privacy testing and owner approval are still required before enabling event-driven notifications for clients. With the two dedicated bot variables missing, the test button correctly stays disabled.

Source: [PR #1388](https://github.com/andylitvinov-design/books/pull/1388).
