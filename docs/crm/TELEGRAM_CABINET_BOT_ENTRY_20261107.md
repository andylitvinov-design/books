# Holistic House — Telegram bot → Cabinet entry

Scope: an existing signed first-party CRM bot offers **🏠 My Cabinet / Мой кабинет** as the first persistent keyboard item and native /cabinet command, with a single fixed inline URL to the verified production site. RU/EN/ES are preserved. The destination is the existing `/{locale}/app` account route (its existing guest flow handles Google and, if enabled and configured, Telegram OIDC). No new bot, API, database, provider, contact, autoresponder or marketing consent.

**Security:** The URL has no login token, Telegram chat ID or tracking data. A bot link is navigation, never authentication. The server already supports independent, manually verified Google ↔ Telegram identity linking from merged PR #3511. Existing client records and private RLS/session protections are unchanged. Don't mint a Supabase session from callback_data, phone, username, bot chat ID or an untrusted browser parameter. /stop and direct review retain independent priority and consent.

**LIVE plan:**
1. Protected-merge code to `codex/public-book-library` after exact-head Core, CRM, auth/privacy specialist and browser checks; verify Vercel production READY and serving SHA.
2. Verify from real RU/EN bot chats: /menu → **Мой кабинет** → inline button → /ru/app → existing Google Cabinet sign-in (if needed) → existing private records; similarly EN; test returning client, STOP and chat consent isolation. This button can work without OIDC, but does NOT log the visitor in.
3. Enable *actual Telegram-only login* only after BotFather Login Widget allowed URLs `https://holistichouse.vercel.app` and `https://shervdixkaxurnaecioe.supabase.co/auth/v1/callback` and Telegram OIDC client credentials are configured **directly in Supabase Auth** with `custom:telegram`, `openid profile`, optional email and manual linking. Never paste secrets in chat/PR. Then run two-account/cross-user/Google-link/PKCE iPhone+Android E2E before setting server-only Vercel `HH_APP_TELEGRAM_OIDC_ENABLED=true` and redeploying. Until then keep the flag OFF, and show Google only where the provider is not ready.
4. Verify the existing first-start welcome PR #3923 independently; do not force-push or overwrite its source ownership lease. Its continue button enters the expanded persistent menu once merged.

No new fees or mass messages. A green PR does not prove Telegram provider login works.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=partial; post_open_head_updates=0; extra_waves=none; cost_new_spend=NO_NEW_SERVICES.
