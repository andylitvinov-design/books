# Holistic House — Telegram Login + existing Google Cabinet

**Implementation:** optional, server-gated native Supabase Auth OIDC login via Telegram. Production stays **OFF** until the real Telegram OIDC provider, manual identity linking, privacy review, 2-account E2E and protected release checks pass.

## Scope and behaviour

- Public Cabinet login: **Telegram** alongside **Google** (EN/RU/ES). Google remains functional at all times.
- Telegram signs in through the existing **Supabase Auth authorization-code + PKCE** callback, with server-side HttpOnly session cookies and the same account onboarding, private APIs and RLS; **no fake email** and no client-provided Telegram ID used as authentication.
- Existing Google users first sign in through Google and may **explicitly link** Telegram as another login method under **Cabinet → Settings → Sign-in methods**. The actor's current server-side UUID must match before and after the Supabase identity-link authorization code exchange. A signed, HttpOnly, 10-minute link proof is cleared after the callback.
- Do not silently merge accounts by email, phone, Telegram username, name, avatar or CRM contact. Already separately registered Telegram identities require deliberate operator-assisted resolution in Supabase Auth, preserving all client records.
- Website login is **not** consent to newsletters or Telegram bot messages. Telegram bot/CRM chats and service notifications have their existing separately verified, opt-in lifecycle. Login scopes only `openid profile`; no `phone` or `telegram:bot_access`.
- Feature is OFF unless `HH_APP_TELEGRAM_OIDC_ENABLED=true` (on server) and configured provider is verified. Do not enable flags just to make a button appear.
- Login on mobile uses existing explicit native external-browser PKCE bridge (not unverified WebView tokens). Verify physically on iOS and Android before claiming native readiness.

## Provider activation — owner approval and provider-side credentials required

Official docs:
- https://core.telegram.org/bots/telegram-login
- https://supabase.com/docs/guides/auth/custom-oauth-providers
- https://supabase.com/docs/guides/self-hosting/self-hosted-custom-oauth-providers
- https://supabase.com/docs/guides/auth/auth-identity-linking

1. In the **existing approved** Telegram bot's **@BotFather → Login Widget**, enable OIDC, register the exact website origin **https://holistichouse.vercel.app** and Supabase Auth callback **https://shervdixkaxurnaecioe.supabase.co/auth/v1/callback** as allowed URLs. Obtain its separate Telegram Login **Client ID** and **Client Secret**; these are **not** the Bot API token. Do not share them in GitHub issues, chat messages, source or public Vercel env. Existing CRM bot must not be replaced or its webhook disturbed.
2. In project `shervdixkaxurnaecioe` → **Supabase Auth → Providers** add OIDC:
   - `identifier: custom:telegram`
   - `issuer: https://oauth.telegram.org`
   - `scopes: openid profile`
   - **`email_optional: true`** (critical because Telegram provides no email)
   - Server-held Client ID and Client Secret entered only into the official provider configuration, not into the website frontend.
   - Register the exact callback URL shown by Supabase in BotFather.
3. Confirm the existing approved Supabase Auth redirect allowlist permits the current website **/api/app/auth/callback**, already used by Google sign-in; for new redirect variants, confirm locale and manual-link query params work. Keep the Google provider and Google redirect unchanged.
4. Enable **manual identity linking** in Supabase Auth, verify the policy and protected current-session requirement. This grants voluntary linking; it does not authorize automatic identity merging.
5. Release this PR through required auth/privacy/Core/Specialist checks and approved GitHub protected merge. Only after a deployed real server/provider E2E on the corresponding SHA should authorized operator set server-only **`HH_APP_TELEGRAM_OIDC_ENABLED=true`** on the Vercel production project and redeploy. No `NEXT_PUBLIC_` secrets. Keep the flag off / revert if any problem.

## Required QA (LIVE must not be claimed before all)

- New Telegram-only account (without email), explicit necessary onboarding, exactly one `app.accounts` row, own encrypted tests/reports protected, signout/relogin persistence.
- Existing Google account, link Telegram from authenticated Settings with explicit click, sign out, Telegram sign-in returns same Supabase `user.id`, same Cabinet/test history. No duplicate CRM contacts; if bot and CRM pairing is needed, verify independent consent and existing #3473 CRM identity mapping separately.
- Two separate synthetic/live accounts: Telegram A cannot open Google B's Cabinet; forged/expired/mismatched proof rejected; replay/unlink, concurrent tabs and denied permission tested; no automated cross-account merge.
- Cancelled OAuth, blocked provider, stale PKCE, invalid continuation, bot unavailable and rate limiting fail safely; Google login still works.
- EN/RU/ES browser at 320, 354, 390, 430 px; no popup, no bottom dock overlap, text wrapping; real iPhone Safari, Android Chrome and if applicable native bridge smoke.
- Run `node --test tests/app-telegram-oidc-login.test.mjs tests/app-auth-pkce.integration.mjs`, auth/RLS/CRM regression, ESLint, Next build, exact HEAD required Core+Specialist and protected merge. After merge verify Vercel READY on serving SHA and actual real-identity login.

## CRM dependency

This PR implements website authentication and **same-Supabase-account** identity linking, not a blanket conversion of Telegram contact to subscriber. The **separately consented Telegram chat ↔ Google Cabinet ↔ CRM** mapping in draft [#3473](https://github.com/andylitvinov-design/books/pull/3473) must be integrated, reviewed and verified in its own release. The user cannot be told that an existing bot chat is verified just because website OIDC succeeded.

**No new database, paid integration, webhook rotation, marketing sending, or alternate sessions. No LIVE claim without provider-side proof.**
