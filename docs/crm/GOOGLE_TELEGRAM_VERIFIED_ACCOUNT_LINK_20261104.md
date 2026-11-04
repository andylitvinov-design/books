# Holistic House CRM — Verified Google account + Telegram identity

Clients keep their existing Google Auth and protected website chats. Telegram connection is optional and does not equal marketing consent.

## Safe linking flow
1. Cabinet Settings → Connect Telegram, press Start in existing first-party bot. Server verifies a private Telegram chat using an expiring single-use challenge. An unconfirmed re-pair never removes the prior verified chat.
2. After connection, click **Link my Telegram to CRM**. Explain that the practitioner can recognize the Google account in an existing Telegram CRM thread. This is a separate voluntary identity permission, not newsletter consent.
3. Server decrypts only the account-owned, verified Telegram chat ID, recomputes its saved HMAC, derives the CRM-bot-specific HMAC, and invokes the restricted account/session-verified database function.
4. One Telegram identity cannot be linked to two Google users. The CRM owner sees a verification flag on the matching Telegram thread. Private messages, medical details and raw Telegram IDs are not copied into the identity table.
5. **Unlink from CRM** removes only this mapping. Google login, notification delivery and existing conversation history stay intact. Disconnecting notifications or a verified change of Telegram identity also invalidates the mapping.
6. Replies from the CRM bot still require the customer's separate /agree consent. News requires /subscribe. /unsubnews removes news consent only, /stop suppresses CRM contact. Google registration or service notification consent never triggers newsletter sending.

## Acceptance and cost
No new bot, cron, schedule, paid API, WhatsApp broadcast, AI, Supabase project or subscription. Test original website/CRM channels, RLS, role separation, wrong account, bogus IDs, /stop, unlink, duplicate pairing, private storage, and EN/RU/ES layout.

Required gates: source tests, exact-HEAD Core and Specialist, DB advisor, production merge, Vercel READY serving SHA, and a separate two-account real provider smoke. Synthetic tests or a READY deployment alone do NOT prove actual Telegram delivery.

## Safe rollout when production migration is not installed

The optional `crm_google_telegram_links` relation and `crm_google_link_verified_self`
function may be absent while Vercel is deploying the code. Every owner inbox
and client notification-settings read must continue working: identity shows
unlinked/unavailable (never verified) until BOTH database objects exist.
Link actions return `CRM_LINK_NOT_READY` rather than failing an unrelated
conversation; unlink remains safe if the optional feature has not been installed.
The additive security-sensitive schema must pass PostgreSQL/RLS, role, trigger
and two-user consent tests before activation. Do not bypass the migration gate
or treat absent schema as a reason to revoke an existing verified notification.
