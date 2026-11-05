-- P0: opt-in Telegram diagnostic conversation state for the existing CRM inbox.
-- Contains no photo, note, phone, full Telegram identity or health data.
-- The only authorized writer is a Telegram-secret-verified server route using hh_app_inbox.
-- Never create another Contacts or Messenger schema.
begin;

create table app_private.crm_tg_diagnostic_sessions (
  business_hash text not null check (business_hash ~ '^[a-f0-9]{64}$'),
  user_hash text not null check (user_hash ~ '^[a-f0-9]{64}$'),
  stage text not null check (stage in ('consent','focus','question','photo','done','stopped')),
  locale text not null check (locale in ('en','ru','es')),
  last_update_id bigint not null check (last_update_id >= 0),
  consent_at timestamptz,
  reply_day date not null default (now() at time zone 'UTC')::date,
  reply_count integer not null default 0 check (reply_count between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_hash,user_hash)
);
create index crm_tg_diagnostic_sessions_age
  on app_private.crm_tg_diagnostic_sessions(updated_at);

alter table app_private.crm_tg_diagnostic_sessions enable row level security;
alter table app_private.crm_tg_diagnostic_sessions force row level security;

revoke all on app_private.crm_tg_diagnostic_sessions
  from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
grant select,insert,update on app_private.crm_tg_diagnostic_sessions to hh_app_inbox;

-- This role is available only to the verified server-side webhook, never as a browser role.
-- RLS is defence-in-depth; the signed webhook additionally resolves the exact CRM owner.
create policy crm_tg_diagnostic_webhook_only
  on app_private.crm_tg_diagnostic_sessions for all to hh_app_inbox
  using (true) with check (true);

comment on table app_private.crm_tg_diagnostic_sessions is
  'Private signed-Telegram webhook state, opt-in only. Photo IDs are encrypted in existing CRM messages, not here. No automation sends or clinical data.';

-- STOP must suppress an already-existing CRM chat even if that chat entered
-- before the guided diagnostic. It must NOT create a new lead for an unknown
-- visitor who sends /stop without consenting.
create or replace function app_private.crm_tg_suppress_existing(
  p_account_hash text,p_user_hash text
) returns boolean
language plpgsql security definer set search_path = ''
as $fn$
declare v_owner uuid;v_thread uuid;v_contact uuid;
begin
  if p_account_hash !~ '^[a-f0-9]{64}$' or p_user_hash !~ '^[a-f0-9]{64}$'
    then return false; end if;
  select t.owner_id,t.id,t.contact_id into v_owner,v_thread,v_contact
    from app.crm_msg_accounts a
    join app.crm_msg_threads t on t.account_id=a.id and t.owner_id=a.owner_id
    where a.channel='telegram' and a.external_hash=p_account_hash
      and t.user_hash=p_user_hash and a.enabled
    limit 1;
  if v_thread is null then return false; end if;
  update app.crm_msg_threads set suppressed=true
    where id=v_thread and owner_id=v_owner;
  update app.crm_contacts set suppressed=true,revision=revision+1
    where id=v_contact and owner_id=v_owner and suppressed=false;
  return true;
end;
$fn$;
revoke all on function app_private.crm_tg_suppress_existing(text,text)
  from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
grant execute on function app_private.crm_tg_suppress_existing(text,text)
  to hh_app_inbox;

commit;
