-- Additive consent for subscriber AI Telegram native voice. No new tables,
-- public grants, provider credentials, workers or paid infrastructure.
-- Apply ONLY after the verified 20261106080000 subscriber AI migration.
begin;
alter table app_private.subscriber_ai_sessions
  add column if not exists voice_pending_at timestamptz,
  add column if not exists voice_consent_at timestamptz;
alter table app_private.subscriber_ai_outbox
  drop constraint if exists subscriber_ai_outbox_kind_check;
alter table app_private.subscriber_ai_outbox
  add constraint subscriber_ai_outbox_kind_check
  check (kind in ('open','enable','disable','decline','hello','chat',
    'materials','practice','video','tests','master','voice'));
comment on column app_private.subscriber_ai_sessions.voice_consent_at
  is 'Separate revocable external STT consent. /voice_off /ai_off /stop revoke.';
comment on column app_private.subscriber_ai_sessions.voice_pending_at
  is 'Separate voice privacy notice, valid for 15 min; no audio stored pre-consent.';
commit;
