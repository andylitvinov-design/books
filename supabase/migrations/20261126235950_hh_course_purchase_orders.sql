-- Candidate only: no deployment or migration application is implied.
-- Review account deletion, owner CRM reporting, receipt reconciliation and
-- fulfillment before enabling course sales. The current catalog is empty.
begin;
create table app_private.course_purchase_orders(
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 owner_id uuid not null,
 contact_id uuid not null,
 cart_hash text not null check(cart_hash ~ '^[a-f0-9]{64}$'),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 12),
 currency text not null check(currency='EUR'),
 total_minor integer not null check(total_minor between 1 and 12000000),
 locale text not null check(locale in ('en','ru','es')),
 notice_version text not null check(notice_version='course-checkout-v1'),
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','receipt_submitted','paid','cancelled','refunded','payment_review')),
 created_at timestamptz not null default now(),
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete restrict
);
create unique index course_purchase_pending_unique on app_private.course_purchase_orders(account_id,cart_hash) where status in ('awaiting_payment','receipt_submitted');
create index course_purchase_crm_owner_idx on app_private.course_purchase_orders(owner_id,contact_id,created_at desc);
alter table app_private.course_purchase_orders enable row level security;
alter table app_private.course_purchase_orders force row level security;
revoke all on app_private.course_purchase_orders from public,anon,authenticated,hh_app_inbox;
grant select(id,account_id,cart_hash,total_minor,status),insert(id,account_id,owner_id,contact_id,cart_hash,items,currency,total_minor,locale,notice_version) on app_private.course_purchase_orders to hh_app_backend;
grant select on app_private.course_purchase_orders to hh_crm_backend;
grant select(id,owner_id,email_hash,suppressed) on app.crm_contacts to hh_app_backend;
grant insert(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source) on app.crm_contacts to hh_app_backend;
create policy course_checkout_contact_read on app.crm_contacts for select to hh_app_backend using(
 (select app_private.account_active()) and email_hash=current_setting('hh.course_checkout_hash',true)
 and exists(select 1 from app.practitioners p where p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid and p.trusted_auth_user_id=crm_contacts.owner_id and p.active and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested')));
create policy course_checkout_contact_insert on app.crm_contacts for insert to hh_app_backend with check(
 (select app_private.account_active()) and email_hash ~ '^[a-f0-9]{64}$' and email_hash=current_setting('hh.course_checkout_hash',true)
 and lifecycle='lead' and source='academy' and phone_hash is null and email_verified=false and suppressed=false and revision=0
 and exists(select 1 from app.practitioners p where p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid and p.trusted_auth_user_id=crm_contacts.owner_id and p.active and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested')));
create policy course_purchase_self_read on app_private.course_purchase_orders for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy course_purchase_self_insert on app_private.course_purchase_orders for insert to hh_app_backend with check(
 account_id=(select auth.uid()) and (select app_private.account_active()) and status='awaiting_payment'
 and exists(select 1 from app.crm_contacts c join app.practitioners p on p.trusted_auth_user_id=c.owner_id
 where c.id=course_purchase_orders.contact_id and c.owner_id=course_purchase_orders.owner_id
 and c.email_hash=current_setting('hh.course_checkout_hash',true) and p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid and p.active and p.public_profile<>'{}'::jsonb and p.status in ('approved','submitted','changes_requested')));
create policy course_purchase_owner_read on app_private.course_purchase_orders for select to hh_crm_backend using(owner_id=(select auth.uid()) and (select app_private.account_active()));
commit;
