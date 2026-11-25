-- Holistic House CRM workflow R1, 18 October 2026.
-- Business contacts only. No clinical data, sending, or external account import.
alter table app.crm_contacts
  add column source text not null default 'manual',
  add constraint crm_contact_source_valid
    check (source in ('manual','website','referral','event','academy','other'));

create table app.crm_followups (
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_id uuid not null,
 kind text not null check (kind in
  ('reply','call','send_details','booking','check_in','other')),
 due_on date not null check (due_on between date '2020-01-01' and date '2100-12-31'),
 status text not null default 'open' check (status in ('open','completed','canceled')),
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now(),
 closed_at timestamptz,
 foreign key(contact_id,owner_id)
   references app.crm_contacts(id,owner_id) on delete cascade,
 constraint crm_followup_closed_consistency check
  ((status='open' and closed_at is null) or
   (status<>'open' and closed_at is not null))
);
create index crm_followups_owner_status_due_idx
 on app.crm_followups(owner_id,status,due_on,id);
create index crm_followups_contact_owner_idx
 on app.crm_followups(contact_id,owner_id);

create table app.crm_activity (
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_id uuid not null,
 kind text not null check (kind in
  ('contact_created','stage_changed','opt_out','contacted',
   'call_completed','offer_sent','booking_requested','booking_confirmed')),
 stage text check (stage is null or stage in ('lead','client','archived')),
 occurred_at timestamptz not null default now(),
 foreign key(contact_id,owner_id)
   references app.crm_contacts(id,owner_id) on delete cascade,
 constraint crm_activity_stage_only check (
  (kind='stage_changed' and stage is not null) or
  (kind<>'stage_changed' and stage is null)
 )
);
create index crm_activity_owner_recent_idx
 on app.crm_activity(owner_id,occurred_at desc,id desc);
create index crm_activity_contact_owner_idx
 on app.crm_activity(contact_id,owner_id);

alter table app.crm_followups enable row level security;
alter table app.crm_followups force row level security;
alter table app.crm_activity enable row level security;
alter table app.crm_activity force row level security;
revoke all on app.crm_followups,app.crm_activity from public,anon,authenticated;

grant select,insert on app.crm_followups,app.crm_activity to hh_crm_backend;
grant update(status,due_on,closed_at,revision) on app.crm_followups to hh_crm_backend;

create policy crm_followups_owner_read on app.crm_followups for select to hh_crm_backend
 using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_followups_owner_create on app.crm_followups for insert to hh_crm_backend
 with check (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_followups_owner_update on app.crm_followups for update to hh_crm_backend
 using (owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check (owner_id=(select auth.uid()) and (select app_private.account_active()));

create policy crm_activity_owner_read on app.crm_activity for select to hh_crm_backend
 using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_activity_owner_create on app.crm_activity for insert to hh_crm_backend
 with check (owner_id=(select auth.uid()) and (select app_private.account_active()));

-- Completed/canceled actions cannot be reopened or silently rewritten.
create function app_private.crm_followup_update_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if old.status<>'open' or new.revision<>old.revision+1
   or new.id<>old.id or new.owner_id<>old.owner_id
   or new.contact_id<>old.contact_id or new.kind<>old.kind
   or new.created_at<>old.created_at then
   raise exception 'CRM_FOLLOWUP_IMMUTABLE';
 end if;
 if new.status='open' and new.closed_at is not null then
   raise exception 'CRM_FOLLOWUP_OPEN_DATE';
 end if;
 if new.status<>'open' and new.closed_at is null then
   raise exception 'CRM_FOLLOWUP_CLOSE_DATE';
 end if;
 return new;
end $$;
revoke all on function app_private.crm_followup_update_guard() from public,anon,authenticated;
grant execute on function app_private.crm_followup_update_guard() to hh_crm_backend;
create trigger crm_followup_update_guard
 before update on app.crm_followups for each row
 execute function app_private.crm_followup_update_guard();

-- Older CRM read grants remain scoped to the same hh_crm_backend role.
-- Client source is owner-managed metadata, not an analytics assertion of verified attribution.
