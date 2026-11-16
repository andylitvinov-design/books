
create or replace function app_private.coaching_require_session_consent()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, app_private
as $$
declare v_latest_consent_id uuid;
begin
  if not app_private.coaching_has_current_consent(new.session_id, new.account_id, tg_argv[0]) then
    raise exception 'Required coaching consent is not active'
      using errcode = '42501';
  end if;

  if tg_table_name = 'coaching_session_messages'
     and new.content_kind = 'consented_transcript' then
    select c.id into v_latest_consent_id
    from app_private.coaching_session_consents c
    where c.session_id = new.session_id
      and c.account_id = new.account_id
      and c.consent_type = 'voice_transcript_storage'
    order by c.occurred_at desc, c.id desc
    limit 1;

    if not app_private.coaching_has_current_consent(new.session_id, new.account_id, 'voice_transcript_storage')
       or v_latest_consent_id is distinct from new.consent_event_id then
      raise exception 'Transcript must reference the current affirmative voice-storage consent'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function app_private.coaching_require_session_consent() from public;
grant execute on function app_private.coaching_require_session_consent() to hh_app_backend;
