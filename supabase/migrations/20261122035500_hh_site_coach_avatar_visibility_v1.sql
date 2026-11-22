-- Personal visibility preferences for eight already published, site-owned coach
-- MP4 presets. Never deletes /public media or another account's selection.
create table if not exists app_private.site_coach_avatar_hidden (
  account_id uuid not null references app.accounts(id) on delete cascade,
  avatar_id text not null check (avatar_id in (
    'mira-calm','mira-attentive','sofia-calm','sofia-attentive',
    'max-calm','max-attentive','alex-calm','alex-attentive'
  )),
  hidden_at timestamptz not null default now(),
  primary key(account_id,avatar_id)
);
alter table app_private.site_coach_avatar_hidden enable row level security;
alter table app_private.site_coach_avatar_hidden force row level security;
revoke all on table app_private.site_coach_avatar_hidden from public, anon, authenticated;
grant select,insert,delete on table app_private.site_coach_avatar_hidden to hh_app_backend;
create policy hh_site_coach_avatar_owner on app_private.site_coach_avatar_hidden
  for all to hh_app_backend
  using (
    account_id=(select auth.uid())
    and (select app_private.account_active())
  )
  with check (
    account_id=(select auth.uid())
    and (select app_private.account_active())
  );
