-- Holistic House: private, session-scoped delivery. Apply as one reviewed migration.
-- No client data is stored in exposed public/app schemas.
create table if not exists app_private.client_delivery_sessions (
 id uuid primary key default gen_random_uuid(),
 legacy_client_id uuid not null,
 source_consultation_id uuid,
 occurred_on date not null default current_date,
 draft_payload text not null,
 published_payload text,
 status text not null default 'draft' check (status in ('draft','published','archived')),
 draft_revision integer not null default 1 check (draft_revision > 0),
 published_revision integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz,
 unique (id, legacy_client_id),
 check (published_revision is null or published_revision <= draft_revision),
 check ((status = 'draft' and published_payload is null) or status <> 'draft')
);
create unique index if not exists client_delivery_consultation_once
 on app_private.client_delivery_sessions(legacy_client_id,source_consultation_id)
 where source_consultation_id is not null;
create index if not exists client_delivery_client_order
 on app_private.client_delivery_sessions(legacy_client_id,occurred_on desc,created_at desc);

create table if not exists app_private.client_delivery_assets (
 id uuid primary key default gen_random_uuid(),
 legacy_client_id uuid not null,
 session_id uuid not null,
 asset_kind text not null check (asset_kind in ('audio','video')),
 scope text not null check (scope in ('client','practitioner')),
 object_key text not null unique,
 mime text not null,
 max_bytes integer not null check(max_bytes > 0),
 bytes integer,
 duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 14400),
 status text not null default 'pending' check (status in ('pending','ready','removed')),
 created_at timestamptz not null default now(),
 ready_at timestamptz,
 foreign key (session_id,legacy_client_id)
  references app_private.client_delivery_sessions(id,legacy_client_id)
  on delete restrict
);
create index if not exists client_delivery_asset_session
 on app_private.client_delivery_assets(legacy_client_id,session_id,status);

create table if not exists app_private.client_session_share_grants (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null unique,
 legacy_client_id uuid not null,
 selector text not null unique check(length(selector)=22),
 secret_hash text not null check(length(secret_hash)=64),
 access_version integer not null default 1 check (access_version > 0),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 foreign key(session_id,legacy_client_id)
  references app_private.client_delivery_sessions(id,legacy_client_id)
  on delete restrict
);
create table if not exists app_private.client_session_viewer_sessions (
 id uuid primary key default gen_random_uuid(),
 grant_id uuid not null references app_private.client_session_share_grants(id),
 secret_hash text not null check(length(secret_hash)=64),
 access_version integer not null,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists client_session_viewer_grant
 on app_private.client_session_viewer_sessions(grant_id,expires_at);

-- The Next.js DB transaction explicitly SET LOCAL ROLE hh_app_backend.
-- There is intentionally no access for anon/authenticated/service-role PostgREST.
revoke all on app_private.client_delivery_sessions,
 app_private.client_delivery_assets,
 app_private.client_session_share_grants,
 app_private.client_session_viewer_sessions
 from PUBLIC, anon, authenticated;
grant select,insert,update,delete on
 app_private.client_delivery_sessions,
 app_private.client_delivery_assets,
 app_private.client_session_share_grants,
 app_private.client_session_viewer_sessions to hh_app_backend;
alter table app_private.client_delivery_sessions enable row level security;
alter table app_private.client_delivery_assets enable row level security;
alter table app_private.client_session_share_grants enable row level security;
alter table app_private.client_session_viewer_sessions enable row level security;
create policy hh_delivery_server_only on app_private.client_delivery_sessions
 for all to hh_app_backend using (true) with check (true);
create policy hh_delivery_asset_server_only on app_private.client_delivery_assets
 for all to hh_app_backend using (true) with check (true);
create policy hh_delivery_grant_server_only on app_private.client_session_share_grants
 for all to hh_app_backend using (true) with check (true);
create policy hh_delivery_viewer_server_only on app_private.client_session_viewer_sessions
 for all to hh_app_backend using (true) with check (true);

-- Storage bucket must be nonpublic. Provision separately with vetted service
-- credentials and storage policy, then enable HH_CLIENT_DELIVERY_ENABLED.
-- In particular, do NOT add a public storage.objects SELECT policy.
