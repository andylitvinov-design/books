-- Telegram Mini App intake: assert and lock the EXISTING consented CRM thread
-- before any app-private questionnaire is appended. No new lead or table.
-- The signed Telegram initData is always verified in the application first.
begin;
create or replace function app_private.crm_tg_existing_thread(
  p_business_hash text, p_user_hash text
) returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare v_found boolean;
begin
  if p_business_hash !~ '^[a-f0-9]{64}$' or p_user_hash !~ '^[a-f0-9]{64}$'
    then return false;
  end if;
  select true into v_found
    from app.crm_msg_accounts a
    join app.crm_msg_threads t on t.account_id = a.id and t.owner_id = a.owner_id
    join app.crm_contacts c on c.id = t.contact_id and c.owner_id = a.owner_id
   where a.channel = 'telegram' and a.enabled and a.external_hash = p_business_hash
     and t.user_hash = p_user_hash and not t.suppressed and not c.suppressed
     and c.lifecycle <> 'archived'
   for share of t
   limit 1;
  return coalesce(v_found, false);
end;
$fn$;
revoke all on function app_private.crm_tg_existing_thread(text,text)
  from public, anon, authenticated, service_role, hh_app_backend, hh_crm_backend;
grant execute on function app_private.crm_tg_existing_thread(text,text) to hh_app_inbox;
comment on function app_private.crm_tg_existing_thread(text,text) is
  'Restrict verified Telegram Mini App questionnaire writes to already-existing active CRM chats; no lead creation.';
commit;
