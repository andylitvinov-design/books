-- Historical source of applied Production migration, 18 Oct 2026.
-- Only conditional grant differs from deployed DDL, to support isolated test bootstraps.
-- PROPOSAL ONLY. Never run at build/startup. Requires explicit schema/security approval.
-- No contact import, no clinical table grants, no credential creation.


create role hh_crm_backend nologin nobypassrls;
grant usage on schema app,app_private,auth to hh_crm_backend;
grant execute on function auth.uid(),auth.jwt(),app_private.account_active() to hh_crm_backend;
create table app.crm_contacts (
 id uuid primary key,owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_ciphertext text not null,email_hash text not null,
 locale text not null check(locale in('en','ru','es')),
 lifecycle text not null check(lifecycle in('lead','client','archived')),
 email_verified boolean not null default false,suppressed boolean not null default false,
 revision integer not null default 0,created_at timestamptz not null default now(),
 unique(owner_id,email_hash),unique(id,owner_id)
);
create table app.crm_consent_ledger (
 id uuid primary key,owner_id uuid not null,contact_id uuid not null,
 channel text not null check(channel in('email','telegram','whatsapp')),
 purpose text not null check(purpose='product_updates'),decision text not null check(decision in('granted','withdrawn')),
 occurred_at timestamptz not null,source text not null,text_version text not null,
 actor_kind text not null check(actor_kind in('contact','owner_recorded')),payload_hash text not null,
 recorded_at timestamptz not null default now(),foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade
);
create table app.crm_campaign_drafts (
 id uuid primary key,owner_id uuid not null references app.accounts(id) on delete cascade,definition jsonb not null,
 status text not null default 'draft' check(status='draft'),revision integer not null default 0,
 created_at timestamptz not null default now()
);
create table app.crm_self_preferences (
 account_id uuid not null references app.accounts(id) on delete cascade,
 channel text not null check(channel in('email','telegram','whatsapp')),
 accepted boolean not null default false,text_version text not null,
 updated_at timestamptz not null default now(),primary key(account_id,channel)
);
alter table app.crm_self_preferences enable row level security;
alter table app.crm_self_preferences force row level security;
revoke all on app.crm_self_preferences from public,anon,authenticated;
grant select,insert on app.crm_self_preferences to hh_crm_backend;
grant update(accepted,text_version,updated_at) on app.crm_self_preferences to hh_crm_backend;
create policy crm_preferences_read on app.crm_self_preferences for select to hh_crm_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_preferences_insert on app.crm_self_preferences for insert to hh_crm_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_preferences_update on app.crm_self_preferences for update to hh_crm_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
alter table app.crm_contacts enable row level security;
alter table app.crm_contacts force row level security;
alter table app.crm_consent_ledger enable row level security;
alter table app.crm_consent_ledger force row level security;
alter table app.crm_campaign_drafts enable row level security;
alter table app.crm_campaign_drafts force row level security;
revoke all on app.crm_contacts,app.crm_consent_ledger,app.crm_campaign_drafts from public,anon,authenticated;
grant select,insert on app.crm_contacts,app.crm_consent_ledger,app.crm_campaign_drafts to hh_crm_backend;
grant update(suppressed,revision) on app.crm_contacts to hh_crm_backend;
create policy crm_contact_read on app.crm_contacts for select to hh_crm_backend using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_contact_insert on app.crm_contacts for insert to hh_crm_backend with check(owner_id=(select auth.uid()) and (select app_private.account_active()) and email_verified=false);
create policy crm_contact_suppress on app.crm_contacts for update to hh_crm_backend using(owner_id=(select auth.uid()) and (select app_private.account_active())) with check(owner_id=(select auth.uid()) and suppressed=true);
create policy crm_consent_read on app.crm_consent_ledger for select to hh_crm_backend using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_consent_insert on app.crm_consent_ledger for insert to hh_crm_backend with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_draft_read on app.crm_campaign_drafts for select to hh_crm_backend using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_draft_insert on app.crm_campaign_drafts for insert to hh_crm_backend with check(owner_id=(select auth.uid()) and (select app_private.account_active()));


do $$ begin
 if exists(select 1 from pg_roles where rolname='hh_app_prod_runtime_v4') then
  grant hh_crm_backend to hh_app_prod_runtime_v4;
 end if;
end $$;
