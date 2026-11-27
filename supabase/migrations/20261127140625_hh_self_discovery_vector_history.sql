begin;
create table app_private.development_vector_history (
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 revision integer not null check(revision>0),
 payload_ciphertext text not null check(octet_length(payload_ciphertext)<=32000),
 saved_at timestamptz not null,
 unique(account_id,revision)
);
alter table app_private.development_vector_history enable row level security;
alter table app_private.development_vector_history force row level security;
revoke all on app_private.development_vector_history from public,anon,authenticated;
grant select,insert on app_private.development_vector_history to hh_app_backend;
create policy development_vector_history_owner_select on app_private.development_vector_history for select to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy development_vector_history_owner_insert on app_private.development_vector_history for insert to hh_app_backend
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
commit;
