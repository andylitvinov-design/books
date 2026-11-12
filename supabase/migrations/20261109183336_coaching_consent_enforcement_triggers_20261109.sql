
-- Consent rows are append-only events: accepted=false is a revocation or refusal.
alter table app_private.coaching_session_consents
  add constraint coaching_session_consents_id_session_account_key unique (id, session_id, account_id);

alter table app_private.coaching_session_messages
  add constraint coaching_messages_transcript_consent_required
  check ((content_kind = 'consented_transcript' and consent_event_id is not null)
      or (content_kind <> 'consented_transcript' and consent_event_id is null));

alter table app_private.coaching_session_messages
  add constraint coaching_messages_consent_event_fk
  foreign key (consent_event_id, session_id, account_id)
  references app_private.coaching_session_consents(id, session_id, account_id)
  on delete restrict;

alter table app_private.coaching_specialist_recommendations
  add constraint coaching_specialist_context_requires_consent
  check (context_packet_ciphertext is null or
    (consent_scope <> 'none' and consented_at is not null and revoked_at is null));

create or replace function app_private.coaching_has_current_consent(
  p_session_id uuid,
  p_account_id uuid,
  p_consent_type text
) returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, app_private
as $$
  select coalesce((
    select c.accepted
    from app_private.coaching_session_consents c
    where c.session_id = p_session_id
      and c.account_id = p_account_id
      and c.consent_type = p_consent_type
    order by c.occurred_at desc, c.id desc
    limit 1
  ), false);
$$;
revoke all on function app_private.coaching_has_current_consent(uuid,uuid,text) from public;
grant execute on function app_private.coaching_has_current_consent(uuid,uuid,text) to hh_app_backend;

create or replace function app_private.coaching_require_session_consent()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, app_private
as $$
begin
  if not app_private.coaching_has_current_consent(new.session_id, new.account_id, tg_argv[0]) then
    raise exception 'Required coaching consent is not active'
      using errcode = '42501';
  end if;

  if tg_table_name = 'coaching_session_messages'
     and new.content_kind = 'consented_transcript'
     and not app_private.coaching_has_current_consent(new.session_id, new.account_id, 'voice_transcript_storage') then
    raise exception 'Voice transcript storage consent is not active'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
revoke all on function app_private.coaching_require_session_consent() from public;
grant execute on function app_private.coaching_require_session_consent() to hh_app_backend;

create or replace function app_private.coaching_require_report_consent()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, app_private
as $$
declare v_session_id uuid;
begin
  select r.session_id into v_session_id
  from app_private.coaching_reports r
  where r.id = new.report_id and r.account_id = new.account_id;

  if v_session_id is null
     or not app_private.coaching_has_current_consent(v_session_id, new.account_id, 'report_storage') then
    raise exception 'Report storage consent is not active'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function app_private.coaching_require_report_consent() from public;
grant execute on function app_private.coaching_require_report_consent() to hh_app_backend;

drop trigger if exists coaching_messages_require_archive_consent on app_private.coaching_session_messages;
create trigger coaching_messages_require_archive_consent
  before insert on app_private.coaching_session_messages
  for each row execute function app_private.coaching_require_session_consent('message_archive');

drop trigger if exists coaching_events_require_persistence_consent on app_private.coaching_session_events;
create trigger coaching_events_require_persistence_consent
  before insert on app_private.coaching_session_events
  for each row execute function app_private.coaching_require_session_consent('session_persistence');

drop trigger if exists coaching_state_require_persistence_consent on app_private.coaching_session_state_versions;
create trigger coaching_state_require_persistence_consent
  before insert on app_private.coaching_session_state_versions
  for each row execute function app_private.coaching_require_session_consent('session_persistence');

drop trigger if exists coaching_hypotheses_require_persistence_consent on app_private.coaching_session_hypotheses;
create trigger coaching_hypotheses_require_persistence_consent
  before insert on app_private.coaching_session_hypotheses
  for each row execute function app_private.coaching_require_session_consent('session_persistence');

drop trigger if exists coaching_reports_require_storage_consent on app_private.coaching_reports;
create trigger coaching_reports_require_storage_consent
  before insert on app_private.coaching_reports
  for each row execute function app_private.coaching_require_session_consent('report_storage');

drop trigger if exists coaching_report_versions_require_storage_consent on app_private.coaching_report_versions;
create trigger coaching_report_versions_require_storage_consent
  before insert on app_private.coaching_report_versions
  for each row execute function app_private.coaching_require_report_consent();

comment on table app_private.coaching_session_consents is
  'Append-only, versioned consent ledger. Use accepted=false as a new refusal/revocation event; latest event controls storage/sharing. Absence means off.';
