-- CRM Telegram Companion: independent opt-in, persistent menu, one greeting/day.
-- No new bot, webhook, scheduler, marketing consent, public grants or paid provider.
begin;
create table if not exists app_private.crm_tg_companion_sessions (
  id uuid primary key default gen_random_uuid(),
  business_hash text not null check (business_hash ~ '^[0-9a-f]{64}$'),
  user_hash text not null check (user_hash ~ '^[0-9a-f]{64}$'),
  owner_id uuid not null,
  chat_ciphertext text,
  locale text not null default 'en' check(locale in ('ru','en','es')),
  mode text not null default 'menu' check(mode in ('menu','ai','checkin','review')),
  ai_consent_at timestamptz,
  pending_ai_at timestamptz,
  daily_opt_in_at timestamptz,
  daily_opt_out_at timestamptz,
  pending_daily_at timestamptz,
  stopped_at timestamptz,
  last_update_id bigint not null check(last_update_id>=0),
  reply_day date,
  reply_count integer not null default 0 check(reply_count between 0 and 40),
  last_daily_day date,
  last_daily_status text check(last_daily_status in ('unknown','accepted','suppressed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_hash,user_hash),
  constraint daily_requires_sealed_destination check(daily_opt_in_at is null or chat_ciphertext is not null)
);
create index if not exists crm_tg_companion_daily_idx
  on app_private.crm_tg_companion_sessions(business_hash,last_daily_day,updated_at)
  where daily_opt_in_at is not null and stopped_at is null;
alter table app_private.crm_tg_companion_sessions enable row level security;
alter table app_private.crm_tg_companion_sessions force row level security;
revoke all on app_private.crm_tg_companion_sessions from public,anon,authenticated,hh_app_backend,hh_app_inbox,hh_crm_backend;
grant select,insert,update,delete on app_private.crm_tg_companion_sessions to hh_app_inbox;
grant select,update on app_private.crm_tg_companion_sessions to hh_app_backend;
create policy hh_crm_tg_companion_signed_inbox on app_private.crm_tg_companion_sessions
  for all to hh_app_inbox
  using(current_setting('hh.crm_companion',true)='1')
  with check(current_setting('hh.crm_companion',true)='1');
create policy hh_crm_tg_companion_daily_backend on app_private.crm_tg_companion_sessions
  for all to hh_app_backend
  using(current_setting('hh.crm_companion',true)='1')
  with check(current_setting('hh.crm_companion',true)='1');
comment on table app_private.crm_tg_companion_sessions is
 'Signed CRM bot only: no questions or check-in scores saved; explicit AI/daily opt-in; encrypted daily destination; 1-per-day no-retry receipts.';
commit;
