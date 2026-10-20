-- Applied on the production Supabase project as migration 20261020190745.
-- Public-only Gemini/Mistral site review cached to avoid double inference
-- on a failed Telegram send. Never store keys or client health/test data.
alter table app_private.council_telegram_deliveries
 add column if not exists report_markdown text
   check(report_markdown is null or length(report_markdown)<=79000),
 add column if not exists model_outcomes jsonb not null default '{}'::jsonb
   check(jsonb_typeof(model_outcomes)='object');
alter table app_private.council_telegram_deliveries force row level security;
revoke all on app_private.council_telegram_deliveries from public,anon,authenticated,hh_app_inbox;
