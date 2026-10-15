-- Holistic House #585: session-scoped sharing, no cabinet-wide grant from an invitation.
-- Apply to the existing HH project only after approved schema/cost/security review.
begin;
create table if not exists app_private.client_session_pages (
  id uuid primary key,
  client_id uuid not null,
  consultation_id uuid,
  occurred_on date not null,
  locale text not null check(locale in ('en','ru')),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  revision integer not null default 1 check(revision > 0),
  published_revision integer,
  draft_ciphertext text not null,
  published_ciphertext text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint client_session_publish_consistency check(
    (published_ciphertext is null and published_revision is null) or
    (published_ciphertext is not null and published_revision is not null)
  ),
  unique(id,client_id)
);
create unique index if not exists client_session_consultation_unique
  on app_private.client_session_pages(client_id,consultation_id)
  where consultation_id is not null;
create index if not exists client_session_owner_history
  on app_private.client_session_pages(client_id,occurred_on desc,created_at desc);

create table if not exists app_private.client_session_assets (
  id uuid primary key,
  session_id uuid not null,
  client_id uuid not null,
  object_key text not null unique,
  mime text not null,
  bytes bigint not null check(bytes>=0 and bytes <= 104857600),
  status text not null default 'pending' check(status in ('pending','ready','failed','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(session_id,client_id) references app_private.client_session_pages(id,client_id) on delete restrict
);
create index if not exists client_session_assets_owner on app_private.client_session_assets(client_id,session_id);

create table if not exists app_private.client_session_grants (
  id uuid primary key,
  session_id uuid not null,
  client_id uuid not null,
  selector text not null unique check(length(selector)=22),
  secret_hash text not null check(length(secret_hash)=64),
  access_version integer not null default 1 check(access_version>0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(session_id,client_id) references app_private.client_session_pages(id,client_id) on delete restrict,
  unique(session_id)
);
create table if not exists app_private.client_session_viewers (
  id uuid primary key,
  grant_id uuid not null references app_private.client_session_grants(id) on delete cascade,
  secret_hash text not null check(length(secret_hash)=64),
  access_version integer not null check(access_version>0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_session_viewers_expiry on app_private.client_session_viewers(expires_at);

-- Server-only BFF with explicit owner/guest checks. Database role is NOT a browser role.
-- No anon/authenticated grants; RLS is defense-in-depth. Never enable anonymous bucket policies.
do $$
declare t text;
begin
  foreach t in array array[
    'client_session_pages','client_session_assets','client_session_grants','client_session_viewers'
  ] loop
    execute format('revoke all on app_private.%I from public, anon, authenticated, hh_app_inbox',t);
    execute format('grant select, insert, update, delete on app_private.%I to hh_app_backend',t);
    execute format('alter table app_private.%I enable row level security',t);
    execute format('create policy %I on app_private.%I for all to hh_app_backend using (true) with check (true)',t||'_bff',t);
  end loop;
end $$;

-- Storage access via server-held provider secret only, signed requests, random object keys.
-- No public bucket access and no public download policy.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('hh-client-private-media','hh-client-private-media',false,104857600,
  array['video/mp4','video/webm','audio/mpeg','audio/mp4','audio/x-m4a','audio/webm','application/pdf'])
on conflict (id) do nothing;
commit;
