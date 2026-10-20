-- Holistic House customer Telegram pairing and at-most-once alerts.
-- Recorded Supabase migration 20261020162323; no live sends or bot credentials activated.
CREATE TABLE app_private.notification_telegram_challenges(
 account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_telegram_challenges_expiry ON app_private.notification_telegram_challenges(expires_at);
CREATE TABLE app_private.notification_telegram_links(
 account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
 chat_hash text NOT NULL UNIQUE CHECK(chat_hash ~ '^[0-9a-f]{64}$'),
 chat_ciphertext text NOT NULL CHECK(length(chat_ciphertext) between 30 and 4096),
 consent_version text NOT NULL CHECK(consent_version='hh-tg-message-alerts-v1'),
 verified_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app_private.notification_telegram_dispatch(
 message_id uuid PRIMARY KEY REFERENCES app.practitioner_request_messages(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'claimed' CHECK(state IN ('claimed','accepted','failed','suppressed')),
 provider_message_id text CHECK(provider_message_id is null or length(provider_message_id)<=64),
 claimed_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.notification_telegram_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_telegram_challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_telegram_links FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_telegram_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.notification_telegram_dispatch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.notification_telegram_challenges,app_private.notification_telegram_links,
 app_private.notification_telegram_dispatch FROM public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.notification_telegram_challenges TO hh_app_backend;
GRANT SELECT,DELETE ON app_private.notification_telegram_links TO hh_app_backend;
CREATE POLICY hh_notification_tg_challenges_owner ON app_private.notification_telegram_challenges
 FOR ALL TO hh_app_backend
 USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY hh_notification_tg_links_owner ON app_private.notification_telegram_links
 FOR ALL TO hh_app_backend
 USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

CREATE OR REPLACE FUNCTION app_private.notification_tg_consume(p_token_hash text, p_account_id uuid, p_chat_hash text, p_ciphertext text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_token_hash !~ '^[0-9a-f]{64}$' or p_chat_hash !~ '^[0-9a-f]{64}$'
  or p_account_id is null or length(p_ciphertext) not between 30 and 4096 then
   return false;
 end if;
 if not exists (
  select 1 from app_private.notification_telegram_challenges c
   join app.accounts a on a.id=c.account_id
   where c.token_hash=p_token_hash and c.account_id=p_account_id
     and c.expires_at>now() and a.status='active' and a.onboarding_state='active'
   for update of c
 ) then return false; end if;
 insert into app_private.notification_telegram_links
  (account_id,chat_hash,chat_ciphertext,consent_version)
 values(p_account_id,p_chat_hash,p_ciphertext,'hh-tg-message-alerts-v1')
 on conflict(account_id) do update set
  chat_hash=excluded.chat_hash,chat_ciphertext=excluded.chat_ciphertext,
  consent_version=excluded.consent_version,verified_at=now(),updated_at=now();
 delete from app_private.notification_telegram_challenges
  where account_id=p_account_id and token_hash=p_token_hash;
 return true;
exception when unique_violation then
 return false;
end
$function$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_dispatch_allowed(p_message_id uuid, p_chat_hash text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from app_private.notification_telegram_dispatch d
  join app_private.notification_telegram_links l on l.account_id=d.account_id
  join app_private.notification_messenger_requests n on n.account_id=d.account_id and n.channel='telegram'
  join app.accounts a on a.id=d.account_id
  where d.message_id=p_message_id and d.state='claimed'
   and l.chat_hash=p_chat_hash and l.consent_version='hh-tg-message-alerts-v1'
   and n.topics->>'messages'='true' and a.status='active' and a.onboarding_state='active'
 )
$function$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_dispatch_finish(p_message_id uuid, p_status text, p_provider_message_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if p_status not in ('accepted','failed','suppressed') or
  (p_provider_message_id is not null and length(p_provider_message_id)>64) then return false; end if;
 update app_private.notification_telegram_dispatch
  set state=p_status,provider_message_id=case when p_status='accepted' then p_provider_message_id else null end,
   updated_at=now()
 where message_id=p_message_id and state='claimed';
 get diagnostics n=row_count;
 return n>0;
end
$function$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_message_claim(p_message_id uuid)
 RETURNS TABLE(target_account_id uuid, target_request_id uuid, target_ciphertext text, target_locale text, target_chat_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_account uuid;v_request uuid;v_cipher text;v_locale text;v_hash text;
begin
 select case when m.author_role='practitioner' then r.account_id
             when m.author_role='client' then p.trusted_auth_user_id end,
        r.id,l.chat_ciphertext,n.locale,l.chat_hash
 into v_account,v_request,v_cipher,v_locale,v_hash
 from app.practitioner_request_messages m
 join app.consultation_requests r on r.id=m.request_id
 join app.practitioners p on p.id=r.recipient_practitioner_id
 join app.accounts a on a.id=case when m.author_role='practitioner' then r.account_id
                         else p.trusted_auth_user_id end
 join app_private.notification_messenger_requests n on n.account_id=a.id and n.channel='telegram'
 join app_private.notification_telegram_links l on l.account_id=a.id
 where m.id=p_message_id and m.visibility='participants'
   and m.created_at>now()-interval '15 minutes'
   and ((m.author_role='practitioner' and m.author_account_id=p.trusted_auth_user_id
         and m.author_account_id<>r.account_id)
        or (m.author_role='client' and m.author_account_id=r.account_id
         and m.author_account_id<>p.trusted_auth_user_id))
   and p.active=true and p.status in ('approved','submitted','changes_requested')
   and r.status in ('requested','contacted')
   and a.status='active' and a.onboarding_state='active'
   and n.topics->>'messages'='true'
   and n.consent_version='hh-messenger-contact-v1'
   and l.consent_version='hh-tg-message-alerts-v1'
 limit 1;
 if v_account is null then return; end if;
 insert into app_private.notification_telegram_dispatch(message_id,account_id,request_id)
 values(p_message_id,v_account,v_request) on conflict do nothing;
 if not found then return; end if;
 target_account_id:=v_account;target_request_id:=v_request;
 target_ciphertext:=v_cipher;target_locale:=v_locale;target_chat_hash:=v_hash;
 return next;
end
$function$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_stop(p_chat_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n integer;
begin
 if p_chat_hash !~ '^[0-9a-f]{64}$' then return false; end if;
 delete from app_private.notification_telegram_links where chat_hash=p_chat_hash;
 get diagnostics n=row_count;
 return n>0;
end
$function$;

CREATE OR REPLACE FUNCTION app_private.notification_tg_token_owner(p_token_hash text)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select c.account_id from app_private.notification_telegram_challenges c
 join app.accounts a on a.id=c.account_id
 where c.token_hash=p_token_hash and c.expires_at>now()
 and a.status='active' and a.onboarding_state='active'
 limit 1
$function$;

REVOKE ALL ON FUNCTION app_private.notification_tg_token_owner(text),
 app_private.notification_tg_consume(text,uuid,text,text),
 app_private.notification_tg_stop(text),
 app_private.notification_tg_message_claim(uuid),
 app_private.notification_tg_dispatch_allowed(uuid,text),
 app_private.notification_tg_dispatch_finish(uuid,text,text) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_private.notification_tg_token_owner(text),
 app_private.notification_tg_consume(text,uuid,text,text),
 app_private.notification_tg_stop(text) TO hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.notification_tg_message_claim(uuid),
 app_private.notification_tg_dispatch_allowed(uuid,text),
 app_private.notification_tg_dispatch_finish(uuid,text,text) TO hh_app_backend;
COMMENT ON TABLE app_private.notification_telegram_links IS
 'Account-verified opt-in via official Telegram bot only. Chat ID stored AES-GCM encrypted by app.';
COMMENT ON TABLE app_private.notification_telegram_dispatch IS
 'At-most-once external notification claims; accepted is Bot API acceptance, never proof of delivery or read.';
