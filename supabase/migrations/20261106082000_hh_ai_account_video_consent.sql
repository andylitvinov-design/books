-- Review-only additive account-binding for HH AI Telegram Draft PR #3647.
-- Apply ONLY after protected merge and separate consent/cost/owner approval.
-- Existing verified link/automatic video permission are authoritative.
begin;
-- The existing dispatch table predates AI video. An ambiguous Telegram
-- network outcome must remain UNKNOWN, not be misreported as rejected.
-- The unique video_id primary key prevents a second automatic send.
alter table app_private.personal_video_telegram_dispatch
 drop constraint if exists personal_video_telegram_dispatch_status_check;
alter table app_private.personal_video_telegram_dispatch
 add constraint personal_video_telegram_dispatch_status_check
 check(status in ('claimed','accepted','failed','suppressed','unknown'));
alter table app_private.ai_telegram_threads
 add column if not exists account_id uuid references app.accounts(id) on delete set null;
alter table app_private.ai_telegram_threads
 add column if not exists video_chat_hash text
 check(video_chat_hash is null or video_chat_hash ~ '^[0-9a-f]{64}$');


-- Record account-owned object intent before FFmpeg upload, surviving STOP.
create table if not exists app_private.ai_video_upload_intents(
 video_job_id uuid primary key,
 account_id uuid references app.accounts(id) on delete set null,
 object_key text not null unique
  check(object_key ~ '^personal-videos/[a-f0-9-]{36}/[a-f0-9-]{36}/master[.]mp4$'
),
 status text not null default 'reserved'
  check(status in ('reserved','committed','cleaning','cleaned')),
 lease_token uuid not null,
 cleanup_token uuid,
 created_at timestamptz not null default now(),
 cleanup_started_at timestamptz,
 cleaned_at timestamptz,
 updated_at timestamptz not null default now()
);
create index if not exists hh_ai_video_orphan_intents_idx
 on app_private.ai_video_upload_intents(status,created_at)
 where status in ('reserved','cleaning');
alter table app_private.ai_video_upload_intents enable row level security;
alter table app_private.ai_video_upload_intents force row level security;
revoke all on app_private.ai_video_upload_intents
 from public,anon,authenticated,hh_app_inbox,hh_app_backend,hh_crm_backend;

