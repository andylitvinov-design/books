-- Holistic House R1 Revision 5 hardening:
-- preserve exclusive delivered-report ownership and retain minimal save receipts after guest cleanup.
begin;

create unique index if not exists report_grants_one_bound_source
  on app_private.report_grants(source_assessment_id,source_revision)
  where bound_account_id is not null;

alter table app_private.save_intents
  drop constraint if exists save_intents_source_guest_session_id_fkey;
alter table app_private.save_intents
  add constraint save_intents_source_guest_session_id_fkey
  foreign key(source_guest_session_id)
  references app_private.guest_sessions(id)
  on delete set null;

alter table app_private.save_intents
  drop constraint if exists save_intents_check1;
alter table app_private.save_intents
  add constraint save_intents_source_shape check(
    (
      source_kind='guest_result'
      and source_report_grant_id is null
      and (
        source_guest_session_id is not null
        or status='committed'
      )
    )
    or
    (
      source_kind='delivered_report'
      and source_guest_session_id is null
      and source_report_grant_id is not null
    )
  );

create index if not exists guest_sessions_cleanup
  on app_private.guest_sessions(expires_at)
  where revoked_at is null;
create index if not exists report_viewer_sessions_cleanup
  on app_private.report_viewer_sessions(expires_at);
create index if not exists save_intents_cleanup
  on app_private.save_intents(expires_at,status);

create table if not exists app_private.housekeeping_runs(
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  guest_sessions_deleted integer not null default 0 check(guest_sessions_deleted>=0),
  viewer_sessions_deleted integer not null default 0 check(viewer_sessions_deleted>=0),
  intents_deleted integer not null default 0 check(intents_deleted>=0),
  status text not null default 'running' check(status in('running','completed','failed'))
);

revoke all on app_private.housekeeping_runs from public,anon,authenticated,hh_app_inbox;
grant select,insert,update on app_private.housekeeping_runs to hh_app_backend;

commit;
