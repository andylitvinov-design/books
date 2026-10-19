-- Holistic House CRM SMS (Twilio): additive, owner-only, sender OFF without external keys.
-- Store no plaintext phone, body or clinical information.
alter table app.crm_consent_ledger drop constraint crm_consent_ledger_channel_check;
alter table app.crm_consent_ledger add constraint crm_consent_ledger_channel_check
 check(channel in ('email','telegram','whatsapp','sms'));

create unique index if not exists crm_consent_ledger_sms_owner_contact_ref
 on app.crm_consent_ledger(id,owner_id,contact_id);

create table app.crm_sms_jobs(
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_id uuid not null,
 consent_event_id uuid not null,
 payload_ciphertext text not null,
 recipient_hash text not null check(recipient_hash ~ '^[0-9a-f]{64}$'),
 segments smallint not null check(segments between 1 and 4),
 status text not null default 'reserved' check(status in(
  'reserved','dispatching','accepted','queued','sending','sent','delivered',
  'undelivered','failed','unknown','blocked')),
 provider_id text unique,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade,
 foreign key(consent_event_id,owner_id,contact_id) references app.crm_consent_ledger(id,owner_id,contact_id)
);
create index crm_sms_jobs_owner_recent on app.crm_sms_jobs(owner_id,created_at desc);
create index crm_sms_jobs_contact_recent on app.crm_sms_jobs(owner_id,contact_id,created_at desc);
create index crm_sms_jobs_recipient on app.crm_sms_jobs(recipient_hash);
alter table app.crm_sms_jobs enable row level security;
alter table app.crm_sms_jobs force row level security;
revoke all on app.crm_sms_jobs from public,anon,authenticated;
grant select,insert on app.crm_sms_jobs to hh_crm_backend;
grant update(status,provider_id,completed_at) on app.crm_sms_jobs to hh_crm_backend;
create policy crm_sms_jobs_read on app.crm_sms_jobs for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_sms_jobs_insert on app.crm_sms_jobs for insert to hh_crm_backend
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_sms_jobs_update on app.crm_sms_jobs for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));

-- Private webhook receipts and global SMS-only opt-out registry; not exposed to PostgREST.
create table app_private.crm_sms_receipts (
 provider_id text primary key,
 provider_status text not null check(provider_status in ('queued','sending','sent','delivered','undelivered','failed')),
 updated_at timestamptz not null default now()
);
create table app_private.crm_sms_optouts(
 recipient_hash text primary key check(recipient_hash ~ '^[0-9a-f]{64}$'),
 provider_event_id text not null unique,
 created_at timestamptz not null default now()
);
revoke all on app_private.crm_sms_receipts,app_private.crm_sms_optouts from public,anon,authenticated,hh_crm_backend;

create function app_private.crm_sms_is_opted_out(p_hash text)
returns boolean language sql security definer set search_path='' as $f$
 select exists(select 1 from app_private.crm_sms_optouts where recipient_hash=p_hash)
$f$;
revoke all on function app_private.crm_sms_is_opted_out(text) from public,anon,authenticated;
grant execute on function app_private.crm_sms_is_opted_out(text) to hh_crm_backend;

-- Must only be called by authenticated owner AFTER provider receipt is linked to their job.
create function app_private.crm_sms_reconcile(p_job uuid,p_owner uuid)
returns void language plpgsql security definer set search_path='' as $f$
declare v_status text;
begin
 if p_owner is null or p_owner is distinct from auth.uid() or not app_private.account_active() then
  raise exception 'CRM_ACCESS_DENIED';
 end if;
 select r.provider_status into v_status
 from app.crm_sms_jobs j join app_private.crm_sms_receipts r on r.provider_id=j.provider_id
 where j.id=p_job and j.owner_id=p_owner;
 if v_status is null then return; end if;
 update app.crm_sms_jobs set
  status=case when status in ('blocked','delivered','undelivered','failed') then status else v_status end,
  completed_at=case when v_status in ('delivered','undelivered','failed') then now() else completed_at end
 where id=p_job and owner_id=p_owner;
