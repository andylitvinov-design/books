-- Private, unreviewed My Coach checkpoints. Final reports remain immutable in their existing archive.
create table if not exists app_private.my_coach_protocol_drafts (
  account_id uuid not null references app.accounts(id) on delete cascade,
  protocol_id uuid not null,
  revision integer not null check (revision between 1 and 10000),
  state text not null default 'active' check (state in ('active','discarded','finalized')),
  payload_ciphertext text,
  updated_at timestamptz not null default now(),
  primary key (account_id,protocol_id),
  check ((state='active' and payload_ciphertext is not null) or (state<>'active' and payload_ciphertext is null))
);
create index if not exists my_coach_protocol_drafts_owner_recent_idx
  on app_private.my_coach_protocol_drafts(account_id,updated_at desc,protocol_id desc) where state='active';
alter table app_private.my_coach_protocol_drafts enable row level security;
alter table app_private.my_coach_protocol_drafts force row level security;
revoke all on app_private.my_coach_protocol_drafts from public,anon,authenticated;
grant select,insert on app_private.my_coach_protocol_drafts to hh_app_backend;
grant update (revision,state,payload_ciphertext,updated_at) on app_private.my_coach_protocol_drafts to hh_app_backend;
create policy my_coach_drafts_owner_select on app_private.my_coach_protocol_drafts for select to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy my_coach_drafts_owner_insert on app_private.my_coach_protocol_drafts for insert to hh_app_backend
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy my_coach_drafts_owner_update on app_private.my_coach_protocol_drafts for update to hh_app_backend
 using (account_id=(select auth.uid()) and (select app_private.account_active()))
 with check (account_id=(select auth.uid()) and (select app_private.account_active()));
comment on table app_private.my_coach_protocol_drafts is 'Explicit private autosave opt-in only; unreviewed encrypted transcript, never a model context grant. Discard/finalize clears ciphertext and retains only non-content tombstone to reject stale retries. Account deletion cascades.';
