-- Existing private subscriber AI and outbox, separate outgoing-TTS consent.
-- OFF until operator verifies this migration AND truly free Gemini quota.
begin;
alter table app_private.subscriber_ai_sessions
 add column if not exists tts_pending_at timestamptz,
 add column if not exists tts_consent_at timestamptz;
alter table app_private.subscriber_ai_outbox
 drop constraint if exists subscriber_ai_outbox_kind_check;
alter table app_private.subscriber_ai_outbox
 add constraint subscriber_ai_outbox_kind_check
 check(kind in ('open','enable','disable','decline','hello','chat','materials','practice',
  'video','tests','master','voice','voice_reply','tts_output'));
create table if not exists app_private.subscriber_ai_tts_file_cache (
 bot_id text not null check(bot_id ~ '^[0-9]{6,16}$'),
 locale text not null check(locale in ('ru','en','es')),
 phrase_hash text not null check(phrase_hash ~ '^[0-9a-f]{64}$'),
 telegram_file_id text not null check(length(telegram_file_id) between 20 and 256),
 updated_at timestamptz not null default now(),
 primary key(bot_id,locale,phrase_hash)
);
alter table app_private.subscriber_ai_tts_file_cache enable row level security;
alter table app_private.subscriber_ai_tts_file_cache force row level security;
revoke all on app_private.subscriber_ai_tts_file_cache from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,update,delete on app_private.subscriber_ai_tts_file_cache to hh_app_backend;
create policy hh_subscriber_ai_tts_server on app_private.subscriber_ai_tts_file_cache
 for all to hh_app_backend using(current_setting('hh.subscriber_ai',true)='1')
 with check(current_setting('hh.subscriber_ai',true)='1');
comment on column app_private.subscriber_ai_sessions.tts_consent_at is
 'Separate, revocable consent for outgoing public-template audio ONLY; private chat never leaves to free external TTS';
comment on table app_private.subscriber_ai_tts_file_cache is
 'Bot-specific Telegram file_id cache of PUBLIC reviewed fixed phrases only; zero personal text/recordings';
commit;
