-- Per-account "remove from cabinet" preferences; public source files are never mutated.
create table if not exists app_private.site_avatar_hidden_v1 (
  account_id uuid not null references app.accounts(id) on delete cascade,
  preset_id text not null check (preset_id in (
    'mira-calm','mira-attentive','sofia-calm','sofia-attentive',
    'max-calm','max-attentive','alex-calm','alex-attentive'
  )),
  hidden_at timestamptz not null default now(),
  primary key (account_id,preset_id)
);
alter table app_private.site_avatar_hidden_v1 enable row level security;
alter table app_private.site_avatar_hidden_v1 force row level security;
revoke all on app_private.site_avatar_hidden_v1 from public,anon,authenticated,hh_app_inbox;
grant select,insert,delete on app_private.site_avatar_hidden_v1 to hh_app_backend;
drop policy if exists hh_site_avatar_hidden_owner_v1 on app_private.site_avatar_hidden_v1;
create policy hh_site_avatar_hidden_owner_v1 on app_private.site_avatar_hidden_v1
  for all to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()))
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
