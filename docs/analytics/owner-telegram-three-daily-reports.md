# Owner Telegram · three reports per day (Toronto local time)

## Approved schedule · 2026-10-27

All three are owner-only reports to the **existing** paired @Andydotbot → @AndyTherapist chat, never to clients, subscribers or public Telegram channels. DST is handled by two UTC cron candidates for each slot plus a server-side `America/Toronto` hour gate; only one candidate can execute the send per day.

| Toronto local | Preparation | Existing source | Verified content | UTC candidate cron |
|---|---|---|---|---|
| 09:00 | Existing ChatGPT "5 ideas" task at 08:00 | Unique owner-signed `HH-REVENUE-DAILY:YYYY-MM-DD` comment in ai-projects-brain [#242](https://github.com/andylitvinov-design/ai-projects-brain/issues/242) | Exactly 5 evidence-based, clearly hypothetical opportunities for paying leads/revenue. Source data are strictly public. | 13,14 UTC |
| 12:00 | Existing ChatGPT strategy/SEO task at 11:00 | Existing owner-signed `HH-CHATGPT-DAILY:YYYY-MM-DD` archive #242 | One `/be-ambitious` systems change, marketing, SEO, 2–3 priorities. No technical scan duplicate or paid AI provider inference. | 16,17 UTC |
| 15:00 | Existing public site scanner output + private aggregate statistics | Existing My Practice daily digest and GitHub Actions `HH-COUNCIL-DAILY:YYYY-MM-DD` archive #242 | Previous completed Toronto day's genuine aggregated inquiries/click counts and same-day bounded **public** technical findings (or explicit NOT_VERIFIED). | 19,20 UTC (same route also wakes for independent opted-in master subscriptions at 13,14 UTC) |

### Operations and privacy

- The single verified Telegram bot, its existing production `HH_PRACTICE_TG_BOT_TOKEN`, paired encrypted owner chat, CRON_SECRET authorization, and delivery flag are unchanged. Preview cannot send. Never publish client test results, health data, CRM contacts, private notes or secret values in Telegram or public GitHub.
- GitHub #242 is a **public-safe archive/queue**, not proof of delivery. Check actual production Supabase receipts separately: `app_private.owner_daily_revenue_sends` (09), `app_private.council_telegram_deliveries` (12), `app_private.practitioner_daily_digest_sends` (15). All three are FORCE RLS with backend-only writes (existing policies for the latter two).
- 09 revenue archives are validated by exact author, marker, closing marker, date, sections, length and canonical comment URL before they enter Telegram. The 12 source reuses its existing independent owner marker validator. 15 loads only the bot-authored technical scan validated by the existing archive reader and preserves aggregated My Practice statistics when GitHub is unavailable. No sensitive numbers are passed through public issue comments.
- Do not equate click counts with leads, booking or payments. Missing opt-in tracking is reported as **no data**, not zero visits. No paid API, advertisement, unsolicited promotion, provider retry or new bot.
- The existing daily My Practice receipt is keyed by the **previous completed Toronto day**, while 09/12 are keyed by **today**. Other practitioners' opted-in analytics subscriptions still run at their original 09:00 Toronto slot, using their own consent and dedup ledger; that path does not send or claim the owner's 15:00 digest. At initial rollout, previously accepted reports must never be resent merely due to new time windows.
- Bot API `accepted`, actual owner visibility, and clock-time arrival are distinct milestones. Gate release on tests, migration/RLS, READY exact source SHA, production aliases and the next real receipts. Vercel's cron invocation is scheduled at the top of the hour, not a strict punctual delivery SLA.

### Rollback

Revert the three cron changes and two route option flags; preserve existing private delivery history. The revenue table can remain as an inert private receipt ledger (do not drop it destructively). On deployment failure do not remove existing bot pairing or alter billing.
