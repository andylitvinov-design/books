-- Additive private journal. No plaintext entry, tags, dates, goal or reflection data.
begin;
create table app_private.daybook_entries (
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 payload_ciphertext text not null check (octet_length(payload_ciphertext)<=180000),
 revision integer not null check (revision>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index daybook_entries_owner_page on app_private.daybook_entries(account_id,created_at desc,id desc);
-- Metadata-only retry receipts also prevent a delayed create resurrecting a deletion.
create table app_private.daybook_entry_receipts (
 account_id uuid not null references app.accounts(id) on delete cascade,
 operation_id uuid not null,
 entry_id uuid not null,
 request_fingerprint text not null check (length(request_fingerprint)=64),
 operation text not null check (operation in ('save','delete')),
 revision integer not null check (revision>0),
 created_at timestamptz not null default now(),
 primary key(account_id,operation_id)
);
create index daybook_receipts_entry on app_private.daybook_entry_receipts(account_id,entry_id,operation);
alter table app_private.daybook_entries enable row level security;
alter table app_private.daybook_entries force row level security;
alter table app_private.daybook_entry_receipts enable row level security;
alter table app_private.daybook_entry_receipts force row level security;
revoke all on app_private.daybook_entries,app_private.daybook_entry_receipts from public,anon,authenticated;
grant select,insert,update,delete on app_private.daybook_entries to hh_app_backend;
grant select,insert on app_private.daybook_entry_receipts to hh_app_backend;
create policy daybook_entries_owner on app_private.daybook_entries for all to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy daybook_receipts_owner on app_private.daybook_entry_receipts for all to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
