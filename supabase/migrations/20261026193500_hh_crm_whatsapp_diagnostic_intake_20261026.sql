-- Additive consent-first WhatsApp six-stage intake in the existing CRM inbox.
-- Store only non-reversible hashes and coarse state; no client message or media in this table.
begin;
create table if not exists app_private.crm_wa_diagnostic_sessions (
  business_hash text not null check (business_hash ~ '^[a-f0-9]{64}$'),
  user_hash text not null check (user_hash ~ '^[a-f0-9]{64}$'),
  stage text not null check (stage in ('consent','focus','photo','question','drawing','done','stopped')),
  locale text not null check (locale in ('en','ru','es')),
  topic text check (topic is null or topic in ('business','wellbeing','relationships','other')),
  last_message_hash text not null check (last_message_hash ~ '^[a-f0-9]{64}$'),
  last_inbound_at timestamptz not null,
  consent_at timestamptz,
  reply_day date not null default (now() at time zone 'UTC')::date,
  reply_count integer not null default 0 check (reply_count between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_hash,user_hash)
);
create index if not exists crm_wa_diagnostic_sessions_age
 on app_private.crm_wa_diagnostic_sessions(updated_at);
alter table app_private.crm_wa_diagnostic_sessions enable row level security;
alter table app_private.crm_wa_diagnostic_sessions force row level security;
revoke all on app_private.crm_wa_diagnostic_sessions
 from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
grant select,insert,update on app_private.crm_wa_diagnostic_sessions to hh_app_inbox;
create policy crm_wa_signed_webhook_only
 on app_private.crm_wa_diagnostic_sessions for all to hh_app_inbox
 using (true) with check (true);
comment on table app_private.crm_wa_diagnostic_sessions is
 'Verified WhatsApp webhook-only coarse diagnostic state; opted-in CRM messages are encrypted elsewhere.';

-- A STOP from someone who already used the pre-intake WhatsApp inbox
-- suppresses the original thread instead of creating a new CRM contact.
create or replace function app_private.crm_wa_suppress_existing(
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
 where a.channel='whatsapp' and a.external_hash=p_account_hash
   and t.user_hash=p_user_hash and a.enabled limit 1;
 if v_thread is null then return false; end if;
 update app.crm_msg_threads set suppressed=true where id=v_thread and owner_id=v_owner;
 update app.crm_contacts set suppressed=true,revision=revision+1
 where id=v_contact and owner_id=v_owner and suppressed=false;
 return true;
end; $fn$;
revoke all on function app_private.crm_wa_suppress_existing(text,text)
 from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
grant execute on function app_private.crm_wa_suppress_existing(text,text) to hh_app_inbox;
commit;
