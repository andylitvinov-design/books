-- Practitioner-owned public events. Drafts and revisions stay private until reviewed.
-- This is intentionally separate from the existing static organizer-confirmed event calendar.
begin;

create table if not exists app.practitioner_events (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete restrict,
  slug text not null unique,
  status text not null default 'draft'
    check (status in ('draft','submitted','changes_requested','published','paused','suspended','archived')),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check (revision >= 0),
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practitioner_events_owner_idx
  on app.practitioner_events(practitioner_id,created_at desc);
create index if not exists practitioner_events_public_idx
  on app.practitioner_events(status,published_at desc)
  where published <> '{}'::jsonb;

alter table app.practitioner_events enable row level security;
revoke all on app.practitioner_events from public, anon, authenticated, hh_app_inbox;
grant select,insert,update on app.practitioner_events to hh_app_backend;

drop policy if exists practitioner_events_read on app.practitioner_events;
create policy practitioner_events_read on app.practitioner_events for select to hh_app_backend
using (
  (
    status in ('published','submitted','changes_requested')
    and published <> '{}'::jsonb
    and exists (
      select 1 from app.practitioners p
      where p.id=practitioner_id and p.active and p.public_profile <> '{}'::jsonb
        and p.status in ('approved','submitted','changes_requested')
    )
  )
  or exists (
    select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

drop policy if exists practitioner_events_insert on app.practitioner_events;
create policy practitioner_events_insert on app.practitioner_events for insert to hh_app_backend
with check (
  exists (
    select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
      and p.status not in ('suspended','rejected','archived')
  )
);

drop policy if exists practitioner_events_update on app.practitioner_events;
create policy practitioner_events_update on app.practitioner_events for update to hh_app_backend
using (
  exists (
    select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
)
with check (
  exists (
    select 1 from app.practitioners p
    where p.id=practitioner_id and p.trusted_auth_user_id=(select auth.uid())
      and (select app_private.account_active())
  )
  or (select current_setting('hh.moderator',true))='1'
);

commit;
