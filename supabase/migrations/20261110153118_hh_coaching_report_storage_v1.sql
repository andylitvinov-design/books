-- Minimal retry receipts for the already-existing coaching report foundation.
-- No report, session, answer or action text is stored here.
begin;
-- The shared trigger runs for reports, events, state and messages. Access
-- message-only fields only after dispatching on the trigger table.
create or replace function app_private.coaching_require_session_consent()
returns trigger language plpgsql security invoker
set search_path = pg_catalog, app_private as $$
declare v_latest_consent_id uuid;
begin
  if not app_private.coaching_has_current_consent(new.session_id,new.account_id,tg_argv[0]) then
    raise exception 'Required coaching consent is not active' using errcode='42501';
  end if;
  if tg_table_name='coaching_session_messages' then
    if new.content_kind='consented_transcript' then
      select c.id into v_latest_consent_id from app_private.coaching_session_consents c
      where c.session_id=new.session_id and c.account_id=new.account_id
        and c.consent_type='voice_transcript_storage'
      order by c.occurred_at desc,c.id desc limit 1;
      if not app_private.coaching_has_current_consent(new.session_id,new.account_id,'voice_transcript_storage')
         or v_latest_consent_id is distinct from new.consent_event_id then
        raise exception 'Transcript must reference the current affirmative voice-storage consent' using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function app_private.coaching_require_session_consent() from public;
grant execute on function app_private.coaching_require_session_consent() to hh_app_backend;
create table if not exists app_private.coaching_report_receipts (
  account_id uuid not null references app.accounts(id) on delete cascade,
  operation_id uuid not null,
  report_id uuid not null,
  report_revision integer not null check(report_revision > 0),
  request_fingerprint text not null check(request_fingerprint ~ '^[0-9a-f]{64}$'),
  state text not null check(state in ('saved','deleted')),
  created_at timestamptz not null default now(),
  primary key(account_id,operation_id)
);
create index if not exists coaching_report_receipts_owner_created_idx on app_private.coaching_report_receipts(account_id,created_at);
alter table app_private.coaching_report_receipts enable row level security;
alter table app_private.coaching_report_receipts force row level security;
revoke all on app_private.coaching_report_receipts from public,anon,authenticated;
grant select,insert on app_private.coaching_report_receipts to hh_app_backend;
grant update(state) on app_private.coaching_report_receipts to hh_app_backend;
create policy coaching_report_receipts_owner_select on app_private.coaching_report_receipts for select to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coaching_report_receipts_owner_insert on app_private.coaching_report_receipts for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy coaching_report_receipts_owner_update on app_private.coaching_report_receipts for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create or replace function app_private.coaching_report_mark_deleted() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  update app_private.coaching_report_receipts set state='deleted'
    where account_id=old.account_id and report_id=old.id;
  return old;
end $$;
revoke all on function app_private.coaching_report_mark_deleted() from public,anon,authenticated;
grant execute on function app_private.coaching_report_mark_deleted() to hh_app_backend;
create trigger coaching_reports_mark_deleted before delete on app_private.coaching_reports
  for each row execute function app_private.coaching_report_mark_deleted();
commit;
