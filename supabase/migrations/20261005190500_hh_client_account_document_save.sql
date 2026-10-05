-- Holistic House: bind practitioner legacy Client records to Google Accounts only through
-- an explicit item-scoped save, and allow private legacy documents (receipt/recommendation)
-- to be saved as version-pinned references in the Google-first Cabinet.
begin;

create table if not exists app_private.client_account_bindings(
  legacy_client_id uuid primary key,
  account_id uuid references app.accounts(id) on delete set null,
  first_source_kind text not null check(first_source_kind in('delivered_report','legacy_document')),
  first_source_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_account_bindings_account
  on app_private.client_account_bindings(account_id,created_at);

revoke all on app_private.client_account_bindings from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.client_account_bindings to hh_app_backend;

-- Historical saved-report claims remain unbound; association begins only after
-- the new explicit Save flow.
alter table app_private.save_intents
  add column if not exists source_legacy_client_id uuid,
  add column if not exists source_hash text;

alter table app_private.save_intents
  drop constraint if exists save_intents_source_kind_check;
alter table app_private.save_intents
  add constraint save_intents_source_kind_check
  check(source_kind in('guest_result','delivered_report','legacy_document'));

alter table app_private.save_intents
  drop constraint if exists save_intents_source_hash_check;
alter table app_private.save_intents
  add constraint save_intents_source_hash_check
  check(source_hash is null or source_hash ~ '^sha256:[a-f0-9]{64}$');

alter table app_private.save_intents
  drop constraint if exists save_intents_source_shape;
alter table app_private.save_intents
  drop constraint if exists save_intents_check1;
alter table app_private.save_intents
  add constraint save_intents_source_shape check(
    (
      source_kind='guest_result'
      and source_report_grant_id is null
      and source_legacy_client_id is null
      and source_hash is null
      and (source_guest_session_id is not null or status='committed')
    )
    or
    (
      source_kind='delivered_report'
      and source_guest_session_id is null
      and source_report_grant_id is not null
      and source_legacy_client_id is null
      and source_hash is null
    )
    or
    (
      source_kind='legacy_document'
      and source_guest_session_id is null
      and source_report_grant_id is null
      and source_legacy_client_id is not null
      and source_hash is not null
    )
  );

create table if not exists app.saved_documents(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  source_document_id uuid not null unique,
  legacy_client_id uuid not null,
  source_hash text not null check(source_hash ~ '^sha256:[a-f0-9]{64}$'),
  document_kind text not null check(document_kind in('receipt','invoice','recommendation')),
  occurred_on date not null,
  saved_at timestamptz not null default now(),
  opened_at timestamptz,
  removed_at timestamptz,
  unique(account_id,source_document_id)
);

alter table app.saved_documents enable row level security;
revoke all on app.saved_documents from public,anon,authenticated;
grant select on app.saved_documents to authenticated,hh_app_backend;
grant insert,update(opened_at,removed_at) on app.saved_documents to hh_app_backend;

create policy own_saved_documents_read on app.saved_documents
  for select to authenticated,hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_saved_documents_insert on app.saved_documents
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_saved_documents_update on app.saved_documents
  for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

commit;
