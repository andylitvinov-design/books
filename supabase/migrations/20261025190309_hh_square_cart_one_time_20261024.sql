-- Holistic House: Square one-time personal-service orders, separate from recurring
-- subscriptions and clinical records. No money movement, client data import or
-- provider secrets. Activation requires explicit production env gates and Square E2E.
create table app_private.square_service_orders (
 id uuid primary key,
 account_id uuid not null, -- Pseudonymous financial record survives account erasure by approved retention policy.
 operation_id uuid not null,
 items text[] not null check (
   cardinality(items) between 1 and 2 and items <@ array['express-consultation-30','personal-session-60']::text[]
   and array_position(items,null) is null
   and (cardinality(items)=1 or items[1]<>items[2])
 ),
 cart_key text not null check (cart_key in (
   'express-consultation-30',
   'personal-session-60',
   'express-consultation-30+personal-session-60'
  )),
 constraint square_exact_cart_check check (
   (cart_key='express-consultation-30' and items=array['express-consultation-30']::text[])
   or (cart_key='personal-session-60' and items=array['personal-session-60']::text[])
   or (cart_key='express-consultation-30+personal-session-60' and
       items=array['express-consultation-30','personal-session-60']::text[])
 ),
 locale text not null check (locale in ('en','ru','es')),
 eur_minor integer not null check (
   (cart_key='express-consultation-30' and eur_minor=5000) or
   (cart_key='personal-session-60' and eur_minor=10000) or
   (cart_key='express-consultation-30+personal-session-60' and eur_minor=15000)
 ),
 cad_minor integer not null check (cad_minor between 100 and 10000000),
 currency text not null default 'CAD' check (currency='CAD'),
 environment text not null check (environment in ('production','sandbox')),
 repeat_of uuid,
 status text not null default 'pending' check (status in (
   'pending','checkout_ready','paid','payment_review','failed'
 )),
 square_link_id text unique check (square_link_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 square_order_id text unique check (square_order_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 square_payment_id text unique check (square_payment_id ~ '^[A-Za-z0-9_-]{5,192}$'),
 checkout_url text check (checkout_url ~ '^https://(square[.]link/u/|sandbox[.]square[.]link/u/|staging[.]square[.]link/u/|checkout[.]square[.]site/)[A-Za-z0-9_-]{5,120}$'),
 refunded_minor integer not null default 0 check (refunded_minor>=0 and refunded_minor<=cad_minor),
 paid_at timestamptz,
 revision integer not null default 0 check (revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint square_checkout_data_complete check (
   (square_link_id is null and square_order_id is null and checkout_url is null)
   or (square_link_id is not null and square_order_id is not null and checkout_url is not null)
 ),
 constraint square_paid_evidence check (
   status not in ('paid','payment_review')
   or (square_payment_id is not null and paid_at is not null)
 ),
 unique(account_id,operation_id)
);
create index square_service_orders_account_recent_idx on app_private.square_service_orders(account_id,created_at desc,id);
create index square_service_orders_cart_idx on app_private.square_service_orders(account_id,cart_key,created_at desc);
create unique index square_service_orders_one_checkout_idx on app_private.square_service_orders(account_id)
 where status in ('pending','checkout_ready');

alter table app_private.square_service_orders enable row level security;
alter table app_private.square_service_orders force row level security;
revoke all on app_private.square_service_orders from public,anon,authenticated,hh_app_inbox;
grant select,insert on app_private.square_service_orders to hh_app_backend;
grant update(status,square_link_id,square_order_id,square_payment_id,checkout_url,
 refunded_minor,paid_at,updated_at,revision) on app_private.square_service_orders to hh_app_backend;

create policy square_orders_account_read on app_private.square_service_orders
 for select to hh_app_backend using (
   account_id=(select auth.uid()) and (select app_private.account_active())
 );
create policy square_orders_account_insert on app_private.square_service_orders
 for insert to hh_app_backend with check (
   account_id=(select auth.uid()) and (select app_private.account_active())
 );
-- Server read is enabled only by the verified raw-body Square webhook handler.
-- The restricted runtime role alone has this grant; browser/anon/authenticated
-- SQL roles have none. The processor does independent Square API readback before
-- setting a separate update guard.
create policy square_orders_verified_webhook_read on app_private.square_service_orders
 for select to hh_app_backend using (
   current_setting('hh.square_signature_verified',true)='true'
 );
create policy square_orders_processor_update on app_private.square_service_orders
 for update to hh_app_backend
 using (current_setting('hh.square_payment_verified',true)='true')
 with check (current_setting('hh.square_payment_verified',true)='true');
create policy square_orders_account_checkout_update on app_private.square_service_orders
 for update to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));

create function app_private.square_service_order_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.id <> old.id or new.account_id <> old.account_id
    or new.operation_id <> old.operation_id or new.items <> old.items
    or new.cart_key <> old.cart_key or new.locale <> old.locale
    or new.eur_minor <> old.eur_minor or new.cad_minor <> old.cad_minor
    or new.environment <> old.environment or new.currency <> old.currency
    or new.repeat_of is distinct from old.repeat_of or new.created_at <> old.created_at
    or new.revision <> old.revision+1 then
   raise exception 'SQUARE_ORDER_IMMUTABLE';
 end if;
 if old.square_order_id is not null and new.square_order_id is distinct from old.square_order_id
    or old.square_link_id is not null and new.square_link_id is distinct from old.square_link_id
    or old.square_payment_id is not null and new.square_payment_id is distinct from old.square_payment_id
    or old.refunded_minor > new.refunded_minor then
   raise exception 'SQUARE_EVIDENCE_IMMUTABLE';
 end if;
 if (
   new.status in ('paid','payment_review') and
   (new.status is distinct from old.status or new.square_payment_id is distinct from old.square_payment_id
    or new.refunded_minor is distinct from old.refunded_minor)
 ) and current_setting('hh.square_payment_verified',true) is distinct from 'true' then
   raise exception 'SQUARE_PAYMENT_REQUIRES_PROVIDER_VERIFICATION';
 end if;
 if old.status in ('paid','payment_review') and new.status not in ('paid','payment_review') then
   raise exception 'SQUARE_PAID_CANNOT_REGRESS';
 end if;
 if old.status='payment_review' and new.status='paid' then
   raise exception 'SQUARE_MANUAL_REVIEW_REQUIRED';
 end if;
 if new.status='checkout_ready' and old.status not in ('pending','checkout_ready') then
   raise exception 'SQUARE_INVALID_CHECKOUT_TRANSITION';
 end if;
 return new;
end; $$;
revoke all on function app_private.square_service_order_guard() from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.square_service_order_guard() to hh_app_backend;
create trigger square_service_order_guard before update on app_private.square_service_orders
 for each row execute function app_private.square_service_order_guard();

-- Only a pending order may be inserted, regardless of the caller's column grants.
-- Payment proof is generated later exclusively by the server with provider readback.
create function app_private.square_service_order_insert_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if new.status <> 'pending' or new.square_link_id is not null or
    new.square_order_id is not null or new.square_payment_id is not null or
    new.checkout_url is not null or new.paid_at is not null or
    new.refunded_minor <> 0 or new.revision <> 0 or
    new.currency <> 'CAD' then
   raise exception 'SQUARE_INSERT_UNVERIFIED';
 end if;
 return new;
end; $$;
revoke all on function app_private.square_service_order_insert_guard() from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.square_service_order_insert_guard() to hh_app_backend;
create trigger square_service_order_insert_guard
 before insert on app_private.square_service_orders for each row
 execute function app_private.square_service_order_insert_guard();

comment on table app_private.square_service_orders is
 'Square only: authenticated one-time service checkout, private order/payment IDs and no clinical/marketing data. Not subscription or automatic booking.';
