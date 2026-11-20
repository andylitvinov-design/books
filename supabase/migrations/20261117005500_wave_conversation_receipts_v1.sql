-- Wave Quality Receipts v1. Source-only metadata, no new transcript or client text.
-- The CRM remains authoritative for encrypted operational messages.
-- This index is not consent to AI training or qualitative client review.
begin;
create table app_private.wave_conversation_receipts (
  source text not null check (source in ('crm','agent_history','coaching')),
  source_id uuid not null,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  channel text not null check
    (channel in ('telegram','whatsapp','instagram','messenger','site','my_coach')),
  direction text not null check (direction in ('in','out','pair')),
  delivery text not null check (delivery in
    ('received','processed','send_pending','provider_accepted','delivery_unknown',
     'draft','queued','accepted','delivered','read','failed','blocked','unknown','stored')),
  locale text check (locale is null or locale in ('ru','en','es')),
  route_version text,
  source_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  primary key (source,source_id)
);
comment on table app_private.wave_conversation_receipts is
  'Private metadata index of existing encrypted sources. No client text or external identifiers. Model route is NULL until independently observed. Source deletion cascades into index deletion.';
create index wave_conversation_receipts_source_day
  on app_private.wave_conversation_receipts(source_at desc,channel,direction,delivery);
create index wave_conversation_receipts_owner
  on app_private.wave_conversation_receipts(owner_id,source_at desc);
revoke all on app_private.wave_conversation_receipts
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
alter table app_private.wave_conversation_receipts enable row level security;
alter table app_private.wave_conversation_receipts force row level security;
-- No direct SELECT/INSERT policies. Only postgres-owned trigger functions may write.
-- Server-only readers can invoke the aggregate function, never obtain source IDs.

create function app_private.wave_sync_crm_receipt()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_channel text;
begin
  if new.direction not in ('in','out') then return new; end if;
  select a.channel into v_channel
    from app.crm_msg_threads t
    join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
    where t.id=new.thread_id and t.owner_id=new.owner_id;
  if v_channel is null then return new; end if;
  insert into app_private.wave_conversation_receipts
    (source,source_id,owner_id,channel,direction,delivery,source_at)
  values('crm',new.id,new.owner_id,v_channel,new.direction,new.status,new.created_at)
  on conflict(source,source_id) do update
    set delivery=excluded.delivery,refreshed_at=now();
  return new;
end;
$fn$;
create trigger wave_crm_receipt_write
after insert or update of status on app.crm_msg_items
for each row execute function app_private.wave_sync_crm_receipt();

create function app_private.wave_sync_history_receipt()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  insert into app_private.wave_conversation_receipts
    (source,source_id,owner_id,channel,direction,delivery,source_at)
  values('agent_history',new.id,new.account_id,'site','pair','stored',new.created_at)
  on conflict(source,source_id) do nothing;
  return new;
end;
$fn$;
create trigger wave_history_receipt_write
after insert on app_private.agent_chat_history_pairs
for each row execute function app_private.wave_sync_history_receipt();

create function app_private.wave_sync_coaching_receipt()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if new.speaker not in ('client','coach') then return new; end if;
  insert into app_private.wave_conversation_receipts
    (source,source_id,owner_id,channel,direction,delivery,locale,source_at)
  values('coaching',new.id,new.account_id,'my_coach',
    case when new.speaker='client' then 'in' else 'out' end,
    'stored',new.locale,new.created_at)
  on conflict(source,source_id) do nothing;
  return new;
end;
$fn$;
create trigger wave_coaching_receipt_write
after insert on app_private.coaching_session_messages
for each row execute function app_private.wave_sync_coaching_receipt();

create function app_private.wave_delete_source_receipt()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare v_source text;
begin
  v_source:=case tg_table_name
    when 'crm_msg_items' then 'crm'
    when 'agent_chat_history_pairs' then 'agent_history'
    when 'coaching_session_messages' then 'coaching'
    else null end;
  if v_source is not null then
    delete from app_private.wave_conversation_receipts
      where source=v_source and source_id=old.id;
  end if;
  return old;
end;
$fn$;
create trigger wave_crm_receipt_delete
after delete on app.crm_msg_items
for each row execute function app_private.wave_delete_source_receipt();
create trigger wave_history_receipt_delete
after delete on app_private.agent_chat_history_pairs
for each row execute function app_private.wave_delete_source_receipt();
create trigger wave_coaching_receipt_delete
after delete on app_private.coaching_session_messages
for each row execute function app_private.wave_delete_source_receipt();

-- Backfill the currently stored, permissioned archives only. Never decode bodies.
insert into app_private.wave_conversation_receipts
  (source,source_id,owner_id,channel,direction,delivery,source_at)
select 'crm',m.id,m.owner_id,a.channel,m.direction,m.status,m.created_at
from app.crm_msg_items m
join app.crm_msg_threads t on t.id=m.thread_id and t.owner_id=m.owner_id
join app.crm_msg_accounts a on a.id=t.account_id and a.owner_id=t.owner_id
where m.direction in ('in','out')
on conflict(source,source_id) do nothing;

insert into app_private.wave_conversation_receipts
  (source,source_id,owner_id,channel,direction,delivery,source_at)
select 'agent_history',h.id,h.account_id,'site','pair','stored',h.created_at
from app_private.agent_chat_history_pairs h
join app_private.agent_chat_history_consent c
  on c.account_id=h.account_id and c.accepted=true
on conflict(source,source_id) do nothing;

insert into app_private.wave_conversation_receipts
  (source,source_id,owner_id,channel,direction,delivery,locale,source_at)
select 'coaching',m.id,m.account_id,'my_coach',
       case when m.speaker='client' then 'in' else 'out' end,
       'stored',m.locale,m.created_at
from app_private.coaching_session_messages m
where m.speaker in ('client','coach')
on conflict(source,source_id) do nothing;

create function app_private.wave_quality_receipt_summary(p_days integer default 31)
returns table (
  day date,source text,channel text,direction text,delivery text,events bigint
)
language sql stable security definer set search_path = '' as $fn$
  select (r.source_at at time zone 'America/Toronto')::date as day,
    r.source,r.channel,r.direction,r.delivery,count(*)::bigint as events
  from app_private.wave_conversation_receipts r
  where r.source_at >= now() - (least(31,greatest(1,coalesce(p_days,31))) * interval '1 day')
  group by 1,2,3,4,5
  order by 1 desc,2,3,4,5
$fn$;
comment on function app_private.wave_quality_receipt_summary(integer) is
  'Owner-admin aggregated coverage only. Incomplete sources are not counted as zero. No raw transcript or provider identifiers.';
revoke all on function app_private.wave_quality_receipt_summary(integer)
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.wave_quality_receipt_summary(integer)
  to hh_app_backend;

revoke all on function app_private.wave_sync_crm_receipt()
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
revoke all on function app_private.wave_sync_history_receipt()
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
revoke all on function app_private.wave_sync_coaching_receipt()
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
revoke all on function app_private.wave_delete_source_receipt()
  from public,anon,authenticated,hh_app_inbox,hh_crm_backend,hh_app_backend;
commit;
