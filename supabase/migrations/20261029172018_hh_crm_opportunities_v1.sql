-- Holistic House CRM 2.0: separate business opportunities from contact lifecycle.
-- Additive only. Manual stages are NOT trusted bookings, payments or invoices.
-- No assessment, clinical note, private link or marketing consent is copied here.
begin;
create table app.crm_opportunities (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  contact_id uuid not null,
  service text not null check(service in ('consultation','business','reiki','video_therapy','other')),
  stage text not null default 'new' check(stage in (
    'new','qualified','offered','booking_requested','booked_manual',
    'delivered_manual','lost','canceled')),
  operation_id uuid not null,
  revision integer not null default 0 check(revision>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_opportunity_contact_owner_fk foreign key(contact_id,owner_id)
    references app.crm_contacts(id,owner_id) on delete cascade,
  constraint crm_opportunity_unique_request unique(owner_id,operation_id),
  constraint crm_opportunity_composite_identity unique(id,owner_id)
);
create index crm_opportunities_owner_recent_idx
  on app.crm_opportunities(owner_id,created_at desc,id desc);
create index crm_opportunities_owner_stage_idx
  on app.crm_opportunities(owner_id,stage);
create index crm_opportunities_contact_idx
  on app.crm_opportunities(contact_id,owner_id);

create table app.crm_opportunity_events (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  opportunity_id uuid not null,
  from_stage text check(from_stage is null or from_stage in (
    'new','qualified','offered','booking_requested','booked_manual',
    'delivered_manual','lost','canceled')),
  to_stage text not null check(to_stage in (
    'new','qualified','offered','booking_requested','booked_manual',
    'delivered_manual','lost','canceled')),
  revision integer not null check(revision>=0),
  occurred_at timestamptz not null default now(),
  constraint crm_opportunity_event_parent_fk foreign key(opportunity_id,owner_id)
    references app.crm_opportunities(id,owner_id) on delete cascade,
  constraint crm_opportunity_event_revision_unique unique(opportunity_id,revision),
  constraint crm_opportunity_event_create_check check(
    (revision=0 and from_stage is null and to_stage='new') or
    (revision>0 and from_stage is not null and from_stage<>to_stage)
  )
);
create index crm_opportunity_events_owner_recent_idx
  on app.crm_opportunity_events(owner_id,occurred_at desc,id desc);

alter table app.crm_opportunities enable row level security;
alter table app.crm_opportunities force row level security;
alter table app.crm_opportunity_events enable row level security;
alter table app.crm_opportunity_events force row level security;
revoke all on app.crm_opportunities from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
revoke all on app.crm_opportunity_events from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
grant select,insert on app.crm_opportunities to hh_crm_backend;
grant update(stage,revision,updated_at) on app.crm_opportunities to hh_crm_backend;
grant select,insert on app.crm_opportunity_events to hh_crm_backend;

create policy crm_opportunities_owner_read on app.crm_opportunities
  for select to hh_crm_backend
  using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_opportunities_owner_create on app.crm_opportunities
  for insert to hh_crm_backend
  with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_opportunities_owner_update on app.crm_opportunities
  for update to hh_crm_backend
  using(owner_id=(select auth.uid()) and (select app_private.account_active()))
  with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_opportunity_events_owner_read on app.crm_opportunity_events
  for select to hh_crm_backend
  using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_opportunity_events_owner_create on app.crm_opportunity_events
  for insert to hh_crm_backend
  with check(owner_id=(select auth.uid()) and (select app_private.account_active()));

-- Defense in depth: only monotonic, explicitly allowed owner-stage changes.
-- Contact identity, ownership, idempotency key and original timestamps stay immutable.
create function app_private.crm_opportunity_update_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id
     or new.contact_id is distinct from old.contact_id or new.service is distinct from old.service
     or new.operation_id is distinct from old.operation_id or
     new.created_at is distinct from old.created_at or new.revision<>old.revision+1
     or new.updated_at<old.updated_at then
    raise exception 'CRM_OPPORTUNITY_IMMUTABLE';
  end if;
  if not (
    (old.stage='new' and new.stage in ('qualified','offered','booking_requested','lost','canceled')) or
    (old.stage='qualified' and new.stage in ('offered','booking_requested','lost','canceled')) or
    (old.stage='offered' and new.stage in ('booking_requested','lost','canceled')) or
    (old.stage='booking_requested' and new.stage in ('booked_manual','lost','canceled')) or
    (old.stage='booked_manual' and new.stage in ('delivered_manual','lost','canceled'))
  ) then
    raise exception 'CRM_OPPORTUNITY_TRANSITION_BLOCKED';
  end if;
  return new;
end $$;
revoke all on function app_private.crm_opportunity_update_guard()
  from public,anon,authenticated,service_role,hh_app_backend,hh_app_inbox;
grant execute on function app_private.crm_opportunity_update_guard() to hh_crm_backend;
create trigger crm_opportunity_update_guard before update
  on app.crm_opportunities for each row
  execute function app_private.crm_opportunity_update_guard();

comment on table app.crm_opportunities is
  'Owner-only business opportunities. Stages are manual and never prove appointments, payments or revenue.';
comment on table app.crm_opportunity_events is
  'Append-only owner-scoped manual stage history for CRM opportunities.';
commit;