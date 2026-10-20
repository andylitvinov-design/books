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
