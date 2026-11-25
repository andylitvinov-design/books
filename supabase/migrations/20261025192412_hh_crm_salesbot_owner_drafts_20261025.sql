-- Holistic House SalesBot R2: private owner-scoped draft and preview-approved graph store.
-- Additive only: no external messenger dispatch, no AI/provider calls, no public access.
-- Internal HH CRM contacts, replies, followups, course and billing data are NOT duplicated.

create table app.crm_salesbot_flows (
  id uuid primary key,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  flow_key text not null check (flow_key ~ '^[a-z][a-z0-9_-]{0,31}$'),
  draft_ciphertext text not null check (octet_length(draft_ciphertext) between 100 and 65536),
  published_ciphertext text check (published_ciphertext is null or octet_length(published_ciphertext) between 100 and 65536),
  status text not null default 'draft'
    check (status in ('draft', 'approved_preview', 'paused')),
  revision integer not null default 0 check (revision >= 0),
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_salesbot_flow_unique_key unique (owner_id, flow_key),
  constraint crm_salesbot_flow_status_snapshot check (
    (status = 'draft' and version = 0 and published_ciphertext is null)
    or
    (status in ('approved_preview', 'paused') and version > 0 and published_ciphertext is not null)
  )
);

create index crm_salesbot_flows_owner_updated
  on app.crm_salesbot_flows(owner_id, updated_at desc, id desc);

alter table app.crm_salesbot_flows enable row level security;
alter table app.crm_salesbot_flows force row level security;

-- Deny direct client-facing Data API roles, and restrict the separate app backend.
revoke all on table app.crm_salesbot_flows from public, anon, authenticated, service_role, hh_app_backend, hh_crm_backend;
grant select, insert, update on table app.crm_salesbot_flows to hh_crm_backend;

-- Same authenticated account-active boundary as CRM contacts and follow-up tasks.
create policy crm_salesbot_owner_read on app.crm_salesbot_flows
  for select to hh_crm_backend
  using (owner_id = (select auth.uid()) and (select app_private.account_active()));

create policy crm_salesbot_owner_insert on app.crm_salesbot_flows
  for insert to hh_crm_backend
  with check (owner_id = (select auth.uid()) and (select app_private.account_active())
    and status = 'draft' and version = 0 and revision = 0 and published_ciphertext is null);

create policy crm_salesbot_owner_update on app.crm_salesbot_flows
  for update to hh_crm_backend
  using (owner_id = (select auth.uid()) and (select app_private.account_active()))
  with check (owner_id = (select auth.uid()) and (select app_private.account_active()));

comment on table app.crm_salesbot_flows is
  'Owner-encrypted SalesBot drafts/preview-approved snapshots only. Never auto-dispatch from this table.';
