-- Private, explicit user acknowledgement of public Academy video viewing.
-- Clicking Play never auto-awards watched/mastered status. No health, test
-- scores, photo, captions, wishes, cookies or tracking pixels are stored.
begin;
create table if not exists app_private.learning_video_progress (
  account_id uuid not null references app.accounts(id) on delete cascade,
  video_id text not null check(video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null check(length(title) between 1 and 160),
  status text not null check(status in ('watched','mastered')),
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(account_id,video_id)
);
create index if not exists hh_learning_video_progress_latest
  on app_private.learning_video_progress(account_id,updated_at desc);
alter table app_private.learning_video_progress enable row level security;
alter table app_private.learning_video_progress force row level security;
revoke all on app_private.learning_video_progress from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.learning_video_progress to hh_app_backend;
drop policy if exists hh_learning_video_progress_owner on app_private.learning_video_progress;
create policy hh_learning_video_progress_owner on app_private.learning_video_progress
  for all to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
