-- Keep STT-derived replies revocable until provider acceptance.
-- Additive private CHECK update; no public grants, jobs or paid resources.
begin;
alter table app_private.subscriber_ai_outbox
  drop constraint if exists subscriber_ai_outbox_kind_check;
alter table app_private.subscriber_ai_outbox
  add constraint subscriber_ai_outbox_kind_check
  check (kind in ('open','enable','disable','decline','hello','chat',
    'materials','practice','video','tests','master','voice','voice_reply'));
comment on column app_private.subscriber_ai_outbox.kind is
  'voice_reply requires renewed voice consent before any Telegram send.';
commit;
