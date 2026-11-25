# Daybook — weekly inspiration with photos (2026-11-25)

**Status: code prepared; delivery NOT yet activated.** Daily source PR #5420 is merged. This feature introduces a separate consent, never upgrades existing Daily opt-ins automatically.

## Client journey
Signed-in client selects an active goal, one of eight meaning axes, day of week (Sunday 0 through Saturday 6), local clock time (07:00–22:00), IANA time zone, and language RU/EN/ES. The settings panel previews a candidate photo and weekly reflection. The client must opt in to specifically weekly photo messages and to disclosing their selected goal title to their verified Telegram chat. The request may be saved pending bot verification; actual delivery requires a confirmed account-bound chat and global release flag. Pause stops future sends.

## Delivery
Reuse the protected 5-minute /api/internal/direct-message-push cron. There is no new paid scheduler, LLM call, messaging provider, or background job. The additional weekly delivery flag HH_DAYBOOK_WEEKLY_SEND_APPROVED must be explicitly true on production **and** the existing HH_CLIENT_TG_SEND_APPROVED plus the verified first-party bot policy must pass. The worker checks account status, goal status, original messenger opt-in and verified chat; uses local weekday, 15-minute sending window, and time zone DST. It durably claims one attempt per account/ISO Monday-start week before contacting Telegram, then locks preference, goal and chat for the final check. Overlapping worker invocations, rescheduling within one calendar week and DST changes cannot send duplicates; timeout/ambiguous responses are not retried automatically. Telegram sendPhoto sends one 1080px image with the localized short caption and a single inline deep link. Acceptance proves provider acceptance, not that the user read it.

## Photos / rights
The included list lib/app/daybook-weekly-photos.mjs supplies 20 distinct Pexels IDs for each of the 8 semantic axes (160 source photos total), with fixed URL allowlist, source page, preview and messenger rendition. **Editorial review of original photos, subjects, licensing suitability, and image availability remains required before enabling the weekly send flag.** Do not imply that people depicted endorse Daybook, treatment or the user's goal. No health/diagnostic/session text is used in messages. The client-facing panel gives a source link.

## Database & rollout
Migration supabase/migrations/20261125191500_hh_daybook_weekly_photo_delivery_20261125.sql adds frequency/weekday to existing private preferences, preserves daily records and consent, isolates daily SQL routines from weekly records, and creates FORCE-RLS private ledger and worker functions. This migration must be applied to Supabase before the new frontend is deployed. No implicit user opt-ins or deliveries. Do not create public role grants or new third-party service budgets.

1. Run Node unit/wiring test tests/daybook-weekly-photo.test.mjs and existing daybook daily tests. Confirm clean code build and protected CI.
2. Apply the additive migration, read back DB schema + one-per-ISO-week constraints, inspect advisor notices. No customer sends during schema deployment.
3. Merge via protected PR to codex/public-book-library and wait for the existing hourly Vercel production publisher. Do not create extra deploys or spending.
4. Verify Telegram bot credentials/webhook and provider response using a genuinely consenting verified test account. Run one weekly test at the selected time/zone; check the photo appears and the correct caption/goal link. Confirm repeated cron execution does not send a second message, and pause/disconnect blocks delivery. Do not enable the new production send flag until verified.
5. Monitor accepted/unknown/suppressed counters without logging chat IDs, personal goals or clinical data.

## QA specific privacy and resilience
Unauthenticated/account-switched POST denied; client cannot opt in for another's goal. User can opt out without new consent. No sends if no link, no specific weekly consent, inactive goal, disabled flag or wrong day/time. Old daily opt-in stays isolated behind old gate; consent version does not mix. No WhatsApp sends or unreviewed paid upgrades.
