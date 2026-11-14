-- Optional ephemeral dialog state in the existing database. It may retain one
-- explicit goal phrase encrypted, but no full transcript or plaintext state.
-- Deployment requires reviewed privacy, RLS,
-- concurrent-update, retention and rollback tests; no route enables it here.
begin;
create table app_private.native_dialogue_sessions (
 id uuid primary key,
 account_id uuid not null references app.accounts(id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 revision integer not null default 0 check(revision between 0 and 256),
 state_ciphertext text not null check(length(state_ciphertext) between 20 and 30000),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 updated_at timestamptz not null default now(),
 check(expires_at>created_at and expires_at<=created_at+interval '30 minutes')
);
create index native_dialogue_sessions_owner_session on app_private.native_dialogue_sessions(account_id,session_id,expires_at);
create index native_dialogue_sessions_expiry on app_private.native_dialogue_sessions(expires_at,id);
revoke all on app_private.native_dialogue_sessions from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,delete on app_private.native_dialogue_sessions to hh_app_backend;
grant insert(id,account_id,session_id,state_ciphertext,expires_at) on app_private.native_dialogue_sessions to hh_app_backend;
grant update(revision,state_ciphertext,updated_at) on app_private.native_dialogue_sessions to hh_app_backend;
alter table app_private.native_dialogue_sessions enable row level security;
alter table app_private.native_dialogue_sessions force row level security;
-- Claims are assigned only by the existing verified transaction helper. A
-- missing/invalid session claim cannot match a UUID and fails closed.
create policy native_dialogue_select on app_private.native_dialogue_sessions for select to hh_app_backend using (
 (account_id=(select auth.uid()) and session_id::text=(select auth.jwt()->>'session_id') and (select app_private.account_active()))
 or ((select auth.uid()) is null and expires_at<=now())
);
create policy native_dialogue_insert on app_private.native_dialogue_sessions for insert to hh_app_backend with check (
 account_id=(select auth.uid()) and session_id::text=(select auth.jwt()->>'session_id')
 and (select app_private.account_active()) and expires_at>now()
);
create policy native_dialogue_update on app_private.native_dialogue_sessions for update to hh_app_backend using (
 account_id=(select auth.uid()) and session_id::text=(select auth.jwt()->>'session_id')
 and (select app_private.account_active()) and expires_at>now()
) with check (
 account_id=(select auth.uid()) and session_id::text=(select auth.jwt()->>'session_id')
 and (select app_private.account_active()) and expires_at>now()
);
create policy native_dialogue_delete on app_private.native_dialogue_sessions for delete to hh_app_backend using (
 (account_id=(select auth.uid()) and session_id::text=(select auth.jwt()->>'session_id') and (select app_private.account_active()))
 or ((select auth.uid()) is null and expires_at<=now())
);
comment on table app_private.native_dialogue_sessions is 'Optional short-lived encrypted state including one explicitly stated goal phrase; no full transcript, no independent client database, and no client access. Existing housekeeping must purge expired rows.';
commit;
