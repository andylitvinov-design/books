-- Every signed-in user may own a personal page, whether or not they are a practitioner.
-- Never expose private therapeutic files or assessment scores through Data API.
create table app_private.user_pages (
 account_id uuid primary key references app.accounts(id) on delete cascade,
 handle text not null unique check (handle ~ '^[a-z][a-z0-9-]{2,29}$'),
 display_name text not null check (char_length(display_name) between 2 and 80),
 bio text not null default '' check (char_length(bio) <= 420),
 is_published boolean not null default false,
 share_tests boolean not null default false,
 share_practices boolean not null default false,
 share_videos boolean not null default false,
 test_count integer not null default 0 check (test_count >= 0),
 practice_count integer not null default 0 check (practice_count >= 0),
 video_count integer not null default 0 check (video_count >= 0),
 stats_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table app_private.user_page_items (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null references app_private.user_pages(account_id) on delete cascade,
 kind text not null check (kind in ('post','video','achievement')),
 body text not null default '',
 title text not null default '',
 video_id uuid references app_private.personal_videos(id) on delete cascade,
 asset_key text,
 achievement_type text,
 achievement_value integer,
 visibility text not null default 'private' check (visibility in ('private','public')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint user_page_item_shape check (
   (kind='post' and char_length(body) between 1 and 1200 and video_id is null and asset_key is null and achievement_type is null and achievement_value is null)
   or (kind='video' and video_id is not null and asset_key is not null and char_length(title) between 1 and 100 and body='' and achievement_type is null and achievement_value is null)
   or (kind='achievement' and video_id is null and asset_key is null and body='' and achievement_type in ('tests','practices','videos') and achievement_value > 0)
 )
);
create unique index user_page_one_video on app_private.user_page_items(account_id,video_id) where video_id is not null;
create index user_page_feed on app_private.user_page_items(account_id,visibility,created_at desc);
alter table app_private.user_pages enable row level security;
alter table app_private.user_pages force row level security;
alter table app_private.user_page_items enable row level security;
alter table app_private.user_page_items force row level security;
revoke all on app_private.user_pages,app_private.user_page_items from public,anon,authenticated,hh_app_inbox;
grant select,insert,update,delete on app_private.user_pages,app_private.user_page_items to hh_app_backend;
create policy hh_user_page_owner on app_private.user_pages for all to hh_app_backend
 using (account_id = (select auth.uid()) and (select app_private.account_active()))
 with check (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy hh_user_page_public on app_private.user_pages for select to hh_app_backend
 using (is_published);
create policy hh_user_page_item_owner on app_private.user_page_items for all to hh_app_backend
 using (account_id = (select auth.uid()) and (select app_private.account_active()))
 with check (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy hh_user_page_item_public on app_private.user_page_items for select to hh_app_backend
 using (visibility='public' and exists(
   select 1 from app_private.user_pages p where p.account_id=user_page_items.account_id and p.is_published
 ));
-- Revocation is atomic with the original account's signed-private-video deletion;
-- this trigger runs as the invoker and respects owner RLS, not SECURITY DEFINER.
create function app_private.revoke_deleted_user_page_video() returns trigger language plpgsql
 security invoker set search_path=pg_catalog as $$
begin
 if new.status in ('deleting','deleted') and old.status is distinct from new.status then
   delete from app_private.user_page_items where video_id=new.id;
 end if;
 return new;
end $$;
create trigger revoke_deleted_user_page_video after update of status on app_private.personal_videos
 for each row execute function app_private.revoke_deleted_user_page_video();
revoke all on function app_private.revoke_deleted_user_page_video() from public,anon,authenticated;
