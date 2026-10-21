-- Practitioner-owned slide courses. Draft media stays private until explicit publication.
-- No client-specific files or reused Reiki lesson identifiers are touched.
create table if not exists app.practitioner_courses (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,119}$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check (revision >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practitioner_courses_owner_idx
  on app.practitioner_courses(practitioner_id,updated_at desc);
create index if not exists practitioner_courses_public_idx
  on app.practitioner_courses(published_at desc)
  where status='published' and published<>'{}'::jsonb;

create table if not exists app.practitioner_course_assets (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete restrict,
  course_id uuid not null references app.practitioner_courses(id) on delete restrict,
  object_key text not null unique,
  kind text not null check(kind in ('image','audio','video')),
  mime text not null,
  expected_bytes integer not null check(expected_bytes between 128 and 25000000),
  status text not null default 'pending' check(status in ('pending','ready')),
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create index if not exists practitioner_course_assets_course_idx
  on app.practitioner_course_assets(course_id,status,created_at desc);

alter table app.practitioner_courses enable row level security;
alter table app.practitioner_course_assets enable row level security;
revoke all on app.practitioner_courses,app.practitioner_course_assets from public,anon,authenticated;
grant select,insert,update on app.practitioner_courses,app.practitioner_course_assets to hh_app_backend;

drop policy if exists practitioner_courses_read on app.practitioner_courses;
create policy practitioner_courses_read on app.practitioner_courses for select to hh_app_backend
using (
  exists(select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
    and (select app_private.account_active()))
  or
  (status='published' and published<>'{}'::jsonb and exists(
    select 1 from app.practitioners p where p.id=practitioner_id
      and p.active and p.status='approved' and p.public_profile<>'{}'::jsonb))
);
drop policy if exists practitioner_courses_insert on app.practitioner_courses;
create policy practitioner_courses_insert on app.practitioner_courses for insert to hh_app_backend
with check(exists(select 1 from app.practitioners p
  where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
  and (select app_private.account_active())));
drop policy if exists practitioner_courses_update on app.practitioner_courses;
create policy practitioner_courses_update on app.practitioner_courses for update to hh_app_backend
using(exists(select 1 from app.practitioners p
  where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
  and (select app_private.account_active())))
with check(exists(select 1 from app.practitioners p
  where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
  and (select app_private.account_active())));

drop policy if exists practitioner_course_assets_read on app.practitioner_course_assets;
create policy practitioner_course_assets_read on app.practitioner_course_assets for select to hh_app_backend
using (
  exists(select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active()))
  or
  (status='ready' and exists(
    select 1 from app.practitioner_courses c
      join app.practitioners p on p.id=c.practitioner_id
    where c.id=course_id and c.practitioner_id=practitioner_id
      and c.status='published' and c.published<>'{}'::jsonb
      and p.active and p.status='approved' and p.public_profile<>'{}'::jsonb
      and c.published->'slides' @> jsonb_build_array(jsonb_build_object('assetId',id::text))
  ))
);
drop policy if exists practitioner_course_assets_insert on app.practitioner_course_assets;
create policy practitioner_course_assets_insert on app.practitioner_course_assets for insert to hh_app_backend
with check(exists(select 1 from app.practitioner_courses c
    join app.practitioners p on p.id=c.practitioner_id
    where c.id=course_id and p.id=practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())));
drop policy if exists practitioner_course_assets_update on app.practitioner_course_assets;
create policy practitioner_course_assets_update on app.practitioner_course_assets for update to hh_app_backend
using(exists(select 1 from app.practitioner_courses c
    join app.practitioners p on p.id=c.practitioner_id
    where c.id=course_id and p.id=practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())))
with check(exists(select 1 from app.practitioner_courses c
    join app.practitioners p on p.id=c.practitioner_id
    where c.id=course_id and p.id=practitioner_id
      and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())));

-- Signed uploads only. No public Storage URLs, no anon/authenticated object policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hh-practitioner-course-media','hh-practitioner-course-media',false,25000000,
  array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/x-m4a','video/mp4','video/quicktime']::text[])
on conflict (id) do nothing;