end $f$;
revoke all on function app_private.crm_sms_reconcile(uuid,uuid) from public,anon,authenticated;
grant execute on function app_private.crm_sms_reconcile(uuid,uuid) to hh_crm_backend;

-- Only invoke after verifying Twilio signature, account SID, message SID.
-- Preserve a receipt that arrives BEFORE Twilio send POST returns.
create function app_private.crm_sms_status_receipt(p_sid text,p_status text)
returns boolean language plpgsql security definer set search_path='' as $f$
begin
 if p_sid is null or p_sid !~ '^SM[0-9a-fA-F]{32}$' or
    p_status not in ('queued','sending','sent','delivered','undelivered','failed') then
   return false;
 end if;
 insert into app_private.crm_sms_receipts(provider_id,provider_status)
 values(p_sid,p_status)
 on conflict(provider_id) do update set
  provider_status=case
   when app_private.crm_sms_receipts.provider_status in ('delivered','failed','undelivered')
      then app_private.crm_sms_receipts.provider_status
   when excluded.provider_status in ('delivered','failed','undelivered')
      then excluded.provider_status
   when app_private.crm_sms_receipts.provider_status='sent'
      then 'sent'
   when excluded.provider_status='sent'
      then 'sent'
   when app_private.crm_sms_receipts.provider_status='sending'
      then 'sending'
   else excluded.provider_status end,
  updated_at=now();
 update app.crm_sms_jobs set
   status=case
    when status in ('blocked','delivered','undelivered','failed') then status
    else (select provider_status from app_private.crm_sms_receipts where provider_id=p_sid)
   end,
   completed_at=case
    when (select provider_status from app_private.crm_sms_receipts where provider_id=p_sid)
      in ('delivered','failed','undelivered') then now() else completed_at end
 where provider_id=p_sid;
 return true;
end $f$;
revoke all on function app_private.crm_sms_status_receipt(text,text) from public,anon,authenticated;

-- Sender STOP must suppress any future SMS to that phone, even across client records.
create function app_private.crm_sms_record_stop(p_hash text,p_event text)
returns boolean language plpgsql security definer set search_path='' as $f$
declare r record;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or
    p_event is null or p_event !~ '^SM[0-9a-fA-F]{32}$' then return false; end if;
 insert into app_private.crm_sms_optouts(recipient_hash,provider_event_id)
 values(p_hash,p_event) on conflict(recipient_hash) do nothing;
 for r in
  select distinct owner_id,contact_id from app.crm_sms_jobs where recipient_hash=p_hash
 loop
  insert into app.crm_consent_ledger(id,owner_id,contact_id,channel,purpose,decision,
     occurred_at,source,text_version,actor_kind,payload_hash)
  select pg_catalog.gen_random_uuid(),r.owner_id,r.contact_id,'sms','product_updates',
     'withdrawn',now(),'twilio_stop','crm-sms-v1','contact',pg_catalog.md5(p_event)
  where not exists(select 1 from app.crm_consent_ledger where owner_id=r.owner_id
    and contact_id=r.contact_id and channel='sms' and decision='withdrawn' and source='twilio_stop');
 end loop;
 return true;
end $f$;
revoke all on function app_private.crm_sms_record_stop(text,text) from public,anon,authenticated;

do $grants$ begin
 if exists(select 1 from pg_catalog.pg_roles where rolname='hh_app_prod_runtime_v4') then
  grant execute on function app_private.crm_sms_status_receipt(text,text),
    app_private.crm_sms_record_stop(text,text) to hh_app_prod_runtime_v4;
 end if;
 if exists(select 1 from pg_catalog.pg_roles where rolname='hh_app_runtime') then
  grant execute on function app_private.crm_sms_status_receipt(text,text),
    app_private.crm_sms_record_stop(text,text) to hh_app_runtime;
 end if;
end $grants$;
