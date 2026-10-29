-- CI ONLY. Faithful 2026-10-29 read-only catalog reconstruction of the three
-- upstream client-session delivery tables that exist in Supabase production but
-- have no source migration in this repository. Not a production migration.
-- Apply ONLY through setup() after assertIsolated() and empty-DB check.
-- No real client records, storage or provider is accessed; no mock bypass.
begin;
do $guard$
begin
  if current_database() <> 'hh_app_test' then
    raise exception 'Client delivery parity fixture requires hh_app_test';
  end if;
  if to_regclass('app_private.client_delivery_sessions') is not null
     or to_regclass('app_private.client_session_share_grants') is not null
     or to_regclass('app_private.client_session_viewer_sessions') is not null then
    raise exception 'Client delivery fixture must start without these tables';
  end if;
  -- Supabase has this role; the isolated synthetic fixture creates it without
  -- LOGIN/BYPASSRLS, only to preserve explicit production REVOKE semantics.
  if not exists(select 1 from pg_roles where rolname='service_role') then
    execute 'create role service_role nologin nobypassrls';
  end if;
end
$guard$;

create table app_private.client_delivery_sessions(
  id uuid primary key default gen_random_uuid(),
  legacy_client_id uuid not null,
  source_consultation_id uuid,
  occurred_on date not null default current_date,
  draft_payload text not null,
  published_payload text,
  status text not null default 'draft' check(status in('draft','published','archived')),
  draft_revision integer not null default 1 check(draft_revision>0),
  published_revision integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique(id,legacy_client_id),
  check(published_revision is null or published_revision<=draft_revision),
  check((status='draft' and published_payload is null) or status<>'draft')
);
create index client_delivery_client_order
  on app_private.client_delivery_sessions(legacy_client_id,occurred_on desc,created_at desc);
create unique index client_delivery_consultation_once
  on app_private.client_delivery_sessions(legacy_client_id,source_consultation_id)
  where source_consultation_id is not null;

create table app_private.client_session_share_grants(
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  legacy_client_id uuid not null,
  selector text not null unique check(length(selector)=22),
  secret_hash text not null check(length(secret_hash)=64),
  access_version integer not null default 1 check(access_version>0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(session_id,legacy_client_id)
    references app_private.client_delivery_sessions(id,legacy_client_id) on delete restrict
);

create table app_private.client_session_viewer_sessions(
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references app_private.client_session_share_grants(id),
  secret_hash text not null check(length(secret_hash)=64),
  access_version integer not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index client_session_viewer_grant
  on app_private.client_session_viewer_sessions(grant_id,expires_at);

alter table app_private.client_delivery_sessions enable row level security;
alter table app_private.client_session_share_grants enable row level security;
alter table app_private.client_session_viewer_sessions enable row level security;
create policy hh_delivery_server_only
  on app_private.client_delivery_sessions for all to hh_app_backend
  using(true) with check(true);
create policy hh_delivery_grant_server_only
  on app_private.client_session_share_grants for all to hh_app_backend
  using(true) with check(true);
create policy hh_delivery_viewer_server_only
  on app_private.client_session_viewer_sessions for all to hh_app_backend
  using(true) with check(true);
revoke all on app_private.client_delivery_sessions,
  app_private.client_session_share_grants,
  app_private.client_session_viewer_sessions
  from public,anon,authenticated,service_role;
grant select,insert,update,delete on
  app_private.client_delivery_sessions,
  app_private.client_session_share_grants,
  app_private.client_session_viewer_sessions
  to hh_app_backend;
commit;
