-- Holistic House 90-day Business & Career coaching — additive private storage.
-- The only durable data is an AES-GCM encrypted, account-owned course payload.
-- Reuses app.accounts and its verified private-session/RLS helpers; no analytics sharing.
begin;
create table if not exists app_private.business_coaching_programs (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  payload_ciphertext text not null check (char_length(payload_ciphertext) between 40 and 250000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table app_private.business_coaching_programs enable row level security;
revoke all on table app_private.business_coaching_programs from public, anon, authenticated;
grant select, insert, update, delete on app_private.business_coaching_programs to hh_app_backend;
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='app_private' and tablename='business_coaching_programs' and policyname='business_coaching_owner_select') then
  create policy business_coaching_owner_select on app_private.business_coaching_programs
   for select to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='app_private' and tablename='business_coaching_programs' and policyname='business_coaching_owner_insert') then
  create policy business_coaching_owner_insert on app_private.business_coaching_programs
   for insert to hh_app_backend
   with check (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='app_private' and tablename='business_coaching_programs' and policyname='business_coaching_owner_update') then
  create policy business_coaching_owner_update on app_private.business_coaching_programs
   for update to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()))
   with check (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='app_private' and tablename='business_coaching_programs' and policyname='business_coaching_owner_delete') then
  create policy business_coaching_owner_delete on app_private.business_coaching_programs
   for delete to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
end $$;
commit;
