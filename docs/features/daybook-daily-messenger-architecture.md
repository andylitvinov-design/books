# Daybook · opt-in daily inspiration in messengers (2026-11-22)

## Purpose
An account holder chooses **one active goal** from My Coaching Plan, explicitly chooses one of eight meaning axes, language, local delivery time (07:00–22:00), IANA time zone, and verifies Telegram. A single short message contains the selected private goal text, one original encouraging phrase, and a sign-in-protected deep link that opens the goal inside My Coaching Plan.

## UX
The inline panel appears at \`/{en|ru}/app/my-coaching-plan#daybook-daily\` (no modal). Message preview shows the exact selected goal, axis and example phrase; the original catalog provides 5 RU, 5 EN and 5 ES phrases per each of 8 meaning axes (120 original localized entries). The link targets \`/{lang}/app/my-coaching-plan?goal={uuid}#goal-{uuid}\` and reopens the relevant goal area; ES messages link to the existing EN cabinet bridge. Copy is reflection, not a clinical promise. No LLM call on every delivery and no paid phrase generation.

**Privacy:** separate unchecked versioned consent explains that the exact goal title will be sent into a third-party Telegram chat. Existing browser/account/CRM/message consents do not enable this feature. Text comes exclusively from the owner-encrypted \`coaching_goals.title_ciphertext\`, not a browser-provided string or tests, medical data, personal session transcripts or diary notes. Never add raw goal titles or chat IDs to logs, database delivery ledgers, analytics or URLs. The URL contains only an opaque goal UUID; the target page requires the signed-in account. Pausing is independent from existing transactional notifications.

## Delivery flow
- Existing first-party Telegram bot and verified \`notification_telegram_links\`; do not provision a different bot, overwrite its webhook, or use unverified usernames/numbers.
- Dedicated owner RLS table \`app_private.daybook_daily_preferences\` with selected goal, explicit consent/version, time zone, language, time and axis; default no row (opted out).
- Existing five-minute authenticated \`/api/internal/direct-message-push\` cron invokes the small Daybook worker. **No new cron or provider.** Server delivery is fail-closed unless production \`HH_DAYBOOK_DAILY_SEND_APPROVED=true\`, existing \`HH_CLIENT_TG_SEND_APPROVED=true\`, linked client bot and webhook are ready.
- Postgres computes due **local date and clock time** using the saved IANA zone and a 15-minute delivery window; DST automatically respected. Worker joins active account, active goal, saved consent, verified link and original notification request.
- Durable unique \`(account_id,local_day)\` claim commits BEFORE contacting provider; unknown provider responses are not retried automatically. Final pre-send read holds locks on the preference, goal, and verified destination; a previously committed pause/disconnect wins.
- Three separate claims per five-minute invocation at most and send in parallel under the existing DB pool. No unbounded work in the shared cron. Delivery accepted means **Telegram API accepted** and does not assert the user read the message.
- Telegram payload uses native text and one inline link button, with no HTML/Markdown parse mode, no image assets, no rich preview fetch. Keep message short enough for lock-screen notifications.

## API
\`GET /api/app/daybook-daily\`: authenticated account-only preferences, Telegram verified/readiness state; never returns Telegram chat ID.
\`POST /api/app/daybook-daily\`: \`{enabled:true,goalId,axis,dailyAt,timezone,locale,consentVersion,goalDisclosureAccepted:true}\` or \`{enabled:false}\`. CSRF origin and verified cookie required, account ID binding required, account scoped RLS plus rate limiting. Changes require affirmative consent; disable always allowed without new consent.

## Constraints and rollout
- **No WhatsApp sends in v1.** A saved WhatsApp number is not proof of ownership or permission. Do not enable until Meta WhatsApp Business verification, approved templates, 24-hour session/marketing category rules, per-message budget and separate affirmative opt-in are reviewed. Channel shown as coming later only.
- Production schema migration \`20261122185000_hh_daybook_daily_telegram_optin.sql\` must be applied before code starts delivering. Migration adds private tables and fixed worker functions, does not send, enroll or bill anyone.
- Release source on \`codex/public-book-library\` via protected PR, approvals/checks and existing hourly production publish. **Never push directly to production or use a paid manual Vercel deployment.**
- First check \`HH_CLIENT_TG_SEND_APPROVED\` and client Telegram bot readiness without exposing secrets; separately approve the new daily send gate; do not claim live delivery until real verified subscriber and Telegram API acknowledgement.
- Minimum QA: no prior consent → no sends; verified only without new consent → no sends; unverified Telegram → cannot enable; inactive/completed goal → no send; pause/disconnect committed → no send; cross-account goal ID → 409; one account/day across overlaps/DST; goal and URL correct; RU/EN/ES; failed/unknown transport → no retry; health of pre-existing private message cron preserved; WhatsApp remains unsent.
- Operator may cap first launch at a few accounts; for large subscriber volume add an approved scalable queue/worker only after explicit budget and capacity review. Existing shared five-minute cron is an intentionally small initial rollout.
