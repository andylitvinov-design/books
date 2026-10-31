-- Install ONLY in an isolated scheduler Postgres database.
-- Never install in the production Holistic House client database.
create schema if not exists hh_lab_ops;
create table if not exists hh_lab_ops.preview_requests(
 id bigint generated always as identity primary key,
 sha text not null check (sha ~ '^[0-9a-f]{40}$'),
 requested_at timestamptz not null default now(),
 state text not null default 'reserved' check (state in ('reserved','building','ready','failed','canceled')),
 deployment_id text,
 lease_expires_at timestamptz not null default (now() + interval '20 minutes')
);
create unique index if not exists hh_lab_preview_unique_sha on hh_lab_ops.preview_requests(sha);
create index if not exists hh_lab_preview_requested_at on hh_lab_ops.preview_requests(requested_at desc);
revoke all on schema hh_lab_ops from public, anon, authenticated;
revoke all on all tables in schema hh_lab_ops from public, anon, authenticated;
alter table hh_lab_ops.preview_requests enable row level security;
create or replace function hh_lab_ops.reserve_preview(p_sha text)
returns table(accepted boolean, reason text, request_id bigint)
language plpgsql security invoker set search_path = pg_catalog, hh_lab_ops
as $$
declare v_now timestamptz := clock_timestamp(); v_id bigint;
begin
 if p_sha !~ '^[0-9a-f]{40}$' then
  return query select false,'invalid-sha'::text,null::bigint; return;
 end if;
 -- Global transaction-scoped mutex; all agents serialize quota evaluation.
 perform pg_advisory_xact_lock(2742026, 31);
 if exists(select 1 from hh_lab_ops.preview_requests where sha=p_sha) then
  return query select false,'duplicate-sha'::text,null::bigint; return;
 end if;
 if (select count(*) from hh_lab_ops.preview_requests where requested_at>v_now-interval '24 hours')>=12 then
  return query select false,'daily-limit'::text,null::bigint; return;
 end if;
 if exists(select 1 from hh_lab_ops.preview_requests where requested_at>v_now-interval '30 minutes') then
  return query select false,'cooldown'::text,null::bigint; return;
 end if;
 if exists(select 1 from hh_lab_ops.preview_requests where state in ('reserved','building') and lease_expires_at>v_now) then
  return query select false,'busy'::text,null::bigint; return;
 end if;
 insert into hh_lab_ops.preview_requests(sha,requested_at,lease_expires_at)
 values(p_sha,v_now,v_now+interval '20 minutes') returning id into v_id;
 return query select true,'reserved'::text,v_id;
end $$;
revoke all on function hh_lab_ops.reserve_preview(text) from public, anon, authenticated;
-- Only a dedicated scheduler DB role with explicit grants may call this function.