-- Reservation is impossible without a fresh video job lease and the current
-- versioned Telegram link + explicit automatic-video permission.
create or replace function app_private.ai_video_reserve_upload(
 p_job uuid,p_lease uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog as $$
declare v_account uuid;v_hash text;v_key text;v_ok uuid;
begin
 if current_setting('hh.ai_queue',true) is distinct from '1'
 or p_job is null or p_lease is null then return false;end if;
 select t.account_id,t.video_chat_hash into v_account,v_hash
 from app_private.ai_work_jobs j
 join app_private.ai_telegram_threads t on t.id=j.thread_id
 where j.id=p_job and j.lane='video' and j.status='leased'
  and j.lease_token=p_lease and j.lease_until>now()
  and t.account_id is not null and t.video_chat_hash is not null
  and t.consent_at is not null and t.stopped_at is null
 for update of j,t;
 if not found then return false;end if;
 perform 1 from app_private.notification_telegram_links l
 join app_private.personal_video_telegram_preferences p
  on p.account_id=l.account_id and p.chat_hash=l.chat_hash
  and p.link_verified_at=l.verified_at
 join app.accounts a on a.id=l.account_id
 where l.account_id=v_account and l.chat_hash=v_hash
  and p.automatic=true and p.consent_version='hh-video-telegram-delivery-v1'
  and a.status='active';
 if not found then return false;end if;
 v_key='personal-videos/'||v_account::text||'/'||p_job::text||'/master.mp4';
 insert into app_private.ai_video_upload_intents(
  video_job_id,account_id,object_key,lease_token)
 values(p_job,v_account,v_key,p_lease)
 on conflict(video_job_id) do update
 set lease_token=excluded.lease_token,updated_at=now()
 where app_private.ai_video_upload_intents.status='reserved'
  and app_private.ai_video_upload_intents.account_id=excluded.account_id
  and app_private.ai_video_upload_intents.object_key=excluded.object_key
 returning video_job_id into v_ok;
 return v_ok=p_job;
end
$$;

-- Claim only old uncommitted uploads; never an existing master or dispatch.
-- Mark CLEANING inside the DB before deletion so the master finalizer fails
-- if a concurrent renderer tries to commit after the cleanup claim.
create or replace function app_private.ai_video_claim_expired_orphans(
 p_limit integer default 5)
returns table(video_job_id uuid,object_key text,cleanup_token uuid)
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if current_setting('hh.ai_queue',true) is distinct from '1'
 or p_limit is null or p_limit not between 1 and 5 then return;end if;
 return query
 with batch as (
  select i.video_job_id from app_private.ai_video_upload_intents i
  where ((i.status='reserved' and i.created_at<now()-interval '24 hours')
   or (i.status='cleaning' and i.cleanup_started_at<now()-interval '1 hour'))
  and not exists(select 1 from app_private.personal_videos v
    where v.id=i.video_job_id)
  and not exists(select 1 from app_private.personal_video_telegram_dispatch d
    where d.video_id=i.video_job_id)
  and not exists(select 1 from app_private.ai_work_jobs j
    where j.id=i.video_job_id and j.status='leased' and j.lease_until>now())
  order by i.created_at,i.video_job_id
  limit p_limit for update of i skip locked
 )
 update app_private.ai_video_upload_intents i
 set status='cleaning',cleanup_token=gen_random_uuid(),
  cleanup_started_at=now(),updated_at=now()
 from batch where i.video_job_id=batch.video_job_id
 returning i.video_job_id,i.object_key,i.cleanup_token;
end
$$;

create or replace function app_private.ai_video_finish_orphan_cleanup(
 p_job uuid,p_token uuid)
returns boolean language plpgsql security definer
set search_path=pg_catalog as $$
declare v_job uuid;
begin
 if current_setting('hh.ai_queue',true) is distinct from '1'
 or p_job is null or p_token is null then return false;end if;
 update app_private.ai_video_upload_intents i
 set status='cleaned',cleanup_token=null,cleaned_at=now(),updated_at=now()
 where i.video_job_id=p_job and i.cleanup_token=p_token
  and i.status='cleaning'
  and not exists(select 1 from app_private.personal_videos v
    where v.id=i.video_job_id)
  and not exists(select 1 from app_private.personal_video_telegram_dispatch d
    where d.video_id=i.video_job_id)
 returning i.video_job_id into v_job;
 return v_job=p_job;
end
$$;
revoke all on function app_private.ai_video_reserve_upload(uuid,uuid)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
revoke all on function app_private.ai_video_claim_expired_orphans(integer)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
revoke all on function app_private.ai_video_finish_orphan_cleanup(uuid,uuid)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
grant execute on function app_private.ai_video_reserve_upload(uuid,uuid)
 to hh_app_inbox;
grant execute on function app_private.ai_video_claim_expired_orphans(integer)
 to hh_app_inbox;
grant execute on function app_private.ai_video_finish_orphan_cleanup(uuid,uuid)
 to hh_app_inbox;

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

-- Review-only personal master + unique delivery receipt. Never grant cross-client
-- personal video table access directly to the Telegram inbox DB role.
create or replace function app_private.ai_video_commit_personal_master(
 p_job uuid,p_lease uuid,p_bytes integer,p_scene text,p_duration integer)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare
 v_account uuid;v_hash text;v_link timestamptz;v_key text;
 v_record app_private.personal_videos%rowtype;
 v_count bigint;v_daily bigint;v_user_bytes bigint;v_global_bytes bigint;v_claimed uuid;
begin
 if current_setting('hh.ai_queue',true) is distinct from '1'
 or p_job is null or p_lease is null or p_bytes not between 1024 and 12000000
 or p_scene !~ '^[a-z0-9-]{2,64}$' or p_duration not in (10,15,20,30,60)
 then return false;end if;
 select t.account_id,t.video_chat_hash into v_account,v_hash
 from app_private.ai_work_jobs j
 join app_private.ai_telegram_threads t on t.id=j.thread_id
 where j.id=p_job and j.lease_token=p_lease and j.lane='video'
 and j.status='leased' and j.lease_until>now()
 and t.consent_at is not null and t.stopped_at is null
 and t.account_id is not null and t.video_chat_hash is not null for update of j,t;
 if not found then return false;end if;
 select l.verified_at into v_link from app_private.notification_telegram_links l
 join app_private.personal_video_telegram_preferences p on p.account_id=l.account_id
 and p.chat_hash=l.chat_hash and p.link_verified_at=l.verified_at
 join app.accounts a on a.id=l.account_id
 where l.account_id=v_account and l.chat_hash=v_hash
 and p.automatic=true and p.consent_version='hh-video-telegram-delivery-v1'
 and a.status='active';
 if not found then return false;end if;
 v_key='personal-videos/'||v_account::text||'/'||p_job::text||'/master.mp4';
 if not exists(select 1 from app_private.ai_video_upload_intents i
  where i.video_job_id=p_job and i.account_id=v_account
   and i.object_key=v_key and i.status='reserved'
  for update) then return false;end if;
 if not exists(select 1 from storage.objects o
 where o.bucket_id='hh-client-private-media' and o.name=v_key) then return false;end if;
 perform pg_advisory_xact_lock(598228614);
 select * into v_record from app_private.personal_videos where id=p_job for update;
 if found then
  if v_record.account_id<>v_account or v_record.object_key<>v_key
  or v_record.status<>'ready' or v_record.bytes<>p_bytes
  or v_record.duration_seconds<>p_duration
  or v_record.mime<>'video/mp4' then return false;end if;
 else
  select count(*),coalesce(sum(bytes),0) into v_count,v_user_bytes
  from app_private.personal_videos where account_id=v_account
  and (status<>'deleted' or released_at is null);
  select count(*) into v_daily from app_private.personal_videos
  where account_id=v_account and created_at>now()-interval '1 day';
  select coalesce(sum(bytes),0) into v_global_bytes
  from app_private.personal_videos
  where status<>'deleted' or released_at is null;
  if v_count>=3 or v_daily>=6 or v_user_bytes+p_bytes>36000000
  or v_global_bytes+p_bytes>180000000 then return false;end if;
  -- Versioned automatic Telegram consent is the source. No forged user
  -- cloud-save consent event is written on the user's behalf.
  insert into app_private.personal_videos
  (id,account_id,theme,scene_id,aspect,duration_seconds,mime,bytes,object_key,status,ready_at)
  values(p_job,v_account,'goals',p_scene,'portrait',p_duration,'video/mp4',
   p_bytes,v_key,'ready',now());
 end if;
 insert into app_private.personal_video_telegram_dispatch
 (video_id,account_id,chat_hash,link_verified_at,mode,status,consent_version)
 values(p_job,v_account,v_hash,v_link,'automatic','claimed',
 'hh-video-telegram-delivery-v1')
 on conflict(video_id) do nothing returning video_id into v_claimed;
 if v_claimed=p_job then
  update app_private.ai_video_upload_intents i
  set status='committed',updated_at=now()
  where i.video_job_id=p_job and i.account_id=v_account
   and i.object_key=v_key and i.status='reserved';
 end if;
 return v_claimed=p_job;
end
$$;

create or replace function app_private.ai_video_delivery_allowed(
 p_delivery uuid,p_video uuid)
returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(current_setting('hh.ai_queue',true)='1' and exists(
 select 1 from app_private.ai_work_jobs j
 join app_private.ai_telegram_threads t on t.id=j.thread_id
 join app_private.personal_video_telegram_dispatch d
  on d.video_id=p_video and d.account_id=t.account_id
 join app_private.personal_videos v on v.id=d.video_id and v.account_id=t.account_id
 join app_private.notification_telegram_links l on l.account_id=t.account_id
  and l.chat_hash=d.chat_hash and l.verified_at=d.link_verified_at
 join app_private.personal_video_telegram_preferences p on p.account_id=t.account_id
  and p.chat_hash=l.chat_hash and p.link_verified_at=l.verified_at
 join app.accounts a on a.id=t.account_id
 where j.id=p_delivery and j.lane='delivery' and j.status='leased'
  and j.lease_until>now() and t.consent_at is not null and t.stopped_at is null
  and t.video_chat_hash=d.chat_hash and d.status='claimed'
  and d.mode='automatic' and d.consent_version='hh-video-telegram-delivery-v1'
  and p.automatic=true and p.consent_version=d.consent_version
  and v.status='ready' and v.mime='video/mp4'
  and v.object_key=('personal-videos/'||t.account_id::text||'/'||p_video::text||'/master.mp4')
  and a.status='active'
 ),false)
$$;

create or replace function app_private.ai_video_finish_dispatch(
 p_delivery uuid,p_video uuid,p_outcome text,p_message text default null)
returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare v_done uuid;
begin
 if current_setting('hh.ai_queue',true) is distinct from '1'
 or p_outcome not in ('accepted','rejected','unknown','suppressed')
 or (p_outcome='accepted' and coalesce(p_message,'') !~ '^[1-9][0-9]{0,15}$')
 then return false;end if;
 update app_private.personal_video_telegram_dispatch d
 set status=case when p_outcome='accepted' then 'accepted'
  when p_outcome='suppressed' then 'suppressed'
  when p_outcome='unknown' then 'unknown' else 'failed' end,
 provider_message_id=case when p_outcome='accepted' then p_message else null end,
 updated_at=now()
 from app_private.ai_work_jobs j
 join app_private.ai_telegram_threads t on t.id=j.thread_id
 where j.id=p_delivery and j.lane='delivery'
 and j.status in ('done','dead','unknown','suppressed')
 and t.account_id=d.account_id and d.video_id=p_video and d.status='claimed'
 returning d.video_id into v_done;
 return v_done=p_video;
end
$$;
revoke all on function app_private.ai_video_commit_personal_master(uuid,uuid,integer,text,integer)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
revoke all on function app_private.ai_video_delivery_allowed(uuid,uuid)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
revoke all on function app_private.ai_video_finish_dispatch(uuid,uuid,text,text)
 from public,anon,authenticated,hh_crm_backend,hh_app_backend;
grant execute on function app_private.ai_video_commit_personal_master(uuid,uuid,integer,text,integer)
 to hh_app_inbox;
grant execute on function app_private.ai_video_delivery_allowed(uuid,uuid)
 to hh_app_inbox;
grant execute on function app_private.ai_video_finish_dispatch(uuid,uuid,text,text)
 to hh_app_inbox;

commit;
