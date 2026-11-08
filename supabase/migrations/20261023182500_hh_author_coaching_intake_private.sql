-- Author's coaching questionnaire v1. Only the account owner can read/write.
-- All answer text and optional identity fields are sealed with AES-256-GCM in the application.
-- No consent to share with practitioners, CRM, analytics or external messengers is implied.
begin;
create table if not exists app_private.coaching_intakes (
  account_id uuid primary key references app.accounts(id) on delete cascade,
  payload_ciphertext text not null check (char_length(payload_ciphertext) between 40 and 100000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table app_private.coaching_intakes enable row level security;
revoke all on table app_private.coaching_intakes from public, anon, authenticated;
grant select, insert, update, delete on app_private.coaching_intakes to hh_app_backend;
do $$
begin
 if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='coaching_intakes' and policyname='coaching_intake_owner_select') then
  create policy coaching_intake_owner_select on app_private.coaching_intakes
   for select to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='coaching_intakes' and policyname='coaching_intake_owner_insert') then
  create policy coaching_intake_owner_insert on app_private.coaching_intakes
   for insert to hh_app_backend
   with check (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='coaching_intakes' and policyname='coaching_intake_owner_update') then
  create policy coaching_intake_owner_update on app_private.coaching_intakes
   for update to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()))
   with check (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
 if not exists (select 1 from pg_policies where schemaname='app_private' and tablename='coaching_intakes' and policyname='coaching_intake_owner_delete') then
  create policy coaching_intake_owner_delete on app_private.coaching_intakes
   for delete to hh_app_backend
   using (account_id=(select auth.uid()) and (select app_private.account_active()));
 end if;
end $$;
commit;
