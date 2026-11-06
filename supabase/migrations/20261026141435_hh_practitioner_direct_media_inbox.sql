-- Native Holistic House account -> practitioner inbox (no CRM or clinical client data).
-- Storage stays private. Public profile audio requires BOTH sender opt-in and recipient publish.
begin;
create table app.practitioner_direct_threads (
  id uuid primary key,
  sender_account_id uuid not null references app.accounts(id) on delete cascade,
  recipient_practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  sender_display_name text not null check(length(sender_display_name) between 1 and 120),
  blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sender_account_id,recipient_practitioner_id)
);
create index practitioner_direct_threads_recipient_idx
  on app.practitioner_direct_threads(recipient_practitioner_id,updated_at desc);

create table app.practitioner_direct_assets (
  id uuid primary key,
  thread_id uuid not null references app.practitioner_direct_threads(id) on delete cascade,
  uploader_account_id uuid not null references app.accounts(id) on delete cascade,
  kind text not null check(kind in ('image','audio')),
  mime text not null check(mime in ('image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav')),
  expected_bytes integer not null check(expected_bytes between 128 and 20000000),
  object_key text not null unique,
  status text not null default 'pending' check(status in ('pending','ready')),
  allow_public_reuse boolean not null default false,
  published_at timestamptz,
  published_title text check(published_title is null or length(published_title) between 1 and 120),
  published_locale text check(published_locale is null or published_locale in ('en','ru','es')),
  published_by_practitioner_id uuid references app.practitioners(id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint practitioner_direct_assets_key check(
    object_key = uploader_account_id::text || '/' || id::text ||
      case mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png'
        when 'image/webp' then '.webp' when 'audio/mpeg' then '.mp3'
        when 'audio/mp4' then '.m4a' when 'audio/webm' then '.webm'
        when 'audio/ogg' then '.ogg' when 'audio/wav' then '.wav'
        else '.invalid' end
  ),
  constraint practitioner_direct_assets_publish check(
    published_at is null or
    (status='ready' and kind='audio' and allow_public_reuse
      and published_by_practitioner_id is not null
      and published_title is not null and published_locale is not null)
  ),
  constraint practitioner_direct_assets_reuse check(kind='audio' or allow_public_reuse=false)
);
create index practitioner_direct_assets_published_idx
  on app.practitioner_direct_assets(published_by_practitioner_id,published_at desc)
  where published_at is not null;

create table app.practitioner_direct_messages (
  id uuid primary key,
  thread_id uuid not null references app.practitioner_direct_threads(id) on delete cascade,
  author_account_id uuid not null references app.accounts(id) on delete cascade,
  body_ciphertext text check(body_ciphertext is null or length(body_ciphertext) between 40 and 16000),
  attachment_id uuid unique references app.practitioner_direct_assets(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint practitioner_direct_messages_content check(body_ciphertext is not null or attachment_id is not null)
);
create index practitioner_direct_messages_history_idx
  on app.practitioner_direct_messages(thread_id,created_at desc,id desc);

create table app.practitioner_direct_reads (
  thread_id uuid not null references app.practitioner_direct_threads(id) on delete cascade,
  account_id uuid not null references app.accounts(id) on delete cascade,
  last_seen_at timestamptz not null,
  primary key(thread_id,account_id)
);

-- Server-only DB connection uses verified auth session and SET LOCAL ROLE.
-- Do not expose to anon/authenticated Data API, including published metadata.
alter table app.practitioner_direct_threads enable row level security;
alter table app.practitioner_direct_threads force row level security;
alter table app.practitioner_direct_assets enable row level security;
alter table app.practitioner_direct_assets force row level security;
alter table app.practitioner_direct_messages enable row level security;
alter table app.practitioner_direct_messages force row level security;
alter table app.practitioner_direct_reads enable row level security;
alter table app.practitioner_direct_reads force row level security;
revoke all on app.practitioner_direct_threads,app.practitioner_direct_assets,
  app.practitioner_direct_messages,app.practitioner_direct_reads
  from public,anon,authenticated,hh_app_inbox,service_role;
grant select,insert,update on app.practitioner_direct_threads to hh_app_backend;
grant select,insert,update on app.practitioner_direct_assets to hh_app_backend;
grant select,insert on app.practitioner_direct_messages to hh_app_backend;
grant select,insert,update on app.practitioner_direct_reads to hh_app_backend;

create policy direct_threads_read on app.practitioner_direct_threads
  for select to hh_app_backend using(
    (select app_private.account_active()) and
    (sender_account_id=(select auth.uid()) or exists(
      select 1 from app.practitioners p where p.id=recipient_practitioner_id
      and p.trusted_auth_user_id=(select auth.uid()) and p.active
      and p.status in ('approved','submitted','changes_requested')
    ))
  );
create policy direct_threads_start on app.practitioner_direct_threads
  for insert to hh_app_backend with check(
    (select app_private.account_active()) and sender_account_id=(select auth.uid())
    and exists(select 1 from app.practitioners p where p.id=recipient_practitioner_id
      and p.trusted_auth_user_id is not null and p.trusted_auth_user_id<>(select auth.uid())
      and p.active and p.status in ('approved','submitted','changes_requested')
      and p.public_profile<>'{}'::jsonb)
  );
create policy direct_threads_update on app.practitioner_direct_threads
  for update to hh_app_backend
  using((select app_private.account_active()) and
    (sender_account_id=(select auth.uid()) or exists(
      select 1 from app.practitioners p where p.id=recipient_practitioner_id
      and p.trusted_auth_user_id=(select auth.uid()) and p.active)))
  with check((select app_private.account_active()) and
    (sender_account_id=(select auth.uid()) or exists(
      select 1 from app.practitioners p where p.id=recipient_practitioner_id
      and p.trusted_auth_user_id=(select auth.uid()) and p.active)));

create policy direct_assets_read on app.practitioner_direct_assets
  for select to hh_app_backend using(
    (status='ready' and published_at is not null and allow_public_reuse)
    or ((select app_private.account_active()) and exists(
      select 1 from app.practitioner_direct_threads t
      join app.practitioners p on p.id=t.recipient_practitioner_id
      where t.id=thread_id and
      (t.sender_account_id=(select auth.uid()) or
        (p.trusted_auth_user_id=(select auth.uid()) and p.active))
    ))
  );
create policy direct_assets_insert on app.practitioner_direct_assets
  for insert to hh_app_backend with check(
    (select app_private.account_active()) and uploader_account_id=(select auth.uid())
    and exists(select 1 from app.practitioner_direct_threads t
      join app.practitioners p on p.id=t.recipient_practitioner_id
      where t.id=thread_id and t.blocked_at is null and
       (t.sender_account_id=(select auth.uid()) or
        (p.trusted_auth_user_id=(select auth.uid()) and p.active)))
  );
create policy direct_assets_update on app.practitioner_direct_assets
  for update to hh_app_backend
  using((select app_private.account_active()) and exists(
    select 1 from app.practitioner_direct_threads t
    join app.practitioners p on p.id=t.recipient_practitioner_id
    where t.id=thread_id and
     (t.sender_account_id=(select auth.uid()) or
       (p.trusted_auth_user_id=(select auth.uid()) and p.active))))
  with check((select app_private.account_active()) and exists(
    select 1 from app.practitioner_direct_threads t
    join app.practitioners p on p.id=t.recipient_practitioner_id
    where t.id=thread_id and
     (t.sender_account_id=(select auth.uid()) or
       (p.trusted_auth_user_id=(select auth.uid()) and p.active))));

create policy direct_messages_read on app.practitioner_direct_messages
  for select to hh_app_backend using(
    (select app_private.account_active()) and exists(
      select 1 from app.practitioner_direct_threads t
      join app.practitioners p on p.id=t.recipient_practitioner_id
      where t.id=thread_id and
       (t.sender_account_id=(select auth.uid()) or
        (p.trusted_auth_user_id=(select auth.uid()) and p.active))
    )
  );
create policy direct_messages_send on app.practitioner_direct_messages
  for insert to hh_app_backend with check(
    (select app_private.account_active()) and author_account_id=(select auth.uid())
    and exists(select 1 from app.practitioner_direct_threads t
      join app.practitioners p on p.id=t.recipient_practitioner_id
      where t.id=thread_id and t.blocked_at is null and
       (t.sender_account_id=(select auth.uid()) or
        (p.trusted_auth_user_id=(select auth.uid()) and p.active))
    )
    and (attachment_id is null or exists(
      select 1 from app.practitioner_direct_assets a
      where a.id=attachment_id and a.thread_id=thread_id
        and a.uploader_account_id=(select auth.uid()) and a.status='ready'
    ))
  );
create policy direct_reads_read on app.practitioner_direct_reads
  for select to hh_app_backend using(
    account_id=(select auth.uid()) and (select app_private.account_active())
  );
create policy direct_reads_insert on app.practitioner_direct_reads
  for insert to hh_app_backend with check(
    account_id=(select auth.uid()) and (select app_private.account_active())
    and exists(select 1 from app.practitioner_direct_threads t
      join app.practitioners p on p.id=t.recipient_practitioner_id
      where t.id=thread_id and
      (t.sender_account_id=(select auth.uid()) or
       (p.trusted_auth_user_id=(select auth.uid()) and p.active)))
  );
create policy direct_reads_update on app.practitioner_direct_reads
  for update to hh_app_backend using(
    account_id=(select auth.uid()) and (select app_private.account_active())
  ) with check(account_id=(select auth.uid()) and (select app_private.account_active()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('hh-member-direct-media','hh-member-direct-media',false,20000000,
  array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav']::text[])
on conflict(id) do nothing;
-- No storage.objects RLS policy: trusted server issues one-time upload and short-read URLs.
commit;
