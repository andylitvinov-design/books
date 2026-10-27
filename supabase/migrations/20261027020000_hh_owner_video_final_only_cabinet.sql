-- ONE final MP4 per owner video job; no original Telegram files or client media.
create table if not exists app_private.telegram_owner_video_drafts (
 id uuid primary key,
 practitioner_id uuid not null references app.practitioners(id) on delete cascade,
 title text not null check(length(title) between 1 and 100),
 storage_path text not null unique check(storage_path ~ '^telegram-slides/[0-9a-f-]{36}\.mp4$'),
 video_bytes integer not null check(video_bytes between 1024 and 50000000),
 created_at timestamptz not null default now()
);
create index if not exists telegram_owner_video_drafts_owner_created
 on app_private.telegram_owner_video_drafts(practitioner_id,created_at desc);
alter table app_private.telegram_owner_video_drafts enable row level security;
alter table app_private.telegram_owner_video_drafts force row level security;
revoke all on app_private.telegram_owner_video_drafts from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
 if exists(select 1 from pg_roles where rolname='service_role') then
   execute 'revoke all on app_private.telegram_owner_video_drafts from service_role';
 end if;
end $roles$;
grant select, insert, update on app_private.telegram_owner_video_drafts to hh_app_backend;
drop policy if exists telegram_owner_video_drafts_backend on app_private.telegram_owner_video_drafts;
create policy telegram_owner_video_drafts_backend on app_private.telegram_owner_video_drafts
 for all to hh_app_backend
 using(current_setting('hh.owner_video_manager',true)='1')
 with check(current_setting('hh.owner_video_manager',true)='1');
