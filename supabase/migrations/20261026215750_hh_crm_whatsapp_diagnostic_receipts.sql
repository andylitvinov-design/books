-- LOCAL DRAFT ONLY. Generate the repository migration with Supabase CLI.
-- Production application requires separate approval and verification.
begin;
create table app_private.crm_wa_diagnostic_receipts (
 business_hash text not null check(business_hash ~ '^[a-f0-9]{64}$'),
 user_hash text not null check(user_hash ~ '^[a-f0-9]{64}$'),
 message_hash text not null check(message_hash ~ '^[a-f0-9]{64}$'),
 received_at timestamptz not null default now(),
 primary key(business_hash,user_hash,message_hash)
);
create index crm_wa_diagnostic_receipts_received
 on app_private.crm_wa_diagnostic_receipts(received_at);
alter table app_private.crm_wa_diagnostic_receipts enable row level security;
alter table app_private.crm_wa_diagnostic_receipts force row level security;
revoke all on app_private.crm_wa_diagnostic_receipts
 from public,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
grant select(business_hash,user_hash,message_hash),
 insert(business_hash,user_hash,message_hash)
 on app_private.crm_wa_diagnostic_receipts to hh_app_inbox;
create policy crm_wa_receipt_signed_inbox_select
 on app_private.crm_wa_diagnostic_receipts for select to hh_app_inbox using(true);
create policy crm_wa_receipt_signed_inbox_insert
 on app_private.crm_wa_diagnostic_receipts for insert to hh_app_inbox with check(true);
-- Existing trusted housekeeping only; inbox can never erase replay receipts.
grant select,delete on app_private.crm_wa_diagnostic_receipts to hh_app_backend;
create policy crm_wa_receipt_expired_backend_select
 on app_private.crm_wa_diagnostic_receipts for select to hh_app_backend
 using(received_at < now()-interval '24 hours');
create policy crm_wa_receipt_expired_backend_delete
 on app_private.crm_wa_diagnostic_receipts for delete to hh_app_backend
 using(received_at < now()-interval '24 hours');
comment on table app_private.crm_wa_diagnostic_receipts is
 'Signed WhatsApp inbox replay receipts: keyed pseudonymous hashes only, no message/media/phone/token. Intended retention 24 hours; bounded housekeeping integration must be verified before activation.';
commit;
