-- REVIEWED SCHEMA CANDIDATE, NOT AN APPLIED MIGRATION.
-- Generate the actual migration via supabase migration new, then review and
-- run on an isolated database before protected release. Never apply from chat.
-- No existing reviewed report or legacy client record is changed.
begin;
create table if not exists app_private.my_coach_drafts (
 account_id uuid not null references app.accounts(id) on delete cascade,
 session_id uuid not null,
 persona_id text not null check (persona_id in ('mira','max','sofia','alex','merlin','harry','genie','lea','noah','iris','ray')),
 payload_ciphertext text check (payload_ciphertext is null or length(payload_ciphertext) between 40 and 500000),
 revision integer not null check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 primary key(account_id,session_id),
 check ((deleted_at is null) = (payload_ciphertext is not null))
);
create index if not exists my_coach_drafts_owner_idx on app_private.my_coach_drafts(account_id,updated_at desc,session_id desc) where deleted_at is null;
alter table app_private.my_coach_drafts enable row level security;
alter table app_private.my_coach_drafts force row level security;
revoke all on app_private.my_coach_drafts from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,update,delete on app_private.my_coach_drafts to hh_app_backend;
create policy my_coach_drafts_select on app_private.my_coach_drafts for select to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy my_coach_drafts_insert on app_private.my_coach_drafts for insert to hh_app_backend
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy my_coach_drafts_update on app_private.my_coach_drafts for update to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy my_coach_drafts_delete on app_private.my_coach_drafts for delete to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()));
comment on table app_private.my_coach_drafts is 'Opt-in, application-encrypted unreviewed coaching checkpoints. Deleted rows contain no transcript; UUID/revision tombstone prevents stale retries recreating erased data. Account deletion cascades.';
commit;
