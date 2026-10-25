-- Short, user-selected, public practitioner aliases.
-- Keep existing app.practitioners.slug and all service URLs stable.
-- Historical aliases remain resolvable to prevent broken printed/shared links.
create table if not exists app.practitioner_profile_aliases (
  alias text primary key,
  practitioner_id uuid not null references app.practitioners(id) on delete cascade,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  constraint practitioner_profile_aliases_valid check (
    alias ~ '^[a-z0-9][a-z0-9-]{1,22}[a-z0-9]$' and alias !~ '--'
  )
);
create index if not exists practitioner_profile_aliases_practitioner_idx
  on app.practitioner_profile_aliases(practitioner_id);
create unique index if not exists practitioner_profile_aliases_one_primary_idx
  on app.practitioner_profile_aliases(practitioner_id) where is_primary;

alter table app.practitioner_profile_aliases enable row level security;
revoke all on app.practitioner_profile_aliases from public, anon, authenticated;
grant select, insert on app.practitioner_profile_aliases to hh_app_backend;
grant update(is_primary) on app.practitioner_profile_aliases to hh_app_backend;

-- Public resolution uses the verified backend role and additionally filters
-- the joined practitioner for publication. No browser Data API exposure.
drop policy if exists practitioner_alias_read on app.practitioner_profile_aliases;
create policy practitioner_alias_read on app.practitioner_profile_aliases
  for select to hh_app_backend using (true);
drop policy if exists practitioner_alias_insert on app.practitioner_profile_aliases;
create policy practitioner_alias_insert on app.practitioner_profile_aliases
  for insert to hh_app_backend with check (
    exists (
      select 1 from app.practitioners p
      where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status not in ('suspended','archived')
        and (select app_private.account_active())
    )
  );
drop policy if exists practitioner_alias_update on app.practitioner_profile_aliases;
create policy practitioner_alias_update on app.practitioner_profile_aliases
  for update to hh_app_backend
  using (
    exists (
      select 1 from app.practitioners p
      where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status not in ('suspended','archived')
        and (select app_private.account_active())
    )
  )
  with check (
    exists (
      select 1 from app.practitioners p
      where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
        and p.active and p.status not in ('suspended','archived')
        and (select app_private.account_active())
    )
  );
