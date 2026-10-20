## 2026-10-20 — prevent empty Gemini/Mistral reports from consuming the day

**Production behavior:** the private Telegram bot is verified and the owner accepted the test; model keys remain **owner-held and missing** in HH Vercel Production. The scheduled AI Council digest now checks for both provider keys and explicit Google Free Tier confirmation *before* fetching GitHub HTML evidence or claiming a day. Missing settings return `model_setup_required`, with **no Telegram document** and **no accepted daily receipt**, so a later owner setup is not blocked by a fake 'complete' report.

If credentials exist but **neither Gemini nor Mistral produced a verified actual response** (quota, model outages, wrong key, or provider errors), the day claim is safely released as `failed` for a future attempt, without sending a report containing only `NOT_AVAILABLE`. When one provider succeeds, the report names the real model and correctly identifies the unavailable one. If a previous accepted report exists, deduplication remains unchanged: no accidental duplicate sends.

This is specifically to prevent the prior misleading Telegram-only HTML document displayed 2026-10-20. GitHub Actions still archives a deterministic *public-only* HTML/TZ draft in issue #242; that is not represented as AI model output and is not sent as an artificial Gemini/Mistral report.

Keys must still be created by the owner in [Google AI Studio](https://aistudio.google.com/apikey) and [OpenRouter](https://openrouter.ai/settings/keys) and saved in **one** [HH Vercel Production Environment Variables screen](https://vercel.com/super10/codex-public-book-library/settings/environment-variables) as `HH_COUNCIL_GEMINI_API_KEY` (Sensitive), `HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED` (`true` only after checking the Free Tier), and `HH_COUNCIL_OPENROUTER_API_KEY` (Sensitive). Do not copy them into ChatGPT or GitHub. Re-deploy after saving; verify Vercel READY and actual distinct provider response/Telegram receipt before marking this channel LIVE.

---
## 2026-10-20 · Genuine Gemini and Mistral reviews to the existing @Andydotbot

**Implementation:** GitHub Actions daily public-site HTML/HTTP scan (09:15 America/Toronto) still archives one evidence report to [AI Council issue #242](https://github.com/andylitvinov-design/ai-projects-brain/issues/242). Holistic House Vercel's **existing** Council cron at **21:00 UTC** now uses this evidence for **two independent provider responses** before sending one .md to the verified private owner chat. The bot and chat are ALREADY paired; do not duplicate BotFather credentials or contact @userinfobot.

**One place for BOTH provider API keys (not Telegram secrets):** [Holistic House Vercel → Production environment variables](https://vercel.com/super10/codex-public-book-library/settings/environment-variables).

| Key (all in this one HH Vercel project) | Type | How to obtain / safety |
| --- | --- | --- |
| `HH_COUNCIL_GEMINI_API_KEY` | Sensitive, Production | [Google AI Studio — API Keys](https://aistudio.google.com/apikey), choose an actual **Free Tier** Google project, not a billed API project |
| `HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED` | Plain, Production | Value `true` **only after** owner confirms that project is still Free Tier and Gemini 3.8 Flash is included in their free quota; otherwise leave unset/false |
| `HH_COUNCIL_OPENROUTER_API_KEY` | Sensitive, Production | [OpenRouter — API Keys](https://openrouter.ai/settings/keys), existing personal OpenRouter key or a new one; **Mistral `mistralai/*:free` only**, dynamic catalog zero-pricing verification, no paid fallback |

The owner does **not** need to add Gemini or Mistral keys to GitHub Actions, AI Council Vercel, or the phone: all real inference occurs in **Holistic House Vercel**. Do not paste any key into GitHub comments, ChatGPT, source code or screenshots. Saving new Production env variables requires a new Vercel Production deployment to take effect; verify READY SHA and canonical alias.

**Why this is genuinely free-first:** Gemini `gemini-3.8-flash` is requested only if BOTH its private key and `HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED=true` exist. The API key's account tier cannot safely be inferred merely from possessing the key; confirming the free project is an owner action. Mistral always uses a current OpenRouter **author=mistralai and slug=:free** model whose catalog pricing fields are all zero, per-request `provider.max_price.prompt/completion=0`, `allow_fallbacks=false`, and returned `usage.cost===0` must be verified. No direct paid Mistral API calls and no model substitution. When a key/model is unavailable, the report clearly says `NOT_AVAILABLE`, never synthesizes a fake AI opinion.

**Real audit content:** Both independent models receive the same **public, sanitized** 24-or-fewer HTTP/HTML evidence items. They must distinguish observed meta/HTTP facts from hypotheses, provide exact URLs, priority, corrections and pass/fail checks. They never access client profiles, clinical records, payments, credentials, private messages, real browser/mobile evidence or Core Web Vitals. The Telegram .md contains each *actual* model's full bounded response, honest provider statuses, the source HTML TZ and Muse `MANUAL_ONLY`.

**Idempotency/cost:** existing private `app_private.council_telegram_deliveries` stores a per-day atomic claim. New additive migration `20261020190745_hh_free_ai_council_cached_daily_20261020.sql` stores the exact public-only reviewed Markdown and model statuses **before** Bot API delivery. Retries reuse the cached result without calling models a second time. One delivery per cron run; previous accepted days aren't resent. No new scheduled job or new paid subscription added.

**Same-day owner option:** [Holistic House → Telegram setup](https://holistichouse.vercel.app/admin/telegram-setup) (existing signed-in master) shows separate Gemini/Mistral readiness and last archived delivery. Once the two keys and Free Tier confirmation are in the Vercel project and deployed, click **«Отправить анализ Gemini и Mistral сейчас»**. It uses the **same** daily claim/cache as the scheduled job; if today's report was already accepted, it will not send a duplicate. The daily scheduler sends future reports automatically. The existing Council cron was moved from 15:00 UTC to 21:00 UTC (17:00 EDT / 16:00 EST) because the 09:15 America/Toronto GitHub audit may be queued for several hours; this prevents routinely checking the archive before its report exists. No extra cron was added.

**Verification status:** server-side code and mock-only provider tests may pass, but **real API calls must remain untested / unavailable until owner configures valid keys**. A green CI build is not evidence of Gemini, Mistral or Telegram provider acceptance. When configured, verify distinct provider responses, actual zero-cost model/usage receipt, Bot API accepted exact private owner chat and owner sees the .md. Never claim genuine AI output from the original GHA archive-only NOT_AVAILABLE text.

---

## 2026-10-20 — Telegram one-click owner connection (preferred)

**Direct owner link:** [Holistic House → Telegram setup](https://holistichouse.vercel.app/admin/telegram-setup). Sign in via the existing private Practitioner Cabinet if redirected.

A genuine existing BotFather token was saved by the owner as **Sensitive / Production** in the Holistic House Vercel project. No second token, numeric chat ID, GitHub secret or @userinfobot is required for the standard no-webhook case.

**Owner's action:** open [@Andydotbot](https://t.me/Andydotbot), send a fresh `/start` if necessary, then open the private setup screen and choose **«Проверить и отправить один тест»**. The POST is a signed admin-authenticated Next.js Server Action; it uses existing `ensureOwnerTelegramPairing` (getMe, getWebhookInfo, getUpdates without offset **only without webhook**, then getChat), saves the verified numeric chat ID only encrypted in `app_private.telegram_owner_pairings`, checks Bot API identity again, and calls the fixed-recipient sendDocument only for the authenticated owner's explicit click. Test delivery is atomic **at most once** through the pairing row's `test_status/test_claim_token` private receipt; a timeout is **uncertain** and blocks unverified retry to prevent duplicates. No private client data or contact details are sent.

The separate **«Только проверить · без сообщения»** action verifies pairing without sending Telegram messages. The owner-facing screen shows only statuses, not token values or numeric chat IDs. The existing `HH_PRACTICE_TG_ENABLED` switch must be true for an owner-authorized test send; even then, a missing/incorrect paired private chat blocks all deliveries. Manual daily cron and private Council relay continue to reuse the same independently verified owner recipient.

**If webhook is active:** do not delete/replace it or call getUpdates. The page reports the blocker; first identify and securely integrate the currently authorized webhook receiver. Do not invent a chat ID or steal updates. If an old /start expired, send a new one; Telegram only retains pending updates for up to 24 hours.

**Implementation:** `app/admin/telegram-setup/{page.js,actions.js,telegram-setup.module.css}`, `lib/practitioners/telegram-owner-setup.js`, private migration `20261020172000_hh_owner_telegram_test_receipt_20261020.sql`. Status remains **NOT LIVE VERIFIED** until the real Bot API confirms delivery to the verified private owner chat and the owner sees the document.

---

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
