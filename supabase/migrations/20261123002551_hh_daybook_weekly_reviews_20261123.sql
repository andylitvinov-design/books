-- Encrypted, voluntarily confirmed weekly reflections and frozen source metadata.
begin;
set local lock_timeout='5s';
create table app_private.daybook_weekly_reviews (
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 week_key text not null check(week_key ~ '^[a-f0-9]{64}$'),
 payload_ciphertext text not null check(octet_length(payload_ciphertext)<=131072),
 revision integer not null check(revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(account_id,week_key)
);
create index daybook_weekly_owner_page on app_private.daybook_weekly_reviews(account_id,created_at desc,id desc);
create table app_private.daybook_weekly_receipts (
 account_id uuid not null references app.accounts(id) on delete cascade,
 operation_id uuid not null,
 review_id uuid not null,
 request_fingerprint text not null check(request_fingerprint ~ '^[a-f0-9]{64}$'),
 operation text not null check(operation in ('save','delete')),
 revision integer not null check(revision>0),
 created_at timestamptz not null default now(),
 primary key(account_id,operation_id)
);
create index daybook_weekly_receipts_record on app_private.daybook_weekly_receipts(account_id,review_id,operation);
alter table app_private.daybook_weekly_reviews enable row level security;
alter table app_private.daybook_weekly_reviews force row level security;
alter table app_private.daybook_weekly_receipts enable row level security;
alter table app_private.daybook_weekly_receipts force row level security;
revoke all on app_private.daybook_weekly_reviews,app_private.daybook_weekly_receipts from public,anon,authenticated;
grant select,insert,update,delete on app_private.daybook_weekly_reviews to hh_app_backend;
grant select,insert on app_private.daybook_weekly_receipts to hh_app_backend;
create policy daybook_weekly_owner on app_private.daybook_weekly_reviews for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy daybook_weekly_receipts_owner on app_private.daybook_weekly_receipts for all to hh_app_backend
 using(account_id=(select auth.uid()) and (select app_private.account_active()))
 with check(account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
