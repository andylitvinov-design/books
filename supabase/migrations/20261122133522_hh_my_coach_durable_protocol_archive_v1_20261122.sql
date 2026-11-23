-- Owner-scoped, append-only durable archive for consented My Coach protocols.
-- The legacy four-slot encrypted envelope remains readable; server-side code
-- lazily copies those entries before removing them from the old record.
create table if not exists app_private.my_coach_protocol_records (
  account_id uuid not null references app.accounts(id) on delete cascade,
  protocol_id uuid not null,
  protocol_ciphertext text not null,
  saved_at timestamptz not null default now(),
  schema_version smallint not null default 1 check (schema_version = 1),
  primary key (account_id, protocol_id)
);
create index if not exists my_coach_protocol_records_owner_recent_idx
  on app_private.my_coach_protocol_records (account_id, saved_at desc, protocol_id desc);
alter table app_private.my_coach_protocol_records enable row level security;
revoke all on app_private.my_coach_protocol_records from public, anon, authenticated;
grant select, insert, delete on app_private.my_coach_protocol_records to hh_app_backend;
do $migration$
begin
  if not exists (select 1 from pg_policies where schemaname = 'app_private'
    and tablename = 'my_coach_protocol_records' and policyname = 'my_coach_protocol_owner_select') then
    create policy my_coach_protocol_owner_select
      on app_private.my_coach_protocol_records for select to hh_app_backend
      using (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'app_private'
    and tablename = 'my_coach_protocol_records' and policyname = 'my_coach_protocol_owner_insert') then
    create policy my_coach_protocol_owner_insert
      on app_private.my_coach_protocol_records for insert to hh_app_backend
      with check (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'app_private'
    and tablename = 'my_coach_protocol_records' and policyname = 'my_coach_protocol_owner_delete') then
    create policy my_coach_protocol_owner_delete
      on app_private.my_coach_protocol_records for delete to hh_app_backend
      using (account_id = (select auth.uid()) and (select app_private.account_active()));
  end if;
end $migration$;
comment on table app_private.my_coach_protocol_records is
  'Individually application-encrypted, explicitly saved My Coach session protocols. No raw audio; no vendor grants; all history retained unless the client deletes it. Only owner-scoped backend role via RLS.';
