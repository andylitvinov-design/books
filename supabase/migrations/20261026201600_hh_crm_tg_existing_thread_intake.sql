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
   limit 1
   for share of t, c;
  return coalesce(v_found, false);
end;
$fn$;
revoke all on function app_private.crm_tg_existing_thread(text,text)
  from public, anon, authenticated, service_role, hh_app_backend, hh_crm_backend;
grant execute on function app_private.crm_tg_existing_thread(text,text) to hh_app_inbox;
comment on function app_private.crm_tg_existing_thread(text,text) is
  'Restrict verified Telegram Mini App questionnaire writes to already-existing active CRM chats; no lead creation.';

-- Attest an *entire* previously committed Telegram questionnaire, not merely
-- the existence of an operation ID. The application HMAC-binds each event
-- hash to the whole canonical questionnaire body, and binds each provider
-- hash to the immutable UUID + chunk index. A partial or altered replay must
-- not yield a false success receipt. No plaintext questionnaire is stored here.
create or replace function app_private.crm_tg_questionnaire_seen(
  p_business_hash text, p_user_hash text,
  p_provider_hashes text[], p_event_hashes text[]
) returns boolean
language plpgsql security definer set search_path = '' as $fn$
declare
  v_owner uuid;
  v_account uuid;
  v_thread uuid;
  v_expected integer;
  v_found integer;
begin
  v_expected := coalesce(pg_catalog.cardinality(p_provider_hashes),0);
  if p_business_hash !~ '^[a-f0-9]{64}

    or p_user_hash !~ '^[a-f0-9]{64}

    or p_provider_hashes is null or p_event_hashes is null
    or v_expected < 1 or v_expected > 48
    or pg_catalog.cardinality(p_event_hashes) <> v_expected
    or exists (select 1 from pg_catalog.unnest(p_provider_hashes) as h(value)
      where h.value is null or h.value !~ '^[a-f0-9]{64}
)
    or exists (select 1 from pg_catalog.unnest(p_event_hashes) as h(value)
      where h.value is null or h.value !~ '^[a-f0-9]{64}
)
    or (select count(distinct h.value) from pg_catalog.unnest(p_provider_hashes) as h(value)) <> v_expected
  then return false;
  end if;

  select a.owner_id,a.id,t.id into v_owner,v_account,v_thread
    from app.crm_msg_accounts a
    join app.accounts o on o.id=a.owner_id and o.status='active'
    join app.crm_msg_threads t on t.account_id=a.id and t.owner_id=a.owner_id
    join app.crm_contacts c on c.id=t.contact_id and c.owner_id=a.owner_id
   where a.channel='telegram' and a.enabled and a.external_hash=p_business_hash
     and t.user_hash=p_user_hash and not t.suppressed and not c.suppressed
     and c.lifecycle<>'archived'
   limit 1
   for share of t, c;
  if v_thread is null then return false; end if;

  select count(*) into v_found
    from pg_catalog.unnest(p_provider_hashes,p_event_hashes) as expected(provider_hash,event_hash)
    join app.crm_msg_items m on m.owner_id=v_owner and m.thread_id=v_thread
      and m.provider_hash=expected.provider_hash and m.direction='in' and m.status='received'
    join app.crm_msg_events e on e.account_id=v_account and e.event_hash=expected.event_hash;
  return v_found=v_expected;
end;
$fn$;
revoke all on function app_private.crm_tg_questionnaire_seen(text,text,text[],text[])
  from public, anon, authenticated, service_role, hh_app_backend, hh_crm_backend;
grant execute on function app_private.crm_tg_questionnaire_seen(text,text,text[],text[]) to hh_app_inbox;
comment on function app_private.crm_tg_questionnaire_seen(text,text,text[],text[]) is
  'Owner-scoped exact replay check for atomic, chunked encrypted Telegram coaching submissions; not callable by public roles.';
commit;
