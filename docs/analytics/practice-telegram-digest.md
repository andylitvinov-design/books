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
