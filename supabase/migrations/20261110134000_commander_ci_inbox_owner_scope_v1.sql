-- Scope every verified GitHub CI receipt to the one authorized Agent Commander owner.
-- Existing unmatched rows are backfilled only when owner scope is unambiguous.
alter table business_brain.commander_ci_event_inbox
  add column if not exists inbox_owner_id uuid references auth.users(id) on delete cascade;

do $$
declare readable_count integer;
begin
  select count(*) into readable_count
  from business_brain.owner_access
  where can_read=true;

  if readable_count <> 1 then
    raise exception 'Commander CI inbox owner scope is ambiguous; expected exactly one readable owner, found %', readable_count;
  end if;

  update business_brain.commander_ci_event_inbox
  set inbox_owner_id = (
    select user_id from business_brain.owner_access
    where can_read=true
    order by approved_at desc
    limit 1
  )
  where inbox_owner_id is null;

  if exists (
    select 1 from business_brain.commander_ci_event_inbox
    where inbox_owner_id is null
  ) then
    raise exception 'Commander CI inbox contains unscoped events';
  end if;
end $$;

alter table business_brain.commander_ci_event_inbox
  alter column inbox_owner_id set not null;

create index if not exists commander_ci_event_inbox_scope_created_idx
  on business_brain.commander_ci_event_inbox(inbox_owner_id,created_at desc);

revoke all on business_brain.commander_ci_event_inbox from public, anon, authenticated;
