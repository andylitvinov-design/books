# Daybook Inspirations · daily opt-in delivery (2026-11-22)

## Scope
One **published** aphorism from existing public.hh_ideas_aphorisms (142 published, EN/RU/ES on 2026-11-22) per consenting account's **local calendar day**. Selection is random on each reserved day; PostgreSQL excludes all phrase IDs reserved for the preceding **30 local dates**, including uncertain sends. Never fall back to a repeat when the filtered pool is empty. The separate 96 RU Daybook seed is *editorial draft* and is NOT auto-sent.

## Consent & identity
Verified Google account + explicit **hh-daybook-inspirations-v1** opt-in is required, independently of existing messenger notifications/CRM. Only a Telegram chat linked by the existing signed /start challenge is eligible. No send based solely on manually typed handles or phone numbers. Pause records withdrawal and stops future deliveries. Existing Telegram /stop revokes linked chat; dispatcher rechecks linked identity just before send. No private goals, test scores, medical notes, tokens or user names go into a messenger.

## Runtime & resource budget
Reuse existing CRON_SECRET-protected /api/internal/direct-message-push Vercel cron (*/5 minutes), with bounded batch=12, no new workflow, cron, paid service or provider. Control flags default OFF: HH_DAYBOOK_INSPIRATIONS_ENABLED, HH_DAYBOOK_INSPIRATIONS_SEND_APPROVED; existing HH_CLIENT_TG_* link, webhook and send gates must also be true. Preview must never send. SQL locks due preferences SKIP LOCKED, reserves unique(account_id,local_day) before provider call and returns eligible published phrase. Dispatch checks current consent, account, chat link and cryptographic chat hash before sending. Telegram 200/message_id means provider **accepted**, not delivered/read. Ambiguous timeouts produce an 'unknown' receipt: NO automatic replay.

## Deployment steps (protected)
1. Apply no production DB changes before reviewed PR, required exact-HEAD security/privacy RLS tests, merge.
2. After protected merge, apply the additive Supabase SQL migration once through existing DB deployment; verify schema, role grants, FORCE RLS, no public grants.
3. Let the **existing** hourly Vercel production workflow publish; no direct deploy, hook or dispatch. Confirm the served alias SHA and authenticated My Page settings UI.
4. Verify existing bot credentials, getMe/webhook identity, production send switch, one opted-in test user and no unexpected recipients. Activate flags only after signed-in E2E. Never auto-enroll currently linked clients.
5. Test 2 consecutive local days, 30-day overlap, duplicate CRON invocation, concurrent claim, /stop, pause, timezone & DST rollover, provider unknown and empty-catalog behavior. Report exact accepted vs delivered status.
6. WhatsApp is NOT an enabled send path until Meta outbound templates, cost and channel-specific consent have been independently authorized.

## Limits
No personalization/goal text in provider payload (by design). Client timezone is editable IANA name. A late cron can send later on the same local day; no retroactive backfill. Repeated/failing provider attempts reserve the day and phrase; user is not spammed on retries. When 30-day eligible pool is exhausted the system sends nothing instead of violating no-repeat.

## Rollback
Set HH_DAYBOOK_INSPIRATIONS_ENABLED=false (or SEND_APPROVED=false) immediately. Never roll back the opt-in database migration destructively or delete consent audit entries to stop sends. Existing notification channels and crons remain untouched.
