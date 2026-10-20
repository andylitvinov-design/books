## 2026-10-20 — Automatic owner chat pairing after one BotFather token

The owner added `HH_PRACTICE_TG_BOT_TOKEN` in **Holistic House Vercel Production**. It is a Sensitive secret; no plain-text token or numeric Telegram chat ID was copied into this repository or shown in ChatGPT.

**One-place onboarding:** `app/api/internal/practice-telegram-digest` and `app/api/internal/council-archive-telegram` (existing CRON_SECRET protected daily schedules), as well as private AI Council hub probes, call `ensureOwnerTelegramPairing`. The method checks official Telegram `getMe`, `getWebhookInfo`, and—**only if no webhook is registered**—a recent verified private `/start` from @AndyTherapist via no-offset `getUpdates`, then `getChat` for secondary identity verification. It does not claim/read client conversations or modify bot webhooks. A private chat ID is stored **only encrypted** via the existing application AES-GCM key in `app_private.telegram_owner_pairings` (Supabase FORCE RLS, no anonymous or authenticated direct SELECT). The server resolves it for My Practice daily stats, the public Council archive, and authenticated Council relay. Numeric ID is not returned to owner-facing clients or exposed in public logs. No extra owner-entered environment variable is needed.

The daily jobs **remain off** while `HH_PRACTICE_TG_ENABLED=false`; mere pairing never sends. After the private database reports `status='paired'`, verify the intended bot/owner through read-only official Bot API and explicitly activate HH + Council sender flags, redeploy, then send one neutral test and check exact recipient receipt. If status is `webhook_active`, never call getUpdates, drop or replace the existing webhook; an authorized integration with its receiver or separate numeric-ID confirmation is required. If `awaiting_new_start`, owner sends one fresh `/start` to [@Andydotbot](https://t.me/Andydotbot) and waits for the next scheduled authenticated pairing attempt. Old Oct 11 updates expire within Telegram's 24-hour retention.

**Operator diagnostic:** the existing CRON_SECRET protected `/api/internal/telegram-owner-discovery` now returns only safe status `paired`, `awaiting_new_start`, `webhook_active`, etc., never chat IDs or tokens. Supabase migration `20261020160856_hh_telegram_owner_verified_private_pairing_20261020.sql` was applied to production with FORCE RLS. The existing bot token remains only in HH Vercel. No separate GitHub or Council Telegram token is necessary.

**Actual delivery/identity status:** needs verification until production pairing, bot/owner readback and one accepted real Bot API message. Muse personal stays manual; Gemini/Mistral only when real free-tier model keys are configured.

---

## 2026-10-20 · Owner's simplified Telegram onboarding (one token, Codex obtains ID)

The full implementation plan and operator technical assignment are in [TELEGRAM_OWNER_AUTO_DISCOVERY_20261020.md](./TELEGRAM_OWNER_AUTO_DISCOVERY_20261020.md).

**Owner's single input:** [Holistic House Vercel Production Environment Variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables) → encrypted `HH_PRACTICE_TG_BOT_TOKEN` from the **existing** BotFather @Andydotbot. No @userinfobot. Do not paste any token into chats, GitHub or the AI Council project.

**Codex/authorized operator:** call `GET /api/internal/telegram-owner-discovery` on the production HH domain using the **existing** private `CRON_SECRET`. It verifies official Telegram `getMe`, `getWebhookInfo`, and (only with webhook absent) recent exact private `/start` from @AndyTherapist using `getUpdates` **without offset**, then `getChat`. The numeric ID is visible only to the authenticated operator, who sets encrypted Production `HH_PRACTICE_TG_CHAT_ID` in **that same Vercel project**. Before enabling messages, verify the owner chat and safe test via the existing unified gateway. If `webhook_active`, **stop** rather than hijacking the webhook. If `awaiting_new_start`, ask the owner to send one new `/start` to [@Andydotbot](https://t.me/Andydotbot).

Current remaining source of truth: real BotFather token and actual numeric chat ID are **not present in Production settings**. Until verified, delivery remains disabled. This helper never reads private site/CRM content, never sends messages and does not run a new cron.

**Legacy two-variable owner steps below are superseded for normal no-webhook onboarding.** If bot has an existing webhook, owner/authorized operator may need to handle an explicit safe alternate confirmation; token-only automatic discovery is not guaranteed.

---

## 2026-10-20 — Telegram credentials in ONE place

Use **only** [Holistic House Vercel Production env](https://vercel.com/super10/codex-public-book-library/settings/environment-variables) for the existing @Andydotbot BotFather token and numeric private @AndyTherapist chat ID:

- `HH_PRACTICE_TG_BOT_TOKEN`: encrypted server-only BotFather token.
- `HH_PRACTICE_TG_CHAT_ID`: encrypted numeric private chat ID.
- `HH_PRACTICE_TG_ENABLED=false` until correct Bot API identity and test send have been verified; then explicitly opt in.

Do NOT duplicate these Telegram values in GitHub Actions or AI Council Vercel. A separate **automatically provisioned** private relay key is configured in both Vercel backends (`HH_COUNCIL_TG_RELAY_KEY` and `COUNCIL_TELEGRAM_RELAY_KEY`); this does not contain the BotFather token. The AI Council owner-only UI calls the HH central gateway. Daily public Mistral/Gemini/Muse status audit archives to [Issue #242](https://github.com/andylitvinov-design/ai-projects-brain/issues/242); the HH `/api/internal/council-archive-telegram` cron at 15:00 UTC sends it to the same private owner, using a separate private idempotency receipt table. The existing My Practice daily statistics cron continues to send independently at 13:00 UTC.

Safety: no client profile, message content or clinical notes; owner check via Telegram `getMe`/`getChat`/`getWebhookInfo`, no userbot or webhook mutation. Sender identity and true Telegram delivery remain **NOT VERIFIED** until the owner securely enters the real BotFather token and chat ID, the server verifies recipient, and one real Telegram message is acknowledged. Enabling one HH delivery switch disables/enables all centralized senders after redeploy; AI Council also has its independent owner opt-in flag.

**Previous environment instructions below refer to the legacy split deployment and are superseded by this section.**

---

# My Practice → daily Telegram service statistics (owner only)

Status as of 2026-10-20: **code in PR #1287, production Telegram delivery not verified**. No Telegram token/chat ID is embedded or assumed available.

## Existing data reused

Authoritative aggregates: `app_private.service_funnel_daily`, displayed in **My Practice → Service statistics**. Report strictly scopes to verified active approved practitioner `andy-litvinov` **and** the existing `PRACTITIONER_ID`; never enumerates other masters. It includes:

- **Yesterday, Toronto calendar:** service impressions, Order clicks, WhatsApp and Telegram handoffs, per published/owned service.
- **Seven completed Toronto days:** same event counters.
- **Yesterday:** number of new authenticated and public enquiries, as aggregate counts only.
- **Currently:** open enquiry totals, published services, pending-moderation services.
- Honest notices: click ≠ sent message/booking/payment, missing event rows ≠ independently verified zero web traffic.
- No patient, client identity, content, diagnostic report, phone, contact or payment amount is read or transmitted.

## Server architecture / scheduling

- Route: `GET /api/internal/practice-telegram-digest`.
- Only Vercel's `Authorization: Bearer <CRON_SECRET>` may call it. Reuses the existing constant-time `cronAuthorized` guard from housekeeping. Missing secret fails 401.
- Existing production Vercel app `codex-public-book-library` and source `codex/public-book-library` (not repository default branch).
- New once-daily cron: `0 13 * * *` (13:00 UTC = 08:00 EST / 09:00 EDT, plus Vercel Hobby's potential one-hour delivery window). Independent of laptop/iPhone. The existing 05:00 UTC housekeeping job is unchanged.
- Aggregation happens inside `transaction(...,{server:true})` restricted to the single verified practitioner. Telegram API is called only from the server, never a client page.
- One report/day claim with idempotency lease in `app_private.practitioner_daily_digest_sends`. State `sending/accepted/failed`, retry stale claims after 15 minutes; no automatic background retry storm. Bot API acceptance is not proof the user has read the message.
- No Cloudflare KV, additional AI calls, separate paid subscription, or new ChatGPT automation.

## Canonical migration (applied, verified)

- `supabase/migrations/20261020025230_hh_practitioner_daily_telegram_digest_20261020.sql`
- Supabase project `shervdixkaxurnaecioe`, canonical migration recorded as `20261020025230`.
- Readback on 2026-10-20: table exists; RLS enabled **and forced**; only `hh_app_backend` has the relevant RLS policy, no select grants for `anon` / `authenticated`.
- The table only stores a practitioner UUID, report date, claim token and delivery status/timestamps. No message text, Telegram token, chat ID, client content or user profile.

## One-time activation (never put secrets in PR, issues or client browser)

The *Holistic House* Vercel project `codex-public-book-library`, **Production environment only**, needs three settings:

| Variable | Required value |
|---|---|
| `HH_PRACTICE_TG_ENABLED` | `true` after safely configuring the other two variables |
| `HH_PRACTICE_TG_BOT_TOKEN` | Telegram BotFather bot token, encrypted/sensitive |
| `HH_PRACTICE_TG_CHAT_ID` | Numeric **owner chat** ID, encrypted/sensitive |

Reuse the existing Vercel `CRON_SECRET` and `HH_APP_*` database configuration. Do not change those secrets or expose them. The owner must have opened the bot and pressed **Start** / sent `/start`.

**Important:** The separate AI Council project `ai-council-chat` has its **own** environment and `COUNCIL_TELEGRAM_*` owner access settings. The existing GitHub Actions Gemini daily audit uses `GEMINI_TELEGRAM_ENABLED` and repository secrets. None of these other integrations provides Vercel Holistic House credentials automatically; do not assume one is active because another was merged.

When variables are missing or malformed, the route returns only `{status:"disabled"}` with no external request and no database access.

## Verification / release

1. Confirm CI `HH Practice Telegram Digest checks`: both unit suites green (Toronto DST, no-PII, same-owner aggregates, cron auth, Telegram `ok` and exact chat ID).
2. Merge only into `codex/public-book-library`; verify Vercel production SHA and the deployed route.
3. After securely configuring the bot and user pressing /start, invoke the protected cron endpoint **once** with its existing production `CRON_SECRET` (never paste secret into chat or a public URL); check Bot API acceptance and receipt in Telegram.
4. Re-run the **same Toronto date** and verify `already_claimed` rather than a duplicate message. Confirm absence of any client-specific data.
5. Monitor Vercel function errors by route and check single `accepted` receipt. If there is a failure, leave `HH_PRACTICE_TG_ENABLED=false` until corrected.

## Rollback

Set `HH_PRACTICE_TG_ENABLED=false` on production, then redeploy to take effect. Revert this PR to remove the new cron/route if necessary. Keep the private receipt table unless separately authorized to delete it.

## Limitations

This is one **owner** digest, not opt-in Telegram mail for every master. No cross-master disclosure. Monetary revenue is intentionally omitted until a verified payment/order source is approved.
