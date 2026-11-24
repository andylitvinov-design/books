-- PROPOSED / DRAFT ONLY. Generate a tracked Supabase migration through the
-- repository's normal isolated migration workflow after review and RLS tests.
-- This file has NOT been applied to production. Do not deploy the dependent
-- code before schema acceptance. No clinical payload or marketing permission.
begin;
alter table app_private.client_account_bindings
  drop constraint client_account_bindings_first_source_kind_check;
alter table app_private.client_account_bindings
  add constraint client_account_bindings_first_source_kind_check
  check(first_source_kind in ('delivered_report','legacy_document','client_session'));

create table app_private.client_report_crm_links (
  legacy_client_id uuid primary key references app_private.client_account_bindings(legacy_client_id) on delete cascade,
  account_id uuid not null references app.accounts(id) on delete cascade,
  owner_id uuid not null references app.accounts(id) on delete cascade,
  contact_id uuid not null,
  notice_version text not null check(notice_version='hh-report-google-crm-v1'),
  linked_at timestamptz not null default now(),
  foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade,
  unique(owner_id,account_id),
  unique(owner_id,contact_id)
);
alter table app_private.client_report_crm_links enable row level security;
alter table app_private.client_report_crm_links force row level security;
revoke all on app_private.client_report_crm_links from public,anon,authenticated,hh_app_inbox;
grant select,insert on app_private.client_report_crm_links to hh_app_backend;
grant select on app_private.client_report_crm_links to hh_crm_backend;

-- SECURITY INVOKER: no elevated role. The server-only transaction must have
-- authenticated the Google recipient, acquired the browser intent proof and
-- inserted the matching immutable legacy binding before setting these scopes.
-- Narrow to the precise current pending invitation, account, owner and hash.
create function app_private.report_crm_claim_allowed(p_owner uuid,p_email_hash text,p_client uuid)
returns boolean language sql stable security invoker set search_path='' as $fn$
  select (select app_private.session_active())
    and p_email_hash ~ '^[a-f0-9]{64}$'
    and p_email_hash=current_setting('hh.report_claim_email_hash',true)
    and exists (
      select 1 from app_private.save_intents i
      join app_private.client_account_bindings b on b.legacy_client_id=i.source_legacy_client_id
      join app_private.client_session_share_grants g on g.id=i.source_session_grant_id
        and g.legacy_client_id=i.source_legacy_client_id and g.session_id=i.source_id
        and g.access_version=i.source_session_grant_version
      join app_private.client_delivery_sessions s on s.id=i.source_id
        and s.legacy_client_id=i.source_legacy_client_id and s.published_revision=i.source_revision
      join app.practitioners p on p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
      where i.id::text=current_setting('hh.report_claim_intent',true)
        and i.source_kind='client_session' and i.status='pending' and i.expires_at>now()
        and (p_client is null or i.source_legacy_client_id=p_client)
        and b.account_id=(select auth.uid())
        and g.revoked_at is null and g.expires_at>now() and s.status='published'
        and p.active and p.public_profile<>'{}'::jsonb
        and p.status in ('approved','submitted','changes_requested')
        and p.trusted_auth_user_id=p_owner
    )
$fn$;
revoke all on function app_private.report_crm_claim_allowed(uuid,text,uuid) from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant execute on function app_private.report_crm_claim_allowed(uuid,text,uuid) to hh_app_backend;

-- Existing hh_app_backend column grants already allow exactly this insertion
-- and lookup by owner/email_hash/id; do not grant contact ciphertext access.
create policy crm_report_claim_contact_lookup on app.crm_contacts
  for select to hh_app_backend
  using(app_private.report_crm_claim_allowed(owner_id,email_hash,null));
create policy crm_report_claim_contact_insert on app.crm_contacts
  for insert to hh_app_backend
  with check(app_private.report_crm_claim_allowed(owner_id,email_hash,null)
    and lifecycle='client' and source='website' and phone_hash is null
    and email_verified=false and suppressed=false and revision=0);

create policy report_crm_link_self_read on app_private.client_report_crm_links
  for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.session_active()));
create policy report_crm_link_owner_read on app_private.client_report_crm_links
  for select to hh_crm_backend
  using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy report_crm_link_self_insert on app_private.client_report_crm_links
  for insert to hh_app_backend with check(
    account_id=(select auth.uid()) and
    app_private.report_crm_claim_allowed(owner_id,current_setting('hh.report_claim_email_hash',true),legacy_client_id)
    and exists(select 1 from app.crm_contacts c
      where c.id=client_report_crm_links.contact_id
        and c.owner_id=client_report_crm_links.owner_id
        and c.email_hash=current_setting('hh.report_claim_email_hash',true))
  );
commit;
