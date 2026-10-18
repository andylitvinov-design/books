-- Applied to Holistic House Supabase as migration 20261018193800.
-- Anonymous write only, owner read and status management only; no marketing consent.
create table if not exists app_private.business_consulting_requests (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 practitioner_id uuid not null references app.practitioners(id) on delete cascade,
 operation_hash text not null unique check (operation_hash ~ '^[a-f0-9]{64}$'),
 locale text not null check(locale in ('en','ru','es')),
 format text not null check(format in ('free','express','full','mentoring')),
 status text not null default 'new' check(status in ('new','contacted','booked','closed')),
 payload_ciphertext text not null check(length(payload_ciphertext) between 40 and 12000),
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists business_consulting_requests_owner_created_idx
 on app_private.business_consulting_requests(owner_id, created_at desc);
revoke all on app_private.business_consulting_requests from public, anon, authenticated;
grant usage on schema app_private to hh_app_inbox,hh_crm_backend;
grant insert(id,owner_id,practitioner_id,operation_hash,locale,format,payload_ciphertext)
 on app_private.business_consulting_requests to hh_app_inbox;
grant select, update(status,revision,updated_at)
 on app_private.business_consulting_requests to hh_crm_backend;
alter table app_private.business_consulting_requests enable row level security;
alter table app_private.business_consulting_requests force row level security;
create policy business_requests_inbox_insert on app_private.business_consulting_requests
 for insert to hh_app_inbox with check (
  practitioner_id::text=current_setting('hh.practitioner_id',true)
  and exists(select 1 from app.practitioners p
   where p.id=practitioner_id and p.trusted_auth_user_id=owner_id
   and p.active and p.status in ('approved','submitted','changes_requested'))
  and status='new' and revision=0
 );
create policy business_requests_owner_read on app_private.business_consulting_requests
 for select to hh_crm_backend
 using (owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy business_requests_owner_update on app_private.business_consulting_requests
 for update to hh_crm_backend
 using (owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check (owner_id=(select auth.uid()) and (select app_private.account_active()));
