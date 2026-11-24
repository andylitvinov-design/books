-- Daily choices reference canonical coaching IDs; no goal/action text is copied.
-- Date, timezone and chosen IDs stay in the application-encrypted payload.
begin;
set local lock_timeout='5s';
create table app_private.daybook_daily_intentions (
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 day_key text not null check (day_key ~ '^[a-f0-9]{64}$'),
 payload_ciphertext text not null check (octet_length(payload_ciphertext)<=16000),
 revision integer not null check (revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(account_id,day_key)
);
create index daybook_daily_owner_page on app_private.daybook_daily_intentions(account_id,created_at desc,id desc);
create table app_private.daybook_daily_receipts (
 account_id uuid not null references app.accounts(id) on delete cascade,
 operation_id uuid not null,
 intention_id uuid not null,
 request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
 operation text not null check (operation in ('save','delete')),
 revision integer not null check (revision>0),
 created_at timestamptz not null default now(),
 primary key(account_id,operation_id)
);
create index daybook_daily_receipts_record on app_private.daybook_daily_receipts(account_id,intention_id,operation);
alter table app_private.daybook_daily_intentions enable row level security;
alter table app_private.daybook_daily_intentions force row level security;
alter table app_private.daybook_daily_receipts enable row level security;
alter table app_private.daybook_daily_receipts force row level security;
revoke all on app_private.daybook_daily_intentions,app_private.daybook_daily_receipts from public,anon,authenticated;
grant select,insert,update,delete on app_private.daybook_daily_intentions to hh_app_backend;
grant select,insert on app_private.daybook_daily_receipts to hh_app_backend;
create policy daybook_daily_owner on app_private.daybook_daily_intentions for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy daybook_daily_receipts_owner on app_private.daybook_daily_receipts for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
