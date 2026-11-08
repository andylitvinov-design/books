# PR Monitor / Agent Commander: Google owner SSO without recurring owner code

Owner request: 7 Nov 2026, iPhone screenshots of /agents.html → /chats.html.
**Root:** the standalone PR Monitor domain has a separate HMAC owner session (\`hh_seo_owner\`) and formerly offered only an owner password. Holistic House uses server-verified Supabase Google auth on a *different* vercel.app origin; that cookie cannot be read by this standalone project.

## Implementation and trust boundary

- On \`/chats.html\`, \`/task-editor.html\` and owner-only PM quick chat, first **check the existing valid owner session**. Do not prompt again when already authorized.
- When expired, offer Google Identity Services One Tap (where supported) and a visible Continue with Google button; legacy code moved to an **optional collapsed recovery section**, never required in the normal path.
- New same-origin \`/api/google-owner-auth\` issues an HttpOnly nonce challenge for 10 minutes, validates Google-issued RS256 ID token against the fixed Google JWKS endpoint, verifies audience, issuer, expiration, issued-at, exact nonce and Google-verified email against the **existing owner email SHA-256 identifier**. Then it issues the **same signed 14-day HttpOnly owner cookie** that existing APIs verify, with Secure/Lax flags. No access from OAuth presence alone and no implicit grant to all Google users.
- On first sign-in Google may require selection/consent, especially in iOS/Safari. A Google session on Holistic House is NOT a shared cookie; silent SSO cannot be guaranteed on unrelated .vercel.app domains. We must not falsely promise a zero-interaction Google handoff across separate origins.
- When the private GitHub server store is unavailable, a new on-device non-extractable WebCrypto AES-GCM key stored in IndexedDB unlocks local encrypted chats on subsequent visits **without a passphrase**. Existing legacy PBKDF2 vaults require one final manual unlock, then migrate; preserve encrypted legacy backup. Portable backup is password-encrypted on explicit user request, never publish device-only ciphertext as a portable archive.
- Preserve the server's \`owner(req)\` checks on chats, drafts and PM AI, strict same-origin writes, private repository verification and separate evidence for PR merge/functional LIVE.

## Before activation

1. \`HH_PM_GOOGLE_CLIENT_ID\` must be set on **the standalone Vercel PR Monitor project** (reuse an existing, owner-controlled Google OAuth web client ID; no new provider), and its OAuth client must allow **https://holistic-house-pr-monitor.vercel.app** as an authorized JavaScript origin in Google Cloud.
2. \`SEO_SESSION_SECRET\` already exists and is reused, never disclosed client-side. The default Google-verified owner email digest is the same constant as \`lib/app/practitioner-access.js\`; if the actual owner Google identity differs, configure protected \`HH_PM_GOOGLE_OWNER_EMAIL_HASH\` (SHA-256 lowercased verified email), **not a raw email**. Do not infer ownership from arbitrary Google accounts.
3. No new paid API, OAuth refresh token, third-party store, GitHub workflow or cron. Do not log OAuth credentials, hash preimages, owner cookies or local crypto keys.

## Release and acceptance

- Control-plane source base \`codex/bootstrap-books\`; one complete source HEAD; required exact-HEAD checks, lease/review, protected merge. The manually deployed standalone monitor is **not** auto-updated on merge.
- Before LIVE, obtain the full READY Vercel source manifest and overlay only changed source files onto it; preserve all other legacy/API assets and previous deployment ID for rollback. Verify production alias, HTML and headers, real owner Google credential on iPhone, 401 for guests, 403 for bad origin, no cross-account grant, token replay rejection, repeat visits and device-vault migration.
- The code PR or Vercel READY alone is **NOT** evidence of Google Cloud origin configuration or functional LIVE.
GLOBAL_PR_ONE_PUBLISH_V1: staged_before_open=yes; local_checks=V8_PARSE_AND_STATIC_CONTRACT; post_open_head_updates=0; cost_new_spend=NO_NEW_SERVICES.
