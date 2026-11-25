-- Owner-only CRM email transport, address confirmation, irreversible unsubscribe and provider event handling.
-- No automatically scheduled campaigns, no public table grants, no bulk sending.
create table app.crm_email_tokens (
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_id uuid not null,
 kind text not null check (kind in ('verify','unsubscribe')),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'reserved' check(status in ('reserved','accepted','unknown')),
 provider_id text,
 created_at timestamptz not null default now(),
 expires_at timestamptz,
 used_at timestamptz,
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade
);
create index crm_email_tokens_contact_idx on app.crm_email_tokens(owner_id,contact_id,created_at desc);
create index crm_email_tokens_provider_idx on app.crm_email_tokens(provider_id) where provider_id is not null;
create table app.crm_email_jobs (
 id uuid primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 contact_id uuid not null,
 consent_event_id uuid not null,
 payload_ciphertext text not null,
 status text not null default 'reserved' check(status in ('reserved','dispatching','accepted','unknown','blocked')),
 provider_id text,
 created_at timestamptz not null default now(),
 completed_at timestamptz,
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade,
 foreign key(consent_event_id) references app.crm_consent_ledger(id) on delete cascade
);
create index crm_email_jobs_owner_recent_idx on app.crm_email_jobs(owner_id,created_at desc);
create index crm_email_jobs_provider_idx on app.crm_email_jobs(provider_id) where provider_id is not null;
create table app.crm_email_webhook_events (
 event_id text primary key,
 owner_id uuid not null references app.accounts(id) on delete cascade,
 provider_id text,
 type text not null,
 received_at timestamptz not null default now()
);
alter table app.crm_email_tokens enable row level security;
alter table app.crm_email_tokens force row level security;
alter table app.crm_email_jobs enable row level security;
alter table app.crm_email_jobs force row level security;
alter table app.crm_email_webhook_events enable row level security;
alter table app.crm_email_webhook_events force row level security;
revoke all on app.crm_email_tokens,app.crm_email_jobs,app.crm_email_webhook_events from public,anon,authenticated;
grant select,insert on app.crm_email_tokens,app.crm_email_jobs to hh_crm_backend;
grant update(status,provider_id) on app.crm_email_tokens to hh_crm_backend;
grant update(status,provider_id,completed_at) on app.crm_email_jobs to hh_crm_backend;
create policy crm_email_token_read on app.crm_email_tokens for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_email_token_insert on app.crm_email_tokens for insert to hh_crm_backend
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_email_token_update on app.crm_email_tokens for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_email_job_read on app.crm_email_jobs for select to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_email_job_insert on app.crm_email_jobs for insert to hh_crm_backend
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
create policy crm_email_job_update on app.crm_email_jobs for update to hh_crm_backend
 using(owner_id=(select auth.uid()) and (select app_private.account_active()))
 with check(owner_id=(select auth.uid()) and (select app_private.account_active()));
-- This routine runs only on a high-entropy emailed token, never on client identifiers or public roles.
create function app_private.crm_consume_email_token(p_hash text,p_kind text) returns boolean
language plpgsql security definer set search_path = '' as $body$
declare
 t record;
 last_decision text;
 c record;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_kind not in ('verify','unsubscribe') then return false; end if;
 select id,owner_id,contact_id,kind,expires_at,used_at into t from app.crm_email_tokens
 where token_hash=p_hash and kind=p_kind for update;
 if not found or t.used_at is not null or (t.expires_at is not null and t.expires_at < now()) then return false; end if;
 select suppressed,email_verified into c from app.crm_contacts where id=t.contact_id and owner_id=t.owner_id for update;
 if not found then return false; end if;
 if p_kind='verify' then
  select decision into last_decision from app.crm_consent_ledger
   where owner_id=t.owner_id and contact_id=t.contact_id and channel='email' and purpose='product_updates'
   order by occurred_at desc,case when decision='withdrawn' then 1 else 0 end desc,recorded_at desc limit 1;
  if c.suppressed or last_decision is distinct from 'granted' then return false; end if;
  update app.crm_contacts set email_verified=true, revision=revision+1 where id=t.contact_id and owner_id=t.owner_id;
 else
  if not c.suppressed then
   update app.crm_contacts set suppressed=true,revision=revision+1 where id=t.contact_id and owner_id=t.owner_id;
   insert into app.crm_consent_ledger
    (id,owner_id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind,payload_hash)
   values(pg_catalog.gen_random_uuid(),t.owner_id,t.contact_id,'email','product_updates','withdrawn',now(),'email_unsubscribe','crm-marketing-v1','contact',pg_catalog.md5(t.id::text));
  end if;
 end if;
 update app.crm_email_tokens set used_at=now() where id=t.id;
 return true;
end $body$;
revoke all on function app_private.crm_consume_email_token(text,text) from public,anon,authenticated;
-- Provider bounce/complaint suppression. Only call after signature verification by the server.
create function app_private.crm_suppress_provider_email(p_id text,p_event text,p_type text) returns boolean
language plpgsql security definer set search_path = '' as $body$
declare
 c record;
begin
 if length(coalesce(p_id,''))<8 or length(p_id)>120 or p_type not in('email.bounced','email.complained','email.failed') or
    length(coalesce(p_event,''))<5 or length(p_event)>128 then return false; end if;
 select owner_id,contact_id into c from app.crm_email_jobs where provider_id=p_id limit 1;
 if not found then
  select owner_id,contact_id into c from app.crm_email_tokens where provider_id=p_id limit 1;
  if not found then return false; end if;
 end if;
 insert into app.crm_email_webhook_events(event_id,owner_id,provider_id,type)
 values(p_event,c.owner_id,p_id,p_type) on conflict do nothing;
 if not found then return true; end if;
 update app.crm_contacts set suppressed=true,revision=revision+1
 where id=c.contact_id and owner_id=c.owner_id and suppressed=false;
 if found then
  insert into app.crm_consent_ledger(id,owner_id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind,payload_hash)
  values(pg_catalog.gen_random_uuid(),c.owner_id,c.contact_id,'email','product_updates','withdrawn',now(),p_type,'crm-marketing-v1','owner_recorded',pg_catalog.md5(p_event));
 end if;
 return true;
end $body$;
revoke all on function app_private.crm_suppress_provider_email(text,text,text) from public,anon,authenticated;
do $grants$
begin
 if exists(select 1 from pg_catalog.pg_roles where rolname='hh_app_prod_runtime_v4') then
  grant execute on function app_private.crm_consume_email_token(text,text) to hh_app_prod_runtime_v4;
  grant execute on function app_private.crm_suppress_provider_email(text,text,text) to hh_app_prod_runtime_v4;
 end if;
 if exists(select 1 from pg_catalog.pg_roles where rolname='hh_app_runtime') then
  grant execute on function app_private.crm_consume_email_token(text,text) to hh_app_runtime;
  grant execute on function app_private.crm_suppress_provider_email(text,text,text) to hh_app_runtime;
 end if;
end $grants$;
