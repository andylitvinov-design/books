-- Reuse the existing PRIVATE owner video draft bucket. Separate storage prefix
-- prevents accidentally mixing Telegram/client media with curated library assets.
-- No storage bucket, paid provider, public table, cron or new grants to browsers.
create table if not exists app_private.owner_video_library_v1 (
 id uuid primary key,
 object_key text not null unique check(object_key ~ '^video-library/[0-9a-f-]{36}\.mp4$'),
 title text not null check(char_length(title) between 1 and 120),
 category text not null check(category in ('goals-money','love-relationships','energy-confidence','stress-anxiety')),
 tags text[] not null default '{}',
 bytes integer not null check(bytes between 1024 and 8000000),
 mime text not null default 'video/mp4' check(mime='video/mp4'),
 sha256 text unique check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
 status text not null default 'pending' check(status in ('pending','ready','reviewed')),
 quality_score smallint check(quality_score is null or quality_score in (4,5)),
 rights_confirmed boolean not null default false,
 people_cleared boolean not null default false,
 source_type text check(source_type is null or source_type in ('owner_original','licensed_source')),
 source_page text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint review_requires_rights check(status<>'reviewed' or
   (rights_confirmed=true and people_cleared=true and quality_score in (4,5)
    and source_type is not null))
);
alter table app_private.owner_video_library_v1 enable row level security;
alter table app_private.owner_video_library_v1 force row level security;
revoke all on app_private.owner_video_library_v1 from public, anon, authenticated;
grant select, insert, update, delete on app_private.owner_video_library_v1 to hh_app_backend;
drop policy if exists hh_owner_video_library_backend on app_private.owner_video_library_v1;
create policy hh_owner_video_library_backend on app_private.owner_video_library_v1
  for all to hh_app_backend using (true) with check (true);
create index if not exists hh_owner_video_library_created_idx
  on app_private.owner_video_library_v1(created_at desc);
