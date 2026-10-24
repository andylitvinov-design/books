-- Practitioner community feed: only reviewed author posts, moderated public discussion.
-- Isolated from CRM, client profiles, private materials and service ratings.
create table if not exists app.practitioner_article_likes (
  article_id uuid not null references app.practitioner_articles(id) on delete cascade,
  account_id uuid not null references app.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(article_id, account_id)
);
create index if not exists practitioner_article_likes_account_idx
  on app.practitioner_article_likes(account_id,created_at desc);

create table if not exists app.practitioner_article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references app.practitioner_articles(id) on delete cascade,
  account_id uuid not null references app.accounts(id) on delete cascade,
  operation_id uuid not null,
  display_name text not null check(char_length(btrim(display_name)) between 2 and 60),
  body text not null check(char_length(btrim(body)) between 5 and 800),
  status text not null default 'pending' check(status in ('pending','approved','hidden')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(account_id,operation_id)
);
create index if not exists practitioner_article_comments_public_idx
  on app.practitioner_article_comments(article_id,created_at desc)
  where status='approved';
create index if not exists practitioner_article_comments_review_idx
  on app.practitioner_article_comments(created_at asc) where status='pending';
create index if not exists practitioner_article_comments_owner_idx
  on app.practitioner_article_comments(account_id,created_at desc);

alter table app.practitioner_article_likes enable row level security;
alter table app.practitioner_article_comments enable row level security;
revoke all on app.practitioner_article_likes from public,anon,authenticated;
revoke all on app.practitioner_article_comments from public,anon,authenticated;
grant select,insert,delete on app.practitioner_article_likes to hh_app_backend;
grant select,insert,update,delete on app.practitioner_article_comments to hh_app_backend;

-- Read/count reactions only on public approved practitioner article snapshots,
-- or for the current user's own reaction. Do not expose the raw account id in APIs.
drop policy if exists practitioner_article_likes_read on app.practitioner_article_likes;
create policy practitioner_article_likes_read on app.practitioner_article_likes
  for select to hh_app_backend using (
    account_id=(select auth.uid())
    or exists(
      select 1 from app.practitioner_articles a
      join app.practitioners p on p.id=a.practitioner_id
      where a.id=article_id and a.published<>'{}'::jsonb
        and a.status in ('published','submitted','changes_requested')
        and p.active and p.public_profile<>'{}'::jsonb
        and p.status in ('approved','submitted','changes_requested')
    )
  );
drop policy if exists practitioner_article_likes_insert on app.practitioner_article_likes;
create policy practitioner_article_likes_insert on app.practitioner_article_likes
  for insert to hh_app_backend with check (
    account_id=(select auth.uid())
    and (select app_private.account_active()) and (select app_private.session_active())
    and exists(
      select 1 from app.practitioner_articles a
      join app.practitioners p on p.id=a.practitioner_id
      where a.id=article_id and a.published<>'{}'::jsonb
        and a.status in ('published','submitted','changes_requested')
        and p.active and p.status='approved'
    )
  );
drop policy if exists practitioner_article_likes_delete on app.practitioner_article_likes;
create policy practitioner_article_likes_delete on app.practitioner_article_likes
  for delete to hh_app_backend using (
    account_id=(select auth.uid()) and (select app_private.session_active())
  );

-- Comments are publicly visible only AFTER moderation; authors see their own
-- pending comments, and the existing admin gate can review the whole queue.
drop policy if exists practitioner_article_comments_read on app.practitioner_article_comments;
create policy practitioner_article_comments_read on app.practitioner_article_comments
  for select to hh_app_backend using (
    ((status='approved') and exists(
      select 1 from app.practitioner_articles a
      join app.practitioners p on p.id=a.practitioner_id
      where a.id=article_id and a.published<>'{}'::jsonb
        and a.status in ('published','submitted','changes_requested')
        and p.active and p.public_profile<>'{}'::jsonb
        and p.status in ('approved','submitted','changes_requested')
    ))
    or (account_id=(select auth.uid()) and (select app_private.session_active()))
    or (select current_setting('hh.moderator',true))='1'
  );
drop policy if exists practitioner_article_comments_insert on app.practitioner_article_comments;
create policy practitioner_article_comments_insert on app.practitioner_article_comments
  for insert to hh_app_backend with check (
    account_id=(select auth.uid()) and status='pending'
    and (select app_private.account_active()) and (select app_private.session_active())
    and exists(
      select 1 from app.practitioner_articles a
      join app.practitioners p on p.id=a.practitioner_id
      where a.id=article_id and a.published<>'{}'::jsonb
        and a.status in ('published','submitted','changes_requested')
        and p.active and p.status='approved'
    )
  );
drop policy if exists practitioner_article_comments_update on app.practitioner_article_comments;
create policy practitioner_article_comments_update on app.practitioner_article_comments
  for update to hh_app_backend
  using ((select current_setting('hh.moderator',true))='1')
  with check ((select current_setting('hh.moderator',true))='1');
drop policy if exists practitioner_article_comments_delete on app.practitioner_article_comments;
create policy practitioner_article_comments_delete on app.practitioner_article_comments
  for delete to hh_app_backend using (
    ((account_id=(select auth.uid())) and (select app_private.session_active()))
    or (select current_setting('hh.moderator',true))='1'
  );
