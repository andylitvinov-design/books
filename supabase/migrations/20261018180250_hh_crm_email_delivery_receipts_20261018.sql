-- CRM email delivery receipts: event idempotency, final outcomes and suppression.
-- Historical name of signed-provider routine retained; it now handles all outcomes.
-- Outbound delivery flags remain OFF until provider credentials/domain verification.
alter table app.crm_email_jobs drop constraint crm_email_jobs_status_check;
alter table app.crm_email_jobs add constraint crm_email_jobs_status_check check (
 status in ('reserved','dispatching','accepted','unknown','blocked','delivered',
            'delivery_delayed','bounced','complained','failed','suppressed')
);
create or replace function app_private.crm_suppress_provider_email(p_id text,p_event text,p_type text)
returns boolean language plpgsql security definer set search_path = '' as $body$
declare
 v_owner uuid;
 v_contact uuid;
 v_job uuid;
 v_inserted integer;
 v_terminal boolean;
begin
 if length(coalesce(p_id,''))<8 or length(p_id)>120 or
    length(coalesce(p_event,''))<5 or length(p_event)>128 or
    p_type not in ('email.delivered','email.delivery_delayed','email.bounced',
                   'email.complained','email.failed','email.suppressed')
 then return false; end if;

 select id,owner_id,contact_id into v_job,v_owner,v_contact
 from app.crm_email_jobs where provider_id=p_id
 order by created_at desc limit 1 for update;
 if not found then
   select owner_id,contact_id into v_owner,v_contact
   from app.crm_email_tokens where provider_id=p_id
   order by created_at desc limit 1 for update;
   if not found then return false; end if;
 end if;

 insert into app.crm_email_webhook_events(event_id,owner_id,provider_id,type)
 values(p_event,v_owner,p_id,p_type) on conflict (event_id) do nothing;
 get diagnostics v_inserted = row_count;
 if v_inserted=0 then return true; end if;

 v_terminal := p_type in ('email.bounced','email.complained','email.failed','email.suppressed');
 if v_job is not null then
   if v_terminal then
     update app.crm_email_jobs
     set status=split_part(p_type,'.',2),completed_at=now()
     where id=v_job and status not in ('blocked','bounced','complained','failed','suppressed');
   elsif p_type='email.delivered' then
     update app.crm_email_jobs set status='delivered',completed_at=now()
     where id=v_job and status in ('accepted','unknown','delivery_delayed');
   elsif p_type='email.delivery_delayed' then
     update app.crm_email_jobs set status='delivery_delayed'
     where id=v_job and status in ('accepted','unknown');
   end if;
 end if;
 if v_terminal then
   update app.crm_contacts set suppressed=true,revision=revision+1
   where id=v_contact and owner_id=v_owner and suppressed=false;
   if found then
     insert into app.crm_consent_ledger
      (id,owner_id,contact_id,channel,purpose,decision,occurred_at,
       source,text_version,actor_kind,payload_hash)
     values(pg_catalog.gen_random_uuid(),v_owner,v_contact,'email','product_updates',
            'withdrawn',now(),p_type,'crm-marketing-v1','owner_recorded',pg_catalog.md5(p_event));
   end if;
 end if;
 return true;
end $body$;
revoke all on function app_private.crm_suppress_provider_email(text,text,text) from public,anon,authenticated;
