-- Signed bot confirmation, optional explicit CRM-link intent. Additive; apply after Reiki Hints schema.
begin;
alter table app_private.notification_telegram_challenges
 add column crm_bot_hash text check(crm_bot_hash is null or crm_bot_hash ~ '^[0-9a-f]{64}$');
create function app_private.notification_tg_consume_with_crm(p_token_hash text,p_account_id uuid,p_chat_hash text,p_ciphertext text,p_bot_hash text,p_user_hash text)
returns boolean language plpgsql security definer set search_path='' as $f$
declare v_intent text; v_owner uuid; v_verified timestamptz;
begin
 select c.crm_bot_hash into v_intent
 from app_private.notification_telegram_challenges c
 where c.token_hash=p_token_hash and c.account_id=p_account_id and c.expires_at>now()
 for update of c;
 if not found then return false; end if;
 if v_intent is not null then
  if p_bot_hash is distinct from v_intent or p_user_hash is null or p_user_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select b.owner_id into v_owner from app.crm_msg_accounts b
  join app.accounts a on a.id=b.owner_id
  where b.channel='telegram' and b.enabled and b.external_hash=v_intent
   and a.status='active' and a.onboarding_state='active' limit 1;
  if v_owner is null then return false; end if;
 end if;
 if not app_private.notification_tg_consume(p_token_hash,p_account_id,p_chat_hash,p_ciphertext) then return false; end if;
 select l.verified_at into v_verified from app_private.notification_telegram_links l
 where l.account_id=p_account_id and l.chat_hash=p_chat_hash;
 if v_verified is null then raise exception 'TELEGRAM_LINK_MISSING'; end if;
 if v_intent is not null then
  insert into app_private.crm_google_telegram_links(account_id,crm_owner_id,chat_hash,crm_bot_hash,crm_user_hash,notice_version)
   values(p_account_id,v_owner,p_chat_hash,v_intent,p_user_hash,'hh-telegram-google-crm-link-v1')
  on conflict(account_id) do update set crm_owner_id=excluded.crm_owner_id,chat_hash=excluded.chat_hash,
   crm_bot_hash=excluded.crm_bot_hash,crm_user_hash=excluded.crm_user_hash,linked_at=now(),notice_version=excluded.notice_version;
 end if;
 -- Pin first verified identity immediately, even if delivery is disabled.
 update app_private.reiki_hints_preferences p set chat_hash=p_chat_hash,link_verified_at=v_verified
 where p.account_id=p_account_id and p.start_day is null and p.chat_hash is null and p.stopped_at is null;
 return true;
exception when unique_violation then
 -- Roll back token consumption and link changes if identity is already bound.
 return false;
end $f$;
revoke all on function app_private.notification_tg_consume_with_crm(text,uuid,text,text,text,text)
 from public,anon,authenticated,hh_app_backend,hh_crm_backend;
grant execute on function app_private.notification_tg_consume_with_crm(text,uuid,text,text,text,text) to hh_app_inbox;
commit;
