-- Review-only additive account-binding for HH AI Telegram Draft PR #3647.
-- Apply ONLY after protected merge and separate consent/cost/owner approval.
-- Existing verified link/automatic video permission are authoritative.
begin;
alter table app_private.ai_telegram_threads
 add column if not exists account_id uuid references app.accounts(id) on delete set null;
alter table app_private.ai_telegram_threads
 add column if not exists video_chat_hash text
 check(video_chat_hash is null or video_chat_hash ~ '^[0-9a-f]{64}$');

-- Never expose this definer or the tables to anon/authenticated/PostgREST.
-- May only be invoked by server role after a verified Telegram webhook.
create or replace function app_private.ai_video_account_for_chat(p_chat_hash text)
returns uuid language sql stable security definer
set search_path = pg_catalog
as $$
 select l.account_id
 from app_private.notification_telegram_links l
 join app_private.personal_video_telegram_preferences p
   on p.account_id=l.account_id
 join app.accounts a on a.id=l.account_id
 where l.chat_hash=p_chat_hash
   and p.chat_hash=l.chat_hash
   and p.link_verified_at=l.verified_at
   and p.consent_version='hh-video-telegram-delivery-v1'
   and p.automatic=true
   and a.status='active'
 limit 1
$$;
revoke all on function app_private.ai_video_account_for_chat(text)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
grant execute on function app_private.ai_video_account_for_chat(text)
 to hh_app_inbox;

comment on function app_private.ai_video_account_for_chat(text) is
 'Private signed-webhook only: current account-bound Telegram video delivery opt-in. Provider token identity must also be verified in server code.';
commit;
